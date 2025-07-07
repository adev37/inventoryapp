import { useEffect, useState } from "react";
import API from "../../utils/axiosInstance";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const AdjustStock = () => {
  const [items, setItems] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [locations, setLocations] = useState([]);
  const [availableQty, setAvailableQty] = useState(null);

  const [form, setForm] = useState({
    item: "",
    warehouse: "",
    location: "",
    quantity: "",
    action: "IN",
    reason: "",
  });

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [itemsRes, warehouseRes, locationRes] = await Promise.all([
          API.get("/items"),
          API.get("/warehouses"),
          API.get("/locations"),
        ]);
        setItems(itemsRes.data);
        setWarehouses(warehouseRes.data);
        setLocations(locationRes.data);
      } catch (err) {
        toast.error("❌ Failed to load initial data.");
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    const fetchAvailable = async () => {
      const { item, warehouse, location } = form;
      if (item && warehouse) {
        try {
          const res = await API.get("/current-stock");

          const matches = res.data.filter(
            (e) =>
              e.itemId === item &&
              e.warehouseId === warehouse &&
              (location
                ? e.location?.trim?.().toLowerCase() ===
                  locations.find((l) => l._id === location)?.name?.toLowerCase()
                : true)
          );

          const totalQty = matches.reduce((sum, row) => sum + row.quantity, 0);
          setAvailableQty(totalQty);
        } catch {
          setAvailableQty(null);
          toast.error("⚠️ Couldn't fetch available stock.");
        }
      }
    };
    fetchAvailable();
  }, [form.item, form.warehouse, form.location, locations]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.item || !form.warehouse || !form.quantity || !form.reason) {
      toast.error("❗ Please fill in all fields.");
      return;
    }

    if (form.action === "OUT" && parseInt(form.quantity) > availableQty) {
      toast.error("❌ Cannot adjust more than available stock.");
      return;
    }

    try {
      const res = await API.post("/stock-adjustments", {
        ...form,
        quantity: parseInt(form.quantity),
      });

      toast.success(res.data.message);
      setForm({
        item: "",
        warehouse: "",
        location: "",
        quantity: "",
        action: "IN",
        reason: "",
      });
      setAvailableQty(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "❌ Failed to adjust stock.");
    }
  };

  // ✅ Deduplicate locations by name
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
      <ToastContainer position="top-right" autoClose={3000} />
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        🛠️ Stock Adjustment
      </h2>

      <div className="bg-white shadow-md p-6 rounded-lg max-w-3xl">
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Item */}
          <div>
            <label className="block mb-1 text-sm font-medium">
              Select Item
            </label>
            <select
              name="item"
              value={form.item}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded px-3 py-2">
              <option value="">Select Item</option>
              {items.map((i) => (
                <option key={i._id} value={i._id}>
                  {i.name} ({i.modelNo})
                </option>
              ))}
            </select>
          </div>

          {/* Warehouse */}
          <div>
            <label className="block mb-1 text-sm font-medium">
              Select Warehouse
            </label>
            <select
              name="warehouse"
              value={form.warehouse}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded px-3 py-2">
              <option value="">Select Warehouse</option>
              {warehouses.map((w) => (
                <option key={w._id} value={w._id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          {/* Location (Optional) */}
          <div>
            <label className="block mb-1 text-sm font-medium">
              Rack / Location (Optional)
            </label>
            <select
              name="location"
              value={form.location}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded px-3 py-2">
              <option value="">— Select Location —</option>
              {getUniqueLocations().map((loc) => (
                <option key={loc._id} value={loc._id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Action */}
          <div>
            <label className="block mb-1 text-sm font-medium">Action</label>
            <select
              name="action"
              value={form.action}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded px-3 py-2">
              <option value="IN">Increase Stock (IN)</option>
              <option value="OUT">Decrease Stock (OUT)</option>
            </select>
          </div>

          {/* Quantity */}
          <div>
            <label className="block mb-1 text-sm font-medium">Quantity</label>
            <input
              type="number"
              name="quantity"
              value={form.quantity}
              onChange={handleChange}
              placeholder={`Qty (Available: ${availableQty ?? "-"})`}
              min="1"
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>

          {/* Reason */}
          <div className="md:col-span-2">
            <label className="block mb-1 text-sm font-medium">
              Reason / Remarks
            </label>
            <input
              type="text"
              name="reason"
              value={form.reason}
              onChange={handleChange}
              placeholder="Reason for adjustment"
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>

          <div className="col-span-1 md:col-span-2 mt-2">
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-semibold transition duration-200">
              Adjust Stock
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdjustStock;
