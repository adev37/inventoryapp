import React, { useEffect, useState } from "react";
import API from "../../utils/axiosInstance";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const CurrentStock = () => {
  const [stock, setStock] = useState([]);
  const [filteredStock, setFilteredStock] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [locations, setLocations] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 11;

  useEffect(() => {
    fetchCurrentStock();
    fetchWarehouses();
    fetchLocations();
  }, []);

  const fetchCurrentStock = async () => {
    setLoading(true);
    try {
      const res = await API.get("/current-stock");
      setStock(res.data);
      setFilteredStock(res.data);
      const uniqueCompanies = [...new Set(res.data.map((s) => s.companyName))];
      setCompanies(uniqueCompanies);
    } catch (error) {
      console.error("Error fetching current stock:", error);
    } finally {
      setLoading(false);
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

  const fetchLocations = async () => {
    try {
      const res = await API.get("/locations");
      const unique = Array.from(
        new Map(res.data.map((loc) => [loc.name, loc])).values()
      );
      setLocations(unique);
    } catch (err) {
      console.error("Error fetching locations:", err);
    }
  };

  useEffect(() => {
    let filtered = [...stock];
    const lower = searchText.toLowerCase();

    if (searchText.trim()) {
      filtered = filtered.filter(
        (entry) =>
          (entry.item && entry.item.toLowerCase().includes(lower)) ||
          (entry.modelNo && entry.modelNo.toLowerCase().includes(lower)) ||
          (entry.companyName && entry.companyName.toLowerCase().includes(lower))
      );
    }

    if (selectedWarehouse) {
      filtered = filtered.filter(
        (entry) => entry.warehouseId === selectedWarehouse
      );
    }

    if (selectedLocation) {
      filtered = filtered.filter(
        (entry) =>
          entry.location?.toLowerCase?.() ===
          locations.find((l) => l._id === selectedLocation)?.name?.toLowerCase()
      );
    }

    if (selectedCompany) {
      filtered = filtered.filter(
        (entry) => entry.companyName === selectedCompany
      );
    }

    setFilteredStock(filtered);
    setCurrentPage(1);
  }, [searchText, selectedWarehouse, selectedLocation, selectedCompany, stock]);

  const handleReset = () => {
    setSearchText("");
    setSelectedWarehouse("");
    setSelectedLocation("");
    setSelectedCompany("");
    setFilteredStock(stock);
    setCurrentPage(1);
  };

  const exportToExcel = () => {
    const data = filteredStock.map((entry, index) => ({
      "S.No.": index + 1,
      Item: entry.item,
      "Model No.": entry.modelNo,
      Company: entry.companyName,
      Warehouse: entry.warehouse,
      Location: entry.location || "",
      Quantity: entry.quantity,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Current Stock");

    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    saveAs(blob, "Current_Stock_Report.xlsx");
  };

  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentItems = filteredStock.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredStock.length / itemsPerPage);

  return (
    <div className="p-6 min-h-screen relative pb-24">
      <h2 className="text-2xl font-bold mb-4">📊 Current Stock Report</h2>

      <div className="flex flex-wrap gap-4 mb-4 items-center">
        <input
          type="text"
          placeholder="🔍 Search Item / Model / Company"
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

        <select
          value={selectedLocation}
          onChange={(e) => setSelectedLocation(e.target.value)}
          className="border px-3 py-2 rounded w-60">
          <option value="">📦 All Racks/Locations</option>
          {locations.map((loc) => (
            <option key={loc._id} value={loc._id}>
              {loc.name}
            </option>
          ))}
        </select>

        <select
          value={selectedCompany}
          onChange={(e) => setSelectedCompany(e.target.value)}
          className="border px-3 py-2 rounded w-60">
          <option value="">🏢 All Companies</option>
          {companies.map((comp, i) => (
            <option key={i} value={comp}>
              {comp}
            </option>
          ))}
        </select>

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

      {loading ? (
        <p className="text-blue-500">Loading stock data...</p>
      ) : currentItems.length === 0 ? (
        <p className="text-gray-600">No stock data found.</p>
      ) : (
        <div className="overflow-x-auto bg-white rounded shadow">
          <table className="w-full table-auto border border-gray-300 text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 border">S.No.</th>
                <th className="p-2 border">Item</th>
                <th className="p-2 border">Model</th>
                <th className="p-2 border">Company</th>
                <th className="p-2 border">Warehouse</th>
                <th className="p-2 border">Rack/Location</th>
                <th className="p-2 border">Qty Available</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.map((entry, index) => (
                <tr key={index} className="border-t hover:bg-gray-50">
                  <td className="p-2 border text-center">
                    {(currentPage - 1) * itemsPerPage + index + 1}
                  </td>
                  <td className="p-2 border">{entry.item}</td>
                  <td className="p-2 border">{entry.modelNo}</td>
                  <td className="p-2 border">{entry.companyName}</td>
                  <td className="p-2 border">{entry.warehouse}</td>
                  <td className="p-2 border">{entry.location || "—"}</td>
                  <td
                    className={`p-2 border font-semibold ${
                      entry.quantity < 0
                        ? "text-red-500"
                        : entry.quantity === 0
                        ? "text-gray-500"
                        : "text-green-600"
                    }`}>
                    {entry.quantity}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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

export default CurrentStock;
