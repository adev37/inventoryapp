import StockLedger from "../models/StockLedger.js";

// 📒 GET: Full Stock Ledger (All In/Out/Transfer history)
export const getStockLedger = async (req, res) => {
  try {
    const ledger = await StockLedger.find()
      .populate("item", "name modelNo") // Include item name & model number
      .populate("warehouse", "name") // Include warehouse name
      .sort({ date: -1 }); // Sort by date descending (latest first)

    res.status(200).json(ledger);
  } catch (error) {
    console.error("❌ Error in getStockLedger:", error);
    res.status(500).json({ message: "Failed to fetch stock ledger records" });
  }
};
