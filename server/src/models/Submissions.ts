import mongoose from "mongoose";
import type { I_Submission } from "../types.js";

const submissionSchema = new mongoose.Schema<I_Submission>({
  submissionId: { type: Number, required: true, unique: true },
  status: { type: String, default: "pending" }, // pending, running, passed, failed
  output: String,
  error: String
}, { timestamps: true });

const Submission =  mongoose.model<I_Submission>("Submission", submissionSchema);
export default Submission;