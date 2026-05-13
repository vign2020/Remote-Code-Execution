/** @format */
import type { Request, Response } from "express";

export default function contestShowController(req: Request, res: Response) {
  res.status(200).json({ message: "Contest Show Controller" });
}
