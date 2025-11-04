import express from "express";
import {
  getCurrentStock,
  getDashboardStats,
  getStockByItemWarehouseRack,
} from "../controllers/currentStockController.js";
import verifyToken from "../middleware/verifyToken.js";

const router = express.Router();
router.use(verifyToken);

router.get("/", getCurrentStock);
router.get("/summary", getDashboardStats);
router.get("/available-stock-by-location", getStockByItemWarehouseRack);

export default router;
