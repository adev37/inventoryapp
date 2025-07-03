import mongoose from "mongoose";

const stockTransferSchema = new mongoose.Schema(
  {
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
    // ✅ Purpose for audit reference
    purpose: {
      type: String,
      default: "Transferred",
    },
  },
  { timestamps: true }
);

// ✅ Safe export (handles Vercel/Render hot reloads)
const StockTransfer =
  mongoose.models.StockTransfer ||
  mongoose.model("StockTransfer", stockTransferSchema);

export default StockTransfer;
