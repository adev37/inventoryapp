// utils/axiosInstance.js
import axios from "axios";

const API = axios.create({
  baseURL: "https://inventoryapp-api.vercel.app/api", // Changed from deployed URL to local
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default API;
