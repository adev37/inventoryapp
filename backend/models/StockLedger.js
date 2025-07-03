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
      default: "Manual", // or "In", "Out", "Transfer In", "Transfer Out"
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
      type: Date, // Only for "Demo" purposes
    },
    returned: {
      type: Boolean, // Used for Demo returns
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StockLedger", // Links this entry to another ledger entry if needed
    },
    // --- Add these fields for tracking numbers! ---
    stockInNo: {
      type: String,
      default: null, // Only for IN (and Demo Return IN)
      index: true,
    },
    stockOutNo: {
      type: String,
      default: null, // Only for OUT (and Demo Return IN if you want traceability)
      index: true,
    },
  },
  { timestamps: true }
);

// ✅ Prevent OverwriteModelError in hot reload
export default mongoose.models.StockLedger ||
  mongoose.model("StockLedger", stockLedgerSchema);
