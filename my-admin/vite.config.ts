import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    host: true,
  },
  build: {
    sourcemap: mode === "development",
    // zweite Seite: öffentliche Online-Terminbuchung (ohne Anmeldung)
    rollupOptions: {
      input: { main: "index.html", buchen: "buchen.html" },
    },
  },
  base: "./",
}));
