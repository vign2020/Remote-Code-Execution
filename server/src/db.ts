import mongoose from "mongoose";

const MONGO_URI = process.env.MONGO_URI as string;

async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("MongoDB connected");
  } catch (err) {
    console.error("DB connection error:", err);
    process.exit(1);
  }
}

export  default connectDB;
