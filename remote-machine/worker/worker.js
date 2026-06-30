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
      const command = new ReceiveMessageCommand({
        QueueUrl: QUEUE_URL,
        MaxNumberOfMessages: 1,
        WaitTimeSeconds: 20,
        VisibilityTimeout: 120,
      });

      const response = await client.send(command);

      if (!response.Messages) {
        console.log("No messages...");
        continue;
      }

      for (const msg of response.Messages) {
        try {
          const job = JSON.parse(msg.Body);
          const submissionDir = `/tmp/sub-${Date.now()}`;
          fs.mkdirSync(submissionDir, { recursive: true });
          const codePath = path.join(submissionDir, "main.cpp");
          console.log("Code written to file:", codePath);
          fs.writeFileSync(codePath, job.code);

          //fetching the testcases from cache
          const testCases = await getTestcaseFromCache(
            job.contestNo,
            job.problemId,
          );

          //inserting the testcases into submissionsDir/
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
g++ /code/main.cpp -o /code/a.out 2>/code/compile_error.txt
if [ \\$? -ne 0 ]; then
  echo '__COMPILE_ERROR__'
  cat /code/compile_error.txt
  exit 100
fi

tc=1
for f in /code/input/*.txt; do
  name=\\$(basename \\$f .txt)
  timeout 15 /code/a.out < \\$f > /code/useroutput-\\$name.txt 2>/code/runtime_error.txt
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
                console.log("STDOUT:", stdout);
                console.log("STDERR:", stderr);

                let status = "error";
                let errorMsg = "";
                let output = stdout;

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

                const result = {
                  status,
                  output,
                  error: errorMsg,
                };

                try {
                  await Submission.findOneAndUpdate(
                    { submissionId: job.submissionId },
                    result,
                    { new: true },
                  );
                  resolve();
                } catch (dbErr) {
                  reject(dbErr);
                }
              },
            );
          });
        } catch (err) {
          console.error("Job failed:", err);
        } finally {
          // delete message so old jobs don't repeat
          await client.send(
            new DeleteMessageCommand({
              QueueUrl: QUEUE_URL,
              ReceiptHandle: msg.ReceiptHandle,
            }),
          );

          console.log("Message deleted from queue");
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
