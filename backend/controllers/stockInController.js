import StockIn from "../models/StockIn.js";
import StockLedger from "../models/StockLedger.js";
import getNextSequence from "../utils/getNextSequence.js";

// ➕ Create Stock In Entry (with auto-incremented stockInNo)
export const createStockIn = async (req, res) => {
  try {
    const { items, date, remarks } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "No items provided." });
    }

    // ✅ Use Counter model for consistent unique stockInNo
    let stockInNo;
    for (let attempt = 0; attempt < 3; attempt++) {
      const seq = await getNextSequence("stockIn");
      stockInNo = `SI-${String(seq).padStart(5, "0")}`;

      // Check if already exists (very rare)
      const existing = await StockIn.findOne({ stockInNo });
      if (!existing) break;

      if (attempt === 2) {
        return res
          .status(500)
          .json({ message: "Failed to generate unique stockInNo." });
      }
    }

    const createdEntries = [];
    const ledgerEntries = [];

    for (const entry of items) {
      const { item, warehouse, quantity, location } = entry;
      if (!item || !warehouse || !quantity) continue;

      // 1️⃣ Create StockIn entry
      const stockIn = await StockIn.create({
        item,
        warehouse,
        quantity,
        date,
        remarks,
        stockInNo,
        location,
      });
      createdEntries.push(stockIn);

      // 2️⃣ Reflect in StockLedger
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
        stockInNo,
        location,
      });
      ledgerEntries.push(ledger);
    }

    res.status(201).json({
      message: "Stock In recorded!",
      stockInNo,
      createdEntries,
      ledgerEntries,
    });
  } catch (error) {
    console.error("❌ Error in createStockIn:", error);
    res.status(500).json({ message: error.message });
  }
};

// 📃 Get All Stock In Records
export const getAllStockIns = async (req, res) => {
  try {
    const entries = await StockIn.find()
      .populate("item", "name modelNo")
      .populate("warehouse", "name")
      .sort({ date: -1 });

    res.json(entries);
  } catch (error) {
    console.error("❌ Error in getAllStockIns:", error);
    res.status(500).json({ message: "Failed to fetch stock in records" });
  }
};
