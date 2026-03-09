// src/theme.ts
import { createTheme } from "@mui/material/styles";
import { defaultTheme } from "react-admin";

export const theme = createTheme({
  ...defaultTheme,
  components: {
    ...defaultTheme.components,

    MuiCssBaseline: {
      styleOverrides: (theme) => ({
        html: {
          height: "100%",
        },
        body: {
          height: "100%",
          overflow: "hidden",
        },
        "#root": {
          height: "100%",
        },

        ".RaLayout-contentWithSidebar": {
          maxWidth: "100dvw",
        },
        ".RaLayout-content": {
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          overflow: "hidden",
        },
        ".list-page": {
          minWidth: 0,
          minHeight: 0,
        },
        ".RaList-main": {
          minWidth: 0,
          minHeight: 0,
        },
        ".RaList-content": {
          minWidth: 0,
          minHeight: 0,
          overflowX: "hidden",
        },
        ".RaDataTable-root": {
          minWidth: 0,
          minHeight: 0,
        },
        ".RaDataTable-tableWrapper": {
          width: "100%",
          maxWidth: "100%",
          overflowX: "auto",
          overflowY: "auto",
        },
        ".RaDataTable-rowCell": {
          whiteSpace: "nowrap",
        },
        ".RaDataTable-headerCell": {
          whiteSpace: "nowrap",
        },

        /* make normal cells paint their own background */
        ".RaDataTable-table thead th": {
          backgroundColor: theme.palette.background.paper,
          backgroundImage: "var(--Paper-overlay)",
        },
        ".RaDataTable-table tbody td": {
          backgroundColor: theme.palette.background.paper,
          backgroundImage: "var(--Paper-overlay)",
        },

        /* sticky checkbox column */
        ".RaDataTable-table th:first-of-type, .RaDataTable-table td:first-of-type": {
          position: "sticky",
          left: 0,
          zIndex: 2,
          backgroundColor: theme.palette.background.paper,
          backgroundImage: "var(--Paper-overlay)",
        },
        ".RaDataTable-table thead th:first-of-type": {
          zIndex: 3,
        },

        /* sticky second column */
        ".RaDataTable-table th:nth-of-type(2), .RaDataTable-table td:nth-of-type(2)": {
          position: "sticky",
          left: 40,
          zIndex: 2,
          backgroundColor: theme.palette.background.paper,
          backgroundImage: "var(--Paper-overlay)",
        },
        ".RaDataTable-table thead th:nth-of-type(2)": {
          zIndex: 3,
        },
      }),
    },
  },
});