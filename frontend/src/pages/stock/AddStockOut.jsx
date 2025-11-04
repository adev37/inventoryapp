// src/pages/stock/AddStockOut.jsx
import React, { useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  useGetItemsQuery,
  useGetWarehousesQuery,
  useLazyGetCurrentStockQuery,
  useCreateStockOutMutation,
} from "../../services/inventoryApi";

const AddStockOut = () => {
  const { data: itemsResult = [] } = useGetItemsQuery();
  const { data: allWarehouses = [] } = useGetWarehousesQuery();
  const [createStockOut, { isLoading }] = useCreateStockOutMutation();

  const allItems = Array.isArray(itemsResult)
    ? itemsResult
    : Array.isArray(itemsResult.items)
    ? itemsResult.items
    : [];

  const [triggerGetCurrentStock] = useLazyGetCurrentStockQuery();

  const [items, setItems] = useState([
    { item: "", warehouse: "", location: "", quantity: "" },
  ]);
  const [itemSearch, setItemSearch] = useState([""]);
  const [itemSuggestions, setItemSuggestions] = useState([]);
  const [activeSuggestionIdx, setActiveSuggestionIdx] = useState(null);
  const [purpose, setPurpose] = useState("");
  const [reason, setReason] = useState("");
  const [tenderNo, setTenderNo] = useState("");
  const [date, setDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [rackOptions, setRackOptions] = useState({});

  const fetchRackOptions = async (index, item, warehouse) => {
    try {
      const data = await triggerGetCurrentStock(
        `item=${encodeURIComponent(item)}&warehouse=${encodeURIComponent(
          warehouse
        )}`
      ).unwrap();
      const valid = (data || []).filter((entry) => entry.quantity > 0);
      setRackOptions((prev) => ({ ...prev, [index]: valid }));
    } catch (err) {
      console.error("Rack fetch error:", err);
      toast.error("Failed to fetch rack info");
      setRackOptions((prev) => ({ ...prev, [index]: [] }));
    }
  };

  const handleItemChange = (index, e) => {
    const { name, value } = e.target;
    setItems((prev) => {
      const updated = [...prev];
      updated[index][name] = value;

      if (name === "item" || name === "warehouse") {
        updated[index].location = "";
        setRackOptions((opts) => ({ ...opts, [index]: [] }));
        const { item, warehouse } = updated[index];
        if (item && warehouse) fetchRackOptions(index, item, warehouse);
      }
      return updated;
    });
  };

  const handleItemSearch = (index, value) => {
    setItemSearch((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
    setActiveSuggestionIdx(index);

    if (value.trim()) {
      const q = value.toLowerCase();
      const filtered = allItems.filter(
        (i) =>
          i.name?.toLowerCase().includes(q) ||
          i.modelNo?.toLowerCase().includes(q)
      );
      setItemSuggestions(filtered);
      handleItemChange(index, { target: { name: "item", value: "" } });
    } else {
      setItemSuggestions([]);
    }
  };

  const handleSelectSuggestion = (index, suggestion) => {
    handleItemChange(index, { target: { name: "item", value: suggestion._id } });
    setItemSearch((prev) => {
      const next = [...prev];
      next[index] = `${suggestion.name} (${suggestion.modelNo})`;
      return next;
    });
    setItemSuggestions([]);
    setActiveSuggestionIdx(null);
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { item: "", warehouse: "", location: "", quantity: "" },
    ]);
    setItemSearch((prev) => [...prev, ""]);
  };

  const removeItem = (idx) => {
    if (items.length > 1) {
      setItems((prev) => prev.filter((_, i) => i !== idx));
      setItemSearch((prev) => prev.filter((_, i) => i !== idx));
      setRackOptions((prev) => {
        const { [idx]: _removed, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        items: items.map((itm) => ({
          item: itm.item,
          warehouse: itm.warehouse,
          location: itm.location || null,
          quantity: Number(itm.quantity),
        })),
        purpose,
        reason,
        tenderNo,
        date,
        returnDate: purpose === "Demo" ? returnDate : null,
      };

      await createStockOut(payload).unwrap();
      toast.success("✅ Stock Out successful");

      setItems([{ item: "", warehouse: "", location: "", quantity: "" }]);
      setItemSearch([""]);
      setPurpose("");
      setReason("");
      setTenderNo("");
      setDate("");
      setReturnDate("");
      setRackOptions({});
    } catch (err) {
      toast.error(err?.data?.message || "❌ Stock Out failed.");
    }
  };

  return (
    <div className="p-6">
      <ToastContainer position="top-right" autoClose={4000} theme="colored" />
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">📤 Stock Out</h2>

      {/* match Stock In width behavior; prevent overflow */}
      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-md p-6 rounded-lg"
      >
        {items.map((itm, idx) => (
          <div
            key={idx}
            className="grid [grid-template-columns:2fr_1fr_1fr_0.5fr] gap-4 border-b pb-4 mb-4 relative"
          >
            {/* Search Item (same width as Stock In) */}
            <div className="relative min-w-0">
              <label className="block mb-1">Search Item</label>
              <input
                type="text"
                value={itemSearch[idx] || ""}
                onChange={(e) => handleItemSearch(idx, e.target.value)}
                placeholder="Type to search item"
                className="w-full border px-3 py-2 rounded"
                required
              />
              {itemSearch[idx] &&
                activeSuggestionIdx === idx &&
                itemSuggestions.length > 0 && (
                  <ul className="absolute z-10 bg-white border rounded shadow w-full max-h-48 overflow-auto">
                    {itemSuggestions.map((s) => (
                      <li
                        key={s._id}
                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                        onClick={() => handleSelectSuggestion(idx, s)}
                      >
                        {s.name} ({s.modelNo})
                      </li>
                    ))}
                  </ul>
                )}
            </div>

            {/* Warehouse */}
            <div className="min-w-0">
              <label className="block mb-1">Warehouse</label>
              <select
                name="warehouse"
                value={itm.warehouse}
                onChange={(e) => handleItemChange(idx, e)}
                className="w-full border px-3 py-2 rounded"
                required
              >
                <option value="">Select Warehouse</option>
                {(allWarehouses || []).map((w) => (
                  <option key={w._id} value={w._id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Rack Location */}
            <div className="min-w-0">
              <label className="block mb-1">Rack Location</label>
              <select
                name="location"
                value={itm.location}
                onChange={(e) => handleItemChange(idx, e)}
                className="w-full border px-3 py-2 rounded"
                required
              >
                <option value="">Select Rack</option>
                {(rackOptions[idx] || []).map((loc) => (
                  <option key={loc.locationId} value={loc.locationId}>
                    {loc.location} (Available: {loc.quantity})
                  </option>
                ))}
              </select>
            </div>

            {/* Qty */}
            <div className="min-w-0">
              <label className="block mb-1">Qty</label>
              <input
                type="number"
                name="quantity"
                min={1}
                value={itm.quantity}
                onChange={(e) => handleItemChange(idx, e)}
                className="w-full border px-3 py-2 rounded text-center"
                required
              />
            </div>

            {items.length > 1 && (
              <div className="col-span-full text-right">
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  className="text-red-500 text-sm"
                >
                  Remove Item
                </button>
              </div>
            )}
          </div>
        ))}

        <button
          type="button"
          onClick={addItem}
          className="bg-blue-500 text-white px-3 py-1 rounded mb-4"
        >
          + Add Another Item
        </button>

        <div className="grid md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block mb-1">Purpose</label>
            <select
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full border px-3 py-2 rounded"
              required
            >
              <option value="">Select Purpose</option>
              <option value="Sale">Sale</option>
              <option value="Demo">Demo</option>
            </select>
          </div>

          <div>
            <label className="block mb-1">Stock Out Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border px-3 py-2 rounded"
              required
            />
          </div>

          {purpose === "Demo" && (
            <div>
              <label className="block mb-1">Expected Return Date</label>
              <input
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                className="w-full border px-3 py-2 rounded"
                required
              />
            </div>
          )}
        </div>

        <div className="mb-4">
          <label className="block mb-1">Reason</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full border px-3 py-2 rounded"
            required
          />
        </div>

        <div className="mb-4">
          <label className="block mb-1">Tender No.</label>
          <input
            type="text"
            value={tenderNo}
            onChange={(e) => setTenderNo(e.target.value)}
            className="w-full border px-3 py-2 rounded"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded mt-2"
        >
          {isLoading ? "Saving..." : "Save Stock Out"}
        </button>
      </form>
    </div>
  );
};

export default AddStockOut;
