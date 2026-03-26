import mongoose from "mongoose";


const submissionSchema = new mongoose.Schema({
  submissionId: { type: Number, required: true, unique: true },
  status: { type: String, default: "pending" }, // pending, running, passed, failed
  output: String,
  error: String
}, { timestamps: true });

const Submission =  mongoose.model("Submission", submissionSchema);
export default Submission;