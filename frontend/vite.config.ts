import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// VITE_API_BASE_URL (used in src/lib/api.ts) is the source of truth for the
// API location in both dev and prod. The dev proxy below is a convenience so
// that a relative "/api" path also works when VITE_API_BASE_URL is unset and
// the backend runs on localhost:8000.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
