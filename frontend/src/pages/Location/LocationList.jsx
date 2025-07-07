import React, { useEffect, useState } from "react";
import API from "../../utils/axiosInstance";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const LocationList = () => {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({ name: "", description: "" });

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const res = await API.get("/locations");
      setLocations(res.data);
    } catch (err) {
      toast.error("❌ Failed to fetch locations.");
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    const confirm = window.confirm(
      "Are you sure you want to delete this location?"
    );
    if (!confirm) return;

    try {
      await API.delete(`/locations/${id}`);
      toast.success("🗑️ Location deleted successfully.");
      setLocations((prev) => prev.filter((loc) => loc._id !== id));
    } catch (err) {
      toast.error("❌ Failed to delete location.");
      console.error("Delete error:", err);
    }
  };

  const handleEditClick = (loc) => {
    setEditingId(loc._id);
    setEditData({ name: loc.name, description: loc.description || "" });
  };

  const handleChange = (e) => {
    setEditData({ ...editData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    try {
      await API.put(`/locations/${editingId}`, editData);
      toast.success("✅ Location updated successfully.");
      setEditingId(null);
      fetchLocations();
    } catch (err) {
      toast.error("❌ Failed to update location.");
      console.error("Update error:", err);
    }
  };

  const handleCancel = () => setEditingId(null);

  return (
    <div className="p-6">
      <ToastContainer position="top-right" autoClose={3000} />
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        🗃️ Location (Rack) List
      </h2>

      {loading ? (
        <p className="text-blue-500">Loading locations...</p>
      ) : locations.length === 0 ? (
        <p className="text-gray-500">No locations found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto bg-white shadow rounded">
            <thead className="bg-gray-100 text-left">
              <tr>
                <th className="p-2 border">#</th>
                <th className="p-2 border">Location Name</th>
                <th className="p-2 border">Warehouse</th>
                <th className="p-2 border">Description</th>
                <th className="p-2 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {locations.map((loc, idx) => (
                <tr
                  key={loc._id}
                  className="border-t hover:bg-gray-50"
                  onDoubleClick={() => handleEditClick(loc)}>
                  <td className="p-2 border">{idx + 1}</td>

                  {editingId === loc._id ? (
                    <>
                      <td className="p-2 border">
                        <input
                          name="name"
                          value={editData.name}
                          onChange={handleChange}
                          className="w-full border rounded px-2 py-1"
                        />
                      </td>
                      <td className="p-2 border italic text-gray-500">
                        {loc.warehouse?.name || "—"}
                      </td>
                      <td className="p-2 border">
                        <input
                          name="description"
                          value={editData.description}
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
                      <td className="p-2 border">{loc.name}</td>
                      <td className="p-2 border">
                        {loc.warehouse?.name || "—"}
                      </td>
                      <td className="p-2 border">{loc.description || "—"}</td>
                      <td className="p-2 border flex gap-2">
                        <button
                          onClick={() => handleEditClick(loc)}
                          className="bg-yellow-400 hover:bg-yellow-500 text-white px-3 py-1 rounded">
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleDelete(loc._id)}
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

export default LocationList;
