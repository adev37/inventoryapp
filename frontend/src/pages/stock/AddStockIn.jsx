import React, { useEffect, useState } from "react";
import API from "../../utils/axiosInstance";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const AddStockIn = () => {
  // Items array for multiple stock-ins
  const [items, setItems] = useState([
    { item: "", warehouse: "", quantity: "" },
  ]);
  // To hold the visible search string for each item input
  const [itemSearch, setItemSearch] = useState([""]);
  // To hold the suggestions for current focused row
  const [itemSuggestions, setItemSuggestions] = useState([]);
  // To track which row is currently focused for autocomplete
  const [activeSuggestionIdx, setActiveSuggestionIdx] = useState(null);

  // Batch-wide fields
  const [date, setDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [allItems, setAllItems] = useState([]);
  const [allWarehouses, setAllWarehouses] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [itemRes, warehouseRes] = await Promise.all([
          API.get("/items"),
          API.get("/warehouses"),
        ]);
        setAllItems(itemRes.data);
        setAllWarehouses(warehouseRes.data);
      } catch (error) {
        toast.error("❌ Failed to load item or warehouse data.");
      }
    };
    fetchData();
  }, []);

  // --- Helpers for managing items and search arrays
  const handleItemChange = (index, e) => {
    const updated = [...items];
    updated[index][e.target.name] = e.target.value;
    setItems(updated);
  };

  // Handle the search string for autocomplete
  const handleItemSearch = (index, value) => {
    // Update search box value
    const updatedSearch = [...itemSearch];
    updatedSearch[index] = value;
    setItemSearch(updatedSearch);

    // Set active row index
    setActiveSuggestionIdx(index);

    // Show filtered suggestions
    if (value.length > 0) {
      setItemSuggestions(
        allItems.filter(
          (item) =>
            item.name.toLowerCase().includes(value.toLowerCase()) ||
            item.modelNo.toLowerCase().includes(value.toLowerCase())
        )
      );
      // Clear previous selection in form state
      handleItemChange(index, { target: { name: "item", value: "" } });
    } else {
      setItemSuggestions([]);
    }
  };

  const handleSelectSuggestion = (index, suggestion) => {
    // Set the item ID for this row
    handleItemChange(index, {
      target: { name: "item", value: suggestion._id },
    });
    // Set the visible value for this row
    const updatedSearch = [...itemSearch];
    updatedSearch[index] = `${suggestion.name} (${suggestion.modelNo})`;
    setItemSearch(updatedSearch);
    // Hide suggestions
    setItemSuggestions([]);
    setActiveSuggestionIdx(null);
  };

  const addItem = () => {
    setItems([...items, { item: "", warehouse: "", quantity: "" }]);
    setItemSearch([...itemSearch, ""]);
  };
  const removeItem = (idx) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== idx));
      setItemSearch(itemSearch.filter((_, i) => i !== idx));
    }
  };

  // Extra: Prevent double submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Optional: prevent duplicate item/warehouse combos
    const hasDuplicate = items.some(
      (item, idx) =>
        items.findIndex(
          (i) => i.item === item.item && i.warehouse === item.warehouse
        ) !== idx
    );
    if (hasDuplicate) {
      toast.error("❌ Duplicate item & warehouse entries found.");
      return;
    }

    setLoading(true);
    try {
      await API.post("/stock-in", {
        items,
        date,
        remarks,
      });
      toast.success("✅ Stock In recorded!");
      setItems([{ item: "", warehouse: "", quantity: "" }]);
      setItemSearch([""]);
      setDate("");
      setRemarks("");
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        "❌ Failed to record stock in. Please try again.";
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
      <div className="bg-white shadow-md p-6 rounded-lg max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-2">
          {items.map((itm, idx) => (
            <div
              key={idx}
              className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b pb-2 mb-2 relative">
              {/* Autocomplete Item Input */}
              <div className="relative">
                <label className="block mb-1 text-sm font-medium">
                  Search Item
                </label>
                <input
                  type="text"
                  value={itemSearch[idx] || ""}
                  onChange={(e) => handleItemSearch(idx, e.target.value)}
                  placeholder="Type to search item"
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  autoComplete="off"
                  required
                />
                {/* Suggestions Dropdown */}
                {itemSearch[idx] &&
                  activeSuggestionIdx === idx &&
                  itemSuggestions.length > 0 && (
                    <ul className="absolute bg-white border border-gray-200 rounded shadow z-10 w-full max-h-44 overflow-auto mt-1">
                      {itemSuggestions.map((suggestion) => (
                        <li
                          key={suggestion._id}
                          className="px-3 py-2 cursor-pointer hover:bg-blue-100"
                          onClick={() =>
                            handleSelectSuggestion(idx, suggestion)
                          }>
                          {suggestion.name} ({suggestion.modelNo})
                        </li>
                      ))}
                    </ul>
                  )}
              </div>
              {/* Warehouse Select */}
              <div>
                <label className="block mb-1 text-sm font-medium">
                  Select Warehouse
                </label>
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
              {/* Quantity Input */}
              <div>
                <label className="block mb-1 text-sm font-medium">
                  Quantity
                </label>
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
              {/* Remove Button */}
              {items.length > 1 && (
                <div className="md:col-span-3 flex justify-end">
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
          {/* Add Another Item Button */}
          <button
            type="button"
            onClick={addItem}
            className="bg-blue-500 text-white px-3 py-1 rounded mb-3">
            + Add Another Item
          </button>
          {/* Batch-wide fields below */}
          <div>
            <label className="block mb-1 text-sm font-medium">Date</label>
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
            <label className="block mb-1 text-sm font-medium">Remarks</label>
            <input
              name="remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Remarks"
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-semibold transition duration-200 mt-2 ${
              loading && "opacity-60 cursor-not-allowed"
            }`}>
            {loading ? "Saving..." : "💾 Save Stock In"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddStockIn;
