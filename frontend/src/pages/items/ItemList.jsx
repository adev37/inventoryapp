import React, { useEffect, useState } from "react";
import API from "../../utils/axiosInstance";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const ItemList = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({
    name: "",
    modelNo: "",
    companyName: "",
    minStockAlert: 0,
  });

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const res = await API.get("/items");
      setItems(res.data);
    } catch (err) {
      toast.error("❌ Failed to fetch items");
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;
    try {
      await API.delete(`/items/${id}`);
      setItems((prev) => prev.filter((item) => item._id !== id));
      toast.success("🗑️ Item deleted successfully");
    } catch (err) {
      toast.error("❌ Failed to delete item");
      console.error("Delete error:", err);
    }
  };

  const handleEditClick = (item) => {
    setEditingId(item._id);
    setEditData(item);
  };

  const handleDoubleClick = (item) => handleEditClick(item);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditData((prev) => ({
      ...prev,
      [name]: name === "minStockAlert" ? parseInt(value) : value,
    }));
  };

  const handleSave = async () => {
    try {
      await API.put(`/items/${editingId}`, editData);
      await fetchItems();
      setEditingId(null);
      toast.success("✅ Item updated successfully");
    } catch (err) {
      toast.error("❌ Failed to update item");
      console.error("Update error:", err);
    }
  };

  const handleCancel = () => setEditingId(null);

  return (
    <div className="p-6">
      <ToastContainer position="top-right" autoClose={3000} />
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <span className="text-2xl">📋</span> Item Master List
      </h2>

      {loading ? (
        <p className="text-blue-600 animate-pulse">Loading items...</p>
      ) : items.length === 0 ? (
        <p className="text-gray-600">No items found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white shadow-md rounded-lg">
            <thead className="bg-blue-100">
              <tr>
                <th className="text-left px-4 py-2">#</th>
                <th className="text-left px-4 py-2">Item Name</th>
                <th className="text-left px-4 py-2">Model No.</th>
                <th className="text-left px-4 py-2">Company</th>
                <th className="text-left px-4 py-2">Min Stock Alert</th>
                <th className="text-left px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr
                  key={item._id}
                  className="border-t hover:bg-gray-50"
                  onDoubleClick={() => handleDoubleClick(item)}>
                  <td className="px-4 py-2">{idx + 1}</td>
                  {editingId === item._id ? (
                    <>
                      <td className="px-4 py-2">
                        <input
                          name="name"
                          value={editData.name}
                          onChange={handleChange}
                          className="w-full border rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-200"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          name="modelNo"
                          value={editData.modelNo}
                          onChange={handleChange}
                          className="w-full border rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-200"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          name="companyName"
                          value={editData.companyName}
                          onChange={handleChange}
                          className="w-full border rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-200"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          name="minStockAlert"
                          value={editData.minStockAlert}
                          onChange={handleChange}
                          className="w-full border rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-200"
                        />
                      </td>
                      <td className="px-4 py-2 flex gap-2">
                        <button
                          onClick={handleSave}
                          className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-1.5 rounded-lg shadow-sm transition">
                          <span className="text-lg">💾</span> Save
                        </button>
                        <button
                          onClick={handleCancel}
                          className="flex items-center gap-1 border border-gray-400 hover:bg-gray-100 text-gray-700 font-semibold px-4 py-1.5 rounded-lg shadow-sm transition">
                          <span className="text-lg">❌</span> Cancel
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-2">{item.name}</td>
                      <td className="px-4 py-2">{item.modelNo}</td>
                      <td className="px-4 py-2">{item.companyName}</td>
                      <td className="px-4 py-2">{item.minStockAlert}</td>
                      <td className="px-4 py-2 flex gap-2">
                        <button
                          onClick={() => handleEditClick(item)}
                          className="flex items-center gap-1 bg-yellow-400 hover:bg-yellow-500 text-gray-800 font-semibold px-4 py-1.5 rounded-lg shadow-sm transition">
                          <span className="text-lg">✏️</span> Edit
                        </button>
                        <button
                          onClick={() => handleDelete(item._id)}
                          className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white font-semibold px-4 py-1.5 rounded-lg shadow-sm transition">
                          <span className="text-lg">🗑️</span> Delete
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ItemList;
