import mongoose from "mongoose";

const warehouseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

// 👇 Optional: prevent duplicate warehouse name-location combos
// warehouseSchema.index({ name: 1, location: 1 }, { unique: true });

const Warehouse = mongoose.model("Warehouse", warehouseSchema);
export default Warehouse;
