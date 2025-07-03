import StockTransfer from "../models/StockTransfer.js";
import StockLedger from "../models/StockLedger.js";

// ➕ Create Stock Transfer
export const createStockTransfer = async (req, res) => {
  try {
    const { item, quantity, fromWarehouse, toWarehouse, note } = req.body;

    if (fromWarehouse === toWarehouse) {
      return res.status(400).json({
        message: "Source and destination warehouses must differ.",
      });
    }

    // 🔍 Check available stock in source warehouse
    const ledgerEntries = await StockLedger.find({
      item,
      warehouse: fromWarehouse,
    });
    const available = ledgerEntries.reduce((sum, e) => sum + e.quantity, 0);

    if (available < quantity) {
      return res.status(400).json({
        message: `Insufficient stock. Available: ${available}`,
      });
    }

    const now = new Date();

    // 1️⃣ OUT entry in Stock Ledger
    await StockLedger.create({
      item,
      warehouse: fromWarehouse,
      quantity: -Math.abs(quantity),
      action: "OUT",
      type: "Transfer Out",
      purpose: "Transferred",
      remarks: note,
      date: now,
    });

    // 2️⃣ IN entry in Stock Ledger
    await StockLedger.create({
      item,
      warehouse: toWarehouse,
      quantity: Math.abs(quantity),
      action: "IN",
      type: "Transfer In",
      purpose: "Transferred",
      remarks: note,
      date: now,
    });

    // 3️⃣ Log Transfer
    const transfer = await StockTransfer.create({
      item,
      quantity,
      fromWarehouse,
      toWarehouse,
      note,
      transferDate: now,
    });

    res.status(201).json({
      message: "✅ Stock transferred successfully.",
      transfer,
    });
  } catch (error) {
    console.error("❌ Error in createStockTransfer:", error);
    res.status(500).json({ message: "Stock transfer failed" });
  }
};

// 📄 Get All Stock Transfers
export const getAllTransfers = async (req, res) => {
  try {
    const transfers = await StockTransfer.find()
      .populate("item", "name modelNo")
      .populate("fromWarehouse", "name")
      .populate("toWarehouse", "name")
      .sort({ createdAt: -1 });

    res.json(transfers);
  } catch (error) {
    console.error("❌ Error in getAllTransfers:", error);
    res.status(500).json({ message: "Failed to fetch transfers" });
  }
};
