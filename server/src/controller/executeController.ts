import type { Request, Response } from "express";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

const client = new SQSClient({ region: "ap-south-1" });
const QUEUE_URL = "https://sqs.ap-south-1.amazonaws.com/905418039311/rce-queue";

export const executeController = async (req: Request, res: Response) => {
  try {
    await client.send(
      new SendMessageCommand({
        QueueUrl: QUEUE_URL,
        MessageBody: JSON.stringify({
          submissionId: "sub123",
          problemId: "p1",
          language: "cpp",
        }),
      }),
    );

    console.log("Job sent!");
    res.status(200).json({ message: "item pushed to the queue!" });
  } catch (e) {
    console.log(e);
    res.status(400).json({ message: "not pushed !" });
  }
};
