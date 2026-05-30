/** @format */

import mongoose from "mongoose";

import type { I_ContestData } from "../types.js";

const ContestDataSchema = new mongoose.Schema<I_ContestData>({
  contest_name: { type: String, required: true },
  contest_id: { type: String, required: true },
  problem_name: { type: String, required: true },
  problem_id: { type: String, required: true },
  problem_title: { type: String, required: true },
  problem_desc: { type: String, required: true },
  sample_input: { type: String, required: true },
  sample_output: { type: String, required: true },
  array_size: { type: String, required: true },
});

ContestDataSchema.index({ contest_id: 1, problem_id: 1 }, { unique: true });

const ContestData = mongoose.model<I_ContestData>(
  "ContestData",
  ContestDataSchema,
);
export default ContestData;
