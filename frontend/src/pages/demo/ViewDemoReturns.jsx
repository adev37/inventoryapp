import React, { useEffect, useState } from "react";
import API from "../../utils/axiosInstance";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const ViewDemoReturns = () => {
  const [entries, setEntries] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [searchText, setSearchText] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchDemoReport();
  }, []);

  const fetchDemoReport = async () => {
    setLoading(true);
    try {
      const res = await API.get("/demo-returns/report");
      const sorted = [...res.data].sort((a, b) => {
        return (
          new Date(b.returnDate || b.createdAt) -
          new Date(a.returnDate || a.createdAt)
        );
      });
      setEntries(sorted);
      setFilteredEntries(sorted);
    } catch (error) {
      console.error(
        "Error fetching demo report:",
        error.response?.data || error.message
      );
    } finally {
      setLoading(false);
    }
  };

  // Filtering
  useEffect(() => {
    let filtered = [...entries];

    if (statusFilter) {
      const isReturned = statusFilter === "Returned";
      filtered = filtered.filter((e) => e.returned === isReturned);
    }

    if (searchText.trim()) {
      const lower = searchText.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          (e.itemName || "").toLowerCase().includes(lower) ||
          (e.modelNo || "").toLowerCase().includes(lower)
      );
    }

    if (dateFrom) {
      filtered = filtered.filter(
        (e) => e.returnDate && new Date(e.returnDate) >= new Date(dateFrom)
      );
    }

    if (dateTo) {
      filtered = filtered.filter(
        (e) => e.returnDate && new Date(e.returnDate) <= new Date(dateTo)
      );
    }

    setFilteredEntries(filtered);
    setCurrentPage(1);
  }, [statusFilter, searchText, dateFrom, dateTo, entries]);

  const resetFilters = () => {
    setStatusFilter("");
    setSearchText("");
    setDateFrom("");
    setDateTo("");
    setCurrentPage(1);
  };

  const formatDate = (date) =>
    date && date !== "-" ? new Date(date).toLocaleDateString() : "-";

  const exportToExcel = () => {
    const exportData = filteredEntries.map((entry, idx) => ({
      "Sl#": idx + 1,
      Item: entry.itemName || "-",
      "Model No.": entry.modelNo || "-",
      "Total Qty": entry.quantity,
      "Returned Qty": entry.returnedQty,
      "Expected Return": formatDate(entry.returnDate),
      "Returned On": entry.returned ? formatDate(entry.returnedOn) : "-",
      Status: entry.returned ? "Returned" : "Pending",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Demo Returns Report");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    saveAs(blob, "Demo_Returns_Report.xlsx");
  };

  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentItems = filteredEntries.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage);

  return (
    <div className="p-6 min-h-screen relative pb-24">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <span className="inline-block w-3 h-3 bg-blue-500 rounded-full"></span>
        Demo Returns Report
      </h2>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-4 items-center">
        <input
          type="text"
          placeholder="🔎 Search Item / Model"
          className="border px-3 py-2 rounded w-52"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border px-3 py-2 rounded w-40">
          <option value="">📌 All Status</option>
          <option value="Returned">Returned</option>
          <option value="Pending">Pending</option>
        </select>
        <label className="ml-2">Expected Return:</label>
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

        <button
          onClick={resetFilters}
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
      <div className="overflow-x-auto shadow rounded bg-white min-h-[400px]">
        {loading ? (
          <p className="p-6 text-blue-600">Loading demo returns...</p>
        ) : currentItems.length === 0 ? (
          <p className="p-6 text-gray-500">No demo return records found.</p>
        ) : (
          <table className="w-full table-auto border border-gray-300 text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 border">Sl#</th>
                <th className="p-2 border">Item</th>
                <th className="p-2 border">Model No.</th>
                <th className="p-2 border">Total Qty</th>
                <th className="p-2 border">Returned Qty</th>
                <th className="p-2 border">Expected Return</th>
                <th className="p-2 border">Returned On</th>
                <th className="p-2 border">Status</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.map((entry, idx) => (
                <tr
                  key={entry._id || idx}
                  className="border-t hover:bg-gray-50">
                  <td className="p-2 border text-center">
                    {indexOfFirst + idx + 1}
                  </td>
                  <td className="p-2 border text-center">{entry.itemName}</td>
                  <td className="p-2 border text-center">{entry.modelNo}</td>
                  <td className="p-2 border text-center">{entry.quantity}</td>
                  <td className="p-2 border text-center">
                    {entry.returnedQty}
                  </td>
                  <td className="p-2 border text-center">
                    {formatDate(entry.returnDate)}
                  </td>
                  <td className="p-2 border text-center">
                    {entry.returned ? formatDate(entry.returnedOn) : "-"}
                  </td>
                  <td className="p-2 border text-center">
                    <span
                      className={`font-semibold px-2 py-1 rounded ${
                        entry.returned
                          ? "text-green-700 bg-green-100"
                          : "text-red-700 bg-red-100"
                      }`}>
                      {entry.returned ? "Returned" : "Pending"}
                    </span>
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

export default ViewDemoReturns;
