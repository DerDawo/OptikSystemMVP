// in src/index.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import dayjs from "dayjs";
import "dayjs/locale/de";
import { App } from "./App";

// Wochentage und Monatsnamen auf Deutsch (Terminkalender, Datumsauswahl).
// Wochenberechnungen nutzen day() und hängen nicht vom Locale ab.
dayjs.locale("de");

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
