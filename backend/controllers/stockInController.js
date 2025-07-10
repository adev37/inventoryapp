import StockIn from "../models/StockIn.js";
import StockLedger from "../models/StockLedger.js";
import mongoose from "mongoose";

export const createStockIn = async (req, res) => {
  try {
    const { items, date, remarks } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "No items provided." });
    }

    const createdEntries = [];
    const ledgerEntries = [];

    for (const entry of items) {
      const { item, warehouse, quantity, location } = entry;
      if (!item || !warehouse || !quantity) continue;

      const locationId = mongoose.Types.ObjectId.isValid(location)
        ? new mongoose.Types.ObjectId(location)
        : null;

      const stockIn = await StockIn.create({
        item,
        warehouse,
        quantity,
        date,
        remarks,
        location: locationId,
      });

      createdEntries.push(stockIn);

      const ledger = await StockLedger.create({
        item,
        warehouse,
        quantity: Math.abs(quantity),
        action: "IN",
        type: "In",
        purpose: null,
        returned: null,
        returnDate: null,
        date,
        remarks,
        location: locationId,
      });

      ledgerEntries.push(ledger);
    }

    return res.status(201).json({
      message: "✅ Stock In recorded!",
      createdEntries,
      ledgerEntries,
    });
  } catch (error) {
    console.error("❌ Error in createStockIn:", error);
    return res.status(500).json({ message: error.message });
  }
};

// 📃 GET: All Stock In Records (with rack info)
export const getAllStockIns = async (req, res) => {
  try {
    const entries = await StockIn.find()
      .populate("item", "name modelNo")
      .populate("warehouse", "name")
      .populate("location", "name") // ✅ include rack name
      .sort({ date: -1 });

    res.json(entries);
  } catch (error) {
    console.error("❌ Error in getAllStockIns:", error);
    res.status(500).json({ message: "Failed to fetch stock in records" });
  }
};
