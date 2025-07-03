import express from "express";
import {
  getCurrentStock,
  getDashboardStats,
} from "../controllers/currentStockController.js";

import verifyToken from "../middleware/verifyToken.js";

const router = express.Router();

router.use(verifyToken); // 🔒 all routes below require token

router.get("/", getCurrentStock);
router.get("/summary", getDashboardStats); // ⬅️ dashboard stats

export default router;
