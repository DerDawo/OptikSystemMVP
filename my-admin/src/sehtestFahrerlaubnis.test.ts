import { describe, expect, it } from "vitest";
import {
  buildSehtestFahrerlaubnisPreviewHtml,
  buildSehtestFahrerlaubnisPrintHtml,
  pruefeSehschaerfe,
  sphaerischesAequivalent,
  visusZahl,
  zuStarkeKorrektur,
} from "./sehtestFahrerlaubnisTemplate";

const entities = {
  kunde: {
    Nachname: "Gottschalk",
    Vorname: "Dirk",
    Geburtsdatum: "1980-04-02",
    Straße: "Hauptstraße",
    Hausnummer: "5",
    Postleitzahl: "07545",
    Stadt: "Gera",
  },
  brille: { Datum: "2026-11-17" },
  glasRechts: { Sph: 0.75, Vis: 1.0, VisSC: 0.6 },
  glasLinks: { Sph: -0.25, Cyl: -0.5, Vis: 0.8, VisSC: 0.5 },
} as never;

describe("Grenzwerte Anlage 6 Nr. 2.1 FeV", () => {
  it("liest Visus mit Komma oder Punkt", () => {
    expect(visusZahl("0,8")).toBe(0.8);
    expect(visusZahl("1.0")).toBe(1);
    expect(visusZahl("")).toBeNull();
    expect(visusZahl("abc")).toBeNull();
  });

  it("erreicht mit 0,8 / 0,8 / 1,0", () => {
    expect(
      pruefeSehschaerfe({ rechts: "0,8", links: "0,8", beidaeugig: "1,0" }),
    ).toEqual({ ergebnis: "erreicht", maengel: [] });
  });

  it("nicht erreicht, wenn ein Auge unter 0,8 oder beidäugig unter 1,0", () => {
    const pruefung = pruefeSehschaerfe({
      rechts: "1,0",
      links: "0,7",
      beidaeugig: "0,9",
    });
    expect(pruefung.ergebnis).toBe("nicht erreicht");
    expect(pruefung.maengel).toHaveLength(2);
  });

  it("unvollständig, solange ein Wert fehlt", () => {
    expect(pruefeSehschaerfe({ rechts: "1,0", links: "1,0" }).ergebnis).toBe(
      "unvollständig",
    );
  });

  it("erkennt Korrekturen über +8,0 dpt sphärisches Äquivalent", () => {
    expect(sphaerischesAequivalent({ Sph: 8.5, Cyl: -0.5 })).toBe(8.25);
    expect(sphaerischesAequivalent({})).toBeNull();
    expect(zuStarkeKorrektur({ Sph: 8.25 }, { Sph: 8, Cyl: 0 })).toEqual([
      "rechts",
    ]);
  });
});

describe("Bescheinigung Sehvermögen Klasse C/D", () => {
  const html = buildSehtestFahrerlaubnisPrintHtml({ entities, bilder: {} });

  it("hat Teil 1 und Teil 2 mit den Pflichtvermerken", () => {
    expect(html).toContain("Teil 1");
    expect(html).toContain("Teil 2");
    expect(html).toContain("Anlage 6 Nummer 2.1");
    expect(html).toContain("Das Zeugnis ist zwei Jahre gültig.");
    expect(html).toContain("Die Identität des Untersuchten wurde geprüft.");
    expect(html).toContain("Nr. des Personalausweises");
    expect(html).toContain("Zusatzuntersuchung nach Anlage 6 Nummer 2.2");
  });

  it("übernimmt Personalien, Datum und Visus in beide Teile", () => {
    expect(html.match(/Gottschalk, Dirk/g)).toHaveLength(2);
    expect(html.match(/Hauptstraße 5, 07545 Gera/g)).toHaveLength(2);
    expect(html.match(/17\.11\.2026/g)).toHaveLength(2);
    expect(html).toContain(">0,6<");
    expect(html).toContain(">0,8<");
  });

  it("druckt ohne Vorschau-Skript, die Vorschau hat es", () => {
    expect(html).not.toContain("<script");
    const vorschau = buildSehtestFahrerlaubnisPreviewHtml({
      entities,
      bilder: {},
    });
    expect(vorschau).toContain("<script data-nur-vorschau>");
    expect(vorschau).toContain('class="hinweise" data-nur-vorschau');
  });

  it("warnt in der Vorschau bei zu starker Korrektur", () => {
    const vorschau = buildSehtestFahrerlaubnisPreviewHtml({
      entities: { kunde: {}, glasRechts: { Sph: 9 }, glasLinks: {} } as never,
      bilder: {},
    });
    expect(vorschau).toContain("über +8,0 dpt");
  });
});
