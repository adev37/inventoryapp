import StockIn from "../models/StockIn.js";
import StockLedger from "../models/StockLedger.js";
import Item from "../models/Item.js";
import Warehouse from "../models/Warehouse.js";
import Location from "../models/Location.js";
import mongoose from "mongoose";

// ✅ CREATE STOCK IN supporting both ObjectIds and Names
export const createStockIn = async (req, res) => {
  try {
    const { items, date, remarks } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "No items provided." });
    }

    // 🔍 Preload all names and their IDs to allow flexible lookup
    const allItems = await Item.find({}, "_id name").lean();
    const allWarehouses = await Warehouse.find({}, "_id name").lean();
    const allLocations = await Location.find({}, "_id name").lean();

    const itemMap = Object.fromEntries(
      allItems.map((i) => [i.name.trim(), i._id.toString()])
    );
    const warehouseMap = Object.fromEntries(
      allWarehouses.map((w) => [w.name.trim(), w._id.toString()])
    );
    const locationMap = Object.fromEntries(
      allLocations.map((l) => [l.name.trim(), l._id.toString()])
    );

    const resolveId = (input, map) => {
      if (!input) return null;
      if (mongoose.Types.ObjectId.isValid(input)) return input;
      return map[input.trim()] || null;
    };

    const createdEntries = [];
    const ledgerEntries = [];

    for (const entry of items) {
      const {
        item: itemInput,
        warehouse: warehouseInput,
        location: locationInput,
        quantity,
        date: entryDate,
        remarks: entryRemarks,
      } = entry;

      const itemId = resolveId(itemInput, itemMap);
      const warehouseId = resolveId(warehouseInput, warehouseMap);
      const locationId = resolveId(locationInput, locationMap);

      if (!itemId || !warehouseId || !quantity) {
        console.warn(
          "⚠️ Skipping entry due to missing or invalid fields:",
          entry
        );
        continue;
      }

      const stockIn = await StockIn.create({
        item: itemId,
        warehouse: warehouseId,
        quantity: Number(quantity),
        date: new Date(entryDate || date),
        remarks: entryRemarks || remarks || "",
        location: locationId,
      });

      createdEntries.push(stockIn);

      const ledger = await StockLedger.create({
        item: itemId,
        warehouse: warehouseId,
        quantity: Math.abs(quantity),
        action: "IN",
        type: "In",
        purpose: null,
        returned: null,
        returnDate: null,
        date: new Date(entryDate || date),
        remarks: entryRemarks || remarks || "",
        location: locationId,
      });

      ledgerEntries.push(ledger);
    }

    return res.status(201).json({
      message: "✅ Stock In recorded successfully!",
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
      .populate("item", "name modelNo companyName")
      .populate("warehouse", "name")
      .populate("location", "name")
      .sort({ date: -1 });

    res.json(entries);
  } catch (error) {
    console.error("❌ Error in getAllStockIns:", error);
    res.status(500).json({ message: "Failed to fetch stock in records" });
  }
};
