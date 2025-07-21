import mongoose from "mongoose";

const itemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    modelNo: { type: String, required: true, trim: true },
    companyName: { type: String, required: true, trim: true },
    minStockAlert: { type: Number, default: 5, min: 0 },
    description: { type: String, trim: true },
    category: { type: String, trim: true },
    unit: { type: String, trim: true }, // e.g., pcs, box, kg
  },
  { timestamps: true }
);

// 🚫 Prevent duplicate modelNo for same company
itemSchema.index({ modelNo: 1, companyName: 1 }, { unique: true });

export default mongoose.models.Item || mongoose.model("Item", itemSchema);
