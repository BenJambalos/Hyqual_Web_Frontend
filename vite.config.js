import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "https://hyqualwebbackend-production-3ef3.up.railway.app",
        changeOrigin: true,
        secure: true
      }
    }
  }
});
