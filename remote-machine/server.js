/** @format */

import express from "express";
import bodyParser from "body-parser";

import dotenv from "dotenv";
import connectDB from "./worker/db.js";

dotenv.config();
const PORT = process.env.PORT || 8000;

const app = express();
app.use(bodyParser.json());

app.get("/health", (req, res) => {
  try {
    res.status(200).json({ message: "all working fine !!" });
  } catch (e) {
    res.status(500).json({ message: "Not reachable !!" });
  }
});

const startServer = (async () => {
  await connectDB();
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
})();
