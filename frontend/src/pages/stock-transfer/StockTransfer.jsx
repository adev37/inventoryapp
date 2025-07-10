import React, { useEffect, useState } from "react";
import API from "../../utils/axiosInstance";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const StockTransfer = () => {
  const [items, setItems] = useState([]);
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

  const [prevRackMemory, setPrevRackMemory] = useState({}); // warehouseId => locationId

  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const [itemRes, warehouseRes, locationRes, stockRes] =
          await Promise.all([
            API.get("/items"),
            API.get("/warehouses"),
            API.get("/locations"),
            API.get("/current-stock"),
          ]);
        setItems(itemRes.data);
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

    // Handle memory of previous rack for each warehouse
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

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const {
      item,
      fromWarehouse,
      toWarehouse,
      fromLocation,
      toLocation,
      quantity,
      reason,
    } = form;

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
        item,
        fromWarehouse,
        toWarehouse,
        fromLocation,
        toLocation,
        quantity: parseInt(quantity),
        reason,
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
          {/* Item */}
          <div>
            <label className="block mb-1 font-medium">Item</label>
            <select
              name="item"
              value={form.item}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded">
              <option value="">Select Item</option>
              {items.map((i) => (
                <option key={i._id} value={i._id}>
                  {i.name} ({i.modelNo})
                </option>
              ))}
            </select>
          </div>

          {/* Qty */}
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

          {/* From WH */}
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

          {/* From Location */}
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

          {/* To WH */}
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

          {/* To Location */}
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

          {/* Reason */}
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
