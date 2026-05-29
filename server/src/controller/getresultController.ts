/** @format */

import type { Request, Response } from "express";
import Submission from "../models/Submissions.js";

export default async function getresultController(req: Request, res: Response) {
  console.log(
    "Inside getresultController with submission ID:",
    req.params.subid,
  );
  //fetch from mongoose
  let subId = Number(req.params.subid);
  if (!subId) {
    return res.status(400).json({ error: "Submission ID is required" });
  }

  try {
    const result = await Submission.findOne({ submissionId: subId });
    if (!result) {
      res.status(404).json({ error: "Submission not found" });
    }

    res
      .status(200)
      .json({ message: "getresult route is working fine", result: result });
  } catch (e) {
    console.error("Error in getresultController:", e);
    const errorMessage =
      e instanceof Error ? e.message : "An unknown error occurred.";
    res.status(500).json({ error: errorMessage });
  }
}
