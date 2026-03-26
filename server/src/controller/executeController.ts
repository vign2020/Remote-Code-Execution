import type { Request, Response } from "express";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import Submission from "../models/Submissions.js";
import mongoose from "mongoose";

const client = new SQSClient({ region: "ap-south-1" });
const QUEUE_URL = "https://sqs.ap-south-1.amazonaws.com/905418039311/rce-queue";

export const executeController = async (req: Request, res: Response) => {
  const { language, code, problemId, contestNo } = req.body;
  const submissionId = Date.now(); // generate a unique submission id

  try {
    // Ensure MongoDB connection is ready
    if (mongoose.connection.readyState !== 1) {
      throw new Error("Database connection is not established.");
    }

    // Record the submission in the database with status as pending
    const newSubmission = new Submission({
      submissionId: submissionId,
      status: "pending",
    });

    await newSubmission.save();

    console.log("Submission recorded in DB with ID:", newSubmission);

    await client.send(
      new SendMessageCommand({
        QueueUrl: QUEUE_URL,
        MessageBody: JSON.stringify({
          submissionId: submissionId,
          problemId: problemId,
          language: language,
          code: code,
          contestNo: contestNo,
        }),
      })
    );

    console.log("Job sent!");
    res.status(200).json({ message: "Item pushed to the queue!" });
  } catch (e) {
    console.error("Error in executeController:", e);
    const errorMessage =
      e instanceof Error ? e.message : "An unknown error occurred.";
    res.status(500).json({ error: errorMessage });
  }
};
