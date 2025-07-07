import StockLedger from "../models/StockLedger.js";
import Location from "../models/Location.js";

export const getStockLedger = async (req, res) => {
  try {
    // 🔍 Fetch all rack/location names once
    const locations = await Location.find({}, "_id name").lean();
    const locationMap = {};
    locations.forEach((loc) => {
      locationMap[loc._id.toString()] = loc.name;
    });

    // 📦 Fetch all stock ledger entries
    const ledger = await StockLedger.find()
      .populate("item", "name modelNo")
      .populate("warehouse", "name")
      .sort({ date: -1 });

    // 🧩 Attach human-readable location name
    const enhanced = ledger.map((entry) => {
      const obj = entry.toObject();
      return {
        ...obj,
        locationDisplay: locationMap[obj.location?.toString()] || "—",
      };
    });

    res.status(200).json(enhanced);
  } catch (error) {
    console.error("❌ Error in getStockLedger:", error);
    res.status(500).json({ message: "Failed to fetch stock ledger records" });
  }
};
