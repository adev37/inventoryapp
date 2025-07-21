import React, { useEffect, useState } from "react";
import API from "../../utils/axiosInstance";

const StockInReport = () => {
  const [entries, setEntries] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [minQty, setMinQty] = useState("");
  const [maxQty, setMaxQty] = useState("");

  const [warehouses, setWarehouses] = useState([]);
  const [locations, setLocations] = useState([]);
  const [companies, setCompanies] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [stockRes, warehouseRes, locationRes] = await Promise.all([
        API.get("/stock-in"),
        API.get("/warehouses"),
        API.get("/locations"),
      ]);

      setEntries(stockRes.data);
      setFiltered(stockRes.data);
      setWarehouses(warehouseRes.data);
      setLocations(locationRes.data);

      const allCompanies = [
        ...new Set(
          stockRes.data.map((e) => e.item?.companyName).filter(Boolean)
        ),
      ];
      setCompanies(allCompanies);
    } catch (err) {
      console.error("Error fetching Stock In data:", err);
    }
  };

  useEffect(() => {
    let data = [...entries];
    const q = searchText.toLowerCase();

    if (searchText.trim()) {
      data = data.filter(
        (e) =>
          e.item?.name?.toLowerCase().includes(q) ||
          e.item?.modelNo?.toLowerCase().includes(q)
      );
    }

    if (warehouseFilter) {
      data = data.filter((e) => e.warehouse?._id === warehouseFilter);
    }

    if (locationFilter) {
      data = data.filter((e) => e.location?._id === locationFilter);
    }

    if (companyFilter) {
      data = data.filter((e) => e.item?.companyName === companyFilter);
    }

    if (minQty) {
      data = data.filter((e) => e.quantity >= parseInt(minQty));
    }

    if (maxQty) {
      data = data.filter((e) => e.quantity <= parseInt(maxQty));
    }

    setFiltered(data);
  }, [
    entries,
    searchText,
    warehouseFilter,
    locationFilter,
    companyFilter,
    minQty,
    maxQty,
  ]);

  // 🔄 Deduplicate rack locations by name
  const uniqueRackLocations = [
    ...new Map(locations.map((l) => [l.name, l])).values(),
  ];

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">📥 Stock In Report</h2>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-4">
        <input
          type="text"
          placeholder="🔍 Search Item / Model"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="border px-3 py-2 rounded w-60"
        />

        <select
          value={warehouseFilter}
          onChange={(e) => setWarehouseFilter(e.target.value)}
          className="border px-3 py-2 rounded w-60">
          <option value="">🏬 All Warehouses</option>
          {warehouses.map((w) => (
            <option key={w._id} value={w._id}>
              {w.name}
            </option>
          ))}
        </select>

        <select
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
          className="border px-3 py-2 rounded w-60">
          <option value="">📦 All Racks</option>
          {uniqueRackLocations.map((l) => (
            <option key={l._id} value={l._id}>
              {l.name}
            </option>
          ))}
        </select>

        <select
          value={companyFilter}
          onChange={(e) => setCompanyFilter(e.target.value)}
          className="border px-3 py-2 rounded w-60">
          <option value="">🏢 All Companies</option>
          {companies.map((c, idx) => (
            <option key={idx} value={c}>
              {c}
            </option>
          ))}
        </select>

        <input
          type="number"
          placeholder="Min Qty"
          value={minQty}
          onChange={(e) => setMinQty(e.target.value)}
          className="border px-3 py-2 rounded w-28"
        />

        <input
          type="number"
          placeholder="Max Qty"
          value={maxQty}
          onChange={(e) => setMaxQty(e.target.value)}
          className="border px-3 py-2 rounded w-28"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white rounded shadow">
        <table className="w-full table-auto border border-gray-300 text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border">Item</th>
              <th className="p-2 border">Model No</th>
              <th className="p-2 border">Company</th>
              <th className="p-2 border">Warehouse</th>
              <th className="p-2 border">Rack</th>
              <th className="p-2 border">Qty</th>
              <th className="p-2 border">Date</th>
              <th className="p-2 border">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e, idx) => (
              <tr key={idx} className="border-t hover:bg-gray-50">
                <td className="p-2 border">{e.item?.name}</td>
                <td className="p-2 border">{e.item?.modelNo}</td>
                <td className="p-2 border">{e.item?.companyName || "—"}</td>
                <td className="p-2 border">{e.warehouse?.name}</td>
                <td className="p-2 border">{e.location?.name || "—"}</td>
                <td className="p-2 border">{e.quantity}</td>
                <td className="p-2 border">
                  {e.date ? new Date(e.date).toLocaleDateString() : "—"}
                </td>
                <td className="p-2 border">{e.remarks || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StockInReport;
