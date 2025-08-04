import React, { useEffect, useState } from "react";
import API from "../../utils/axiosInstance";
import moment from "moment";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const TransferReport = () => {
  const [transfers, setTransfers] = useState([]);
  const [filteredTransfers, setFilteredTransfers] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [warehouses, setWarehouses] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchTransfers();
    fetchWarehouses();
  }, []);

  const fetchTransfers = async () => {
    try {
      const res = await API.get("/stock-transfers");
      setTransfers(res.data);
      setFilteredTransfers(res.data);
    } catch (err) {
      console.error("Error fetching transfers:", err);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const res = await API.get("/warehouses");
      setWarehouses(res.data);
    } catch (err) {
      console.error("Error fetching warehouses:", err);
    }
  };

  const resetFilters = () => {
    setSearchText("");
    setSelectedWarehouse("");
    setCurrentPage(1);
  };

  useEffect(() => {
    let filtered = [...transfers];

    if (searchText.trim()) {
      const lower = searchText.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.item?.name?.toLowerCase().includes(lower) ||
          t.item?.modelNo?.toLowerCase().includes(lower)
      );
    }

    if (selectedWarehouse) {
      filtered = filtered.filter(
        (t) =>
          t.fromWarehouse?._id === selectedWarehouse ||
          t.toWarehouse?._id === selectedWarehouse
      );
    }

    setFilteredTransfers(filtered);
    setCurrentPage(1);
  }, [searchText, selectedWarehouse, transfers]);

  const exportToExcel = () => {
    const exportData = filteredTransfers.map((t) => ({
      Date: moment(t.date).format("DD-MM-YYYY"),
      Item: t.item?.name || "N/A",
      "Model No.": t.item?.modelNo || "-",
      Quantity: t.quantity,
      From: t.fromWarehouse?.name || "-",
      To: t.toWarehouse?.name || "-",
      Remarks: t.note || "-",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Transfer Report");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    saveAs(blob, "Transfer_Report.xlsx");
  };

  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentItems = filteredTransfers.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredTransfers.length / itemsPerPage);

  return (
    <div className="p-6 min-h-screen relative pb-24">
      <h2 className="text-2xl font-bold mb-4">📋 Stock Transfer Report</h2>

      {/* Filter Controls */}
      <div className="flex flex-wrap gap-4 mb-4 items-center">
        <input
          type="text"
          placeholder="🔍 Search Item or Model No."
          className="border px-3 py-2 rounded w-60"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />

        <select
          value={selectedWarehouse}
          onChange={(e) => setSelectedWarehouse(e.target.value)}
          className="border px-3 py-2 rounded w-60">
          <option value="">🏬 All Warehouses</option>
          {warehouses.map((wh) => (
            <option key={wh._id} value={wh._id}>
              {wh.name}
            </option>
          ))}
        </select>

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
      <div className="overflow-x-auto bg-white rounded shadow min-h-[400px]">
        {currentItems.length === 0 ? (
          <p className="p-6 text-gray-500 italic">No transfer records found.</p>
        ) : (
          <table className="min-w-full text-sm border border-gray-300">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 border">#</th>
                <th className="p-2 border">Date</th>
                <th className="p-2 border">Item</th>
                <th className="p-2 border">Model No.</th>
                <th className="p-2 border">Quantity</th>
                <th className="p-2 border">From</th>
                <th className="p-2 border">To</th>
                <th className="p-2 border">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.map((t, i) => (
                <tr key={t._id} className="border-t hover:bg-gray-50">
                  <td className="p-2 border">{indexOfFirst + i + 1}</td>
                  <td className="p-2 border">
                    {moment(t.date).format("DD-MM-YYYY")}
                  </td>
                  <td className="p-2 border">{t.item?.name || "N/A"}</td>
                  <td className="p-2 border">{t.item?.modelNo || "-"}</td>
                  <td className="p-2 border">{t.quantity}</td>
                  <td className="p-2 border">{t.fromWarehouse?.name}</td>
                  <td className="p-2 border">{t.toWarehouse?.name}</td>

                  <td className="p-2 border">{t.note || "-"}</td>
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

export default TransferReport;
