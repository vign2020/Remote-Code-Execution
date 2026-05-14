/** @format */

import redis from "./redis.js";
import {
  S3Client,
  GetObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";

const s3 = new S3Client({ region: process.env.AWS_REGION });
const BUCKET_NAME = process.env.S3_BUCKET_NAME;

export const fetchFromS3 = async (contestId, problemId) => {
  const inputs = [];
  const outputs = [];

  const inputList = await s3.send(
    new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: `testcases/contest-${contestId}/problem-${problemId}/input/`,
    }),
  );

  for (const file of inputList.Contents) {
    const obj = await s3.send(
      new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: file.Key,
      }),
    );
    const content = await obj.Body.transformToString();
    inputs.push({ name: file.Key.split("/").pop(), content });
  }

  const outputList = await s3.send(
    new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: `testcases/contest-${contestId}/problem-${problemId}/output/`,
    }),
  );

  for (const file of outputList.Contents) {
    const obj = await s3.send(
      new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: file.Key,
      }),
    );
    const content = await obj.Body.transformToString();
    outputs.push({ name: file.Key.split("/").pop(), content });
  }

  return { inputs, outputs };
};
