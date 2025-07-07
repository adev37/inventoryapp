import mongoose from "mongoose";
import StockTransfer from "../models/StockTransfer.js";
import StockLedger from "../models/StockLedger.js";
import Location from "../models/Location.js";
import getNextSequence from "../utils/getNextSequence.js";

// ➕ Create Stock Transfer with auto-incremented transferNo
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

    if (fromWarehouse === toWarehouse && fromLocation === toLocation) {
      return res
        .status(400)
        .json({ message: "Source and destination must differ." });
    }

    const now = new Date();
    const fromLocationId = mongoose.Types.ObjectId.isValid(fromLocation)
      ? new mongoose.Types.ObjectId(fromLocation)
      : null;
    const toLocationId = mongoose.Types.ObjectId.isValid(toLocation)
      ? new mongoose.Types.ObjectId(toLocation)
      : null;

    const stock = await StockLedger.find({
      item,
      warehouse: fromWarehouse,
      ...(fromLocationId && { location: fromLocationId }),
    });

    const available = stock.reduce((sum, e) => sum + e.quantity, 0);
    if (available < quantity) {
      return res
        .status(400)
        .json({ message: `Insufficient stock. Available: ${available}` });
    }

    const seq = await getNextSequence("stockTransfer");
    const transferNo = `TR-${String(seq).padStart(5, "0")}`;

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

// ✅ Get all transfers with rack/location names
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

// 📦 Fetch available quantity (used in frontend dropdown onchange)
export const fetchAvailableQty = async (req, res) => {
  try {
    const { item, warehouse, location } = req.query;

    if (!item || !warehouse) {
      return res.status(400).json({ message: "Missing parameters." });
    }

    const locationId = mongoose.Types.ObjectId.isValid(location)
      ? new mongoose.Types.ObjectId(location)
      : null;

    const ledger = await StockLedger.find({
      item,
      warehouse,
      ...(locationId && { location: locationId }),
    });

    const quantity = ledger.reduce((sum, l) => sum + l.quantity, 0);

    res.status(200).json({ quantity });
  } catch (error) {
    console.error("❌ Error in fetchAvailableQty:", error);
    res.status(500).json({ message: "Failed to fetch available quantity" });
  }
};
