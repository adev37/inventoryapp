import express from "express";
import {
  createStockOut,
  getAllStockOuts,
  getPendingDemoReturns,
  getStockOutChallan,
} from "../controllers/stockOutController.js";

import verifyToken from "../middleware/verifyToken.js";

const router = express.Router();

// 🔒 Protect all routes with token middleware
router.use(verifyToken);

// ➖ POST: Create a Stock Out entry (Demo, Sale, etc.)
router.post("/", createStockOut);

// 📄 GET: All stock out entries
router.get("/", getAllStockOuts);

// 🔄 GET: Demo items with expected return dates (from StockOut model)
router.get("/demo-returns", getPendingDemoReturns);
router.get("/challan/:stockOutNo", getStockOutChallan);

export default router;
