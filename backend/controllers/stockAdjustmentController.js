// controllers/stockAdjustmentController.js

import StockAdjustment from "../models/StockAdjustment.js";
import StockLedger from "../models/StockLedger.js";

// ➕ POST: Create a stock adjustment
export const createStockAdjustment = async (req, res) => {
  try {
    const { item, warehouse, quantity, action, reason, date } = req.body;

    // Create the stock adjustment entry
    const adjustment = await StockAdjustment.create({
      item,
      warehouse,
      quantity,
      action,
      reason,
      date,
    });

    // Add to Stock Ledger with forced "Adjusted" purpose
    await StockLedger.create({
      item,
      warehouse,
      quantity: action === "IN" ? Math.abs(quantity) : -Math.abs(quantity),
      action,
      type: "Adjustment",
      purpose: "Adjusted", // ✅ fixed purpose
      remarks: reason,
      date,
    });

    res.status(201).json({
      message: "✅ Stock adjustment recorded successfully.",
      adjustment,
    });
  } catch (error) {
    console.error("❌ Error in createStockAdjustment:", error);
    res.status(500).json({ message: "Stock adjustment failed." });
  }
};

// 📄 GET: All stock adjustments
export const getAllStockAdjustments = async (req, res) => {
  try {
    const adjustments = await StockAdjustment.find()
      .populate("item", "name modelNo")
      .populate("warehouse", "name")
      .sort({ date: -1 });

    res.json(adjustments);
  } catch (error) {
    console.error("❌ Error in getAllStockAdjustments:", error);
    res.status(500).json({ message: "Failed to fetch adjustments." });
  }
};
