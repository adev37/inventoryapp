import mongoose from "mongoose";

const stockTransferSchema = new mongoose.Schema(
  {
    transferNo: {
      type: String,
      required: true,
      unique: true, // ✅ Ensure uniqueness
    },
    fromWarehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
    },
    toWarehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
    },
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    transferDate: {
      type: Date,
      default: Date.now,
    },
    note: {
      type: String,
    },
    purpose: {
      type: String,
      default: "Transferred",
    },
    fromLocation: {
      type: String,
      trim: true,
      default: "",
    },
    toLocation: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

// ✅ Safe export
const StockTransfer =
  mongoose.models.StockTransfer ||
  mongoose.model("StockTransfer", stockTransferSchema);

export default StockTransfer;
