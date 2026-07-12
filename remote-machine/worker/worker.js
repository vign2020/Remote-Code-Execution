/** @format */

import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} from "@aws-sdk/client-sqs";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import Submission from "./models/Submission.js";
import connectDB from "./db.js";
import { getTestcaseFromCache } from "./getTestcaseFromCache.js";
import os from "os";
import { randomUUID } from "crypto";
import util from "util";

dotenv.config();

const AWS_REGION = process.env.AWS_REGION;
const QUEUE_URL = process.env.SQS_QUEUE_URL;

const client = new SQSClient({ region: AWS_REGION });

console.log("QUEUE is " + QUEUE_URL);
const execAsync = util.promisify(exec);

const POOL_SIZE = 2; // match your MAX_CONCURRENCY
const pool = [];

// docker-compose runs this worker at --scale app=2, so multiple replicas
// share the same host /tmp and the same docker daemon. Without a per-replica
// namespace, both replicas would create identically-named pool containers
// bind-mounted to identically-named host directories and stomp on each
// other's in-flight submissions. Docker gives each container a hostname
// equal to its own (unique) short container ID by default, so it doubles
// as a stable, collision-free instance id here.
const INSTANCE_ID = os.hostname();

const poolHostDir = (name) => `/tmp/${name}-code`;

async function startPoolContainer(name) {
  const hostDir = poolHostDir(name);
  fs.mkdirSync(hostDir, { recursive: true });
  await execAsync(
    `docker run -d --name ${name} --network none --memory 512m --cpus 1.0 --pids-limit 200 -v ${hostDir}:/code cp-judge-gcc:latest tail -f /dev/null`,
  );
}

async function initPool() {
  for (let i = 0; i < POOL_SIZE; i++) {
    const name = `${INSTANCE_ID}-pool-worker-${i}`;
    try {
      await execAsync(`docker rm -f ${name}`);
    } catch (e) {
      // container didn't exist, fine
    }
    await startPoolContainer(name);
    pool.push({ name, hostDir: poolHostDir(name), busy: false });
    console.log(`Pool container ready: ${name}`);
  }
}

function acquireContainer() {
  return new Promise((resolve) => {
    const tryAcquire = () => {
      const free = pool.find((c) => !c.busy);
      if (free) {
        free.busy = true;
        resolve(free);
      } else {
        setTimeout(tryAcquire, 20);
      }
    };
    tryAcquire();
  });
}

function releaseContainer(container) {
  container.busy = false;
}

// Recreates a pool container in place. Only called reactively (a compile/run
// exec detected the container is gone) or from the background health check —
// never on the per-submission hot path.
async function recreateContainer(container) {
  console.warn(`Recreating pool container: ${container.name}`);
  try {
    await execAsync(`docker rm -f ${container.name}`);
  } catch (_) {}
  try {
    fs.rmSync(container.hostDir, { recursive: true, force: true });
  } catch (_) {}
  await startPoolContainer(container.name);
}

// Background safety net for containers that die while idle (e.g. OOM-killed).
// Deliberately not run per-submission — that was costing a `docker inspect`
// process spawn + daemon RPC on every single job.
setInterval(async () => {
  for (const container of pool) {
    if (container.busy) continue;
    try {
      const { stdout } = await execAsync(
        `docker inspect -f "{{.State.Running}}" ${container.name}`,
      );
      if (stdout.trim() !== "true") throw new Error("not running");
    } catch (e) {
      await recreateContainer(container);
    }
  }
}, 10000);

