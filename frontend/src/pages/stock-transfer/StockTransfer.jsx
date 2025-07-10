import React, { useEffect, useState } from "react";
import API from "../../utils/axiosInstance";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const StockTransfer = () => {
  const [items, setItems] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [locations, setLocations] = useState([]);
  const [availableQty, setAvailableQty] = useState(null);
  const [prevRacks, setPrevRacks] = useState({});
  const [allStock, setAllStock] = useState([]);

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
    fetchCurrentStock();
    fetchWarehouses();
    fetchLocations();
  }, []);

  const fetchCurrentStock = async () => {
    try {
      const res = await API.get("/current-stock");
      setAllStock(res.data);
      const uniqueItems = Array.from(
        new Map(
          res.data.map((entry) => [
            entry.itemId,
            { _id: entry.itemId, name: entry.item, modelNo: entry.modelNo },
          ])
        ).values()
      );
      setItems(uniqueItems);
    } catch {
      toast.error("❌ Failed to fetch current stock.");
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

  // 🔄 Auto update availableQty when relevant fields change
  useEffect(() => {
    if (form.item && form.fromWarehouse && form.fromLocation !== undefined) {
      const match = allStock.find(
        (s) =>
          String(s.itemId) === String(form.item) &&
          String(s.warehouseId) === String(form.fromWarehouse) &&
          String(s.locationId || "") === String(form.fromLocation || "")
      );
      setAvailableQty(match?.quantity || 0);
    } else {
      setAvailableQty(null);
    }
  }, [form.item, form.fromWarehouse, form.fromLocation, allStock]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "fromWarehouse") {
      setPrevRacks((prev) => ({
        ...prev,
        [form.fromWarehouse]: form.fromLocation,
      }));
      const restored = prevRacks[value] || "";
      setForm((prev) => ({
        ...prev,
        fromWarehouse: value,
        fromLocation: restored,
      }));
      setAvailableQty(null);
      return;
    }

    if (name === "fromLocation") {
      setAvailableQty(null);
    }

    setForm((prev) => ({ ...prev, [name]: value }));
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

    if (!item || !fromWarehouse || !fromLocation || !toWarehouse || !quantity) {
      toast.error("❗ Please fill all required fields.");
      return;
    }

    if (
      String(fromWarehouse) === String(toWarehouse) &&
      String(fromLocation || "") === String(toLocation || "")
    ) {
      toast.error("❌ From and To locations must differ.");
      return;
    }

    if (availableQty === null) {
      toast.error("❌ Please select source rack/warehouse.");
      return;
    }

    if (parseInt(quantity) > availableQty) {
      toast.error(`❌ Only ${availableQty} units available.`);
      return;
    }

    try {
      await API.post("/stock-transfers", {
        ...form,
        quantity: parseInt(quantity),
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
      fetchCurrentStock();
    } catch (err) {
      toast.error(err.response?.data?.message || "❌ Transfer failed");
    }
  };

  const getFromLocations = (warehouseId) => {
    return locations.filter((loc) => {
      const wId =
        typeof loc.warehouse === "object" ? loc.warehouse._id : loc.warehouse;
      return String(wId) === String(warehouseId);
    });
  };

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
          {/* ITEM */}
          <div>
            <label className="block mb-1 text-sm font-medium">
              Select Item
            </label>
            <select
              name="item"
              value={form.item}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded px-3 py-2"
              required>
              <option value="">Select Item</option>
              {items.map((item) => (
                <option key={item._id} value={item._id}>
                  {item.name} ({item.modelNo})
                </option>
              ))}
            </select>
          </div>

          {/* FROM WAREHOUSE */}
          <div>
            <label className="block mb-1 text-sm font-medium">
              From Warehouse
            </label>
            <select
              name="fromWarehouse"
              value={form.fromWarehouse}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded px-3 py-2"
              required>
              <option value="">From Warehouse</option>
              {warehouses.map((wh) => (
                <option key={wh._id} value={wh._id}>
                  {wh.name}
                </option>
              ))}
            </select>
          </div>

          {/* FROM RACK */}
          <div>
            <label className="block mb-1 text-sm font-medium">From Rack</label>
            <select
              name="fromLocation"
              value={form.fromLocation}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded px-3 py-2"
              required>
              <option value="">Select Rack</option>
              {getFromLocations(form.fromWarehouse).map((loc) => (
                <option key={loc._id} value={loc._id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          {/* TO WAREHOUSE */}
          <div>
            <label className="block mb-1 text-sm font-medium">
              To Warehouse
            </label>
            <select
              name="toWarehouse"
              value={form.toWarehouse}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded px-3 py-2"
              required>
              <option value="">To Warehouse</option>
              {warehouses.map((wh) => (
                <option key={wh._id} value={wh._id}>
                  {wh.name}
                </option>
              ))}
            </select>
          </div>

          {/* TO RACK */}
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

          {/* QUANTITY */}
          <div>
            <label className="block mb-1 text-sm font-medium">
              Quantity (Available: {availableQty !== null ? availableQty : "-"})
            </label>
            <input
              type="number"
              name="quantity"
              value={form.quantity}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded px-3 py-2"
              placeholder="Enter quantity"
              required
              min="1"
            />
          </div>

          {/* REMARKS */}
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

          {/* SUBMIT */}
          <div className="md:col-span-2 mt-2">
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded">
              🔁 Transfer Stock
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StockTransfer;
