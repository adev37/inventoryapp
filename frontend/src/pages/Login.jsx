// src/pages/Login.jsx
import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Login = ({ setIsAuthenticated }) => {
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError(""); // clear error while typing
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await axios.post(
        "https://inventoryapp-api.vercel.app/api/auth/login",
        form
      );
      const data = res.data;

      if (data.success) {
        // Save token and user info to localStorage
        localStorage.setItem("token", data.jwtToken);
        localStorage.setItem(
          "user",
          JSON.stringify({
            name: data.name,
            email: data.email,
            role: data.role, // if backend includes role
          })
        );

        setIsAuthenticated(true);
        navigate("/");
      } else {
        setError(data.message || "Login failed.");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(err.response?.data?.message || "Login failed. Try again.");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4 text-center">🔐 Login</h2>
      {error && (
        <p className="text-red-600 mb-3 text-sm text-center">{error}</p>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          required
          className="w-full border px-3 py-2 rounded"
        />

        <input
          type="password"
          name="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          required
          className="w-full border px-3 py-2 rounded"
        />

        <button
          type="submit"
          className="w-full bg-blue-600 text-white font-medium py-2 rounded hover:bg-blue-700 transition">
          Login
        </button>
      </form>
    </div>
  );
};

export default Login;
