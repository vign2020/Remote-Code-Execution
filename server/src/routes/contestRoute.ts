import { Router } from "express";
import { executeController } from "../controller/executeController.js";

const router = Router();
router.post("/", executeController);

export default router;
