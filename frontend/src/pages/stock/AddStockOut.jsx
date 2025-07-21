import React, { useEffect, useState } from "react";
import API from "../../utils/axiosInstance";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const AddStockOut = () => {
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
  const [allItems, setAllItems] = useState([]);
  const [allWarehouses, setAllWarehouses] = useState([]);
  const [rackOptions, setRackOptions] = useState({});

  useEffect(() => {
    const fetchInitials = async () => {
      try {
        const [itemRes, warehouseRes] = await Promise.all([
          API.get("/items"),
          API.get("/warehouses"),
        ]);
        setAllItems(itemRes.data);
        setAllWarehouses(warehouseRes.data);
      } catch {
        toast.error("❌ Failed to load data");
      }
    };
    fetchInitials();
  }, []);

  const fetchRackOptions = async (index, item, warehouse) => {
    try {
      const res = await API.get(
        `/current-stock?item=${item}&warehouse=${warehouse}`
      );
      const valid = res.data.filter((entry) => entry.quantity > 0);
      setRackOptions((prev) => ({ ...prev, [index]: valid }));
    } catch (err) {
      console.error("Rack fetch error", err);
    }
  };

  const handleItemChange = (index, e) => {
    const updated = [...items];
    updated[index][e.target.name] = e.target.value;
    setItems(updated);

    const { item, warehouse } = updated[index];
    if (item && warehouse) fetchRackOptions(index, item, warehouse);
  };

  const handleItemSearch = (index, value) => {
    const updatedSearch = [...itemSearch];
    updatedSearch[index] = value;
    setItemSearch(updatedSearch);
    setActiveSuggestionIdx(index);

    if (value.length > 0) {
      const filtered = allItems.filter(
        (i) =>
          i.name.toLowerCase().includes(value.toLowerCase()) ||
          i.modelNo.toLowerCase().includes(value.toLowerCase())
      );
      setItemSuggestions(filtered);
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
      { item: "", warehouse: "", location: "", quantity: "" },
    ]);
    setItemSearch([...itemSearch, ""]);
  };

  const removeItem = (idx) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== idx));
      setItemSearch(itemSearch.filter((_, i) => i !== idx));
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
          quantity: itm.quantity,
        })),
        purpose,
        reason,
        tenderNo,
        date,
        returnDate: purpose === "Demo" ? returnDate : null,
      };
      const res = await API.post("/stock-out", payload);
      toast.success(res?.data?.message || "✅ Stock Out successful");

      setItems([{ item: "", warehouse: "", location: "", quantity: "" }]);
      setItemSearch([""]);
      setPurpose("");
      setReason("");
      setTenderNo("");
      setDate("");
      setReturnDate("");
      setRackOptions({});
    } catch (err) {
      const errorMsg = err?.response?.data?.message || "❌ Stock Out failed.";
      toast.error(errorMsg);
    }
  };

  return (
    <div className="p-6">
      <ToastContainer position="top-right" autoClose={4000} theme="colored" />
      <h2 className="text-2xl font-bold mb-4">📤 Stock Out</h2>
      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-md p-6 rounded-lg">
        {items.map((itm, idx) => (
          <div
            key={idx}
            className="grid md:grid-cols-4 gap-4 border-b pb-4 mb-4 relative">
            <div className="relative">
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
                        onClick={() => handleSelectSuggestion(idx, s)}>
                        {s.name} ({s.modelNo})
                      </li>
                    ))}
                  </ul>
                )}
            </div>

            <div>
              <label className="block mb-1">Select Warehouse</label>
              <select
                name="warehouse"
                value={itm.warehouse}
                onChange={(e) => handleItemChange(idx, e)}
                className="w-full border px-3 py-2 rounded"
                required>
                <option value="">Select Warehouse</option>
                {allWarehouses.map((w) => (
                  <option key={w._id} value={w._id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-1">Select Rack</label>
              <select
                name="location"
                value={itm.location}
                onChange={(e) => handleItemChange(idx, e)}
                className="w-full border px-3 py-2 rounded"
                required>
                <option value="">Select Rack</option>
                {(rackOptions[idx] || []).map((loc) => (
                  <option key={loc.locationId} value={loc.locationId}>
                    {loc.location} (Available: {loc.quantity})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-1">Quantity</label>
              <input
                type="number"
                name="quantity"
                min={1}
                value={itm.quantity}
                onChange={(e) => handleItemChange(idx, e)}
                className="w-full border px-3 py-2 rounded"
                required
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

        <button
          type="button"
          onClick={addItem}
          className="bg-blue-500 text-white px-3 py-1 rounded mb-4">
          + Add Another Item
        </button>

        <div className="grid md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block mb-1">Purpose</label>
            <select
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full border px-3 py-2 rounded"
              required>
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
          className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded mt-2">
          Save Stock Out
        </button>
      </form>
    </div>
  );
};

export default AddStockOut;
