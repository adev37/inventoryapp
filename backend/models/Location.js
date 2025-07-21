import mongoose from "mongoose";

const locationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// 🚫 Prevent duplicate rack name within the same warehouse
locationSchema.index({ name: 1, warehouse: 1 }, { unique: true });

export default mongoose.models.Location ||
  mongoose.model("Location", locationSchema);
