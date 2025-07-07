import mongoose from "mongoose";

const stockInSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      required: true,
    },
    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, "Quantity must be at least 1"],
    },
    date: {
      type: Date,
      default: Date.now,
    },
    remarks: {
      type: String,
      default: "",
      trim: true,
    },
    stockInNo: {
      type: String,
      required: true,
      unique: true,
    },
    // ✅ NEW FIELD FOR RACK/LOCATION
    location: {
      type: String,
      trim: true,
      default: "", // Optional: you can require this if needed
    },
  },
  {
    timestamps: true,
  }
);

const StockIn = mongoose.model("StockIn", stockInSchema);
export default StockIn;
