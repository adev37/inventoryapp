import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";

// Route imports
import itemRoutes from "./routes/itemRoutes.js";
import warehouseRoutes from "./routes/warehouseRoutes.js";
import stockInRoutes from "./routes/stockInRoutes.js";
import stockOutRoutes from "./routes/stockOutRoutes.js";
import stockLedgerRoutes from "./routes/stockLedgerRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import currentStockRoutes from "./routes/currentStockRoutes.js";
import demoReturnRoutes from "./routes/demoReturnRoutes.js";
import stockTransferRoutes from "./routes/stockTransferRoutes.js";
import stockAdjustmentRoutes from "./routes/stockAdjustmentRoutes.js";

dotenv.config();

const app = express();

app.use(cors()); // Consider origin restrictions for prod
app.use(express.json());

connectDB();

app.use("/api/auth", authRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/warehouses", warehouseRoutes);
app.use("/api/stock-in", stockInRoutes);
app.use("/api/stock-out", stockOutRoutes);
app.use("/api/stock-ledger", stockLedgerRoutes);
app.use("/api/current-stock", currentStockRoutes);
app.use("/api/demo-returns", demoReturnRoutes);
app.use("/api/stock-transfers", stockTransferRoutes);
app.use("/api/stock-adjustments", stockAdjustmentRoutes);

app.get("/", (req, res) => {
  res.send("Inventory Backend is running ✅");
});

// Optional: Catch-all for undefined routes
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Optional: Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: err.message || "Server Error" });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
