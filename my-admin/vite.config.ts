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
    // weitere Seiten ohne Mitarbeiter-Login: öffentliche Online-Terminbuchung
    // und die Kunden-App
    rollupOptions: {
      input: { main: "index.html", buchen: "buchen.html", kunde: "kunde.html" },
    },
  },
  base: "./",
}));
