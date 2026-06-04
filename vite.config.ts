import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The frontend never talks to Anthropic directly. All /api requests are
// proxied to the Express backend (see server/index.ts) which holds the key.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
