import React, { useEffect, useState } from "react";
import API from "../../utils/axiosInstance";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const WarehouseList = () => {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({ name: "", location: "" });

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    try {
      const res = await API.get("/warehouses");
      setWarehouses(res.data);
    } catch (err) {
      toast.error("❌ Failed to fetch warehouses.");
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this warehouse?"))
      return;
    try {
      await API.delete(`/warehouses/${id}`);
      toast.success("🗑️ Warehouse deleted successfully.");
      setWarehouses((prev) => prev.filter((w) => w._id !== id));
    } catch (err) {
      toast.error("❌ Failed to delete warehouse.");
      console.error("Delete error:", err);
    }
  };

  const handleEditClick = (wh) => {
    setEditingId(wh._id);
    setEditData({ name: wh.name, location: wh.location });
  };

  const handleDoubleClick = (wh) => handleEditClick(wh);

  const handleChange = (e) => {
    setEditData({ ...editData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    try {
      await API.put(`/warehouses/${editingId}`, editData);
      toast.success("✅ Warehouse updated successfully.");
      setEditingId(null);
      fetchWarehouses();
    } catch (err) {
      toast.error("❌ Failed to update warehouse.");
      console.error("Update error:", err);
    }
  };

  const handleCancel = () => setEditingId(null);

  return (
    <div className="p-6">
      <ToastContainer position="top-right" autoClose={3000} />
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        🏬 Warehouse List
      </h2>

      {loading ? (
        <p className="text-blue-500">Loading warehouses...</p>
      ) : warehouses.length === 0 ? (
        <p className="text-gray-500">No warehouses found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto bg-white shadow rounded">
            <thead className="bg-gray-100 text-left">
              <tr>
                <th className="p-2 border">#</th>
                <th className="p-2 border">Warehouse Name</th>
                <th className="p-2 border">Location</th>
                <th className="p-2 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {warehouses.map((wh, idx) => (
                <tr
                  key={wh._id}
                  className="border-t hover:bg-gray-50"
                  onDoubleClick={() => handleDoubleClick(wh)}>
                  <td className="p-2 border">{idx + 1}</td>

                  {editingId === wh._id ? (
                    <>
                      <td className="p-2 border">
                        <input
                          name="name"
                          value={editData.name}
                          onChange={handleChange}
                          className="w-full border rounded px-2 py-1"
                        />
                      </td>
                      <td className="p-2 border">
                        <input
                          name="location"
                          value={editData.location}
                          onChange={handleChange}
                          className="w-full border rounded px-2 py-1"
                        />
                      </td>
                      <td className="p-2 border flex gap-2">
                        <button
                          onClick={handleSave}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded">
                          💾 Save
                        </button>
                        <button
                          onClick={handleCancel}
                          className="bg-gray-400 hover:bg-gray-500 text-white px-3 py-1 rounded">
                          ❌ Cancel
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="p-2 border">{wh.name}</td>
                      <td className="p-2 border">{wh.location}</td>
                      <td className="p-2 border flex gap-2">
                        <button
                          onClick={() => handleEditClick(wh)}
                          className="bg-yellow-400 hover:bg-yellow-500 text-white px-3 py-1 rounded">
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleDelete(wh._id)}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded">
                          🗑 Delete
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

export default WarehouseList;
