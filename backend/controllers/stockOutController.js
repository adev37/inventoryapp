import StockOut from "../models/StockOut.js";
import StockLedger from "../models/StockLedger.js";
import Location from "../models/Location.js";
import getNextSequence from "../utils/getNextSequence.js";
import mongoose from "mongoose";
import { PDFDocument, StandardFonts } from "pdf-lib";

// Utility: Draw wrapped cell for table
function drawWrappedCell(
  page,
  text,
  x,
  y,
  width,
  height,
  font,
  fontSize,
  align = "left"
) {
  const words = text.split(" ");
  const lines = [];
  let line = "";

  for (let word of words) {
    const testLine = line + (line ? " " : "") + word;
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);
    if (testWidth < width - 12) {
      line = testLine;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);

  const lineHeight = fontSize + 2;
  for (let i = 0; i < lines.length; i++) {
    let textX = x + 5;
    const lineText = lines[i];
    if (align === "center") {
      const tw = font.widthOfTextAtSize(lineText, fontSize);
      textX = x + (width - tw) / 2;
    } else if (align === "right") {
      const tw = font.widthOfTextAtSize(lineText, fontSize);
      textX = x + width - tw - 5;
    }

    page.drawText(lineText, {
      x: textX,
      y: y - lineHeight * i - 5,
      size: fontSize,
      font,
    });
  }

  page.drawRectangle({ x, y: y - height, width, height, borderWidth: 1 });
}

// 🧾 PDF Challan for Stock Out
export const getStockOutChallan = async (req, res) => {
  try {
    const { stockOutNo } = req.params;

    const outEntries = await StockOut.find({ stockOutNo })
      .populate("item", "name modelNo")
      .lean();

    if (!outEntries?.length) {
      return res.status(404).json({ message: "Challan not found." });
    }

    const { date } = outEntries[0];
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const cols = [
      { title: "Sr.", width: 50, align: "center" },
      { title: "Item Name", width: 420, align: "left" },
      { title: "Qty", width: 60, align: "center" },
    ];

    const tableX = 60;
    let y = 740;
    const fontSize = 11;
    const lineHeight = fontSize + 2;

    // Title
    page.drawText("CHALLAN", {
      x: (595 - boldFont.widthOfTextAtSize("CHALLAN", 22)) / 2,
      y: 800,
      size: 22,
      font: boldFont,
    });

    page.drawText(`Challan No: ${stockOutNo}`, {
      x: tableX,
      y: 775,
      size: 12,
      font: regularFont,
    });
    const dateStr = `Date: ${date?.toISOString().split("T")[0] || "-"}`;
    const totalTableWidth = cols.reduce((a, c) => a + c.width, 0);
    const dateWidth = boldFont.widthOfTextAtSize(dateStr, 12);
    page.drawText(dateStr, {
      x: tableX + totalTableWidth - dateWidth,
      y: 775,
      size: 12,
      font: regularFont,
    });

    // Table Headers
    let cx = tableX;
    const headerHeight = 24;
    for (let col of cols) {
      drawWrappedCell(
        page,
        col.title,
        cx,
        y,
        col.width,
        headerHeight,
        boldFont,
        12,
        col.align
      );
      cx += col.width;
    }
    y -= headerHeight;

    let totalQty = 0;
    const rows = outEntries.map((entry, idx) => {
      const itemName = `${entry.item?.name || ""} (${
        entry.item?.modelNo || ""
      })`;
      return [String(idx + 1), itemName, `${entry.quantity}`];
    });

    for (let row of rows) {
      const rowHeight = row.reduce((h, text, i) => {
        const lines = Math.ceil(
          text.length / (cols[i].width / (fontSize * 0.55))
        );
        return Math.max(h, lines * lineHeight + 8);
      }, 0);

      let colX = tableX;
      row.forEach((text, i) => {
        drawWrappedCell(
          page,
          text,
          colX,
          y,
          cols[i].width,
          rowHeight,
          regularFont,
          fontSize,
          cols[i].align
        );
        colX += cols[i].width;
      });

      totalQty += parseInt(row[2]);
      y -= rowHeight;
    }

    // Total row
    drawWrappedCell(
      page,
      "",
      tableX,
      y,
      cols[0].width,
      24,
      regularFont,
      fontSize
    );
    drawWrappedCell(
      page,
      "Total",
      tableX + cols[0].width,
      y,
      cols[1].width,
      24,
      boldFont,
      fontSize,
      "center"
    );
    drawWrappedCell(
      page,
      `${totalQty}`,
      tableX + cols[0].width + cols[1].width,
      y,
      cols[2].width,
      24,
      boldFont,
      fontSize,
      "center"
    );

    // Signatures
    y -= 60;
    page.drawText("Signature:", { x: tableX, y, size: 13, font: regularFont });
    page.drawLine({
      start: { x: tableX + 75, y: y + 3 },
      end: { x: tableX + 210, y: y + 3 },
      thickness: 1,
    });
    page.drawLine({
      start: { x: tableX + totalTableWidth - 145, y: y + 3 },
      end: { x: tableX + totalTableWidth, y: y + 3 },
      thickness: 1,
    });

    const pdfBytes = await pdfDoc.save();
    res.json({ challan: Buffer.from(pdfBytes).toString("base64"), stockOutNo });
  } catch (error) {
    console.error("❌ Error in getStockOutChallan:", error);
    res.status(500).json({ message: "Failed to generate challan" });
  }
};

