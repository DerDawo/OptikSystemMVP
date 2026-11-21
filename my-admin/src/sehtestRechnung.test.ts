import { describe, expect, it } from "vitest";
import {
  FAHRERLAUBNISKLASSEN,
  SEHTEST_LEISTUNGEN,
  SEHTEST_RECHNUNG_KATEGORIE,
  berechneSehtestRechnung,
  buildSehtestRechnungPreviewHtml,
  buildSehtestRechnungPrintHtml,
  euroZahl,
} from "./sehtestRechnungTemplate";

const daten = {
  entities: {
    kunde: {
      Vorname: "Max",
      Nachname: "Muster",
      KundenNummer: "4711",
      Geburtsdatum: "1980-05-01",
      Straße: "Hauptstraße",
      Hausnummer: "1",
      Postleitzahl: "07545",
      Stadt: "Gera",
    },
    brille: { Datum: "2026-11-20" },
  },
  rechnungsnummer: "2026-123",
};

describe("euroZahl", () => {
  it("liest deutsche und englische Schreibweisen", () => {
    expect(euroZahl("12,50")).toBe(12.5);
    expect(euroZahl("12.50")).toBe(12.5);
    expect(euroZahl("1.234,56 €")).toBe(1234.56);
    expect(euroZahl("8,00 EUR")).toBe(8);
    expect(euroZahl(3)).toBe(3);
  });

  it("ergibt 0 bei leerer oder ungültiger Eingabe", () => {
    expect(euroZahl("")).toBe(0);
    expect(euroZahl(null)).toBe(0);
    expect(euroZahl("abc")).toBe(0);
    expect(euroZahl(Number.NaN)).toBe(0);
  });
});

describe("berechneSehtestRechnung", () => {
  it("rechnet Beträge, Netto und enthaltene MwSt", () => {
    const s = berechneSehtestRechnung(
      [
        { menge: 1, preis: 8 },
        { menge: 1, preis: 8 },
        { menge: 1, preis: 6 },
        { menge: 1, preis: 3 },
      ],
      0,
      19,
    );
    expect(s.betraege).toEqual([8, 8, 6, 3]);
    expect(s.zwischensumme).toBe(25);
    expect(s.rabatt).toBe(0);
    expect(s.brutto).toBe(25);
    expect(s.netto).toBe(21.01);
    expect(s.mwst).toBe(3.99);
  });

  it("zieht Rabatt ab und begrenzt ihn auf 0 bis 100 %", () => {
    const zeilen = [{ menge: 2, preis: 12.5 }];
    expect(berechneSehtestRechnung(zeilen, 10, 19).brutto).toBe(22.5);
    expect(berechneSehtestRechnung(zeilen, 150, 19).brutto).toBe(0);
    expect(berechneSehtestRechnung(zeilen, -5, 19).brutto).toBe(25);
  });

  it("rundet auf Cent", () => {
    const s = berechneSehtestRechnung([{ menge: 3, preis: 3.333 }], 0, 19);
    expect(s.betraege[0]).toBe(10);
  });
});

describe("Leistungskatalog", () => {
  it("hat eindeutige Schlüssel und wählt die Pflichtprüfungen vor", () => {
    const ids = SEHTEST_LEISTUNGEN.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(
      SEHTEST_LEISTUNGEN.filter((l) => l.standard).map((l) => l.id),
    ).toEqual(["visus_sc", "visus_cc", "korrektur", "bescheinigung"]);
  });
});

describe("Rechnung Sehtest C/D", () => {
  it("hat die Kategorie der Vorlage", () => {
    expect(SEHTEST_RECHNUNG_KATEGORIE).toBe("Rechnung Sehtest C/D");
  });

  it("enthält Kunde, Nummer, Klassen, alle Leistungen und die Summe", () => {
    const html = buildSehtestRechnungPrintHtml(daten);
    expect(html).toContain("Max Muster");
    expect(html).toContain("2026-123");
    expect(html).toContain("4711");
    expect(html).toContain("20.11.2026");
    // Gültigkeit der Bescheinigung: zwei Jahre ab Untersuchung
    expect(html).toContain("20.11.2028");
    for (const k of FAHRERLAUBNISKLASSEN) expect(html).toContain(k);
    for (const l of SEHTEST_LEISTUNGEN) expect(html).toContain(l.bezeichnung);
    expect(html).toContain("139,90 EUR");
    expect(html).toContain("22,34 EUR");
    expect(html).toContain("Anlage 6 Nr. 2.1 FeV");
    // ohne Vorschau kein Skript
    expect(html).not.toContain("<script");
  });

  it("Vorschau enthält das Rechenskript mit denselben Funktionen", () => {
    const html = buildSehtestRechnungPreviewHtml(daten);
    expect(html).toContain("<script data-nur-vorschau>");
    const skript =
      html.match(/<script data-nur-vorschau>([\s\S]*?)<\/script>/)?.[1] ?? "";
    // die eingebetteten Funktionen herauslösen und ausführen
    const teil = (name: string) =>
      skript.match(new RegExp(`var ${name} = ([\\s\\S]*?);\\n  var `))?.[1] ??
      "";
    const zahl = new Function(
      `return (${teil("euroZahl")})`,
    )() as typeof euroZahl;
    const rechne = new Function(
      `return (${teil("berechne")})`,
    )() as typeof berechneSehtestRechnung;
    expect(zahl("1.234,56 €")).toBe(1234.56);
    expect(rechne([{ menge: 2, preis: 12.5 }], 10, 19).brutto).toBe(22.5);
    // nicht gewählte Leistungen sind markiert und werden nicht gedruckt
    expect(html).toContain('class="leistung aus" data-zeile="refraktion"');
  });
});
