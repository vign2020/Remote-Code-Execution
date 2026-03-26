import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();
const MONGO_URI = process.env.MONGO_URI;

async function connectDB() {
  try {
    await mongoose.connect('mongodb://vign2020_db_user:QPFKztmAvjGqBG00D@ac-nwvq1cp-shard-00-00.veuwryl.mongodb.net:27017,ac-nwvq1cp-shard-00-01.veuwryl.mongodb.net:27017,ac-nwvq1cp-shard-00-02.veuwryl.mongodb.net:27017/CodeCrunch?ssl=true&replicaSet=atlas-vlw7hl-shard-0&authSource=admin&appName=CodeCrunch-1');
    console.log("MongoDB connected");
  } catch (err) {
    console.error("DB connection error:", err);
    process.exit(1);
  }
}

export default connectDB;
