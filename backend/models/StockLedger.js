import mongoose from "mongoose";

const stockLedgerSchema = new mongoose.Schema(
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
      enum: ["IN", "OUT"], // IN = received, OUT = issued
      required: true,
    },
    type: {
      type: String,
      default: "Manual", // e.g., Manual, In, Out, Transfer In, Transfer Out
    },
    purpose: {
      type: String,
      enum: ["Sale", "Demo", "Demo Return", "Adjusted", "Transferred"],
    },
    remarks: {
      type: String,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    returnDate: {
      type: Date, // Only for Demo purposes
    },
    returned: {
      type: Boolean, // Only used for Demo returns
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StockLedger", // Links to another ledger entry (e.g., return)
    },
    stockInNo: {
      type: String,
      default: null,
      index: true,
    },
    stockOutNo: {
      type: String,
      default: null,
      index: true,
    },
    // ✅ NEW: Rack-level location support
    location: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      default: null,
    },
  },
  { timestamps: true }
);

// ✅ Prevent OverwriteModelError during development with hot reload
export default mongoose.models.StockLedger ||
  mongoose.model("StockLedger", stockLedgerSchema);
