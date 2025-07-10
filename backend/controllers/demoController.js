import mongoose from "mongoose";
import StockLedger from "../models/StockLedger.js";

// 📦 GET: Pending Demo Returns (grouped without stockOutNo)
// ✅ Show only actual unreturned OUT entries (no grouping now)
export const getPendingDemoReturns = async (req, res) => {
  try {
    const raw = await StockLedger.find({
      action: "OUT",
      purpose: "Demo",
      returned: { $ne: true }, // Only NOT returned
    })
      .populate("item", "name modelNo")
      .populate("warehouse", "name")
      .populate("location", "name")
      .sort({ date: -1 });

    // Format and return each entry individually
    const formatted = raw.map((entry) => ({
      _id: entry._id,
      itemName: entry.item?.name || "-",
      modelNo: entry.item?.modelNo || "-",
      warehouse: entry.warehouse?.name || "-",
      location: entry.location?.name || "-",
      quantity: entry.quantity,
      date: entry.date,
    }));

    res.status(200).json(formatted);
  } catch (error) {
    console.error("❌ Error in getPendingDemoReturns:", error);
    res.status(500).json({ message: error.message });
  }
};

// 🔄 POST: Mark OUT entries as returned and create matching IN entries
export const returnDemoBatch = async (req, res) => {
  try {
    const id = req.params.id; // single StockLedger._id
    const outEntry = await StockLedger.findById(id);

    if (!outEntry || outEntry.returned || outEntry.action !== "OUT") {
      return res.status(400).json({ message: "Invalid or already returned." });
    }

    outEntry.returned = true;
    await outEntry.save();

    const inEntry = await StockLedger.create({
      item: outEntry.item,
      warehouse: outEntry.warehouse,
      location: outEntry.location,
      quantity: Math.abs(outEntry.quantity),
      action: "IN",
      type: "Return In",
      purpose: "Demo Return",
      remarks: "Returned from demo",
      date: new Date(),
      referenceId: outEntry._id,
    });

    res.status(200).json({
      message: "✅ Returned successfully.",
      inEntry,
    });
  } catch (error) {
    console.error("❌ Error in returnDemoBatch:", error);
    res.status(500).json({ message: error.message });
  }
};

// 📄 GET: All demo return IN entries (for completed list)
export const getAllDemoReturns = async (req, res) => {
  try {
    const demoReturns = await StockLedger.find({
      action: "IN",
      purpose: "Demo Return",
    })
      .populate("item", "name modelNo")
      .populate("warehouse", "name")
      .sort({ date: -1 });

    res.status(200).json(demoReturns);
  } catch (error) {
    console.error("❌ Error in getAllDemoReturns:", error);
    res.status(500).json({ message: error.message });
  }
};

// 📊 GET: Full grouped return report
export const getDemoReturnReport = async (req, res) => {
  try {
    const entries = await StockLedger.find({
      purpose: "Demo Return", // or use your custom filtering
      action: "IN",
    })
      .populate("item", "name modelNo") // ✅ Pull item name + model no
      .sort({ date: -1 });

    const grouped = entries.map((entry) => ({
      _id: entry._id,
      itemName: entry.item?.name || "-",
      modelNo: entry.item?.modelNo || "-",
      quantity: Math.abs(entry.quantity),
      returnedQty: Math.abs(entry.quantity),
      returnDate: entry.date,
      returnedOn: entry.date,
      returned: true,
    }));

    res.status(200).json(grouped);
  } catch (error) {
    console.error("❌ Error in getDemoReturnReport:", error);
    res.status(500).json({ message: error.message });
  }
};
