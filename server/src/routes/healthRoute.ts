import { Router } from "express";
import { executeController } from "../controller/executeController.js";
import { healthController } from "../controller/healthController.js";

const router = Router();
router.get("/health", healthController);
router.post("/:id", executeController);

export default router;
