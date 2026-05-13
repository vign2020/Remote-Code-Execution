/** @format */

import {
  S3Client,
  GetObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import "dotenv/config";

const AWS_REGION = process.env.AWS_REGION as string;
const s3 = new S3Client({ region: AWS_REGION });

const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME as string;

export const getFroms3 = async (contestId: string, problemId: string) => {
  // Simulate cache warming by performing some dummy operations
  const inputs = [];
  const outputs = [];

  const inputList = await s3.send(
    new ListObjectsV2Command({
      Bucket: S3_BUCKET_NAME,
      Prefix: `testcases/contest-${contestId}/problem-${problemId}/input/`,
    }),
  );

  if (!inputList.Contents || inputList.Contents.length === 0) {
    throw new Error(
      `No input files found for contest ${contestId} problem ${problemId}`,
    );
  }

  for (const file of inputList.Contents) {
    if (!file.Key) throw new Error("File is not found.");
    const obj = await s3.send(
      new GetObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: file.Key,
      }),
    );
    if (!obj.Body) {
      throw new Error(`Failed to retrieve content for file ${file.Key}`);
    }
    const content = await obj.Body.transformToString();
    inputs.push({ name: file.Key.split("/").pop(), content });
  }

  const outputList = await s3.send(
    new ListObjectsV2Command({
      Bucket: S3_BUCKET_NAME,
      Prefix: `testcases/contest-${contestId}/problem-${problemId}/output/`,
    }),
  );

  if (!outputList.Contents || outputList.Contents.length === 0) {
    throw new Error(
      `No output files found for contest ${contestId} problem ${problemId}`,
    );
  }

  for (const file of outputList.Contents) {
    if (!file.Key) throw new Error("File is not found.");
    const obj = await s3.send(
      new GetObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: file.Key,
      }),
    );

    if (!obj.Body) {
      throw new Error(`Failed to retrieve content for file ${file.Key}`);
    }

    const content = await obj.Body.transformToString();
    outputs.push({ name: file.Key.split("/").pop(), content });
  }

  return { inputs, outputs };
};
