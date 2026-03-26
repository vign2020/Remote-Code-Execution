import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from "@aws-sdk/client-sqs";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

const AWS_REGION = process.env.AWS_REGION;
const QUEUE_URL = process.env.SQS_QUEUE_URL;


const client = new SQSClient({ region: AWS_REGION });


console.log('QUEUE is ' + QUEUE_URL)




async function pollQueue() {

  while (true) {
    try {

      const command = new ReceiveMessageCommand({
        QueueUrl: QUEUE_URL,
        MaxNumberOfMessages: 1,
        WaitTimeSeconds: 20,
        VisibilityTimeout: 120
      });

      const response = await client.send(command);

      if (!response.Messages) {
	console.log("No messages...");       
 	continue;
      }

      for (const msg of response.Messages) {

        try {

          const job = msg.Body ? JSON.parse(msg.Body) : null;

          const submissionDir = `/tmp/sub-${Date.now()}`;
          fs.mkdirSync(submissionDir, { recursive: true });

          const codePath = path.join(submissionDir, "main.cpp");
          fs.writeFileSync(codePath, job.code);
          console.log("Code written to file:", codePath  + " with content: " + job.code);
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

            exec(cmd, (error, stdout, stderr) => {
              console.log("STDOUT:", stdout);
              console.log("STDERR:", stderr);

              if (error) {
                console.log("Execution failed");
                reject(error);
              } else {
                console.log("Execution success");
                resolve(true);
              }
            });

          });

        } catch (err) {

          console.error("Job failed:", err);

        } finally {

          // delete message so old jobs don't repeat
          await client.send(new DeleteMessageCommand({
            QueueUrl: QUEUE_URL,
            ReceiptHandle: msg.ReceiptHandle
          }));

          console.log("Message deleted from queue");

        }

      }

    } catch (err) {
      console.error("Queue polling error:", err);
    }
  }
}

pollQueue();
