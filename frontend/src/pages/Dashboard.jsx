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
import {
  FaBox,
  FaWarehouse,
  FaArrowCircleDown,
  FaShoppingCart,
  FaClock,
} from "react-icons/fa";

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
      {/* Hero Welcome */}
      <div className="bg-gradient-to-r from-blue-100 to-white rounded-xl px-6 py-4 mb-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-800">
          Inventory Dashboard
        </h1>
        <p className="text-gray-600">
          Welcome <strong>{user?.name || "Guest"}</strong>{" "}
          <span className="text-sm text-gray-500">
            ({user?.role || "Viewer"})
          </span>
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <StatCard
          title="Total Items"
          value={stats.totalItems}
          icon={<FaBox />}
        />
        <StatCard
          title="Total Stock"
          value={stats.totalStock}
          icon={<FaArrowCircleDown />}
        />
        <StatCard
          title="Low Stock Items"
          value={stats.lowStockItems}
          icon={<FaWarehouse />}
        />
        <StatCard
          title="Stock Out (Sale)"
          value={saleOutCount}
          icon={<FaShoppingCart />}
        />
        <StatCard
          title="Demo Pending Return"
          value={demoPendingCount}
          icon={<FaClock />}
        />
      </div>

      {/* Overview Section */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* 📦 Table */}
        <div className="bg-white rounded-xl shadow p-5">
          <h2 className="text-lg font-semibold mb-3 text-gray-800">
            📦 Top Stock Overview
          </h2>
          {stocks.length > 0 ? (
            <table className="min-w-full text-sm border rounded overflow-hidden">
              <thead className="bg-gray-100 text-gray-700 font-medium">
                <tr>
                  <th className="px-4 py-2 text-left">Item</th>
                  <th className="px-4 py-2">Model</th>
                  <th className="px-4 py-2">Warehouse</th>
                  <th className="px-4 py-2 text-right">Qty</th>
                </tr>
              </thead>
              <tbody>
                {stocks.slice(0, 5).map((s, i) => (
                  <tr key={i} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2">{s.item || "N/A"}</td>
                    <td className="px-4 py-2 text-center">
                      {s.modelNo || "-"}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {s.warehouse || "N/A"}
                    </td>
                    <td className="px-4 py-2 text-right">{s.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-400 italic">No stock data found.</p>
          )}
        </div>

        {/* 📊 Pie Chart */}
        <div className="bg-white rounded-xl shadow p-5">
          <h2 className="text-lg font-semibold mb-3 text-gray-800">
            📊 Stock Out by Purpose
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
            <p className="text-gray-400 italic">No stock out data yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

// ✅ Clean Stat Card
const StatCard = ({ title, value, icon }) => (
  <div className="bg-white rounded-lg shadow flex items-center justify-between p-4">
    <div>
      <p className="text-gray-500 text-sm">{title}</p>
      <h3 className="text-xl font-bold text-blue-700">{value}</h3>
    </div>
    <div className="text-blue-400 text-2xl">{icon}</div>
  </div>
);
