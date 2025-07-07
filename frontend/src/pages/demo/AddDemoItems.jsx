import React, { useEffect, useState } from "react";
import API from "../../utils/axiosInstance";
import { toast } from "react-toastify";

const AddDemoItems = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [returning, setReturning] = useState("");

  // Fetch pending demo return items (grouped)
  const fetchDemoItems = async () => {
    try {
      const res = await API.get("/demo-returns");
      setItems(res.data);
    } catch (error) {
      toast.error("❌ Failed to fetch demo returns.");
    } finally {
      setLoading(false);
    }
  };

  // Batch return handler using stockOutNo
  const markAsReturned = async (stockOutNo) => {
    setReturning(stockOutNo);
    try {
      await API.post(`/demo-returns/return-batch/${stockOutNo}`);
      toast.success("✅ Batch marked as returned!");
      setItems((prev) => prev.filter((item) => item.stockOutNo !== stockOutNo));
    } catch {
      toast.error("❌ Failed to mark as returned.");
    } finally {
      setReturning("");
    }
  };

  useEffect(() => {
    fetchDemoItems();
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4 flex items-center">
        📦 Pending Demo Returns
      </h2>
      <div className="overflow-x-auto shadow rounded bg-white">
        <table className="w-full table-auto border border-gray-300">
          <thead className="bg-gray-100 sticky top-0 z-10">
            <tr>
              <th className="p-2 border">Sl#</th>
              <th className="p-2 border">Stock No.</th>
              <th className="p-2 border">Total Quantity</th>
              <th className="p-2 border">Out Date</th>
              <th className="p-2 border">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" className="text-center p-4">
                  ⏳ Loading...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center p-4 text-gray-500">
                  No pending demo returns.
                </td>
              </tr>
            ) : (
              items.map((item, idx) => (
                <tr key={item.stockOutNo || idx} className="hover:bg-gray-50">
                  <td className="p-2 border text-center">{idx + 1}</td>
                  <td className="p-2 border text-center">
                    {item.stockOutNo || "-"}
                  </td>
                  <td className="p-2 border text-center">
                    {item.totalQuantity || item.quantity}
                  </td>
                  <td className="p-2 border text-center">
                    {item.date ? new Date(item.date).toLocaleDateString() : "-"}
                  </td>
                  <td className="p-2 border text-center">
                    <button
                      onClick={() => markAsReturned(item.stockOutNo)}
                      disabled={returning === item.stockOutNo}
                      className={`px-3 py-1 rounded text-white ${
                        returning === item.stockOutNo
                          ? "bg-gray-400 cursor-not-allowed"
                          : "bg-green-600 hover:bg-green-700"
                      }`}>
                      {returning === item.stockOutNo
                        ? "Returning..."
                        : "Return"}
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
