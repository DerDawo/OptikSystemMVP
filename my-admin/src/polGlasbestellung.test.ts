import { describe, expect, it } from "vitest";
import {
  buildPolGlasbestellungPrintHtml,
  fassungsMasse,
} from "./polGlasbestellungTemplate";

const entities = {
  kunde: { Vorname: "Max", Nachname: "Beispiel" },
  brille: { id: 4711, BrillenArt: "Fernbrille" },
  glasRechts: {
    Sph: -1.25,
    Cyl: -0.5,
    A: 10,
    Add: 2,
    PD: 32,
    y_h: 22,
    HSA: 13,
  },
  glasLinks: { Sph: -1, Cyl: -0.75, A: 170, Add: 2, PD: 31.5, y_h: 21.5 },
  glastyp: {
    Bezeichnung: "Einstärke 1.67 Transitions",
    Verguetung: "BlueBlocker",
  },
  fassung: { Bezeichnung: "Air", Groesse: "52□18" },
};

describe("POL Glasbestellformular", () => {
  it("liest Breite und Brücke aus der Fassungsgröße", () => {
    expect(fassungsMasse("52□18")).toEqual({ breite: "52", bruecke: "18" });
    expect(fassungsMasse("54-17 140")).toEqual({ breite: "54", bruecke: "17" });
    expect(fassungsMasse("")).toEqual({ breite: "", bruecke: "" });
  });

  it("übernimmt Kunde, Werte und Zentrierdaten", () => {
    const html = buildPolGlasbestellungPrintHtml({ entities });
    expect(html).toContain("Beispiel, Max · Auftrag 4711");
    expect(html).toContain("-1,25");
    expect(html).toContain("-0,75");
    expect(html).toContain(">52<");
    expect(html).toContain(">18<");
    expect(html).toContain(">22<");
    expect(html).toContain(">31,5<");
    expect(html).toContain(">13<");
  });

  it("kreuzt Index, Material und Beschichtung aus der Glasbezeichnung an", () => {
    const html = buildPolGlasbestellungPrintHtml({ entities });
    const angekreuzt = [
      ...html.matchAll(
        /checked \/>(?:<span[^>]*>[^<]*<\/span> )?([^<]+)<\/label>/g,
      ),
    ].map((m) => m[1]);
    expect(angekreuzt).toEqual([
      "1.67 High index",
      "Transitions",
      "BlueBlocker",
    ]);
  });
});
