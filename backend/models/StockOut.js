// models/StockOut.js
import mongoose from "mongoose";

const stockOutSchema = new mongoose.Schema(
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
    location: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      default: null,
    },
    quantity: {
      type: Number,
      required: true,
    },
    purpose: {
      type: String,
      enum: ["Sale", "Demo"],
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    returnDate: {
      type: Date,
    },
    reason: {
      type: String,
      trim: true,
    },
    tenderNo: {
      type: String,
      trim: true,
    },
    returnProcessed: {
      type: Boolean,
      default: false,
    },

    // ❌ Removed stockOutNo completely
  },
  { timestamps: true }
);

export default mongoose.models.StockOut ||
  mongoose.model("StockOut", stockOutSchema);
