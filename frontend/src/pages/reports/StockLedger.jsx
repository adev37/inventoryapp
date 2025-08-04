import React, { useEffect, useState } from "react";
import API from "../../utils/axiosInstance";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const StockLedger = () => {
  const [entries, setEntries] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchText, setSearchText] = useState("");
  const [actionType, setActionType] = useState("");
  const [purpose, setPurpose] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [allPurposes, setAllPurposes] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 11;

  useEffect(() => {
    fetchLedger();
  }, []);

  const fetchLedger = async () => {
    setLoading(true);
    try {
      const res = await API.get("/stock-ledger");
      const sorted = [...res.data].sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      );
      setEntries(sorted);
      setFilteredEntries(sorted);
      const purposes = Array.from(
        new Set(res.data.map((e) => e.purpose).filter(Boolean))
      );
      setAllPurposes(purposes);
    } catch (error) {
      console.error(
        "Error fetching stock ledger:",
        error.response?.data || error.message
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let filtered = [...entries];
    const lower = searchText.toLowerCase();

    if (searchText.trim()) {
      filtered = filtered.filter(
        (e) =>
          e.item?.name?.toLowerCase().includes(lower) ||
          e.item?.modelNo?.toLowerCase().includes(lower) ||
          e.warehouse?.name?.toLowerCase().includes(lower)
      );
    }
    if (actionType) {
      filtered = filtered.filter((e) => e.action === actionType);
    }
    if (purpose) {
      filtered = filtered.filter((e) => e.purpose === purpose);
    }
    if (dateFrom) {
      filtered = filtered.filter((e) => new Date(e.date) >= new Date(dateFrom));
    }
    if (dateTo) {
      filtered = filtered.filter((e) => new Date(e.date) <= new Date(dateTo));
    }

    setFilteredEntries(filtered);
    setCurrentPage(1);
  }, [searchText, actionType, purpose, dateFrom, dateTo, entries]);

  const formatDate = (date) =>
    date ? new Date(date).toLocaleDateString() : "-";

  const exportToExcel = () => {
    const exportData = filteredEntries.map((entry, idx) => ({
      "Sl#": idx + 1,
      Date: formatDate(entry.date),
      Item: entry.item?.name || "-",
      "Model No.": entry.item?.modelNo || "-",
      Warehouse: entry.warehouse?.name || "-",
      "Rack/Location": entry.locationDisplay || "-",
      "Qty (+/-)": entry.quantity,
      Action: entry.action,
      Purpose: entry.purpose || "-",
      Remarks: entry.remarks || "-",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Stock Ledger");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    saveAs(blob, "Stock_Ledger.xlsx");
  };

  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentItems = filteredEntries.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage);

  const handleReset = () => {
    setSearchText("");
    setActionType("");
    setPurpose("");
    setDateFrom("");
    setDateTo("");
  };

  return (
    <div className="p-6 min-h-screen relative pb-20 bg-gray-50">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <span className="inline-block w-3 h-3 bg-yellow-500 rounded-full"></span>
        Stock Ledger (IN/OUT History)
      </h2>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-4 items-center">
        <input
          type="text"
          placeholder="🔍 Search Item / Model / Warehouse"
          className="border px-3 py-2 rounded w-60"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
        <select
          value={actionType}
          onChange={(e) => setActionType(e.target.value)}
          className="border px-3 py-2 rounded w-44">
          <option value="">All Actions</option>
          <option value="IN">Stock In</option>
          <option value="OUT">Stock Out</option>
        </select>
        <select
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          className="border px-3 py-2 rounded w-44">
          <option value="">All Purpose</option>
          {allPurposes.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <div className="flex gap-2 items-center">
          <label>Date:</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="border px-2 py-1 rounded"
          />
          <span>to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="border px-2 py-1 rounded"
          />
        </div>
        <button
          onClick={handleReset}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
          🔄 Reset
        </button>
        <button
          onClick={exportToExcel}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded">
          📄 Export to Excel
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto w-full shadow rounded bg-white min-h-[400px]">
        {loading ? (
          <p className="p-6 text-blue-600">Loading stock ledger...</p>
        ) : currentItems.length === 0 ? (
          <p className="p-6 text-gray-500">No stock ledger records found.</p>
        ) : (
          <table className="min-w-[1000px] table-auto border border-gray-300 text-sm whitespace-nowrap">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 border">Date</th>
                <th className="p-2 border min-w-[180px]">Item</th>
                <th className="p-2 border">Model No.</th>
                <th className="p-2 border min-w-[200px]">Warehouse</th>
                <th className="p-2 border min-w-[120px]">Rack / Location</th>
                <th className="p-2 border">Qty (+/-)</th>
                <th className="p-2 border">Action</th>
                <th className="p-2 border">Purpose</th>
                <th className="p-2 border min-w-[180px]">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.map((entry) => (
                <tr key={entry._id} className="border-t hover:bg-gray-50">
                  <td className="p-2 border">{formatDate(entry.date)}</td>
                  <td className="p-2 border">{entry.item?.name || "-"}</td>
                  <td className="p-2 border">{entry.item?.modelNo || "-"}</td>
                  <td className="p-2 border">{entry.warehouse?.name || "-"}</td>
                  <td className="p-2 border">{entry.locationDisplay || "-"}</td>
                  <td
                    className={`p-2 border text-center ${
                      entry.quantity > 0 ? "text-green-600" : "text-red-600"
                    }`}>
                    {entry.quantity}
                  </td>
                  <td className="p-2 border">{entry.action}</td>
                  <td className="p-2 border">{entry.purpose || "-"}</td>
                  <td className="p-2 border">{entry.remarks || "-"}</td>
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

export default StockLedger;
