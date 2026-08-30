// src/theme.ts
import { createTheme } from "@mui/material/styles";
import { defaultTheme } from "react-admin";

export const theme = createTheme({
  ...defaultTheme,
  palette: {
    ...defaultTheme.palette,
    mode: "light",
    primary: {
      main: "#1d4e89",
    },
    secondary: {
      main: "#0f9b8e",
    },
    background: {
      default: "#f4f6f9",
      paper: "#ffffff",
    },
  },
  shape: {
    borderRadius: 10,
  },
  typography: {
    ...defaultTheme.typography,
    fontFamily: [
      "Inter",
      "-apple-system",
      "BlinkMacSystemFont",
      '"Segoe UI"',
      "Roboto",
      "Arial",
      "sans-serif",
    ].join(","),
    h5: {
      fontWeight: 700,
    },
    h6: {
      fontWeight: 700,
    },
    subtitle1: {
      fontWeight: 600,
    },
    button: {
      textTransform: "none",
      fontWeight: 600,
    },
  },
  components: {
    ...defaultTheme.components,

    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },

    MuiCard: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },

    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
        },
      },
    },

    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: "#1d4e89",
        },
      },
    },

    /*
     * react-admin's layout root defaults to `minWidth: "fit-content"`, which lets a
     * single long, unbreakable string anywhere on the page (a long name, a link in a
     * message, ...) force the *entire* app shell wider than the viewport. Overriding
     * it lets the page shrink to the viewport again, so per-element wrapping/ellipsis
     * rules actually take effect instead of being overruled by this floor.
     */
    RaLayout: {
      styleOverrides: {
        root: {
          minWidth: 0,
        },
      },
    },

    // Keep per-page top actions (Edit, Show, Create, ...) visible while scrolling
    RaTopToolbar: {
      styleOverrides: {
        root: ({ theme }) => ({
          position: "sticky",
          top: 0,
          zIndex: theme.zIndex.appBar - 1,
          backgroundColor: theme.palette.background.default,
        }),
      },
    },

    MuiCssBaseline: {
      styleOverrides: (theme) => ({
        html: {
          overflowX: "hidden",
        },
        ".RaLayout-contentWithSidebar": {
          maxWidth: "100dvw",
        },
        /*
         * The content area scrolls on its own, bounded to the viewport height
         * below the fixed AppBar. This keeps sticky top actions (Edit/Show/
         * Create buttons, message send bar, ...) working, since position:
         * sticky only reacts to scrolling within this exact container.
         */
        ".RaLayout-content": {
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          height: "calc(100dvh - 48px)",
          overflowY: "auto",
          overflowX: "hidden",
          scrollbarGutter: "stable",
          [theme.breakpoints.down("sm")]: {
            height: "calc(100dvh - 56px)",
          },
        },
        /*
         * Keep the form's Save/Delete toolbar reachable while scrolling long
         * Edit/Create forms, mirroring the sticky top actions above. The mobile
         * variant is already fixed to the bottom by react-admin itself.
         */
        ".RaToolbar-desktopToolbar": {
          position: "sticky",
          bottom: 0,
          zIndex: theme.zIndex.appBar - 1,
          backgroundColor: theme.palette.background.paper,
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
        ".RaDataTable-table th:first-of-type, .RaDataTable-table td:first-of-type":
          {
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
        ".RaDataTable-table th:nth-of-type(2), .RaDataTable-table td:nth-of-type(2)":
          {
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
