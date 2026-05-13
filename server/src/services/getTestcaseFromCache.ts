/** @format */

import redis from "../redis.js";
import { getFroms3 } from "./getFroms3.js";

export const getTestcaseFromCache = async (
  contestId: string,
  problemId: string,
) => {
  const cacheKey = `contest:${contestId}:problem:${problemId}:testcases`;

  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      console.log("Cache hit");
      return cached;
    }
  } catch (redisError) {
    console.error("Redis unavailable, falling back to S3:", redisError);
  }

  console.log("Cache miss — fetching from S3");
  const testCases = await getFroms3(contestId, problemId);

  try {
    await redis.set(cacheKey, testCases, { ex: 86400 });
  } catch (redisError) {
    console.error("Could not cache result:", redisError);
  }

  return testCases;
};
