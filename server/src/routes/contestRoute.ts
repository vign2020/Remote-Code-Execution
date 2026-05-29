/** @format */

import { Router } from "express";
import { executeController } from "../controller/executeController.js";
import contestShowController from "../controller/contestShowController.js";

const router = Router();
router.post("/execute", executeController);
router.get("/:contestSlug/:problemSlug", contestShowController);

export default router;
