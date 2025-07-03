import StockLedger from "../models/StockLedger.js";

// 📦 GET: Pending Demo Returns (grouped by Stock Out No)
export const getPendingDemoReturns = async (req, res) => {
  try {
    // Get all "OUT" demo entries not yet returned
    const raw = await StockLedger.find({
      action: "OUT",
      purpose: "Demo",
      returned: { $ne: true },
    })
      .populate("item", "name modelNo")
      .populate("warehouse", "name")
      .sort({ date: -1 });

    // Group by stockOutNo
    const grouped = {};
    for (const entry of raw) {
      const key = entry.stockOutNo || "NO_NUMBER";
      if (!grouped[key]) {
        grouped[key] = {
          _id: entry._id, // just use first entry as key for UI
          stockOutNo: entry.stockOutNo,
          date: entry.date,
          returnDate: entry.returnDate,
          totalQuantity: 0,
        };
      }
      grouped[key].totalQuantity += entry.quantity;
    }

    const result = Object.values(grouped);
    res.status(200).json(result);
  } catch (error) {
    console.error("❌ Error in getPendingDemoReturns (grouped):", error);
    res.status(500).json({ message: error.message });
  }
};

// 🔄 POST: Mark ALL OUT entries in the batch as returned and log IN entries
// POST /demo-returns/return/:stockOutNo
export const returnDemoBatch = async (req, res) => {
  try {
    const stockOutNo = req.params.stockOutNo;

    // Find all OUT entries for this batch not yet returned
    const outEntries = await StockLedger.find({
      stockOutNo,
      action: "OUT",
      purpose: "Demo",
      returned: { $ne: true },
    });

    if (outEntries.length === 0) {
      return res
        .status(404)
        .json({ message: "No pending demo returns for this batch." });
    }

    // Mark all as returned and create IN return entries
    const inEntries = [];
    for (const out of outEntries) {
      out.returned = true;
      await out.save();

      // Create matching IN entry (Demo Return)
      const returned = await StockLedger.create({
        item: out.item,
        warehouse: out.warehouse,
        quantity: Math.abs(out.quantity),
        action: "IN",
        type: "Return In",
        purpose: "Demo Return",
        remarks: "Returned from demo",
        date: new Date(),
        referenceId: out._id,
        stockOutNo: out.stockOutNo,
      });
      inEntries.push(returned);
    }

    res.status(200).json({
      message: "Batch marked as returned!",
      count: outEntries.length,
      inEntries,
    });
  } catch (error) {
    console.error("❌ Error in returnDemoBatch:", error);
    res.status(500).json({ message: error.message });
  }
};

// 📄 GET: All completed demo returns
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

// 📊 GET: Full demo return report (GROUPED by stockOutNo, one row per batch)
export const getDemoReturnReport = async (req, res) => {
  try {
    // OUT: all demo issues (grouped)
    const outEntries = await StockLedger.find({
      action: "OUT",
      purpose: "Demo",
    })
      .sort({ date: -1 })
      .lean();

    // IN: all demo returns
    const inEntries = await StockLedger.find({
      action: "IN",
      purpose: "Demo Return",
    }).lean();

    // Group OUT
    const groupMap = {};
    for (const entry of outEntries) {
      const soNo = entry.stockOutNo || "-";
      if (!groupMap[soNo]) {
        groupMap[soNo] = {
          _id: entry._id,
          stockOutNo: soNo,
          quantity: 0,
          returnedQty: 0,
          returnDate: entry.returnDate || "-",
          returnedOn: null,
          returned: false,
        };
      }
      groupMap[soNo].quantity += Math.abs(entry.quantity);
    }

    // Add up returnedQty for each batch
    for (const ret of inEntries) {
      const soNo = ret.stockOutNo || "-";
      if (groupMap[soNo]) {
        groupMap[soNo].returnedQty += Math.abs(ret.quantity);
        // Always keep the latest returnedOn date
        if (
          !groupMap[soNo].returnedOn ||
          new Date(ret.date) > new Date(groupMap[soNo].returnedOn)
        ) {
          groupMap[soNo].returnedOn = ret.date;
        }
      }
    }

    // Mark as returned only if all qty is returned
    for (const soNo in groupMap) {
      const group = groupMap[soNo];
      group.returned = group.returnedQty >= group.quantity;
    }

    res.json(Object.values(groupMap));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
