import express from "express";
import {
  createStockIn,
  getAllStockIns,
} from "../controllers/stockInController.js";
import verifyToken from "../middleware/verifyToken.js";

const router = express.Router();

// 🔒 All routes below require valid JWT
router.use(verifyToken);

// ➕ Create Stock In Entry
router.post("/", createStockIn);

// 📃 Get All Stock In Entries
router.get("/", getAllStockIns);

export default router;
