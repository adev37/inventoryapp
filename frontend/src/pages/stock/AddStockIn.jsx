import React, { useEffect, useState } from "react";
import API from "../../utils/axiosInstance";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const AddStockIn = () => {
  const [items, setItems] = useState([
    { item: "", warehouse: "", quantity: "", location: "" },
  ]);
  const [itemSearch, setItemSearch] = useState([""]);
  const [itemSuggestions, setItemSuggestions] = useState([]);
  const [activeSuggestionIdx, setActiveSuggestionIdx] = useState(null);

  const [date, setDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [allItems, setAllItems] = useState([]);
  const [allWarehouses, setAllWarehouses] = useState([]);
  const [allLocations, setAllLocations] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [itemRes, warehouseRes, locationRes] = await Promise.all([
          API.get("/items"),
          API.get("/warehouses"),
          API.get("/locations"),
        ]);
        setAllItems(itemRes.data);
        setAllWarehouses(warehouseRes.data);
        setAllLocations(locationRes.data);
      } catch (error) {
        toast.error("❌ Failed to load item, warehouse, or location data.");
      }
    };
    fetchData();
  }, []);

  const handleItemChange = (index, e) => {
    const updated = [...items];
    updated[index][e.target.name] = e.target.value;
    setItems(updated);
  };

  const handleItemSearch = (index, value) => {
    const updatedSearch = [...itemSearch];
    updatedSearch[index] = value;
    setItemSearch(updatedSearch);
    setActiveSuggestionIdx(index);

    if (value.length > 0) {
      setItemSuggestions(
        allItems.filter(
          (item) =>
            item.name.toLowerCase().includes(value.toLowerCase()) ||
            item.modelNo.toLowerCase().includes(value.toLowerCase())
        )
      );
      handleItemChange(index, { target: { name: "item", value: "" } });
    } else {
      setItemSuggestions([]);
    }
  };

  const handleSelectSuggestion = (index, suggestion) => {
    handleItemChange(index, {
      target: { name: "item", value: suggestion._id },
    });
    const updatedSearch = [...itemSearch];
    updatedSearch[index] = `${suggestion.name} (${suggestion.modelNo})`;
    setItemSearch(updatedSearch);
    setItemSuggestions([]);
    setActiveSuggestionIdx(null);
  };

  const addItem = () => {
    setItems([
      ...items,
      { item: "", warehouse: "", quantity: "", location: "" },
    ]);
    setItemSearch([...itemSearch, ""]);
  };

  const removeItem = (idx) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== idx));
      setItemSearch(itemSearch.filter((_, i) => i !== idx));
    }
  };

  const getLocationsForWarehouse = (warehouseId) => {
    return allLocations.filter((l) => {
      const locWarehouse =
        typeof l.warehouse === "object" ? l.warehouse._id : l.warehouse;
      return locWarehouse === warehouseId;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const hasDuplicate = items.some(
      (item, idx) =>
        items.findIndex(
          (i) =>
            i.item === item.item &&
            i.warehouse === item.warehouse &&
            i.location === item.location
        ) !== idx
    );
    if (hasDuplicate) {
      toast.error("❌ Duplicate item, warehouse & location entries found.");
      return;
    }

    setLoading(true);
    try {
      await API.post("/stock-in", { items, date, remarks });
      toast.success("✅ Stock In recorded!");
      setItems([{ item: "", warehouse: "", quantity: "", location: "" }]);
      setItemSearch([""]);
      setDate("");
      setRemarks("");
    } catch (err) {
      const msg =
        err?.response?.data?.message || "❌ Failed to record stock in.";
      toast.error(msg);
    }
    setLoading(false);
  };

  return (
    <div className="p-6">
      <ToastContainer position="top-right" autoClose={3000} />
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        📥 Stock In
      </h2>
      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-md p-6 rounded-lg">
        {items.map((itm, idx) => (
          <div
            key={idx}
            className="grid md:grid-cols-4 gap-4 border-b pb-4 mb-4 relative">
            {/* Search Item */}
            <div className="relative">
              <label className="block mb-1">Search Item</label>
              <input
                type="text"
                value={itemSearch[idx] || ""}
                onChange={(e) => handleItemSearch(idx, e.target.value)}
                placeholder="Type to search item"
                className="w-full border border-gray-300 rounded px-3 py-2"
                required
                autoComplete="off"
              />
              {itemSearch[idx] &&
                activeSuggestionIdx === idx &&
                itemSuggestions.length > 0 && (
                  <ul className="absolute z-10 bg-white border rounded shadow w-full max-h-48 overflow-auto">
                    {itemSuggestions.map((s) => (
                      <li
                        key={s._id}
                        className="px-3 py-2 cursor-pointer hover:bg-blue-100"
                        onClick={() => handleSelectSuggestion(idx, s)}>
                        {s.name} ({s.modelNo})
                      </li>
                    ))}
                  </ul>
                )}
            </div>

            {/* Warehouse */}
            <div>
              <label className="block mb-1">Warehouse</label>
              <select
                name="warehouse"
                value={itm.warehouse}
                onChange={(e) => handleItemChange(idx, e)}
                required
                className="w-full border border-gray-300 rounded px-3 py-2">
                <option value="">Select Warehouse</option>
                {allWarehouses.map((w) => (
                  <option key={w._id} value={w._id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Rack */}
            <div>
              <label className="block mb-1">Rack Location</label>
              <select
                name="location"
                value={itm.location}
                onChange={(e) => handleItemChange(idx, e)}
                className="w-full border border-gray-300 rounded px-3 py-2">
                <option value="">Select Rack</option>
                {getLocationsForWarehouse(itm.warehouse).map((l) => (
                  <option key={l._id} value={l._id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity */}
            <div>
              <label className="block mb-1">Quantity</label>
              <input
                name="quantity"
                type="number"
                value={itm.quantity}
                onChange={(e) => handleItemChange(idx, e)}
                placeholder="Enter quantity"
                required
                className="w-full border border-gray-300 rounded px-3 py-2"
                min={1}
              />
            </div>

            {items.length > 1 && (
              <div className="col-span-4 text-right">
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  className="text-red-500 text-sm">
                  Remove Item
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Add Another Item */}
        <button
          type="button"
          onClick={addItem}
          className="bg-blue-500 text-white px-3 py-1 rounded mb-4">
          + Add Another Item
        </button>

        {/* Date and Remarks */}
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block mb-1">Date</label>
            <input
              name="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block mb-1">Remarks</label>
            <input
              name="remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Remarks"
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-semibold transition duration-200 ${
            loading && "opacity-60 cursor-not-allowed"
          }`}>
          {loading ? "Saving..." : "💾 Save Stock In"}
        </button>
      </form>
    </div>
  );
};

export default AddStockIn;
