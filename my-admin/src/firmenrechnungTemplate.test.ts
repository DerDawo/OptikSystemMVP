import { describe, expect, it } from "vitest";
import {
  alsDatensatz,
  ausDatensatz,
  betrag,
  buildFirmenrechnungHtml,
  fehlendeAngaben,
  leereFirmenrechnung,
  summen,
  type Firmenrechnung,
} from "./firmenrechnungTemplate";

const gesundheitstag = (): Firmenrechnung => ({
  ...leereFirmenrechnung("2026-11-08"),
  empfaenger: "DAKO GmbH\nBrüsseler Str. 22\n07743 Jena",
  auftragsnummer: "A-17",
  aktivitaet: "Gesundheitstag Augen",
  beschreibung: "Netzhautscreening",
  positionen: [
    {
      zeitaufwand: "ganztägig",
      aktivitaet: "Gesundheitstag Augen",
      betrag: "1.000,00",
    },
  ],
  kilometer: "46",
  kmSatz: "0,30",
  mwstSatz: 19,
});

describe("Firmenrechnung", () => {
  it("liest deutsche Beträge", () => {
    expect(betrag("1.000,50")).toBe(1000.5);
    expect(betrag("13,8")).toBe(13.8);
    expect(betrag("12.5")).toBe(12.5);
    expect(betrag("")).toBe(0);
    expect(betrag("abc")).toBe(0);
  });

  it("rechnet Fahrkosten und MwSt", () => {
    expect(summen(gesundheitstag())).toEqual({
      honorar: 1000,
      fahrkosten: 13.8,
      netto: 1013.8,
      mwst: 192.62,
      brutto: 1206.42,
    });
    expect(summen({ ...gesundheitstag(), mwstSatz: 0 }).brutto).toBe(1013.8);
  });

  it("verlangt Empfänger und eine Position mit Betrag", () => {
    expect(fehlendeAngaben(gesundheitstag())).toEqual([]);
    expect(fehlendeAngaben(leereFirmenrechnung("2026-11-08"))).toEqual([
      "Empfänger",
      "mindestens eine Position mit Betrag",
      "Betrag",
    ]);
  });

  it("zeigt Empfänger, Fahrkosten und Rechnungsbetrag", () => {
    const html = buildFirmenrechnungHtml(
      { ...gesundheitstag(), rechnungsnummer: "114999" },
      false,
    );
    expect(html).toContain("DAKO GmbH");
    expect(html).toContain("114999");
    expect(html).toContain("46 km");
    expect(html).toContain("HONORARRECHNUNG");
    expect(html).toMatch(/1\.206,42/);
  });

  it("übersteht Speichern und Wiederöffnen", () => {
    const d = alsDatensatz(gesundheitstag());
    const zurueck = ausDatensatz({ ...d, Rechnungsnummer: "1" });
    expect(summen(zurueck)).toEqual(summen(gesundheitstag()));
    expect(zurueck.empfaenger).toContain("Jena");
  });
});
