import { describe, expect, it } from "vitest";
import {
  buildRechnungBodyHtml,
  buildRechnungPositionen,
  RECHNUNG_ABSENDER,
} from "./rechnungTemplate";
import type { DocumentMergeEntities } from "./documentTemplateEngine";

// Nachgebildet aus der Referenzrechnung Nr. 114638 (Issue #88,
// BR1Rechnung_AH_N.pdf), um das Layout gegen die dort abgedruckten Werte zu
// verifizieren.
const REFERENZ_ENTITIES: DocumentMergeEntities = {
  kunde: {
    Anrede: "Frau",
    Vorname: "Alexandra",
    Nachname: "Heckner",
    Straße: "Otto Rothestr.",
    Hausnummer: "27",
    Postleitzahl: "07549",
    Stadt: "Gera",
  },
  brille: {
    Rechnungsnummer: "114638",
    Summe: 511.5,
    BrillenArt: "Fernbrille",
    Berater: "Robert Ulm",
  },
  glasRechts: { Sph: 1.5, Cyl: -0.25, A: 169, Betrag: 169 },
  glasLinks: { Sph: 1.25, Cyl: -0.25, A: 23, Betrag: 169 },
  glastyp: {
    Bezeichnung: "ES HDC 1.6 Photo 60/65 Photo Extra Grau",
    Verguetung: "HMC Blue",
  },
  fassung: { Lagernummer: "zl 32001 5 49 19", Betrag: 149 },
  zusatzleistungen: [{ Bezeichnung: "Refraktion", Betrag: 24.5 }],
};

describe("buildRechnungPositionen", () => {
  it("ordnet Fassung, Glas rechts, Glas links und Zusatzleistungen wie im Referenzdesign", () => {
    const positionen = buildRechnungPositionen(REFERENZ_ENTITIES);

    expect(positionen.map((p) => p.label)).toEqual([
      "Fassung :",
      "Glas rechts :",
      "Glas links :",
      "Refraktion",
    ]);
    expect(positionen.map((p) => p.betrag)).toEqual([149, 169, 169, 24.5]);
    expect(positionen[0].detailZeilen).toEqual(["zl 32001 5 49 19"]);
    expect(positionen[1].detailZeilen).toEqual([
      "sph:+1.50 cyl:-0.25 A:169",
      "ES HDC 1.6 Photo 60/65 Photo Extra Grau",
      "HMC Blue",
    ]);
    expect(positionen[2].detailZeilen).toEqual([
      "sph:+1.25 cyl:-0.25 A:23",
      "ES HDC 1.6 Photo 60/65 Photo Extra Grau",
      "HMC Blue",
    ]);
  });

  it("hängt einen Rabatt als letzte, negative Position an", () => {
    const positionen = buildRechnungPositionen({
      ...REFERENZ_ENTITIES,
      brille: {
        ...REFERENZ_ENTITIES.brille,
        RabattProzent: 10,
        RabattBezeichnung: "Stammkundenrabatt",
      },
    });

    const rabatt = positionen[positionen.length - 1];
    expect(rabatt.label).toBe("Rabatt: Stammkundenrabatt (-10 %)");
    // Rabattbasis: Fassung 149 + Glas rechts 169 + Glas links 169 = 487
    expect(rabatt.betrag).toBeCloseTo(-48.7, 2);
  });
});

describe("buildRechnungBodyHtml", () => {
  const html = buildRechnungBodyHtml({
    entities: REFERENZ_ENTITIES,
    rechnungsnummer: "114638",
  });

  it("zeigt Rechnungsnummer, Summe und den enthaltenen MwSt-Betrag wie im Referenz-PDF", () => {
    expect(html).toContain("114638");
    expect(html).toContain("511.50 EUR");
    // 511,50 EUR brutto bei 19% MwSt enthält 81,67 EUR MwSt (siehe Referenz-PDF).
    expect(html).toContain("81.67 EUR");
    expect(html).toContain(`${RECHNUNG_ABSENDER.mwstSatz}% Mwst`);
  });

  it("zeigt Anrede, Kundenname und Berater", () => {
    expect(html).toContain("Frau");
    expect(html).toContain("Alexandra Heckner");
    expect(html).toContain("Es bediente Sie Robert Ulm.");
  });

  it("escaped Kundendaten, um HTML-Injection im Druckfenster zu verhindern", () => {
    const html2 = buildRechnungBodyHtml({
      entities: {
        ...REFERENZ_ENTITIES,
        kunde: {
          ...REFERENZ_ENTITIES.kunde,
          Nachname: "<script>alert(1)</script>",
        },
      },
      rechnungsnummer: "114638",
    });
    expect(html2).not.toContain("<script>alert(1)</script>");
    expect(html2).toContain("&lt;script&gt;");
  });
});
