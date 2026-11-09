import { describe, expect, it } from "vitest";
import {
  AUSWERTUNG_PRUEFUNGEN,
  alterJahre,
  buildAuswertungsbogenPrintHtml,
} from "./auswertungsbogenTemplate";
import dayjs from "dayjs";

const html = buildAuswertungsbogenPrintHtml({
  bilder: {},
  entities: {
    kunde: {
      Vorname: "Georgi",
      Nachname: "Darchia",
      Geburtsdatum: "1985-04-02",
    },
    brille: {
      Datum: "2026-10-28",
      Refraktion: "Robert Ulm lt. optometrischer Messung",
    },
    glasRechts: { Sph: 0, Cyl: -0.75, A: 126, PD: 33, Vis: 1, iod: 15 },
    glasLinks: { Sph: 0.25, Cyl: -0.5, A: 75, PD: 33, Vis: 1.25, iod: 16.5 },
  },
});

describe("Auswertungsbogen", () => {
  it("übernimmt Kunde, Datum und Untersucher", () => {
    for (const wert of ["Georgi Darchia", "02.04.1985", "28.10.2026", ">41<"])
      expect(html).toContain(wert);
    expect(html).toContain(">Robert Ulm<");
    expect(html).not.toContain("lt. optometrischer");
  });

  it("übernimmt Refraktion, Visus und IOD", () => {
    for (const wert of [
      ">-0,75<",
      ">126<",
      ">+0,25<",
      ">75<",
      ">1,25<",
      ">15<",
      ">16,5<",
    ])
      expect(html).toContain(wert);
  });

  it("hat alle Prüfungen mit Kästchen, keines angekreuzt", () => {
    for (const p of [
      "Motilität",
      "Farbsehen",
      "Gesichtsfeld",
      "Augeninnendruck",
    ])
      expect(html).toContain(p);
    expect(AUSWERTUNG_PRUEFUNGEN.length).toBeGreaterThan(8);
    expect(html).not.toMatch(/class="kaestchen" checked/);
  });

  it("berechnet das Alter", () => {
    expect(alterJahre("2000-06-01", dayjs("2026-05-31"))).toBe("25");
    expect(alterJahre("")).toBe("");
  });
});
