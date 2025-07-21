import React, { useEffect, useState } from "react";
import API from "../../utils/axiosInstance";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const LocationList = () => {
  const [locations, setLocations] = useState([]);
  const [groupedLocations, setGroupedLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(null);
  const [editData, setEditData] = useState({ newName: "", description: "" });

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const res = await API.get("/locations");
      setLocations(res.data);
      groupByRackName(res.data);
    } catch (err) {
      toast.error("❌ Failed to fetch locations.");
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const groupByRackName = (data) => {
    const map = new Map();

    data.forEach((loc) => {
      const key = loc.name.trim().toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          _id: loc._id,
          name: loc.name,
          description: loc.description,
          warehouses: [loc.warehouse?.name || "—"],
        });
      } else {
        map.get(key).warehouses.push(loc.warehouse?.name || "—");
      }
    });

    setGroupedLocations(Array.from(map.values()));
  };

  const handleDelete = async (name) => {
    const confirm = window.confirm(`Delete ALL entries for "${name}" rack?`);
    if (!confirm) return;

    try {
      const res = await API.get("/locations");
      const all = res.data;
      const toDelete = all.filter(
        (loc) => loc.name.trim().toLowerCase() === name.trim().toLowerCase()
      );

      for (let loc of toDelete) {
        await API.delete(`/locations/${loc._id}`);
      }

      toast.success(`🗑️ Deleted ${toDelete.length} entries of "${name}" rack`);
      fetchLocations();
    } catch (err) {
      toast.error("❌ Failed to delete rack group.");
      console.error("Delete error:", err);
    }
  };

  const handleEditClick = (loc) => {
    setEditingName(loc.name);
    setEditData({ newName: loc.name, description: loc.description || "" });
  };

  const handleChange = (e) => {
    setEditData({ ...editData, [e.target.name]: e.target.value });
  };

  const handleUpdate = async () => {
    try {
      await API.put(`/locations/by-name/${editingName}`, editData);
      toast.success("✅ Rack group updated successfully.");
      setEditingName(null);
      fetchLocations();
    } catch (err) {
      toast.error("❌ Failed to update rack group.");
      console.error("Update error:", err);
    }
  };

  const handleCancel = () => setEditingName(null);

  return (
    <div className="p-6">
      <ToastContainer position="top-right" autoClose={3000} />
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        🗃️ Location (Rack) List
      </h2>

      {loading ? (
        <p className="text-blue-500">Loading locations...</p>
      ) : groupedLocations.length === 0 ? (
        <p className="text-gray-500">No locations found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto bg-white shadow rounded">
            <thead className="bg-gray-100 text-left">
              <tr>
                <th className="p-2 border">#</th>
                <th className="p-2 border">Location Name</th>
                <th className="p-2 border">Warehouses</th>
                <th className="p-2 border">Description</th>
                <th className="p-2 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {groupedLocations.map((loc, idx) => (
                <tr key={loc.name} className="border-t hover:bg-gray-50">
                  <td className="p-2 border">{idx + 1}</td>

                  {editingName === loc.name ? (
                    <>
                      <td className="p-2 border">
                        <input
                          name="newName"
                          value={editData.newName}
                          onChange={handleChange}
                          className="w-full border rounded px-2 py-1"
                        />
                      </td>
                      <td className="p-2 border text-sm text-gray-700">
                        {loc.warehouses.join(", ")}
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
                          onClick={handleUpdate}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded">
                          💾 Save All
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
                      <td className="p-2 border text-sm text-gray-700">
                        {loc.warehouses.join(", ")}
                      </td>
                      <td className="p-2 border">{loc.description || "—"}</td>
                      <td className="p-2 border flex gap-2">
                        <button
                          onClick={() => handleEditClick(loc)}
                          className="bg-yellow-400 hover:bg-yellow-500 text-white px-3 py-1 rounded">
                          ✏️ Edit All
                        </button>
                        <button
                          onClick={() => handleDelete(loc.name)}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded">
                          🗑 Delete All
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
