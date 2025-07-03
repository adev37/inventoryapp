import StockOut from "../models/StockOut.js";
import StockLedger from "../models/StockLedger.js";
import { PDFDocument, rgb } from "pdf-lib";

// Draw table cell utility (unchanged)
function drawCell(page, text, x, y, width, height, fontSize, align = "left") {
  page.drawRectangle({
    x,
    y: y - height,
    width,
    height,
    borderColor: rgb(0.2, 0.2, 0.2),
    borderWidth: 0.7,
  });
  let tx = x + 4;
  if (align === "center" && text) {
    tx = x + width / 2 - (text.length * fontSize * 0.28) / 2;
  }
  page.drawText(text || "", { x: tx, y: y - height + 8, size: fontSize });
}

export const getStockOutChallan = async (req, res) => {
  try {
    const { stockOutNo } = req.params;
    const outEntries = await StockOut.find({ stockOutNo })
      .populate("item", "name modelNo")
      .populate("warehouse", "name");
    if (!outEntries || outEntries.length === 0) {
      return res.status(404).json({ message: "Challan not found." });
    }

    const { date } = outEntries[0];
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);

    // Table setup
    const cols = [
      { title: "Sr. No.", width: 60 },
      { title: "Item Name", width: 350 },
      { title: "Quantity", width: 100 },
    ];
    const rowHeight = 28;
    const tableX = 50;
    let y = 740;

    // Title
    page.drawText("CHALLAN", {
      x: 245,
      y: 800,
      size: 22,
      color: rgb(0, 0, 0),
    });

    // Top info: Challan No (left) & Date (right at table edge)
    page.drawText(`Challan No: ${stockOutNo}`, {
      x: tableX,
      y: 775,
      size: 12,
    });

    // Calculate right edge of table for date
    const tableWidth = cols.reduce((a, c) => a + c.width, 0);
    const dateString = `Date: ${date?.toISOString().split("T")[0] || "-"}`;
    const dateFontSize = 12;
    const dateTextWidth = dateString.length * dateFontSize * 0.6;
    // Align right edge of date text with table
    page.drawText(dateString, {
      x: tableX + tableWidth - dateTextWidth,
      y: 775,
      size: dateFontSize,
    });

    // Table headers
    let cx = tableX;
    cols.forEach((col) => {
      drawCell(page, col.title, cx, y, col.width, rowHeight, 13, "center");
      cx += col.width;
    });
    y -= rowHeight;

    // Table rows
    outEntries.forEach((entry, idx) => {
      let cx = tableX;
      drawCell(
        page,
        `${idx + 1}`,
        cx,
        y,
        cols[0].width,
        rowHeight,
        12,
        "center"
      );
      cx += cols[0].width;
      drawCell(
        page,
        `${entry.item?.name || ""} (${entry.item?.modelNo || ""})`,
        cx,
        y,
        cols[1].width,
        rowHeight,
        12,
        "left"
      );
      cx += cols[1].width;
      drawCell(
        page,
        `${entry.quantity}`,
        cx,
        y,
        cols[2].width,
        rowHeight,
        12,
        "center"
      );
      y -= rowHeight;
    });

    // Signature and Stamp lines (aligned with table, not to page edge)
    y -= 60;

    // Signature (left, same as before)
    page.drawText("Signature:", { x: tableX, y: y, size: 13 });
    page.drawLine({
      start: { x: tableX + 75, y: y + 3 },
      end: { x: tableX + 210, y: y + 3 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    // Stamp (start at right border of table, same length as signature line)
    const stampLineStart = tableX + tableWidth - (200 - 75);
    page.drawText("", { x: stampLineStart, y: y, size: 13 });
    page.drawLine({
      start: { x: stampLineStart + 55, y: y + 3 },
      end: { x: tableX + tableWidth, y: y + 3 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    // Send PDF as base64
    const pdfBytes = await pdfDoc.save();
    res.json({
      challan: Buffer.from(pdfBytes).toString("base64"),
      stockOutNo,
    });
  } catch (error) {
    console.error("❌ Error in getStockOutChallan:", error);
    res.status(500).json({ message: "Failed to generate challan" });
  }
};
// Helper: Generate next Stock Out Number
async function generateNextStockOutNo() {
  // Find the latest stock out number (assume format SO-00001)
  const latest = await StockOut.findOne({})
    .sort({ createdAt: -1 })
    .select("stockOutNo")
    .lean();
  let next = 1;
  if (latest && latest.stockOutNo) {
    const matches = latest.stockOutNo.match(/\d+$/);
    if (matches) next = parseInt(matches[0], 10) + 1;
  }
  return `SO-${String(next).padStart(5, "0")}`;
}

// ➖ Create Stock Out Entry for multiple items
export const createStockOut = async (req, res) => {
  try {
    const { items, date, returnDate } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json({ message: "No items provided.", success: false });
    }

    // Generate a single stock out number for this batch
    const stockOutNo = await generateNextStockOutNo();

    let outEntries = [];
    let ledgerEntries = [];
    let insufficient = [];

    for (const entry of items) {
      const { item, warehouse, quantity, purpose, reason, tenderNo } = entry;
      const qty = Number(quantity);
      if (!qty || qty <= 0) {
        insufficient.push({ item, message: "Invalid quantity." });
        continue;
      }
      const ledger = await StockLedger.find({ item, warehouse });
      const currentQty = ledger.reduce((acc, e) => acc + e.quantity, 0);
      if (qty > currentQty) {
        insufficient.push({
          item,
          message: `Insufficient stock. Only ${currentQty} available.`,
        });
        continue;
      }
      const stockOut = await StockOut.create({
        item,
        warehouse,
        quantity: qty,
        purpose,
        date,
        returnDate: purpose === "Demo" ? returnDate : undefined,
        reason,
        tenderNo,
        stockOutNo, // 👈 Save the Stock Out Number!
      });
      outEntries.push(stockOut);

      const ledgerEntry = await StockLedger.create({
        item,
        warehouse,
        quantity: -Math.abs(qty),
        action: "OUT",
        type: "Out",
        purpose,
        remarks: reason,
        date,
        returnDate: purpose === "Demo" ? returnDate : undefined,
        returned: purpose === "Demo" ? false : undefined,
        stockOutNo, // Optionally also store on ledger for easier reporting
      });
      ledgerEntries.push(ledgerEntry);
    }

    // Challan PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);
    page.drawText("Stock Out Challan", {
      x: 220,
      y: 800,
      size: 20,
      color: rgb(0, 0, 0.8),
    });
    let y = 770;
    page.drawText(`Stock Out No: ${stockOutNo}`, { x: 40, y, size: 12 });
    y -= 16;
    page.drawText(`Date: ${date}`, { x: 40, y, size: 12 });
    y -= 20;
    outEntries.forEach((entry, idx) => {
      page.drawText(
        `${idx + 1}. Item: ${entry.item}, Warehouse: ${entry.warehouse}, Qty: ${
          entry.quantity
        }, Purpose: ${entry.purpose}${
          entry.tenderNo ? ", Tender: " + entry.tenderNo : ""
        }${entry.reason ? ", Reason: " + entry.reason : ""}`,
        { x: 40, y, size: 10 }
      );
      y -= 16;
    });
    if (returnDate) {
      page.drawText(`Expected Return Date: ${returnDate}`, {
        x: 40,
        y: y - 10,
        size: 10,
      });
    }
    const pdfBytes = await pdfDoc.save();

    if (insufficient.length) {
      return res.status(400).json({
        message: "Some items could not be processed.",
        insufficient,
        outEntries,
        ledgerEntries,
      });
    }

    // Return PDF as base64
    res.status(201).json({
      message: "Stock Out recorded successfully.",
      outEntries,
      ledgerEntries,
      stockOutNo, // 👈 Return stockOutNo for UI if needed!
      challan: Buffer.from(pdfBytes).toString("base64"),
    });
  } catch (error) {
    console.error("❌ Error in createStockOut:", error);
    res.status(500).json({
      message: error.message || "Server error occurred.",
      success: false,
    });
  }
};

// 📄 Fetch All Stock Out Entries
export const getAllStockOuts = async (req, res) => {
  try {
    const entries = await StockOut.find()
      .populate("item", "name")
      .populate("warehouse", "name")
      .sort({ date: -1 });

    res.status(200).json(entries);
  } catch (error) {
    console.error("❌ Error in getAllStockOuts:", error);
    res.status(500).json({ message: "Failed to fetch stock out records" });
  }
};

// 🔄 Fetch Pending Demo Returns WITH Stock Out Number
export const getPendingDemoReturns = async (req, res) => {
  try {
    const demoItems = await StockOut.find({
      purpose: "Demo",
      returnDate: { $exists: true, $gte: new Date() },
    })
      .populate("item", "name modelNo")
      .populate("warehouse", "name")
      .sort({ returnDate: 1 })
      .select("stockOutNo quantity date"); // <-- Make sure stockOutNo is sent

    res.status(200).json(demoItems);
  } catch (error) {
    console.error("❌ Error in getPendingDemoReturns:", error);
    res.status(500).json({ message: "Failed to fetch demo returns" });
  }
};
