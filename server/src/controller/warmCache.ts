/** @format */

import {
  S3Client,
  GetObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import "dotenv/config";
import type { Request, Response } from "express";
import { getFroms3 } from "../services/getFroms3.js";
import { getTestcaseFromCache } from "../services/getTestcaseFromCache.js";

const AWS_REGION = process.env.AWS_REGION as string;
const s3 = new S3Client({ region: AWS_REGION });

export const warmCache = async (req: Request, res: Response) => {
  const { contestId, problemId } = req.body;

  //get from s3
  const result = await getTestcaseFromCache(contestId, problemId);

  res.send({
    message: "Cache warmed successfully",
    result: result,
  });
  //insert into redis
};
