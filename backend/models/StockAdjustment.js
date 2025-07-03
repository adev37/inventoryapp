import mongoose from "mongoose";

const stockAdjustmentSchema = new mongoose.Schema(
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
    },
    action: {
      type: String,
      enum: ["IN", "OUT"],
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    purpose: {
      type: String,
      default: "Adjusted",
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.models.StockAdjustment ||
  mongoose.model("StockAdjustment", stockAdjustmentSchema);
