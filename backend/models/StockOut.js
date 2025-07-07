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
    },
    tenderNo: {
      type: String,
    },
    returnProcessed: {
      type: Boolean,
      default: false,
    },
    stockOutNo: {
      type: String,
      required: true,
      unique: true, // ✅ Only this is needed
    },
    location: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// ❌ REMOVE this — already declared via field options
// stockOutSchema.index({ stockOutNo: 1 }, { unique: true });

const StockOut = mongoose.model("StockOut", stockOutSchema);
export default StockOut;
