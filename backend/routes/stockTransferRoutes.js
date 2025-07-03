import express from "express";
import {
  createStockTransfer,
  getAllTransfers,
} from "../controllers/stockTransferController.js";
import verifyToken from "../middleware/verifyToken.js";

const router = express.Router();

// 🔒 Apply token verification to all transfer routes
router.use(verifyToken);

// ➕ Create a new stock transfer
router.post("/", createStockTransfer);

// 📄 Get all stock transfer records
router.get("/", getAllTransfers);

export default router;
