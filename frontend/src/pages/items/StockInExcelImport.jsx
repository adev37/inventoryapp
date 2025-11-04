import React, { useState } from "react";
import * as XLSX from "xlsx";
import API from "../../utils/axiosInstance";
import { toast } from "react-toastify";
import { Download, Send } from "lucide-react";

const StockInExcelImport = () => {
  const [excelData, setExcelData] = useState([]);
  const [file, setFile] = useState(null);

  const handleFileUpload = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    const reader = new FileReader();

    reader.onload = (evt) => {
      const binaryStr = evt.target.result;
      const workbook = XLSX.read(binaryStr, { type: "binary" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
      setExcelData(jsonData);
    };

    reader.readAsBinaryString(selectedFile);
  };

  const handleImport = async () => {
    try {
      const mappedItems = excelData.map((row, index) => {
        const quantity = Number(row["Quantity"]);

        const rawDate = row["Date"];
        let date;

        if (rawDate instanceof Date && !isNaN(rawDate.getTime())) {
          date = rawDate;
        } else if (typeof rawDate === "number") {
          // Excel serial number to date (UTC) — add timezone offset for IST
          date = new Date(Math.round((rawDate - 25569) * 86400 * 1000));
        } else if (typeof rawDate === "string") {
          // Convert to local date string
          date = new Date(rawDate);
        } else {
          date = null;
        }

        if (!date || isNaN(date.getTime())) {
          throw new Error(`Row ${index + 2} has an invalid date.`);
        }

        // Convert to ISO string and slice to get yyyy-mm-dd
        const istDate = new Date(date.getTime() + 330 * 60000); // Convert to IST (UTC+5:30)
        const formattedDate = istDate.toISOString().split("T")[0]; // "yyyy-mm-dd"

        if (!row["Item"] || !row["Warehouse"] || isNaN(quantity)) {
          throw new Error(`Row ${index + 2} has invalid or missing data.`);
        }

        return {
          item: row["Item"]?.trim(),
          warehouse: row["Warehouse"]?.trim(),
          location: row["Rack"]?.trim() || null,
          quantity,
          date: formattedDate,
          remarks: row["Remarks"] || "",
        };
      });

      await API.post("/stock-in", {
        items: mappedItems,
        date: new Date(),
        remarks: "Imported via Excel",
      });

      toast.success("✅ Stock In imported successfully!");
      setExcelData([]);
      setFile(null);
    } catch (err) {
      console.error("❌ Import error:", err);
      toast.error(`❌ Failed to import: ${err.message}`);
    }
  };

  const downloadFormat = () => {
    const url = "/StockIn_Template.xlsx"; // Ensure this file exists in /public
    const link = document.createElement("a");
    link.href = url;
    link.download = "StockIn_Template.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-blue-50">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-xl">
        <h2 className="text-2xl font-semibold text-blue-700 flex items-center gap-2 mb-6">
          {/* <img src="/import-icon.png" alt="import" className="w-6 h-6" /> */}
          Import Stock In
        </h2>

        <label className="block text-sm font-medium text-gray-700 mb-2">
          Upload Excel File
        </label>
        <input
          type="file"
          accept=".xlsx, .xls"
          onChange={handleFileUpload}
          className="w-full px-4 py-2 border border-gray-300 rounded mb-4"
        />

        <div className="flex justify-between gap-4">
          <button
            onClick={downloadFormat}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition">
            <Download className="w-4 h-4" />
            Download Format
          </button>

          <button
            onClick={handleImport}
            disabled={excelData.length === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded transition ${
              excelData.length === 0
                ? "bg-gray-300 text-gray-700 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}>
            <Send className="w-4 h-4" />
            Import Stock
          </button>
        </div>
      </div>
    </div>
  );
};

export default StockInExcelImport;
