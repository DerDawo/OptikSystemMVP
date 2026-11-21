import { describe, expect, it } from "vitest";
import {
  artBeschreibung,
  staerkeKurz,
  zeitpunktText,
} from "./refraktionsprotokoll";

describe("Refraktionsprotokoll", () => {
  it("kennt die Felder je Art", () => {
    expect(artBeschreibung("Subjektiv MKH").mkh).toBe(true);
    expect(artBeschreibung("Tonometrie").augen.map((a) => a.feld)).toEqual([
      "IOD",
      "Pachymetrie",
    ]);
    expect(artBeschreibung("Medizinisches").augen).toEqual([]);
  });
  it("schreibt die Stärke kurz", () => {
    expect(
      staerkeKurz(
        { SphRechts: -1.25, CylRechts: -0.5, ARechts: 180, AddRechts: 2 },
        "Rechts",
      ),
    ).toBe("-1,25 / -0,50 × 180° Add +2,00");
    expect(staerkeKurz({ Sph: 0.5 })).toBe("+0,50");
    expect(staerkeKurz({})).toBe("");
  });
  it("zeigt die Uhrzeit nur, wenn eine erfasst ist", () => {
    expect(zeitpunktText("2026-11-17T00:00:00")).toBe("17.11.2026");
    expect(zeitpunktText("2026-11-17T14:30:00")).toBe("17.11.2026 14:30");
    expect(zeitpunktText(null)).toBe("");
  });
});
