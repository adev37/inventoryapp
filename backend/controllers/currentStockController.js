import mongoose from "mongoose";
import Item from "../models/Item.js";
import StockLedger from "../models/StockLedger.js";
import Location from "../models/Location.js";

// Get full current stock (rack-aware)
export const getCurrentStock = async (req, res) => {
  try {
    const { item, warehouse } = req.query;
    const filter = {};
    if (item) filter.item = item;
    if (warehouse) filter.warehouse = warehouse;

    const ledgerEntries = await StockLedger.find(filter)
      .populate("item", "name modelNo companyName")
      .populate("warehouse", "name")
      .lean();

    const allLocations = await Location.find({}, "_id name").lean();
    const locationMap = Object.fromEntries(
      allLocations.map((loc) => [String(loc._id), loc.name])
    );

    const stockMap = {};
    for (const entry of ledgerEntries) {
      const itemObj = entry.item || {};
      const warehouseObj = entry.warehouse || {};
      const locationId = entry.location ? String(entry.location) : "null";

      const key = `${itemObj._id}|${warehouseObj._id}|${locationId}`;

      if (!stockMap[key]) {
        stockMap[key] = {
          itemId: itemObj._id,
          warehouseId: warehouseObj._id,
          locationId: locationId === "null" ? null : locationId,
          item: itemObj.name || "Unknown",
          modelNo: itemObj.modelNo || "-",
          companyName: itemObj.companyName || "Unknown",
          warehouse: warehouseObj.name || "Unknown",
          location: locationMap[locationId] || "—",
          quantity: 0,
        };
      }

      stockMap[key].quantity += entry.quantity;
    }

    const results = Object.values(stockMap).filter((s) => s.quantity !== 0);
    res.json(results);
  } catch (error) {
    console.error("❌ Error in getCurrentStock:", error);
    res.status(500).json({ message: "Failed to fetch current stock" });
  }
};

// Dashboard stats
export const getDashboardStats = async (req, res) => {
  try {
    const ledgerEntries = await StockLedger.find()
      .populate("item", "minStockAlert")
      .populate("warehouse", "name")
      .lean();

    const stockMap = {};

    for (const entry of ledgerEntries) {
      const item = entry.item;
      const warehouse = entry.warehouse;
      if (!item || !warehouse) continue;

      const key = `${item._id}_${warehouse._id}`;
      if (!stockMap[key]) {
        stockMap[key] = {
          quantity: 0,
          minStockAlert: item.minStockAlert || 5,
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

// 🔍 Specific quantity at item+warehouse+location
export const getStockByItemWarehouseRack = async (req, res) => {
  try {
    const { item, warehouse, location } = req.query;

    const matchStage = {
      item: new mongoose.Types.ObjectId(item),
      warehouse: new mongoose.Types.ObjectId(warehouse),
    };

    if (location === "null" || !location) {
      matchStage.location = { $in: [null, undefined] };
    } else {
      matchStage.location = new mongoose.Types.ObjectId(location);
    }

    const entries = await StockLedger.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          quantity: { $sum: "$quantity" },
        },
      },
    ]);

    const qty = entries.length > 0 ? entries[0].quantity : 0;
    res.json({ quantity: qty });
  } catch (error) {
    console.error("❌ Error in getStockByItemWarehouseRack:", error);
    res.status(500).json({ message: "Failed to fetch available stock" });
  }
};
