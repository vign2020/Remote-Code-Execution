/** @format */

import { Redis } from "@upstash/redis";
import dotenv from "dotenv";
dotenv.config();

const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// console.log("Redis URL:", UPSTASH_REDIS_REST_URL);
// console.log("Redis Token:", UPSTASH_REDIS_REST_TOKEN);

const redis = new Redis({
  url: UPSTASH_REDIS_REST_URL,
  token: UPSTASH_REDIS_REST_TOKEN,
});
console.log("Connected to Redis...");

export default redis;
