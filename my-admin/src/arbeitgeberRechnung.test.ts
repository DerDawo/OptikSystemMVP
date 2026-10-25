import { describe, expect, it } from "vitest";
import {
  ARBEITGEBER_RECHNUNG_KATEGORIEN,
  arbeitgeberGlasZeile,
  arbeitgeberPositionen,
  buildArbeitgeberRechnungPreviewHtml,
  buildArbeitgeberRechnungPrintHtml,
} from "./arbeitgeberRechnungTemplate";

const entities = {
  kunde: { Vorname: "Max", Nachname: "Beispiel", Anrede: "Herr" },
  brille: { id: 7, Summe: 261.8, Rechnungsnummer: "2026-0042" },
  glasRechts: { Sph: 1.25, Cyl: -0.5, A: 10, Betrag: 83.3 },
  glasLinks: { Sph: 1, Cyl: -0.75, A: 170, Betrag: 83.3 },
  fassung: { Hersteller: "Lindberg", Bezeichnung: "Air", Betrag: 95.2 },
};

describe("Rechnungen an den Arbeitgeber", () => {
  it("zeigt die Gläser einzeln mit Werten unter der Überschrift", () => {
    const pos = arbeitgeberPositionen(entities);
    expect(pos.map((p) => p.label)).toEqual([
      "Fassung :",
      "Brillengläser:",
      "",
      "",
    ]);
    expect(pos[2].betrag).toBe(83.3);
    expect(pos[2].werte).toBe("RA: sph + 1,25 cyl - 0,50 A 10");
    expect(pos[3].werte).toBe("LA: sph + 1,00 cyl - 0,75 A 170");
  });

  it("nennt die Nahstärke mit der Degression", () => {
    expect(
      arbeitgeberGlasZeile("RA", { Sph: 1, Cyl: 0, Add: 0.75, Vis: 1 }),
    ).toBe("RA: sph + 1,75 Degression 0,75 Vcc 1,00");
  });

  it("zeigt Summe, enthaltene Mwst, Rechnungsnummer und Zweck", () => {
    const html = buildArbeitgeberRechnungPrintHtml("bildschirm", {
      entities,
      rechnungsnummer: "2026-0042",
    });
    expect(html).toContain("RECHNUNG");
    expect(html).toContain("261,80 EUR");
    expect(html).toContain("41,80 EUR");
    expect(html).toContain("220,00 €");
    expect(html).toContain("2026-0042");
    expect(html).toContain("Bildschirmarbeitsplatzbrille");
    expect(html).toContain("ArbMedVV");
    expect(html).toContain("Max Beispiel");
    expect(html).toContain("DE299317258");
    expect(html).toContain("RA: sph + 1,25");
    expect(html).toContain("nach optometrischer Verordnung vom");
  });

  it("nennt bei der Schutzbrille die DIN EN 166", () => {
    const html = buildArbeitgeberRechnungPrintHtml("schutz", {
      entities,
      rechnungsnummer: "2026-0042",
    });
    expect(html).toContain("DIN EN 166");
    expect(html).not.toContain("ArbMedVV");
  });

  it("macht die Empfängerdaten in der Vorschau eintippbar", () => {
    const html = buildArbeitgeberRechnungPreviewHtml("schutz", {
      entities,
      rechnungsnummer: "2026-0042",
    });
    expect(html).toContain('contenteditable="true"');
    expect(html).toContain("versand-email");
    expect(html).toContain("data-nur-vorschau");
    expect(html).toContain("data-bildschirm");
  });

  it("verwendet die Kategorien der Formulare", () => {
    expect(ARBEITGEBER_RECHNUNG_KATEGORIEN).toEqual({
      bildschirm: "Rechnung Bildschirmarbeitsplatzbrille",
      schutz: "Rechnung Arbeitsschutzbrille",
    });
  });
});

describe("Stempel und Unterschrift auf der Arbeitgeber-Rechnung", () => {
  const PNG =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
  it("erscheinen nur, wenn sie in den Einstellungen gespeichert sind", () => {
    const daten = { entities, rechnungsnummer: "1" };
    expect(
      buildArbeitgeberRechnungPrintHtml("bildschirm", { ...daten, bilder: {} }),
    ).not.toContain('stempelblock"');
    const mit = buildArbeitgeberRechnungPrintHtml("bildschirm", {
      ...daten,
      bilder: { stempel: PNG, unterschrift: PNG },
    });
    expect(mit).toContain('class="stempel"');
    expect(mit).toContain('class="unterschrift"');
  });
});

describe("Gespeicherter Arbeitgeber", () => {
  it("trägt Anschrift und E-Mail aus dem Kunden in die Vorschau ein", () => {
    const html = buildArbeitgeberRechnungPreviewHtml("bildschirm", {
      entities: {
        ...entities,
        kunde: {
          ...entities.kunde,
          Arbeitgeber: {
            firma: "Muster GmbH",
            strasse: "Hauptstr. 1",
            ort: "07545 Gera",
            email: "rechnung@muster.de",
          },
        },
      },
      rechnungsnummer: "2026-0042",
    });
    expect(html).toContain('data-ag="firma">Muster GmbH<');
    expect(html).toContain('data-ag="email">rechnung@muster.de<');
  });
});
