import React, { useEffect, useState } from "react";
import API from "../../utils/axiosInstance";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const StockTransfer = () => {
  const [items, setItems] = useState([]);
  const [itemSearch, setItemSearch] = useState("");
  const [itemSuggestions, setItemSuggestions] = useState([]);
  const [activeSuggestion, setActiveSuggestion] = useState(false);

  const [warehouses, setWarehouses] = useState([]);
  const [locations, setLocations] = useState([]);
  const [currentStock, setCurrentStock] = useState([]);
  const [availableQty, setAvailableQty] = useState(null);

  const [form, setForm] = useState({
    item: "",
    fromWarehouse: "",
    toWarehouse: "",
    fromLocation: "",
    toLocation: "",
    quantity: "",
    reason: "",
  });

  const [prevRackMemory, setPrevRackMemory] = useState({});

  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const [itemsRes, warehouseRes, locationRes, stockRes] =
          await Promise.all([
            API.get("/items"),
            API.get("/warehouses"),
            API.get("/locations"),
            API.get("/current-stock"),
          ]);
        setItems(itemsRes.data);
        setWarehouses(warehouseRes.data);
        setLocations(locationRes.data);
        setCurrentStock(stockRes.data);
      } catch (err) {
        toast.error("❌ Failed to load data");
      }
    };
    fetchInitial();
  }, []);

  useEffect(() => {
    const { item, fromWarehouse, fromLocation } = form;
    if (!item || !fromWarehouse) {
      setAvailableQty(null);
      return;
    }

    const matched = currentStock.filter((e) => {
      const matchItem = e.itemId === item;
      const matchWH = e.warehouseId === fromWarehouse;
      const matchLoc = fromLocation
        ? e.location?.toLowerCase() ===
          locations.find((l) => l._id === fromLocation)?.name?.toLowerCase()
        : true;
      return matchItem && matchWH && matchLoc;
    });

    const total = matched.reduce((sum, row) => sum + row.quantity, 0);
    setAvailableQty(total);
  }, [
    form.item,
    form.fromWarehouse,
    form.fromLocation,
    currentStock,
    locations,
  ]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "fromWarehouse") {
      setPrevRackMemory((prev) => ({
        ...prev,
        [form.fromWarehouse]: form.fromLocation,
      }));
      const restoredRack = prevRackMemory[value] || "";
      setForm((prev) => ({
        ...prev,
        fromWarehouse: value,
        fromLocation: restoredRack,
      }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleItemSearch = (value) => {
    setItemSearch(value);
    setActiveSuggestion(true);
    setItemSuggestions(
      items.filter(
        (item) =>
          item.name.toLowerCase().includes(value.toLowerCase()) ||
          item.modelNo.toLowerCase().includes(value.toLowerCase())
      )
    );
    setForm((prev) => ({ ...prev, item: "" }));
  };

  const handleSelectSuggestion = (suggestion) => {
    setForm((prev) => ({ ...prev, item: suggestion._id }));
    setItemSearch(`${suggestion.name} (${suggestion.modelNo})`);
    setItemSuggestions([]);
    setActiveSuggestion(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { item, fromWarehouse, toWarehouse, quantity, reason } = form;

    if (!item || !fromWarehouse || !toWarehouse || !quantity || !reason) {
      toast.error("⚠️ Please fill all required fields.");
      return;
    }

    if (fromWarehouse === toWarehouse) {
      toast.error("⚠️ Source and destination warehouse cannot be the same.");
      return;
    }

    if (parseInt(quantity) > availableQty) {
      toast.error("❌ Quantity exceeds available stock.");
      return;
    }

    try {
      const res = await API.post("/stock-transfers", {
        ...form,
        quantity: parseInt(quantity),
        date: new Date(),
      });
      toast.success(res.data.message);
      setForm({
        item: "",
        fromWarehouse: "",
        toWarehouse: "",
        fromLocation: "",
        toLocation: "",
        quantity: "",
        reason: "",
      });
      setItemSearch("");
      setAvailableQty(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Transfer failed.");
    }
  };

  const getUniqueLocations = () => {
    const seen = new Set();
    return locations.filter((loc) => {
      if (seen.has(loc.name)) return false;
      seen.add(loc.name);
      return true;
    });
  };

  return (
    <div className="p-6">
      <ToastContainer position="top-right" />
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        🔁 Stock Transfer
      </h2>

      <div className="bg-white shadow-md p-6 rounded-lg max-w-3xl">
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <label className="block mb-1 font-medium">Search Item</label>
            <input
              type="text"
              value={itemSearch}
              onChange={(e) => handleItemSearch(e.target.value)}
              placeholder="Type to search item"
              className="w-full border px-3 py-2 rounded"
              autoComplete="off"
              required
            />
            {itemSearch && activeSuggestion && itemSuggestions.length > 0 && (
              <ul className="absolute z-10 bg-white border rounded shadow w-full max-h-48 overflow-auto">
                {itemSuggestions.map((s) => (
                  <li
                    key={s._id}
                    className="px-3 py-2 cursor-pointer hover:bg-blue-100"
                    onClick={() => handleSelectSuggestion(s)}>
                    {s.name} ({s.modelNo})
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <label className="block mb-1 font-medium">Quantity</label>
            <input
              type="number"
              name="quantity"
              min="1"
              value={form.quantity}
              onChange={handleChange}
              placeholder={`Qty (Available: ${availableQty ?? "-"})`}
              className="w-full border px-3 py-2 rounded"
            />
          </div>

          <div>
            <label className="block mb-1 font-medium">From Warehouse</label>
            <select
              name="fromWarehouse"
              value={form.fromWarehouse}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded">
              <option value="">Select Warehouse</option>
              {warehouses.map((w) => (
                <option key={w._id} value={w._id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1 font-medium">
              From Rack / Location
            </label>
            <select
              name="fromLocation"
              value={form.fromLocation}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded">
              <option value="">— Optional —</option>
              {getUniqueLocations().map((loc) => (
                <option key={loc._id} value={loc._id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1 font-medium">To Warehouse</label>
            <select
              name="toWarehouse"
              value={form.toWarehouse}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded">
              <option value="">Select Warehouse</option>
              {warehouses.map((w) => (
                <option key={w._id} value={w._id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1 font-medium">To Rack / Location</label>
            <select
              name="toLocation"
              value={form.toLocation}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded">
              <option value="">— Optional —</option>
              {getUniqueLocations().map((loc) => (
                <option key={loc._id} value={loc._id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block mb-1 font-medium">Reason</label>
            <input
              type="text"
              name="reason"
              value={form.reason}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
              placeholder="Reason for transfer"
            />
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded mt-2">
              Transfer Stock
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StockTransfer;
