/** @format */

import { Router } from "express";
import { executeController } from "../controller/executeController.js";

const router = Router();
router.post("/execute", executeController);
router.get("/:id", executeController);

export default router;
