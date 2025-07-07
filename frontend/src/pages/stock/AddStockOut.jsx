import React, { useEffect, useState } from "react";
import API from "../../utils/axiosInstance";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const AddStockOut = () => {
  const [items, setItems] = useState([
    { item: "", warehouse: "", location: "", locationName: "", quantity: "" },
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
  const [allLocations, setAllLocations] = useState([]);
  const [loading, setLoading] = useState(false);

  // ✅ Fetch dropdown data
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
      } catch {
        toast.error("❌ Failed to load items, warehouses or locations");
      }
    };
    fetchData();
  }, []);

  // ✅ Fetch rack location based on selected item+warehouse
  const handleItemChange = async (index, e) => {
    const updated = [...items];
    updated[index][e.target.name] = e.target.value;
    setItems(updated);

    const { item: selectedItem, warehouse: selectedWarehouse } = updated[index];

    if (selectedItem && selectedWarehouse) {
      try {
        const res = await API.get(
          `/current-stock?item=${selectedItem}&warehouse=${selectedWarehouse}`
        );
        const stockEntries = res.data.filter((entry) => entry.quantity > 0);

        if (stockEntries.length > 0) {
          const rackName = stockEntries[0].location;
          const locationObj = allLocations.find((loc) => loc.name === rackName);
          updated[index].location = locationObj?._id || null;
          updated[index].locationName = locationObj?.name || "Rack Unknown";
        } else {
          updated[index].location = null;
          updated[index].locationName = "Rack Unknown";
        }

        setItems([...updated]);
      } catch (error) {
        console.error("Error fetching location", error);
      }
    }
  };

  // ✅ Search and suggest item
  const handleItemSearch = (index, value) => {
    const updatedSearch = [...itemSearch];
    updatedSearch[index] = value;
    setItemSearch(updatedSearch);
    setActiveSuggestionIdx(index);

    if (value.length > 0) {
      const filtered = allItems.filter(
        (item) =>
          item.name.toLowerCase().includes(value.toLowerCase()) ||
          item.modelNo.toLowerCase().includes(value.toLowerCase())
      );
      setItemSuggestions(filtered);
      handleItemChange(index, { target: { name: "item", value: "" } }); // reset item
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
      { item: "", warehouse: "", location: "", locationName: "", quantity: "" },
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
    setLoading(true);

    const hasDuplicate = items.some(
      (item, idx) =>
        items.findIndex(
          (i) => i.item === item.item && i.warehouse === item.warehouse
        ) !== idx
    );
    if (hasDuplicate) {
      toast.error("❌ Duplicate item & warehouse entries found.");
      setLoading(false);
      return;
    }

    try {
      const payload = {
        items: items.map((itm) => ({
          item: itm.item,
          warehouse: itm.warehouse,
          quantity: itm.quantity,
          location: itm.location || null,
          purpose,
          reason,
          tenderNo,
        })),
        date,
        returnDate: purpose === "Demo" ? returnDate : undefined,
      };

      const res = await API.post("/stock-out", payload);
      toast.success(res?.data?.message || "✅ Stock Out recorded!");

      setItems([
        {
          item: "",
          warehouse: "",
          location: "",
          locationName: "",
          quantity: "",
        },
      ]);
      setItemSearch([""]);
      setPurpose("");
      setReason("");
      setTenderNo("");
      setDate("");
      setReturnDate("");
    } catch (err) {
      const insufficient = err?.response?.data?.insufficient || [];
      if (insufficient.length > 0) {
        insufficient.forEach((e) => {
          toast.error(`❌ ${e.message}`);
        });
      } else {
        toast.error(err?.response?.data?.message || "❌ Something went wrong.");
      }
    }

    setLoading(false);
  };

  return (
    <div className="p-6">
      <ToastContainer position="top-right" autoClose={4000} theme="colored" />
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        📤 Stock Out
      </h2>
      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-md p-6 rounded-lg max-w-4xl">
        {items.map((itm, idx) => (
          <div
            key={idx}
            className="grid grid-cols-1 md:grid-cols-4 gap-4 border-b pb-2 mb-4 relative">
            {/* Search Item */}
            <div className="relative col-span-1">
              <label className="block text-sm font-medium mb-1">
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
              {itemSearch[idx] &&
                activeSuggestionIdx === idx &&
                itemSuggestions.length > 0 && (
                  <ul className="absolute bg-white border border-gray-200 rounded shadow z-10 w-full max-h-44 overflow-auto mt-1">
                    {itemSuggestions.map((suggestion) => (
                      <li
                        key={suggestion._id}
                        className="px-3 py-2 cursor-pointer hover:bg-blue-100"
                        onClick={() => handleSelectSuggestion(idx, suggestion)}>
                        {suggestion.name} ({suggestion.modelNo})
                      </li>
                    ))}
                  </ul>
                )}
            </div>

            {/* Warehouse */}
            <div>
              <label className="block text-sm font-medium mb-1">
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

            {/* Location */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Rack Location
              </label>
              <input
                type="text"
                value={
                  itm.locationName ? `🗄️ ${itm.locationName}` : "Rack Unknown"
                }
                disabled
                className="w-full border border-gray-300 rounded px-3 py-2 bg-gray-100"
              />
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium mb-1">Quantity</label>
              <input
                type="number"
                name="quantity"
                min={1}
                value={itm.quantity}
                onChange={(e) => handleItemChange(idx, e)}
                placeholder="Quantity"
                required
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>

            {items.length > 1 && (
              <div className="md:col-span-4 flex justify-end">
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
          className="bg-blue-500 text-white px-3 py-1 rounded mb-3">
          + Add Another Item
        </button>

        {/* Purpose, Dates, Reason */}
        <div>
          <label className="block text-sm font-medium mb-1">Purpose</label>
          <select
            name="purpose"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            required
            className="w-full border border-gray-300 rounded px-3 py-2">
            <option value="">Select Purpose</option>
            <option value="Sale">Sale</option>
            <option value="Demo">Demo</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            🗓 Stock Out Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>

        {purpose === "Demo" && (
          <div>
            <label className="block text-sm font-medium mb-1">
              🕓 Expected Return Date
            </label>
            <input
              type="date"
              value={returnDate}
              onChange={(e) => setReturnDate(e.target.value)}
              required
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">Reason</label>
          <input
            type="text"
            name="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason"
            required
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Tender No.</label>
          <input
            type="text"
            name="tenderNo"
            value={tenderNo}
            onChange={(e) => setTenderNo(e.target.value)}
            placeholder="Tender Number"
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded transition duration-200 mt-4 ${
            loading ? "opacity-60 cursor-not-allowed" : ""
          }`}>
          {loading ? "Saving..." : "📀 Save Stock Out"}
        </button>
      </form>
    </div>
  );
};

export default AddStockOut;
