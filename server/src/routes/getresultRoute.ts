/** @format */

import { Router } from "express";
import getresultController from "../controller/getresultController.js";

const router = Router();
router.get("/:subid", getresultController);

export default router;
