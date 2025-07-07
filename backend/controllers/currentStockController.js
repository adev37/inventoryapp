import Item from "../models/Item.js";
import StockLedger from "../models/StockLedger.js";
import Location from "../models/Location.js";

// 📦 GET: Current Stock per item, warehouse & location (rack)
export const getCurrentStock = async (req, res) => {
  try {
    const { item, warehouse } = req.query;
    const filter = {};
    if (item) filter.item = item;
    if (warehouse) filter.warehouse = warehouse;

    const entries = await StockLedger.find(filter)
      .populate("item", "name modelNo companyName")
      .populate("warehouse", "name")
      .lean();

    const allLocations = await Location.find({}, "_id name").lean();
    const locationMap = {};
    for (const loc of allLocations) {
      locationMap[loc._id.toString()] = loc.name;
    }

    const stockMap = {}; // key = itemId-warehouseId-locationId (nullable)

    for (const entry of entries) {
      const itemObj = entry.item || {};
      const warehouseObj = entry.warehouse || {};
      const locationId = entry.location?.toString() || "null";

      const key = `${itemObj._id}-${warehouseObj._id}-${locationId}`;
      const locationName = locationMap[locationId] || "—";

      if (!stockMap[key]) {
        stockMap[key] = {
          itemId: itemObj._id,
          warehouseId: warehouseObj._id,
          locationId: locationId === "null" ? null : locationId, // ✅ ADDED to support frontend matching
          item: itemObj.name || "Unknown",
          modelNo: itemObj.modelNo || "-",
          companyName: itemObj.companyName || "Unknown",
          warehouse: warehouseObj.name || "Unknown",
          location: locationName,
          quantity: 0,
        };
      }

      stockMap[key].quantity += entry.quantity;
    }

    res.json(Object.values(stockMap));
  } catch (error) {
    console.error("❌ Error in getCurrentStock:", error);
    res.status(500).json({ message: "Failed to fetch current stock" });
  }
};

// 📊 GET: Dashboard Summary (Rack-agnostic logic remains unchanged)
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