// 🔢 Generate Unique Stock Out Number
async function generateNextStockOutNo() {
  const seq = await getNextSequence("stockOutNo");
  return `SO-${String(seq).padStart(5, "0")}`;
}

// ➕ Create Stock Out
export const createStockOut = async (req, res) => {
  const { items, date, returnDate } = req.body;
  if (!Array.isArray(items) || items.length === 0)
    return res.status(400).json({ message: "No items provided." });

  let stockOutNo,
    retryCount = 0;
  const MAX_RETRIES = 5;

  while (retryCount < MAX_RETRIES) {
    try {
      stockOutNo = await generateNextStockOutNo();

      const outEntries = [],
        ledgerEntries = [],
        insufficient = [];

      for (const entry of items) {
        const {
          item,
          warehouse,
          location,
          quantity,
          purpose,
          reason,
          tenderNo,
        } = entry;
        const qty = Number(quantity);
        if (!qty || qty <= 0) {
          insufficient.push({ item, message: "Invalid quantity." });
          continue;
        }

        const locationId = mongoose.Types.ObjectId.isValid(location)
          ? new mongoose.Types.ObjectId(location)
          : null;

        const ledger = await StockLedger.find({
          item,
          warehouse,
          ...(locationId && { location: locationId }),
        });

        const currentQty = ledger.reduce((sum, l) => sum + l.quantity, 0);
        if (qty > currentQty) {
          insufficient.push({
            item,
            message: `Insufficient stock. Only ${currentQty} available.`,
          });
          continue;
        }

        const out = await StockOut.create({
          item,
          warehouse,
          location: locationId,
          quantity: qty,
          purpose,
          reason,
          tenderNo,
          date,
          returnDate: purpose === "Demo" ? returnDate : undefined,
          stockOutNo,
        });

        outEntries.push(out);

        const ledgerEntry = await StockLedger.create({
          item,
          warehouse,
          location: locationId,
          quantity: -Math.abs(qty),
          action: "OUT",
          type: "Out",
          purpose,
          remarks: reason,
          date,
          returnDate: purpose === "Demo" ? returnDate : undefined,
          returned: purpose === "Demo" ? false : undefined,
          stockOutNo,
        });

        ledgerEntries.push(ledgerEntry);
      }

      if (insufficient.length > 0) {
        await StockOut.deleteMany({ stockOutNo });
        await StockLedger.deleteMany({ stockOutNo });
        return res.status(400).json({
          message: "Some items could not be processed.",
          insufficient,
        });
      }

      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595, 842]);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      let y = 770;

      page.drawText("Stock Out Challan", { x: 220, y: 800, size: 20 });
      page.drawText(`Stock Out No: ${stockOutNo}`, { x: 40, y, size: 12 });
      y -= 20;
      page.drawText(`Date: ${date}`, { x: 40, y, size: 12 });
      y -= 20;

      for (const entry of outEntries) {
        const rack = await Location.findById(entry.location).lean();
        page.drawText(
          `• Item: ${entry.item}, Qty: ${entry.quantity}, Rack: ${
            rack?.name || "-"
          }`,
          { x: 40, y, size: 10 }
        );
        y -= 16;
      }

      const pdfBytes = await pdfDoc.save();

      return res.status(201).json({
        message: "✅ Stock Out successful.",
        stockOutNo,
        outEntries,
        ledgerEntries,
        challan: Buffer.from(pdfBytes).toString("base64"),
      });
    } catch (err) {
      if (err.code === 11000 && err.keyPattern?.stockOutNo) {
        retryCount++;
        console.warn(
          `⚠️ Duplicate stockOutNo (${stockOutNo}) detected. Retrying...`
        );
        continue;
      }

      console.error("❌ Error in createStockOut:", err);
      return res
        .status(500)
        .json({ message: "Server error. Please try again." });
    }
  }

  return res.status(500).json({
    message: "❌ Failed to generate unique StockOutNo. Please try again.",
  });
};

// 📥 All Stock Outs
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

// 📅 Demo Returns
export const getPendingDemoReturns = async (req, res) => {
  try {
    const demoItems = await StockOut.find({
      purpose: "Demo",
      returnDate: { $exists: true, $gte: new Date() },
    })
      .populate("item", "name modelNo")
      .populate("warehouse", "name")
      .sort({ returnDate: 1 })
      .select("stockOutNo quantity date");

    res.status(200).json(demoItems);
  } catch (error) {
    console.error("❌ Error in getPendingDemoReturns:", error);
    res.status(500).json({ message: "Failed to fetch demo returns" });
  }
};
