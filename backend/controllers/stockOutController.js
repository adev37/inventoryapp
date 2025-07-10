import StockOut from "../models/StockOut.js";
import StockLedger from "../models/StockLedger.js";
import mongoose from "mongoose";
import { PDFDocument, StandardFonts } from "pdf-lib"; // required for challan
// import { drawWrappedCell } from "../utils/pdfUtils.js"; // assume your PDF cell util is here

// ✅ Create Stock Out Entries
export const createStockOut = async (req, res) => {
  try {
    const { items, purpose, reason, tenderNo, date, returnDate } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "No items provided." });
    }

    if (!purpose) {
      return res.status(400).json({ message: "Purpose is required." });
    }

    const createdEntries = [];
    const ledgerEntries = [];

    for (const entry of items) {
      const { item, warehouse, quantity, location } = entry;
      if (!item || !warehouse || !quantity) continue;

      const locationId = mongoose.Types.ObjectId.isValid(location)
        ? new mongoose.Types.ObjectId(location)
        : null;

      // ✅ Create StockOut document
      const stockOut = await StockOut.create({
        item,
        warehouse,
        quantity,
        date,
        returnDate: purpose === "Demo" ? returnDate : null,
        reason,
        tenderNo,
        purpose,
        returnProcessed: false,
        location: locationId,
      });

      createdEntries.push(stockOut);

      // ✅ Create StockLedger OUT entry
      const ledger = await StockLedger.create({
        item,
        warehouse,
        quantity: -Math.abs(quantity),
        action: "OUT",
        type: "Out",
        purpose,
        returned: false,
        returnDate: purpose === "Demo" ? returnDate : null, // ✅ critical fix
        date,
        remarks: reason,
        location: locationId,
      });

      ledgerEntries.push(ledger);
    }

    res.status(201).json({
      message: "✅ Stock Out recorded!",
      createdEntries,
      ledgerEntries,
    });
  } catch (error) {
    console.error("❌ Error in createStockOut:", error);
    res.status(500).json({ message: "❌ Failed to create Stock Out." });
  }
};

// ✅ Get All Stock Outs
export const getAllStockOuts = async (req, res) => {
  try {
    const entries = await StockOut.find()
      .populate("item", "name modelNo")
      .populate("warehouse", "name")
      .populate("location", "name")
      .sort({ date: -1 });

    res.status(200).json(entries);
  } catch (error) {
    console.error("❌ Error in getAllStockOuts:", error);
    res.status(500).json({ message: "Failed to fetch stock out records" });
  }
};

// ✅ Get Pending Demo Returns (StockOut only)
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

// ✅ Generate PDF Challan for Stock Out (by stockOutNo)
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
