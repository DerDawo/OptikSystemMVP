// Design-Tokens des "Liquid Glass"-Designs (hell/dunkel). Einzige Quelle für
// Farben, Glasflächen und Schatten: theme.ts baut daraus die MUI-Themes,
// Komponenten mit eigener Glasfläche (AppBar, Sidebar, Dashboard) nutzen
// glassSurface().
//
// Regel aus dem Design: Glas nur für Navigation, schwebende Werkzeuge und
// Overlays. Tabellen, Formulare und Kundendaten liegen auf festen Flächen
// (palette.background.paper).
import type { Theme } from "@mui/material/styles";

export type Mode = "light" | "dark";

export const tokens = {
  light: {
    bg: "#EDEFF3",
    surface: "#FFFFFF",
    surface2: "#F6F7F9",
    glass: "rgba(255,255,255,0.62)",
    glassBorder: "rgba(255,255,255,0.78)",
    glassHighlight: "rgba(255,255,255,0.9)",
    line: "rgba(17,24,39,0.08)",
    lineStrong: "rgba(17,24,39,0.14)",
    hover: "rgba(17,24,39,0.045)",
    text: "#1D2329",
    text2: "#525B67",
    text3: "#68707C",
    primary: "#0A66D6",
    primaryText: "#0A5BC0",
    primarySoft: "rgba(10,102,214,0.10)",
    primaryContrast: "#FFFFFF",
    focus: "rgba(10,102,214,0.45)",
    mint: "#1B7F68",
    teal: "#12737C",
    warn: "#9A520A",
    warnMain: "#C26A12",
    danger: "#B5322C",
    dangerMain: "#C93A36",
    shadow: "0 1px 2px rgba(16,24,40,0.04), 0 6px 20px rgba(16,24,40,0.05)",
    shadowFloat: "0 10px 36px rgba(16,24,40,0.10)",
    blobA: "rgba(10,102,214,0.10)",
    blobB: "rgba(43,168,138,0.10)",
  },
  dark: {
    bg: "#0F1115",
    surface: "#181B21",
    surface2: "#1F232A",
    glass: "rgba(30,34,41,0.60)",
    glassBorder: "rgba(255,255,255,0.08)",
    glassHighlight: "rgba(255,255,255,0.06)",
    line: "rgba(255,255,255,0.08)",
    lineStrong: "rgba(255,255,255,0.14)",
    hover: "rgba(255,255,255,0.05)",
    text: "#E8EAED",
    text2: "#AEB5BF",
    text3: "#939BA6",
    // Heller Blauton mit dunkler Schrift auf Buttons: weiße Schrift auf
    // Blau erreicht im Dunkelmodus kein ausreichendes Kontrastverhältnis.
    primary: "#5A9CF2",
    primaryText: "#78B0F6",
    primarySoft: "rgba(90,156,242,0.17)",
    primaryContrast: "#08111F",
    focus: "rgba(120,176,246,0.55)",
    mint: "#57CFAE",
    teal: "#5BC6CF",
    warn: "#F2AE5B",
    warnMain: "#E8963A",
    danger: "#F28680",
    dangerMain: "#E5605A",
    shadow: "0 1px 2px rgba(0,0,0,0.3), 0 6px 20px rgba(0,0,0,0.25)",
    shadowFloat: "0 12px 40px rgba(0,0,0,0.45)",
    blobA: "rgba(90,156,242,0.12)",
    blobB: "rgba(87,207,174,0.08)",
  },
} as const;

export type Tokens = (typeof tokens)[Mode];

export const tokensFor = (theme: Theme): Tokens =>
  tokens[theme.palette.mode === "dark" ? "dark" : "light"];

export const fontFamily = [
  "-apple-system",
  "BlinkMacSystemFont",
  '"SF Pro Text"',
  '"SF Pro Display"',
  '"Segoe UI Variable Text"',
  '"Segoe UI"',
  "system-ui",
  "sans-serif",
].join(",");

// Hintergrund hinter den Glasflächen: dezente Farbflecken statt flächiger
// Verläufe, damit der Unschärfeeffekt überhaupt sichtbar wird.
export const appBackground = (t: Tokens) =>
  [
    `radial-gradient(900px 640px at -8% -12%, ${t.blobA}, transparent 62%)`,
    `radial-gradient(820px 620px at 108% 70%, ${t.blobB}, transparent 62%)`,
    t.bg,
  ].join(", ");

export const glassSurface = (t: Tokens) => ({
  backgroundColor: t.glass,
  backdropFilter: "blur(28px) saturate(170%)",
  WebkitBackdropFilter: "blur(28px) saturate(170%)",
  border: `1px solid ${t.glassBorder}`,
  boxShadow: `inset 0 1px 0 ${t.glassHighlight}, ${t.shadowFloat}`,
});
