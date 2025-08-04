import React, { useEffect, useState } from "react";
import API from "../../utils/axiosInstance";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { toast } from "react-toastify";

// Utility: Download base64 PDF
function downloadPDF(base64Data, filename = "Challan.pdf") {
  const linkSource = `data:application/pdf;base64,${base64Data}`;
  const downloadLink = document.createElement("a");
  downloadLink.href = linkSource;
  downloadLink.download = filename;
  downloadLink.click();
}

const ViewStockOut = () => {
  const [entries, setEntries] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [downloading, setDownloading] = useState(""); // stockOutNo for button loading

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchStockOutBatches();
  }, []);

  // Fetch batches by stockOutNo
  const fetchStockOutBatches = async () => {
    setLoading(true);
    try {
      const res = await API.get("/stock-ledger");
      const outEntries = res.data.filter((entry) => entry.action === "OUT");
      const inEntries = res.data.filter(
        (entry) => entry.action === "IN" && entry.purpose === "Demo Return"
      );

      // Group OUT by SO number
      const groupMap = {};
      for (const entry of outEntries) {
        const soNo = entry.stockOutNo || "-";
        if (!groupMap[soNo]) {
          groupMap[soNo] = {
            _id: entry._id,
            stockOutNo: soNo,
            quantity: 0,
            returnedQty: 0,
            returnDate: entry.returnDate || "-",
            returnedOn: null,
          };
        }
        groupMap[soNo].quantity += Math.abs(entry.quantity);
        if (entry.returnDate && groupMap[soNo].returnDate === "-") {
          groupMap[soNo].returnDate = entry.returnDate;
        }
      }
      // Add returnedQty for each batch (IN entries)
      for (const ret of inEntries) {
        const soNo = ret.stockOutNo || "-";
        if (groupMap[soNo]) {
          groupMap[soNo].returnedQty += Math.abs(ret.quantity);
          groupMap[soNo].returnedOn = ret.date;
        }
      }

      // Sort by SO number (latest first)
      const batchList = Object.values(groupMap).sort((a, b) =>
        (b.stockOutNo || "").localeCompare(a.stockOutNo || "")
      );
      setEntries(batchList);
      setFilteredEntries(batchList);
    } catch (error) {
      toast.error("Failed to load stock out report");
    } finally {
      setLoading(false);
    }
  };

  // Search
  useEffect(() => {
    let filtered = [...entries];
    if (search) {
      const s = search.trim().toLowerCase();
      filtered = filtered.filter(
        (entry) =>
          entry.stockOutNo && entry.stockOutNo.toLowerCase().includes(s)
      );
    }
    setFilteredEntries(filtered);
    setCurrentPage(1);
  }, [search, entries]);

  // Export to Excel (optional)
  const exportToExcel = () => {
    const exportData = filteredEntries.map((entry, idx) => ({
      "Sl#": idx + 1,
      "Stock No.": entry.stockOutNo || "-",
      "Total Qty": entry.quantity,
      "Returned Qty": entry.returnedQty,
      "Expected Return": formatDate(entry.returnDate),
      "Returned On": entry.returnedOn ? formatDate(entry.returnedOn) : "-",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Stock Out Batches");
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, "Stock_Out_Batches.xlsx");
  };

  const formatDate = (date) =>
    date && date !== "-" ? new Date(date).toLocaleDateString() : "-";

  // Download Challan for a StockOutNo
  const handleDownloadChallan = async (stockOutNo) => {
    setDownloading(stockOutNo);
    try {
      const res = await API.get(`/stock-out/challan/${stockOutNo}`);
      if (res.data && res.data.challan) {
        downloadPDF(res.data.challan, `Challan_${stockOutNo}.pdf`);
      } else {
        toast.error("Challan not available.");
      }
    } catch (error) {
      toast.error("Failed to download challan.");
    }
    setDownloading("");
  };

  // Pagination logic
  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentItems = filteredEntries.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage);

  return (
    <div className="p-6 min-h-screen relative pb-24">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <span className="inline-block w-3 h-3 bg-yellow-500 rounded-full"></span>
        Stock Out Report
      </h2>
      {/* Search & Export */}
      <div className="flex flex-wrap gap-4 mb-4 items-center">
        <input
          type="text"
          placeholder="🔎 Search Stock Out No."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border px-3 py-2 rounded w-64"
        />
        <button
          onClick={exportToExcel}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded">
          📄 Export to Excel
        </button>
      </div>
      {/* Table */}
      <div className="overflow-x-auto shadow rounded bg-white min-h-[200px]">
        {loading ? (
          <p className="p-6 text-blue-600">Loading stock out records...</p>
        ) : currentItems.length === 0 ? (
          <p className="p-6 text-gray-500">No stock out batch records found.</p>
        ) : (
          <table className="w-full table-auto border border-gray-300 text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 border">Sl#</th>
                <th className="p-2 border">Stock No.</th>
                <th className="p-2 border">Total Qty</th>
                <th className="p-2 border">Returned Qty</th>
                <th className="p-2 border">Expected Return</th>
                <th className="p-2 border">Returned On</th>
                <th className="p-2 border">Challan</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.map((entry, idx) => (
                <tr
                  key={entry.stockOutNo || idx}
                  className="border-t hover:bg-gray-50">
                  <td className="p-2 border text-center">
                    {indexOfFirst + idx + 1}
                  </td>
                  <td className="p-2 border text-center">
                    {entry.stockOutNo || "-"}
                  </td>
                  <td className="p-2 border text-center">{entry.quantity}</td>
                  <td className="p-2 border text-center">
                    {entry.returnedQty}
                  </td>
                  <td className="p-2 border text-center">
                    {formatDate(entry.returnDate)}
                  </td>
                  <td className="p-2 border text-center">
                    {entry.returnedOn ? formatDate(entry.returnedOn) : "-"}
                  </td>
                  <td className="p-2 border text-center">
                    <button
                      onClick={() => handleDownloadChallan(entry.stockOutNo)}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded disabled:bg-gray-300"
                      disabled={downloading === entry.stockOutNo}>
                      {downloading === entry.stockOutNo
                        ? "Generating..."
                        : "Download Challan"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-50 bg-white px-4 py-2 shadow rounded">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            className={`px-3 py-1 rounded ${
              currentPage === 1
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-blue-500 text-white"
            }`}>
            ◀️ Prev
          </button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i + 1)}
              className={`px-3 py-1 rounded ${
                currentPage === i + 1
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700"
              }`}>
              {i + 1}
            </button>
          ))}
          <button
            disabled={currentPage === totalPages}
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
            className={`px-3 py-1 rounded ${
              currentPage === totalPages
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-blue-500 text-white"
            }`}>
            Next ▶️
          </button>
        </div>
      )}
    </div>
  );
};

export default ViewStockOut;
