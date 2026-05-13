/** @format */

import { Router } from "express";
import { warmCache } from "../controller/warmCache.js";

const router = Router();
router.post("/warm-cache", warmCache);

export default router;
