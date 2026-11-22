// Einstieg der Kunden-App (kunde.html), getrennt von UNICORN selbst: kein
// Mitarbeiter-Login, kein react-admin
import React from "react";
import ReactDOM from "react-dom/client";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import { KundenApp } from "./KundenApp";

const theme = createTheme({
  palette: {
    primary: { main: "#1d4e8f" },
    background: { default: "#f4f6fa" },
  },
  shape: { borderRadius: 10 },
  typography: { fontFamily: "Arial, Helvetica, sans-serif" },
  components: {
    MuiButton: {
      styleOverrides: { root: { textTransform: "none", fontWeight: 700 } },
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <KundenApp />
    </ThemeProvider>
  </React.StrictMode>,
);
