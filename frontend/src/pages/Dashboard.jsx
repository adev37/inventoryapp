import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../utils/axiosInstance";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const COLORS = ["#FF8042", "#FFBB28", "#00C49F", "#0088FE", "#A28EFF"];

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [stocks, setStocks] = useState([]);
  const [stockOut, setStockOut] = useState([]);
  const [stats, setStats] = useState({
    totalItems: 0,
    totalStock: 0,
    lowStockItems: 0,
  });
  const [saleOutCount, setSaleOutCount] = useState(0);
  const [demoPendingCount, setDemoPendingCount] = useState(0);

  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) setUser(JSON.parse(userData));
    fetchDashboardStats();
    fetchStocks();
    fetchStockOuts();
    fetchDemoPendingReturns();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const res = await API.get("/current-stock/summary");
      setStats({
        totalItems: res.data.totalItems,
        totalStock: res.data.totalStock,
        lowStockItems: res.data.lowStockItems,
      });
    } catch (err) {
      console.error("Failed to load dashboard stats", err);
    }
  };

  const fetchStocks = async () => {
    try {
      const res = await API.get("/current-stock");
      setStocks(res.data);
    } catch (error) {
      console.error("Error fetching stocks:", error);
    }
  };

  const fetchStockOuts = async () => {
    try {
      const res = await API.get("/stock-out");
      setStockOut(res.data);
      const saleCount = res.data.filter((s) => s.purpose === "Sale").length;
      setSaleOutCount(saleCount);
    } catch (error) {
      console.error("Error fetching stock out:", error);
    }
  };

  const fetchDemoPendingReturns = async () => {
    try {
      const res = await API.get("/demo-returns");
      setDemoPendingCount(res.data.length);
    } catch (error) {
      console.error("Error fetching demo pending returns:", error);
    }
  };

  const purposeCounts = stockOut.reduce((acc, s) => {
    const purpose = s.purpose || "Unknown";
    acc[purpose] = (acc[purpose] || 0) + 1;
    return acc;
  }, {});

  const pieData = Object.entries(purposeCounts).map(([name, value]) => ({
    name,
    value,
  }));

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-1">📊 Inventory Dashboard</h1>
      <p className="text-gray-600 mb-6">
        Welcome <strong>{user?.name}</strong> ({user?.role})
      </p>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        <StatCard title="Total Items" value={stats.totalItems} />
        <StatCard title="Total Stock" value={stats.totalStock} />
        <StatCard title="Low Stock Items" value={stats.lowStockItems} />
        <StatCard title="Stock Out (Sale)" value={saleOutCount} />
        <StatCard title="Demo Pending Return" value={demoPendingCount} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* ✅ Stock Table (limited to 6 recent rows) */}
        <div className="bg-white rounded shadow p-4 overflow-x-auto">
          <h2 className="text-lg font-semibold mb-2">📦 Stock Overview</h2>
          {stocks.length > 0 ? (
            <>
              <table className="min-w-full table-auto text-sm text-left border">
                <thead className="bg-gray-100 text-gray-700 font-medium">
                  <tr>
                    <th className="px-4 py-2 border">Item</th>
                    <th className="px-4 py-2 border">Model</th>
                    {/* <th className="px-4 py-2 border">Company</th> */}
                    <th className="px-4 py-2 border">Warehouse</th>
                    <th className="px-4 py-2 border text-right">Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {stocks.slice(0, 6).map((s, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-4 py-2">{s.item || "N/A"}</td>
                      <td className="px-4 py-2">{s.modelNo || "-"}</td>
                      {/* <td className="px-4 py-2">{s.companyName || "N/A"}</td> */}
                      <td className="px-4 py-2">{s.warehouse || "N/A"}</td>
                      <td className="px-4 py-2 text-right">{s.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <p className="text-gray-400 italic">No stock data available</p>
          )}
        </div>

        {/* ✅ Pie Chart */}
        <div className="bg-white rounded shadow p-4">
          <h2 className="text-lg font-semibold mb-2">
            ⚠️ Stock Out by Purpose
          </h2>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label>
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 italic">No purpose data found</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

const StatCard = ({ title, value }) => (
  <div className="bg-white rounded shadow p-4">
    <p className="text-gray-500 text-sm">{title}</p>
    <h3 className="text-3xl font-bold text-blue-600">{value}</h3>
  </div>
);
