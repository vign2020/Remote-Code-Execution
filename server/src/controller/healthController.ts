import type { Request, Response } from "express";
export const healthController = (req: Request, res: Response) => {
  try {
    res.status(200).json({ message: "working fine !!" });
  } catch (e) {
    res.status(400).json({ message: "not working fine !!" });
  }
};
