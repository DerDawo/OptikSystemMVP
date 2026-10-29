// Einstieg der öffentlichen Buchungsseite (buchen.html), getrennt von
// UNICORN selbst: keine Anmeldung, kein react-admin
import React from "react";
import ReactDOM from "react-dom/client";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import { BuchungSeite } from "./BuchungSeite";

const theme = createTheme({
  palette: {
    primary: { main: "#1d4e8f" },
    background: { default: "transparent" },
  },
  shape: { borderRadius: 10 },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BuchungSeite />
    </ThemeProvider>
  </React.StrictMode>,
);
