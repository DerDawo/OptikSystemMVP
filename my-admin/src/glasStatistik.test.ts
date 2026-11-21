import { describe, expect, it } from "vitest";
import { achsenMax, monatsreihe, vergleich } from "./glasStatistik";

const zeilen = [
  { jahr: 2025, monat: 1, auftraege: 100, glaeser: 190, umsatz: "15000.50" },
  { jahr: 2025, monat: 11, auftraege: 120, glaeser: 230, umsatz: 18000 },
  { jahr: 2026, monat: 1, auftraege: 110, glaeser: 210, umsatz: 16500 },
  { jahr: 2026, monat: 11, auftraege: 60, glaeser: 115, umsatz: 9000 },
];

describe("monatsreihe", () => {
  it("füllt zwölf Monate, fehlende mit 0", () => {
    const r = monatsreihe(zeilen, 2026, "glaeser");
    expect(r).toHaveLength(12);
    expect(r[0]).toEqual({ monat: 1, jahr: 210, vorjahr: 190 });
    expect(r[5]).toEqual({ monat: 6, jahr: 0, vorjahr: 0 });
  });

  it("liest Umsatz auch als Text", () => {
    expect(monatsreihe(zeilen, 2026, "umsatz")[0].vorjahr).toBe(15000.5);
  });
});

describe("vergleich", () => {
  it("vergleicht nur bis zum gewählten Monat", () => {
    const r = monatsreihe(zeilen, 2026, "glaeser");
    expect(vergleich(r, 10)).toEqual({
      jahr: 210,
      vorjahr: 190,
      prozent: 10.5,
    });
    expect(vergleich(r).prozent).toBe(-22.6);
  });

  it("ohne Vorjahr keine Prozentangabe", () => {
    expect(vergleich(monatsreihe([], 2026, "glaeser")).prozent).toBeNull();
  });
});

describe("achsenMax", () => {
  it("rundet auf runde Werte", () => {
    expect(achsenMax(monatsreihe(zeilen, 2026, "glaeser"))).toBe(250);
    expect(achsenMax(monatsreihe(zeilen, 2026, "umsatz"))).toBe(20000);
    expect(achsenMax(monatsreihe([], 2026, "glaeser"))).toBe(1);
  });
});
