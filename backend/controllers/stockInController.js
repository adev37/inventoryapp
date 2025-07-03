import StockIn from "../models/StockIn.js";
import StockLedger from "../models/StockLedger.js";

// Helper: Generate next Stock In Number
async function generateNextStockInNo() {
  // Find latest by createdAt
  const latest = await StockIn.findOne({})
    .sort({ createdAt: -1 })
    .select("stockInNo")
    .lean();
  let next = 1;
  if (latest && latest.stockInNo) {
    const matches = latest.stockInNo.match(/\d+$/);
    if (matches) next = parseInt(matches[0], 10) + 1;
  }
  return `SI-${String(next).padStart(5, "0")}`;
}

// ➕ Create Stock In Entry (Batch version, with StockInNo)
export const createStockIn = async (req, res) => {
  try {
    const { items, date, remarks } = req.body; // items is an array: [{item, warehouse, quantity}]
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "No items provided." });
    }

    // Generate Stock In No. for the whole batch
    const stockInNo = await generateNextStockInNo();

    let createdEntries = [];
    let ledgerEntries = [];

    for (const entry of items) {
      const { item, warehouse, quantity } = entry;
      if (!item || !warehouse || !quantity) continue;

      // 1️⃣ Save entry in StockIn collection
      const stockIn = await StockIn.create({
        item,
        warehouse,
        quantity,
        date,
        remarks,
        stockInNo, // <-- Save Stock In Number!
      });
      createdEntries.push(stockIn);

      // 2️⃣ Reflect it in Stock Ledger
      const ledger = await StockLedger.create({
        item,
        warehouse,
        quantity: Math.abs(quantity), // Always positive
        action: "IN",
        type: "In",
        purpose: null,
        returned: null,
        returnDate: null,
        date,
        remarks,
        stockInNo, // <-- Save in Ledger too!
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