// ===== Per-submission processing using the pool =====
async function processSubmission(msg) {
  const tStart = performance.now();

  const timings = {
    redisAndContainerWait: 0,
    fsWrites: 0,
    execRun: 0,
    mongoUpdate: 0,
    deleteSQS: 0,
  };

  let compileTime = 0;
  let executionTime = 0;
  let container = null;
  let containerDead = false;

  try {
    const job = JSON.parse(msg.Body);

    // --- Redis fetch + container acquire happen in parallel ---
    const tParallelStart = performance.now();
    const [testCases, acquiredContainer] = await Promise.all([
      getTestcaseFromCache(job.contestNo, job.problemId),
      acquireContainer(),
    ]);
    container = acquiredContainer;
    timings.redisAndContainerWait = performance.now() - tParallelStart;

    // --- Write files straight into the pool container's bind-mounted /code ---
    // No docker exec / docker cp needed: hostDir is bind-mounted to /code in
    // the already-running container, so plain fs calls land there directly.
    const tFsStart = performance.now();
    const codeDir = container.hostDir;
    const inputDir = path.join(codeDir, "input");
    const outputDir = path.join(codeDir, "output");
    // Clear codeDir's *contents* only — never rm/recreate codeDir itself.
    // It's the source side of a live docker bind mount, so a fresh directory
    // at the same path would be an inode the container's /code can't see.
    for (const entry of fs.readdirSync(codeDir)) {
      fs.rmSync(path.join(codeDir, entry), { recursive: true, force: true });
    }
    fs.mkdirSync(inputDir, { recursive: true });
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(path.join(codeDir, "main.cpp"), job.code);
    for (const input of testCases.inputs) {
      fs.writeFileSync(path.join(inputDir, input.name), input.content);
    }
    for (const output of testCases.outputs) {
      fs.writeFileSync(path.join(outputDir, output.name), output.content);
    }
    timings.fsWrites = performance.now() - tFsStart;

    // --- Compile + Run (exec into the already-running container) ---
    const tExecStart = performance.now();
    const {
      status,
      output,
      errorMsg,
      compileTime: ct,
      executionTime: et,
    } = await new Promise((resolve, reject) => {
      const cmd = `
docker exec ${container.name} bash -c "
chmod +x /code 2>/dev/null
COMPILE_START=\\$(date +%s%3N)

g++ -std=c++17 -O0 /code/main.cpp -o /code/a.out 2>/code/compile_error.txt

COMPILE_END=\\$(date +%s%3N)
echo '__COMPILE_TIME__:'\\$((COMPILE_END-COMPILE_START))

if [ \\$? -ne 0 ]; then
  echo '__COMPILE_ERROR__'
  cat /code/compile_error.txt
  exit 100
fi

chmod +x /code/a.out

tc=1
for f in /code/input/*.txt; do
  EXEC_START=\\$(date +%s%3N)

  name=\\$(basename \\$f .txt)
  timeout 15 /code/a.out < \\$f > /code/useroutput-\\$name.txt 2>/code/runtime_error.txt

  EXEC_END=\\$(date +%s%3N)
  echo '__EXECUTION_TIME__:'\\$((EXEC_END-EXEC_START))

  status=\\$?

  if [ \\$status -eq 124 ]; then
    echo '__TLE__'
    exit 124
  elif [ \\$status -ne 0 ]; then
    echo '__RUNTIME_ERROR__'
    cat /code/runtime_error.txt
    exit 101
  fi

  if ! diff -q /code/useroutput-\\$name.txt /code/output/\\$name.txt > /dev/null; then
    echo '__WRONG_ANSWER__'
    echo 'Testcase: '\\$tc
    echo 'Input:'
    cat \\$f
    echo 'Expected output:'
    cat /code/output/\\$name.txt
    echo 'Your output:'
    cat /code/useroutput-\\$name.txt
    exit 102
  fi

  tc=\\$((tc+1))
done

echo '__ACCEPTED__'
exit 0
"
`;

      exec(
        cmd,
        { timeout: 30000, killSignal: "SIGKILL" },
        (error, stdout, stderr) => {
          let status = "error";
          let errorMsg = "";
          let output = stdout;
          let compileTime = 0;
          let executionTime = 0;

          if (stdout.includes("__COMPILE_ERROR__")) {
            status = "COMPILE ERROR";
            errorMsg = stdout.replace("__COMPILE_ERROR__", "").trim();
          } else if (stdout.includes("__TLE__") || error?.code === 124) {
            status = "TLE";
            errorMsg = "Time limit exceeded";
          } else if (stdout.includes("__RUNTIME_ERROR__")) {
            status = "RUN TIME ERROR";
            errorMsg = stdout.replace("__RUNTIME_ERROR__", "").trim();
          } else if (stdout.includes("__WRONG_ANSWER__")) {
            status = "WRONG ANSWER";

            const lines = stdout.split("\n");
            const tcLine = lines.find((l) => l.startsWith("Testcase:"));
            const tcNo = tcLine ? tcLine.split(":")[1].trim() : "?";
            const inputIdx = lines.indexOf("Input:");
            const expectedIdx = lines.indexOf("Expected output:");
            const yourIdx = lines.indexOf("Your output:");
            const input = lines.slice(inputIdx + 1, expectedIdx).join("\n");
            const expected = lines.slice(expectedIdx + 1, yourIdx).join("\n");
            const your = lines.slice(yourIdx + 1).join("\n");

            errorMsg = `Wrong answer for testcase ${tcNo}
Input:
${input}
Expected output:
${expected}
Your output:
${your}`;
          } else if (stdout.includes("__ACCEPTED__")) {
            status = "ACCEPTED";
            errorMsg = "";
          } else if (error) {
            status = "error";
            errorMsg = stderr || "Unknown error";
            if (
              /is not running|No such container/i.test(
                `${stderr || ""} ${error.message || ""}`,
              )
            ) {
              containerDead = true;
            }
          }

          const compileMatch = stdout.match(/__COMPILE_TIME__:(\d+)/);
          if (compileMatch) compileTime = Number(compileMatch[1]);

          const execMatches = [...stdout.matchAll(/__EXECUTION_TIME__:(\d+)/g)];
          if (execMatches.length > 0) {
            executionTime = execMatches.reduce(
              (sum, m) => sum + Number(m[1]),
              0,
            );
          }

          resolve({ status, output, errorMsg, compileTime, executionTime });
        },
      );
    });

    timings.execRun = performance.now() - tExecStart;
    compileTime = ct;
    executionTime = et;

    const result = { status, output, error: errorMsg };

    // --- Mongo update ---
    const tMongoStart = performance.now();
    await Submission.findOneAndUpdate(
      { submissionId: job.submissionId },
      result,
      { new: true },
    );
    timings.mongoUpdate = performance.now() - tMongoStart;
  } catch (err) {
    console.error("Job failed:", err);
  } finally {
    // --- Release container back to the pool ---
    // No cleanup exec here: the next job to use this container wipes
    // codeDir via plain fs calls before writing its own files in.
    if (container) {
      if (containerDead) {
        await recreateContainer(container);
      }
      releaseContainer(container);
    }

    // --- Delete SQS ---
    const tDeleteStart = performance.now();
    await client.send(
      new DeleteMessageCommand({
        QueueUrl: QUEUE_URL,
        ReceiptHandle: msg.ReceiptHandle,
      }),
    );
    timings.deleteSQS = performance.now() - tDeleteStart;

    const total = performance.now() - tStart;
    const dockerOverhead = timings.execRun - compileTime - executionTime;

    const fmt = (label, ms) =>
      `${label.padEnd(24)} ${ms.toFixed(0).padStart(5)} ms`;

    console.log("\n--- Timing Breakdown (warm pool) ---");
    console.log(fmt("Redis fetch + container wait:", timings.redisAndContainerWait));
    console.log(fmt("Filesystem writes:", timings.fsWrites));
    console.log(fmt("Exec total:", timings.execRun));
    console.log(fmt("  Compile:", compileTime));
    console.log(fmt("  Execution:", executionTime));
    console.log(fmt("  Overhead:", dockerOverhead));
    console.log(fmt("Mongo update:", timings.mongoUpdate));
    console.log(fmt("Delete SQS:", timings.deleteSQS));
    console.log(fmt("TOTAL:", total));
    console.log("-------------------------------------\n");
  }
}

const MAX_CONCURRENCY = 2; // per worker process
let activeCount = 0;

async function pollQueue() {
  while (true) {
    try {
      if (activeCount >= MAX_CONCURRENCY) {
        await new Promise((r) => setTimeout(r, 50)); // brief backoff, avoid busy-loop
        continue;
      }

      const command = new ReceiveMessageCommand({
        QueueUrl: QUEUE_URL,
        MaxNumberOfMessages: Math.min(5, MAX_CONCURRENCY - activeCount),
        WaitTimeSeconds: 5, // shorter wait since we're polling in a tight loop now
        VisibilityTimeout: 120,
      });

      const response = await client.send(command);
      if (!response.Messages) continue;

      // fire and forget — do NOT await here
      for (const msg of response.Messages) {
        activeCount++;
        processSubmission(msg).finally(() => {
          activeCount--;
        });
      }
    } catch (err) {
      console.error("Queue polling error:", err);
    }
  }
}

(async () => {
  await connectDB();
  await initPool();
  pollQueue();
})();

//to simulate delay in c++
// this_thread::sleep_for(chrono::seconds(3));\n

//
