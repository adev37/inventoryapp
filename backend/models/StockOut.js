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
      type: Date, // Used only if purpose === "Demo"
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
    // 👇 Add this for unique Stock Out Number!
    stockOutNo: {
      type: String,
      required: true, // All new records should have it
      unique: true, // Prevent duplicates per out batch
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
  }
);

const StockOut = mongoose.model("StockOut", stockOutSchema);
export default StockOut;
