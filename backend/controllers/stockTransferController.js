import mongoose from "mongoose";
import StockTransfer from "../models/StockTransfer.js";
import StockLedger from "../models/StockLedger.js";
import Location from "../models/Location.js";
import Item from "../models/Item.js";

// ➕ Create Stock Transfer without sequence
export const createStockTransfer = async (req, res) => {
  try {
    const {
      item,
      quantity,
      fromWarehouse,
      toWarehouse,
      note,
      fromLocation,
      toLocation,
    } = req.body;

    // 🛑 Prevent transfer to same place (rack-aware)
    if (
      fromWarehouse === toWarehouse &&
      (fromLocation || "") === (toLocation || "")
    ) {
      return res
        .status(400)
        .json({ message: "Source and destination must differ." });
    }

    const now = new Date();

    // 🧐 Sanitize ObjectIds
    const fromLocationId = mongoose.Types.ObjectId.isValid(fromLocation)
      ? new mongoose.Types.ObjectId(fromLocation)
      : null;
    const toLocationId = mongoose.Types.ObjectId.isValid(toLocation)
      ? new mongoose.Types.ObjectId(toLocation)
      : null;

    // 🔹 Load all relevant ledger entries
    const ledgerEntries = await StockLedger.find({ item }).lean();

    // 🔹 Build stockMap (correct key formatting)
    const stockMap = {};
    for (const entry of ledgerEntries) {
      const key = `${entry.item}-${entry.warehouse}-${
        entry.location ? entry.location.toString() : "null"
      }`;
      if (!stockMap[key]) stockMap[key] = 0;
      stockMap[key] += entry.quantity;
    }

    const key = `${item}-${fromWarehouse}-${
      fromLocationId ? fromLocationId.toString() : "null"
    }`;
    const availableQty = stockMap[key] || 0;

    if (availableQty < quantity) {
      return res
        .status(400)
        .json({ message: `Insufficient stock. Available: ${availableQty}` });
    }

    // 🆔 Use timestamp-based ID instead of sequence
    const transferNo = `TR-${Date.now()}`;

    // 📄 Ledger OUT
    await StockLedger.create({
      item,
      warehouse: fromWarehouse,
      location: fromLocationId,
      quantity: -Math.abs(quantity),
      action: "OUT",
      type: "Transfer Out",
      purpose: "Transferred",
      remarks: note,
      date: now,
      stockTransferNo: transferNo,
    });

    // 📅 Ledger IN
    await StockLedger.create({
      item,
      warehouse: toWarehouse,
      location: toLocationId,
      quantity: Math.abs(quantity),
      action: "IN",
      type: "Transfer In",
      purpose: "Transferred",
      remarks: note,
      date: now,
      stockTransferNo: transferNo,
    });

    // 📂 Save StockTransfer record
    const transfer = await StockTransfer.create({
      item,
      quantity,
      fromWarehouse,
      toWarehouse,
      note,
      transferDate: now,
      fromLocation: fromLocationId,
      toLocation: toLocationId,
      transferNo,
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

// 📦 Fetch available quantity for item+warehouse+location
export const fetchAvailableQty = async (req, res) => {
  try {
    const { item, warehouse, location } = req.query;

    if (!item || !warehouse || !location) {
      return res
        .status(400)
        .json({ message: "Missing item, warehouse or location." });
    }

    const locationId = mongoose.Types.ObjectId.isValid(location)
      ? new mongoose.Types.ObjectId(location)
      : location;

    const stockEntries = await StockLedger.find({
      item,
      warehouse,
      location: locationId,
    });

    const availableQty = stockEntries.reduce(
      (sum, entry) => sum + entry.quantity,
      0
    );

    res.status(200).json({ quantity: availableQty });
  } catch (error) {
    console.error("❌ Error in fetchAvailableQty:", error);
    res.status(500).json({ message: "Failed to fetch available quantity" });
  }
};

// 📄 Get all transfers with rack/location names
export const getAllTransfers = async (req, res) => {
  try {
    const transfers = await StockTransfer.find()
      .populate("item", "name modelNo")
      .populate("fromWarehouse", "name")
      .populate("toWarehouse", "name")
      .sort({ createdAt: -1 })
      .lean();

    const locationIds = Array.from(
      new Set(
        transfers.flatMap((t) => [t.fromLocation, t.toLocation]).filter(Boolean)
      )
    );

    const locations = await Location.find({ _id: { $in: locationIds } });
    const locationMap = {};
    locations.forEach((loc) => {
      locationMap[loc._id.toString()] = loc.name;
    });

    const enriched = transfers.map((t) => ({
      ...t,
      fromLocationName: locationMap[t.fromLocation?.toString()] || "",
      toLocationName: locationMap[t.toLocation?.toString()] || "",
    }));

    res.json(enriched);
  } catch (error) {
    console.error("❌ Error in getAllTransfers:", error);
    res.status(500).json({ message: "Failed to fetch transfers" });
  }
};

// ✅ Get available items for transfer with rack awareness
export const getAvailableTransferItems = async (req, res) => {
  try {
    const ledgerEntries = await StockLedger.find().lean();

    const stockMap = {}; // key = item-warehouse-location
    for (const entry of ledgerEntries) {
      if (!entry.item || !entry.warehouse) continue;

      const locKey = entry.location ? entry.location.toString() : "null";
      const key = `${entry.item}-${entry.warehouse}-${locKey}`;

      if (!stockMap[key]) {
        stockMap[key] = {
          item: entry.item,
          warehouse: entry.warehouse,
          location: entry.location || null,
          quantity: 0,
        };
      }

      stockMap[key].quantity += entry.quantity;
    }

    const validEntries = Object.values(stockMap).filter((e) => e.quantity > 0);

    const itemIds = [...new Set(validEntries.map((e) => e.item.toString()))];
    const items = await Item.find(
      { _id: { $in: itemIds } },
      "name modelNo"
    ).lean();
    const itemMap = {};
    items.forEach((i) => (itemMap[i._id.toString()] = i));

    const locationIds = [
      ...new Set(validEntries.map((e) => e.location).filter(Boolean)),
    ];
    const locations = await Location.find(
      { _id: { $in: locationIds } },
      "name"
    ).lean();
    const locationMap = {};
    locations.forEach((l) => (locationMap[l._id.toString()] = l.name));

    const results = validEntries.map((entry) => ({
      itemId: entry.item,
      warehouseId: entry.warehouse,
      locationId: entry.location,
      quantity: entry.quantity,
      itemName: itemMap[entry.item.toString()]?.name || "",
      modelNo: itemMap[entry.item.toString()]?.modelNo || "",
      locationName: entry.location
        ? locationMap[entry.location.toString()] || ""
        : "",
    }));

    res.json(results);
  } catch (error) {
    console.error("❌ Error in getAvailableTransferItems:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch available transfer items" });
  }
};
