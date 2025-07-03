import express from "express";
import {
  createItem,
  getAllItems,
  updateItem,
  deleteItem,
} from "../controllers/itemController.js";
import verifyToken from "../middleware/verifyToken.js";

const router = express.Router();

// 🔒 Protect all item routes
router.use(verifyToken);

// ✅ Routes
router.post("/", createItem); // ➕ Add new item
router.get("/", getAllItems); // 📥 Fetch all items
router.put("/:id", updateItem); // ✏️ Update specific item
router.delete("/:id", deleteItem); // ❌ Delete item

export default router;
