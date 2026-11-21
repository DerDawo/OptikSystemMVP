// Gemeinsame Tabellen-Darstellung der OPTICA-Seiten.
export const tabelleSx = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "0.9rem",
  "& th": {
    textAlign: "left",
    fontWeight: 600,
    color: "text.secondary",
    p: "6px 10px",
    borderBottom: "1px solid",
    borderColor: "divider",
    whiteSpace: "nowrap",
  },
  "& td": {
    p: "6px 10px",
    borderBottom: "1px solid",
    borderColor: "divider",
    verticalAlign: "middle",
  },
  "& .zahl": { textAlign: "right", whiteSpace: "nowrap" },
  "& .minus": { color: "error.main" },
} as const;
