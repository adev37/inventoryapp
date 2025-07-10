import React, { useEffect, useState } from "react";
import API from "../../utils/axiosInstance";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const AddDemoItems = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [returning, setReturning] = useState("");

  // Fetch all pending demo return items
  const fetchDemoItems = async () => {
    try {
      const res = await API.get("/demo-returns");
      setItems(res.data);
    } catch {
      toast.error("❌ Failed to fetch demo returns.");
    } finally {
      setLoading(false);
    }
  };

  // Mark a demo item as returned
  const markAsReturned = async (id) => {
    setReturning(id);
    try {
      await API.post(`/demo-returns/return/${id}`);
      toast.success("✅ Marked as returned.");
      setItems((prev) => prev.filter((item) => item._id !== id));
    } catch (error) {
      toast.error("❌ Failed to mark as returned.");
      console.error("Return error:", error);
    } finally {
      setReturning("");
    }
  };

  useEffect(() => {
    fetchDemoItems();
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">📦 Pending Demo Returns</h2>

      <div className="overflow-x-auto shadow rounded bg-white">
        <table className="w-full table-auto border border-gray-300">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border">Sl#</th>
              <th className="p-2 border">Item</th>
              <th className="p-2 border">Model No.</th>
              <th className="p-2 border">Warehouse</th>
              <th className="p-2 border">Rack</th>
              <th className="p-2 border">Qty</th>
              <th className="p-2 border">Out Date</th>
              <th className="p-2 border">Action</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" className="p-4 text-center">
                  ⏳ Loading...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan="8" className="p-4 text-center text-gray-500">
                  No pending demo returns.
                </td>
              </tr>
            ) : (
              items.map((item, idx) => (
                <tr key={item._id} className="hover:bg-gray-50">
                  <td className="p-2 border text-center">{idx + 1}</td>
                  <td className="p-2 border text-center">{item.itemName}</td>
                  <td className="p-2 border text-center">{item.modelNo}</td>
                  <td className="p-2 border text-center">{item.warehouse}</td>
                  <td className="p-2 border text-center">{item.location}</td>
                  <td className="p-2 border text-center">{item.quantity}</td>
                  <td className="p-2 border text-center">
                    {new Date(item.date).toLocaleDateString()}
                  </td>
                  <td className="p-2 border text-center">
                    <button
                      onClick={() => markAsReturned(item._id)}
                      disabled={returning === item._id}
                      className={`px-3 py-1 rounded text-white ${
                        returning === item._id
                          ? "bg-gray-400 cursor-wait"
                          : "bg-green-600 hover:bg-green-700"
                      }`}>
                      {returning === item._id ? "Returning..." : "Return"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AddDemoItems;
