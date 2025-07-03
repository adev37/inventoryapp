import express from "express";
import {
  getPendingDemoReturns,
  returnDemoBatch, // Make sure this is the batch return function!
  getAllDemoReturns,
  getDemoReturnReport,
} from "../controllers/demoController.js";
import verifyToken from "../middleware/verifyToken.js";

const router = express.Router();

router.use(verifyToken);

// 📦 GET: All pending demo returns (grouped by stockOutNo)
router.get("/", getPendingDemoReturns);

// 🔄 POST: Mark entire batch as returned (by Stock Out No)
router.post("/return-batch/:stockOutNo", returnDemoBatch);

// ✅ GET: All completed demo returns (all IN)
router.get("/completed", getAllDemoReturns);

// 📊 GET: Full demo return report (shows returned status per batch)
router.get("/report", getDemoReturnReport);

export default router;
