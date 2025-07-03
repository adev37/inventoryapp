// controllers/currentStockController.js
import Item from "../models/Item.js";
import StockLedger from "../models/StockLedger.js";

// 📦 GET: Current Stock per item & warehouse
export const getCurrentStock = async (req, res) => {
  try {
    const entries = await StockLedger.find()
      .populate("item", "name modelNo companyName")
      .populate("warehouse", "name");

    const stockMap = {};

    for (const entry of entries) {
      const item = entry.item || {};
      const warehouse = entry.warehouse || {};
      const key = `${item._id}-${warehouse._id}`;

      if (!stockMap[key]) {
        stockMap[key] = {
          itemId: item._id,
          warehouseId: warehouse._id,
          item: item.name || "Unknown",
          modelNo: item.modelNo || "-",
          companyName: item.companyName || "Unknown",
          warehouse: warehouse.name || "Unknown",
          quantity: 0,
        };
      }

      stockMap[key].quantity += entry.quantity;
    }

    const result = Object.values(stockMap);
    res.json(result);
  } catch (error) {
    console.error("❌ Error in getCurrentStock:", error);
    res.status(500).json({ message: "Failed to fetch current stock" });
  }
};

// 📊 GET: Dashboard Summary
export const getDashboardStats = async (req, res) => {
  try {
    const ledgerEntries = await StockLedger.find()
      .populate({
        path: "item",
        select: "minStockAlert",
      })
      .populate("warehouse");

    const stockMap = {}; // key = itemId + warehouseId

    for (const entry of ledgerEntries) {
      const item = entry.item;
      const warehouse = entry.warehouse;
      if (!item || !warehouse) continue;

      const key = `${item._id}_${warehouse._id}`;

      if (!stockMap[key]) {
        stockMap[key] = {
          quantity: 0,
          minStockAlert: item.minStockAlert || 5, // default if not set
        };
      }

      stockMap[key].quantity += entry.quantity;
    }

    const totalItems = await Item.countDocuments();

    const totalStock = Object.values(stockMap).reduce(
      (sum, s) => sum + s.quantity,
      0
    );

    const lowStockItems = Object.values(stockMap).filter(
      (s) => s.quantity < s.minStockAlert
    ).length;

    res.json({
      totalItems,
      totalStock,
      lowStockItems,
    });
  } catch (error) {
    console.error("❌ Error in getDashboardStats:", error);
    res.status(500).json({ message: "Dashboard summary error" });
  }
};
