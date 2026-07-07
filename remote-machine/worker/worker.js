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

dotenv.config();

const AWS_REGION = process.env.AWS_REGION;
const QUEUE_URL = process.env.SQS_QUEUE_URL;

const client = new SQSClient({ region: AWS_REGION });

console.log("QUEUE is " + QUEUE_URL);

async function pollQueue() {
  await connectDB();
  while (true) {
    try {
      const tReceiveStart = performance.now();
      const command = new ReceiveMessageCommand({
        QueueUrl: QUEUE_URL,
        MaxNumberOfMessages: 1,
        WaitTimeSeconds: 20,
        VisibilityTimeout: 120,
      });

      const response = await client.send(command);
      const tReceiveEnd = performance.now();

      if (!response.Messages) {
        console.log("No messages...");
        continue;
      }

      for (const msg of response.Messages) {
        // timing accumulators for this submission
        const timings = {
          receiveSQS: tReceiveEnd - tReceiveStart,
          redisFetch: 0,
          fsWrites: 0,
          dockerRun: 0,
          mongoUpdate: 0,
          deleteSQS: 0,
        };

        // declare these in outer scope so they're accessible in finally
        let compileTime = 0;
        let executionTime = 0;
        let dockerOverhead = 0;

        try {
          const job = JSON.parse(msg.Body);
          const submissionDir = `/tmp/sub-${Date.now()}`;
          fs.mkdirSync(submissionDir, { recursive: true });
          const codePath = path.join(submissionDir, "main.cpp");
          fs.writeFileSync(codePath, job.code);

          // --- Redis fetch ---
          const tRedisStart = performance.now();
          const testCases = await getTestcaseFromCache(
            job.contestNo,
            job.problemId,
          );
          timings.redisFetch = performance.now() - tRedisStart;

          // --- Filesystem writes ---
          const tFsStart = performance.now();
          const inputDir = `${submissionDir}/input`;
          const outputDir = `${submissionDir}/output`;
          fs.mkdirSync(inputDir, { recursive: true });
          fs.mkdirSync(outputDir, { recursive: true });

          for (const input of testCases.inputs) {
            fs.writeFileSync(`${inputDir}/${input.name}`, input.content);
          }
          for (const output of testCases.outputs) {
            fs.writeFileSync(`${outputDir}/${output.name}`, output.content);
          }
          timings.fsWrites = performance.now() - tFsStart;

          // --- Docker + Compile + Run ---
          const tDockerStart = performance.now();
          await new Promise((resolve, reject) => {
            const cmd = `
docker run --rm \
--network none \
--memory 512m \
--cpus 1.0 \
--pids-limit 200 \
-v ${submissionDir}:/code \
gcc:latest \
bash -c "
COMPILE_START=\\$(date +%s%3N)

g++ /code/main.cpp -o /code/a.out 2>/code/compile_error.txt

COMPILE_END=\\$(date +%s%3N)
echo '__COMPILE_TIME__:'\\$((COMPILE_END-COMPILE_START))

if [ \\$? -ne 0 ]; then
  echo '__COMPILE_ERROR__'
  cat /code/compile_error.txt
  exit 100
fi

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
              async (error, stdout, stderr) => {
                timings.dockerRun = performance.now() - tDockerStart;

                let status = "error";
                let errorMsg = "";
                let output = stdout;

                // --- Parse stdout for status ---
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
                  const input = lines
                    .slice(inputIdx + 1, expectedIdx)
                    .join("\n");
                  const expected = lines
                    .slice(expectedIdx + 1, yourIdx)
                    .join("\n");
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
                }

                // --- Parse compile and execution times from stdout ---
                const compileMatch = stdout.match(/__COMPILE_TIME__:(\d+)/);
                if (compileMatch) {
                  compileTime = Number(compileMatch[1]);
                }

                const execMatches = [
                  ...stdout.matchAll(/__EXECUTION_TIME__:(\d+)/g),
                ];
                if (execMatches.length > 0) {
                  executionTime = execMatches.reduce(
                    (sum, match) => sum + Number(match[1]),
                    0,
                  );
                }

                dockerOverhead =
                  timings.dockerRun - compileTime - executionTime;

                const result = { status, output, error: errorMsg };

                // --- Mongo update ---
                const tMongoStart = performance.now();
                try {
                  await Submission.findOneAndUpdate(
                    { submissionId: job.submissionId },
                    result,
                    { new: true },
                  );
                  timings.mongoUpdate = performance.now() - tMongoStart;
                  resolve();
                } catch (dbErr) {
                  timings.mongoUpdate = performance.now() - tMongoStart;
                  reject(dbErr);
                }
              },
            );
          });
        } catch (err) {
          console.error("Job failed:", err);
        } finally {
          // --- Delete SQS ---
          const tDeleteStart = performance.now();
          await client.send(
            new DeleteMessageCommand({
              QueueUrl: QUEUE_URL,
              ReceiptHandle: msg.ReceiptHandle,
            }),
          );
          timings.deleteSQS = performance.now() - tDeleteStart;

          // --- Print timing breakdown ---
          const total =
            timings.receiveSQS +
            timings.redisFetch +
            timings.fsWrites +
            timings.dockerRun +
            timings.mongoUpdate +
            timings.deleteSQS;

          const fmt = (label, ms) =>
            `${label.padEnd(24)} ${ms.toFixed(0).padStart(5)} ms`;

          console.log("\n--- Timing Breakdown ---");
          console.log(fmt("Receive SQS:", timings.receiveSQS));
          console.log(fmt("Redis fetch:", timings.redisFetch));
          console.log(fmt("Filesystem writes:", timings.fsWrites));
          console.log(fmt("Docker total:", timings.dockerRun));
          console.log(fmt("  Compile:", compileTime));
          console.log(fmt("  Execution:", executionTime));
          console.log(fmt("  Overhead:", dockerOverhead));
          console.log(fmt("Mongo update:", timings.mongoUpdate));
          console.log(fmt("Delete SQS:", timings.deleteSQS));
          console.log(fmt("TOTAL:", total));
          console.log("------------------------\n");
        }
      }
    } catch (err) {
      console.error("Queue polling error:", err);
    }
  }
}

pollQueue();

//to simulate delay in c++
// this_thread::sleep_for(chrono::seconds(3));\n
