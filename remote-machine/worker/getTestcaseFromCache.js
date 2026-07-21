/** @format */

import zlib from "zlib";
import { promisify } from "util";
import redis from "./redis.js";
import { fetchFromS3 } from "./fetchFromS3.js";

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

export const getTestcaseFromCache = async (contestId, problemId) => {
  const cacheKey = `contest:${contestId}:problem:${problemId}:testcases`;

  try {
    const cached = await redis.get(cacheKey);
    // Only strings are our gzip+base64 format. Anything else (including a
    // stale pre-compression cache entry, which Upstash auto-deserializes
    // back into an object) is treated as a miss so it gets re-fetched and
    // re-written in the new format.
    if (typeof cached === "string") {
      const decompressed = await gunzip(Buffer.from(cached, "base64"));
      console.log("Cache hit");
      return JSON.parse(decompressed.toString("utf-8"));
    }
  } catch (redisError) {
    console.error(
      "Redis unavailable or cache entry unreadable, falling back to S3:",
      redisError,
    );
  }

  console.log("Cache miss — fetching from S3");
  const testCases = await fetchFromS3(contestId, problemId);

  try {
    const compressed = await gzip(Buffer.from(JSON.stringify(testCases)));
    await redis.set(cacheKey, compressed.toString("base64"), { ex: 86400 });
  } catch (redisError) {
    console.error("Could not cache result:", redisError);
  }

  return testCases;
};
