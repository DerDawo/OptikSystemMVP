import { describe, expect, it } from "vitest";
import {
  SEITE,
  SICHERUNG_TABELLEN,
  erstelleSicherung,
  sicherungDateiname,
  sicherungUmfang,
} from "./datensicherung";

describe("Datensicherung", () => {
  it("liest alle Tabellen seitenweise und merkt sich Fehler", async () => {
    const aufrufe: string[] = [];
    const s = await erstelleSicherung(async (tabelle, von, bis) => {
      aufrufe.push(`${tabelle}:${von}`);
      if (tabelle === "termin")
        return { data: null, error: { message: "keine Rechte" } };
      if (tabelle === "kunde") {
        const n = von === 0 ? SEITE : 5;
        return {
          data: Array.from({ length: Math.min(n, bis - von + 1) }, (_, i) => ({
            id: von + i,
          })),
          error: null,
        };
      }
      return { data: [{ id: 1 }], error: null };
    });
    expect(s.tabellen.kunde).toHaveLength(SEITE + 5);
    expect(aufrufe).toContain(`kunde:${SEITE}`);
    expect(s.fehler).toEqual({ termin: "keine Rechte" });
    expect(sicherungUmfang(s)).toEqual({
      tabellen: SICHERUNG_TABELLEN.length - 1,
      datensaetze: SEITE + 5 + SICHERUNG_TABELLEN.length - 2,
    });
  });

  it("benennt die Datei mit Datum und Uhrzeit", () => {
    expect(sicherungDateiname(new Date(2026, 10, 14, 9, 5))).toBe(
      "UNICORN-Datensicherung-2026-11-14_0905.json",
    );
  });
});
