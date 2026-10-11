// src/theme.ts
//
// "Liquid Glass"-Design (hell + dunkel). Farben/Glas/Schatten kommen aus
// designTokens.ts. Glas nur für Navigation (AppBar, Sidebar), schwebende
// Werkzeuge (sticky Toolbars) und Overlays (Menüs, Popover, Dialog-Backdrop);
// Tabellen, Formulare und Kundendaten bleiben auf festen Flächen.
import { alpha } from "@mui/material/styles";
import { defaultTheme, type RaThemeOptions } from "react-admin";
import {
  appBackground,
  fontFamily,
  glassSurface,
  tokens,
  type Mode,
} from "./designTokens";

export const SIDEBAR_WIDTH = 256;
export const SIDEBAR_CLOSED_WIDTH = 64;

const buildTheme = (mode: Mode): RaThemeOptions => {
  const t = tokens[mode];
  const dark = mode === "dark";

  return {
    ...defaultTheme,
    sidebar: { width: SIDEBAR_WIDTH, closedWidth: SIDEBAR_CLOSED_WIDTH },
    palette: {
      mode,
      primary: { main: t.primary, contrastText: t.primaryContrast },
      secondary: {
        main: dark ? "#57CFAE" : "#17806D",
        contrastText: dark ? "#06140F" : "#FFFFFF",
      },
      success: {
        main: dark ? "#57CFAE" : "#1B7F68",
        contrastText: dark ? "#06140F" : "#FFFFFF",
      },
      warning: {
        main: t.warnMain,
        contrastText: dark ? "#1A1003" : "#FFFFFF",
      },
      error: { main: t.dangerMain },
      info: {
        main: dark ? "#5BC6CF" : "#12737C",
        contrastText: dark ? "#041314" : "#FFFFFF",
      },
      background: { default: t.bg, paper: t.surface },
      text: { primary: t.text, secondary: t.text2 },
      divider: t.line,
      action: { hover: t.hover, selected: t.primarySoft },
    },
    shape: {
      borderRadius: 12,
    },
    typography: {
      ...defaultTheme.typography,
      fontFamily,
      fontSize: 14,
      h4: { fontWeight: 700, letterSpacing: "-0.02em" },
      h5: { fontWeight: 700, letterSpacing: "-0.015em" },
      h6: { fontWeight: 700, letterSpacing: "-0.01em" },
      subtitle1: { fontWeight: 600 },
      button: { textTransform: "none", fontWeight: 600, letterSpacing: 0 },
    },
    components: {
      ...defaultTheme.components,

      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: ({ ownerState }) => {
            const color = ownerState.color ?? "primary";
            return {
              borderRadius: 11,
              transition:
                "transform .15s ease, box-shadow .15s ease, background-color .15s ease",
              "&:hover": { transform: "translateY(-1px)" },
              "&:active": { transform: "none" },
              "@media (prefers-reduced-motion: reduce)": {
                transition: "none",
                "&:hover": { transform: "none" },
              },
              ...(ownerState.variant === "contained" &&
                color === "primary" && {
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18)",
                  "&:hover": {
                    transform: "translateY(-1px)",
                    boxShadow: `0 6px 16px ${alpha(t.primary, 0.28)}, inset 0 1px 0 rgba(255,255,255,0.18)`,
                  },
                }),
              // Sekundäre Aktionen im macOS-Stil: neutrale Fläche mit feiner Kontur
              ...(ownerState.variant === "outlined" &&
                color === "primary" && {
                  color: t.text,
                  backgroundColor: t.surface,
                  borderColor: t.lineStrong,
                  "&:hover": {
                    transform: "translateY(-1px)",
                    backgroundColor: t.surface2,
                    borderColor: t.lineStrong,
                  },
                }),
            };
          },
        },
      },

      MuiIconButton: {
        styleOverrides: {
          root: { borderRadius: 10 },
        },
      },

      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: "none" },
          rounded: { borderRadius: 16 },
          outlined: { borderColor: t.line },
          elevation1: { boxShadow: t.shadow },
        },
      },

      MuiCard: {
        defaultProps: {
          elevation: 0,
        },
        styleOverrides: {
          root: {
            borderRadius: 18,
            border: `1px solid ${t.line}`,
            boxShadow: t.shadow,
            backgroundColor: t.surface,
          },
        },
      },

      MuiFilledInput: {
        defaultProps: {
          disableUnderline: true,
        },
        styleOverrides: {
          root: {
            borderRadius: 10,
            backgroundColor: t.surface2,
            border: `1px solid ${t.line}`,
            transition: "border-color .15s ease, box-shadow .15s ease",
            "&:hover": {
              backgroundColor: t.surface2,
              borderColor: t.lineStrong,
            },
            "&.Mui-focused": {
              backgroundColor: t.surface,
              borderColor: t.primary,
              boxShadow: `0 0 0 4px ${t.primarySoft}`,
            },
            "&.Mui-error": { borderColor: t.dangerMain },
            "&.Mui-disabled": {
              backgroundColor: t.hover,
              borderColor: "transparent",
            },
          },
        },
      },

      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            backgroundColor: t.surface,
            "& .MuiOutlinedInput-notchedOutline": { borderColor: t.lineStrong },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: t.lineStrong,
            },
            "&.Mui-focused": { boxShadow: `0 0 0 4px ${t.primarySoft}` },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: t.primary,
              borderWidth: 1,
            },
          },
        },
      },

      MuiInputLabel: {
        styleOverrides: {
          root: {
            color: t.text2,
            "&.Mui-focused": { color: t.primaryText },
          },
        },
      },

      MuiTableCell: {
        styleOverrides: {
          root: { borderBottomColor: t.line },
          head: {
            color: t.text3,
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.03em",
            textTransform: "uppercase",
          },
        },
      },

      MuiChip: {
        styleOverrides: {
          root: ({ ownerState, theme }) => {
            const color = ownerState.color;
            const base = { borderRadius: 999, fontWeight: 600 };
            if (
              ownerState.variant === "outlined" ||
              !color ||
              color === "default"
            ) {
              return base;
            }
            // Statusfarben als dezente Tönung statt satter Vollfläche
            const c = theme.palette[color];
            return {
              ...base,
              backgroundColor: alpha(c.main, dark ? 0.18 : 0.13),
              color: dark ? c.light : c.dark,
              "& .MuiChip-icon, & .MuiChip-deleteIcon": { color: "inherit" },
            };
          },
        },
      },

      MuiTabs: {
        styleOverrides: {
          indicator: { height: 3, borderRadius: 3 },
        },
      },

      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: "none",
            fontWeight: 600,
            fontSize: 14,
            minHeight: 44,
          },
        },
      },

      MuiAlert: {
        styleOverrides: {
          root: { borderRadius: 12 },
        },
      },

      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 20,
            border: `1px solid ${t.line}`,
            boxShadow: t.shadowFloat,
          },
        },
      },

      // Modale bekommen einen weichgezeichneten Hintergrund; unsichtbare
      // Backdrops (Menüs, Popover) bleiben unverändert.
      MuiBackdrop: {
        styleOverrides: {
          root: ({ ownerState }) =>
            ownerState.invisible
              ? {}
              : {
                  backgroundColor: dark
                    ? "rgba(0,0,0,0.45)"
                    : "rgba(15,23,42,0.18)",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                },
        },
      },

      MuiPopover: {
        styleOverrides: {
          paper: {
            ...glassSurface(t),
            borderRadius: 14,
          },
        },
      },

      MuiMenuItem: {
        styleOverrides: {
          root: { borderRadius: 8, marginInline: 6, minHeight: 36 },
        },
      },

      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: dark ? "#2A2F37" : "rgba(29,35,41,0.92)",
            backdropFilter: "blur(12px)",
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 500,
          },
        },
      },

      MuiDivider: {
        styleOverrides: {
          root: { borderColor: t.line },
        },
      },

      MuiAppBar: {
        defaultProps: {
          elevation: 0,
        },
        styleOverrides: {
          root: {
            "--AppBar-background": alpha(t.bg, 0.72),
            "--AppBar-color": t.text,
            backgroundColor: alpha(t.bg, 0.72),
            color: t.text,
            backdropFilter: "blur(24px) saturate(180%)",
            WebkitBackdropFilter: "blur(24px) saturate(180%)",
            borderBottom: `1px solid ${t.line}`,
            boxShadow: "none",
          },
        },
      },

      // Sidebar als schwebende Glasfläche. Die Fläche liegt auf dem Menü
      // selbst, damit sie zusammen mit dem Menü auf- und zuklappt.
      RaMenu: {
        styleOverrides: {
          root: {
            ...glassSurface(t),
            boxShadow: `inset 0 1px 0 ${t.glassHighlight}, ${t.shadow}`,
            boxSizing: "border-box",
            margin: "12px 0 12px 12px",
            padding: 8,
            borderRadius: 20,
            minHeight: "calc(100dvh - 48px - 24px)",
            "&.RaMenu-open": { width: SIDEBAR_WIDTH - 16 },
            "&.RaMenu-closed": { width: SIDEBAR_CLOSED_WIDTH - 12 },
          },
        },
      },

      RaSidebar: {
        styleOverrides: {
          root: {
            "& .RaSidebar-fixed": { overflowY: "auto" },
          },
        },
      },

      RaMenuItemLink: {
        styleOverrides: {
          root: {
            borderRadius: 11,
            marginInline: 0,
            marginBlock: 1,
            minHeight: 40,
            paddingLeft: 11,
            color: t.text2,
            fontSize: 14,
            transition: "background-color .18s ease, color .18s ease",
            "& .RaMenuItemLink-icon": { minWidth: 34, color: "inherit" },
            "&:hover": { backgroundColor: t.hover, color: t.text },
            "&.RaMenuItemLink-active": {
              backgroundColor: t.primarySoft,
              color: t.primaryText,
              fontWeight: 600,
              "& .RaMenuItemLink-icon": { color: t.primaryText },
            },
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
            background: appBackground(t),
            backgroundAttachment: "fixed",
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
            backgroundColor: alpha(t.bg, 0.72),
            backdropFilter: "blur(20px) saturate(170%)",
            WebkitBackdropFilter: "blur(20px) saturate(170%)",
          }),
        },
      },

      // Login: gleicher Hintergrund wie die App statt react-admins Dunkelblau
      RaLogin: {
        styleOverrides: {
          root: {
            background: appBackground(t),
            "& .RaLogin-card": {
              borderRadius: 20,
              border: `1px solid ${t.line}`,
              boxShadow: t.shadowFloat,
            },
            "& .RaLogin-avatar .MuiAvatar-root": {
              backgroundColor: t.primary,
              color: t.primaryContrast,
            },
          },
        },
      },

      MuiCssBaseline: {
        styleOverrides: (theme) => ({
          html: {
            overflowX: "hidden",
          },
          body: {
            backgroundColor: t.bg,
            color: t.text,
            WebkitFontSmoothing: "antialiased",
            MozOsxFontSmoothing: "grayscale",
          },
          "::selection": {
            backgroundColor: alpha(t.primary, 0.22),
          },
          ":focus-visible": {
            outline: `3px solid ${t.focus}`,
            outlineOffset: 2,
          },
          "@media (prefers-reduced-motion: reduce)": {
            "*, *::before, *::after": {
              transitionDuration: "0.01ms !important",
              animationDuration: "0.01ms !important",
            },
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
            borderTop: `1px solid ${t.line}`,
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
            transition: "background-color .15s ease",
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

          /* row hover: the cells paint their own (solid) background, so the
             hover color has to go on the cells, not on the row. Listed last so
             it wins over the sticky-column backgrounds above. */
          ".RaDataTable-table tbody tr:hover td, .RaDataTable-table tbody tr:hover td:first-of-type, .RaDataTable-table tbody tr:hover td:nth-of-type(2)":
            {
              backgroundColor: t.surface2,
            },
        }),
      },
    },
  };
};

export const lightTheme = buildTheme("light");
export const darkTheme = buildTheme("dark");
