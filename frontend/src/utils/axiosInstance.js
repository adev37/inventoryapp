// src/utils/axiosInstance.js
import axios from "axios";

// Prefer env var; default to /api so the Vite proxy handles it in dev
const RAW_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

// Normalize (remove trailing slashes)
const BASE_URL = RAW_BASE.replace(/\/+$/, "");

const API = axios.create({
  baseURL: BASE_URL, // e.g. "/api" (dev) or "https://.../api" (prod)
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default API;
