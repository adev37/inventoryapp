// frontend/vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // SPA routes (React Router) should fall back to index.html
    historyApiFallback: true,

    // Local-dev proxy: avoids CORS when running on http://localhost:5173
    proxy: {
      "/api": {
        target: "https://inventoryapp-api.vercel.app",
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
