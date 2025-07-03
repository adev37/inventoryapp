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
    // 🔥 Add this field:
    stockInNo: {
      type: String,
      required: true, // All new records should have it
      unique: true, // Optional: batch numbers should be unique
    },
  },
  {
    timestamps: true,
  }
);

const StockIn = mongoose.model("StockIn", stockInSchema);
export default StockIn;
