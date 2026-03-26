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
import mongoose from "mongoose";
import Submission from "../models/Submission.js";
import connectDB from "../db.js";

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
          console.log(
            "Code written to file:",
            codePath + " with content: " + job,
          );
          fs.writeFileSync(codePath, job.code);

          await new Promise((resolve, reject) => {
            const cmd = `
docker run --rm \
-v ${submissionDir}:/code \
-v /home/ubuntu/contest-data/contest-${job.contestNo}/problem-${job.problemId}:/tests \
gcc:latest \
bash -c "
g++ /code/main.cpp -o /code/a.out || exit 1
for f in /tests/input/*.txt; do
  name=\\$(basename \\$f .txt)

  echo 'Running test:' \\$name

  /code/a.out < \\$f > /code/useroutput-\\$name.txt

  echo 'User Output:'
  cat /code/useroutput-\\$name.txt

  echo 'Expected Output:'
  cat /tests/output/\\$name.txt

  diff /code/useroutput-\\$name.txt /tests/output/\\$name.txt || exit 1
done
"
`;

            exec(cmd, async (error, stdout, stderr) => {
              console.log("STDOUT:", stdout);
              console.log("STDERR:", stderr);

              const result = {
                status: error ? "failed" : "passed",
                output: stdout,
                error: stderr,
              };

              try {
                console.log(
                  "Updating DB with result for submissionId:",
                  job.submissionId,
                );
                // if (mongoose.connection.readyState !== 1) {
                //   throw new Error("Database connection is not established.");
                // }
                await Submission.findOneAndUpdate(
                  { submissionId: job.submissionId },
                  result,
                  { new: true },
                );
                console.log("Result saved to DB");
              } catch (dbErr) {
                console.error("DB update failed:", dbErr);
              }
            });
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
