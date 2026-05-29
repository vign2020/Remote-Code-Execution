/** @format */
import type { Request, Response } from "express";
import ContestData from "../models/ContestData.js";

export default async function contestShowController(
  req: Request,
  res: Response,
) {
  const { contestSlug, problemSlug } = req.params;

  console.log(
    "Received request for contest:",
    contestSlug,
    "problem:",
    problemSlug,
  );

  if (!contestSlug || !problemSlug) {
    return res
      .status(400)
      .json({ message: "Sorry! This page does not exist :(" });
  }
  //fetch the respective contest details from the database and send it as response
  const contestData = await ContestData.findOne({
    contest_name: contestSlug,
    problem_name: problemSlug,
  });
  console.log("Fetched contest data:", contestData);
  if (!contestData) {
    return res.status(404).json({ message: "Contest not found" });
  }

  res
    .status(200)
    .json({ message: "Contest Show Controller", contestdata: contestData });
}
