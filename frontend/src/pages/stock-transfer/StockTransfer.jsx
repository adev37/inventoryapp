import React, { useEffect, useState } from "react";
import API from "../../utils/axiosInstance";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const StockTransfer = () => {
  const [items, setItems] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [locations, setLocations] = useState([]);
  const [availableQty, setAvailableQty] = useState(null);

  const [form, setForm] = useState({
    item: "",
    fromWarehouse: "",
    fromLocation: "",
    toWarehouse: "",
    toLocation: "",
    quantity: "",
    note: "",
  });

  useEffect(() => {
    fetchItems();
    fetchWarehouses();
    fetchLocations();
  }, []);

  const fetchItems = async () => {
    try {
      const res = await API.get("/items");
      setItems(res.data);
    } catch {
      toast.error("❌ Failed to fetch items.");
    }
  };

  const fetchWarehouses = async () => {
    try {
      const res = await API.get("/warehouses");
      setWarehouses(res.data);
    } catch {
      toast.error("❌ Failed to fetch warehouses.");
    }
  };

  const fetchLocations = async () => {
    try {
      const res = await API.get("/locations");
      setLocations(res.data);
    } catch {
      toast.error("❌ Failed to fetch locations.");
    }
  };

  const fetchAvailableQty = async () => {
    if (form.item && form.fromWarehouse && form.fromLocation) {
      try {
        const res = await API.get("/stock-transfers/available", {
          params: {
            item: form.item,
            warehouse: form.fromWarehouse,
            location: form.fromLocation,
          },
        });
        setAvailableQty(res.data.quantity || 0);
      } catch (err) {
        console.error("Failed to fetch qty:", err);
        toast.error("❌ Failed to fetch available stock.");
        setAvailableQty(null);
      }
    } else {
      setAvailableQty(null);
    }
  };

  useEffect(() => {
    fetchAvailableQty();
  }, [form.item, form.fromWarehouse, form.fromLocation]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const {
      item,
      fromWarehouse,
      fromLocation,
      toWarehouse,
      toLocation,
      quantity,
    } = form;

    if (fromWarehouse === toWarehouse && fromLocation === toLocation) {
      toast.error("❌ From and To locations must differ.");
      return;
    }

    if (!item || !fromWarehouse || !fromLocation || !toWarehouse || !quantity) {
      toast.error("❗ Please fill all required fields.");
      return;
    }

    if (availableQty === null) {
      toast.error("❌ Please select source warehouse and rack.");
      return;
    }

    if (parseInt(quantity) > availableQty) {
      toast.error(`❌ Only ${availableQty} units available.`);
      return;
    }

    try {
      await API.post("/stock-transfers", {
        ...form,
        quantity: parseInt(quantity) || 0,
      });

      toast.success("✅ Stock transfer successful");

      setForm({
        item: "",
        fromWarehouse: "",
        fromLocation: "",
        toWarehouse: "",
        toLocation: "",
        quantity: "",
        note: "",
      });
      setAvailableQty(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "❌ Transfer failed");
    }
  };

  const getFromLocations = (warehouseId) =>
    locations.filter((loc) => {
      const locWarehouseId =
        typeof loc.warehouse === "object" ? loc.warehouse._id : loc.warehouse;
      return locWarehouseId === warehouseId;
    });

  const getToLocations = () => {
    const seen = new Set();
    return locations.filter((loc) => {
      if (seen.has(loc.name)) return false;
      seen.add(loc.name);
      return true;
    });
  };

  return (
    <div className="p-6">
      <ToastContainer position="top-right" autoClose={3000} />
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        🔁 Stock Transfer
      </h2>

      <div className="bg-white shadow-md p-6 rounded-lg max-w-3xl">
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block mb-1 text-sm font-medium">
              Select Item
            </label>
            <select
              name="item"
              value={form.item}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded px-3 py-2">
              <option value="">Select Item</option>
              {items.map((item) => (
                <option key={item._id} value={item._id}>
                  {item.name} ({item.modelNo})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">
              From Warehouse
            </label>
            <select
              name="fromWarehouse"
              value={form.fromWarehouse}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded px-3 py-2">
              <option value="">From Warehouse</option>
              {warehouses.map((wh) => (
                <option key={wh._id} value={wh._id}>
                  {wh.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">From Rack</label>
            <select
              name="fromLocation"
              value={form.fromLocation}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded px-3 py-2">
              <option value="">Select Rack</option>
              {getFromLocations(form.fromWarehouse).map((loc) => (
                <option key={loc._id} value={loc._id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">
              To Warehouse
            </label>
            <select
              name="toWarehouse"
              value={form.toWarehouse}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded px-3 py-2">
              <option value="">To Warehouse</option>
              {warehouses.map((wh) => (
                <option key={wh._id} value={wh._id}>
                  {wh.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">To Rack</label>
            <select
              name="toLocation"
              value={form.toLocation}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded px-3 py-2">
              <option value="">Select Rack</option>
              {getToLocations().map((loc) => (
                <option key={loc._id} value={loc._id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">
              Quantity (Available: {availableQty !== null ? availableQty : "-"})
            </label>
            <input
              type="number"
              name="quantity"
              value={form.quantity}
              onChange={handleChange}
              required
              min="1"
              placeholder="Enter quantity"
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block mb-1 text-sm font-medium">Remarks</label>
            <input
              type="text"
              name="note"
              value={form.note}
              onChange={handleChange}
              placeholder="Any remarks or notes"
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>

          <div className="md:col-span-2 mt-2">
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded transition duration-200">
              🔁 Transfer Stock
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StockTransfer;
