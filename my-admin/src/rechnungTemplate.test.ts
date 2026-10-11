import { describe, expect, it } from "vitest";
import {
  absenderAusBetrieb,
  buildKostenvoranschlagBodyHtml,
  buildRechnungBodyHtml,
  buildRechnungPositionen,
  formatGlaswerte,
  RECHNUNG_ABSENDER,
  STANDARD_ABSENDER,
} from "./rechnungTemplate";
import type { DocumentMergeEntities } from "./documentTemplateEngine";

// Erfundene Daten im Aufbau der Referenzrechnung (Rechnung HF25.pdf):
// Bifokalbrille, eigenes Gestell, zwei Gläser und Glaseinschliff.
const ENTITIES: DocumentMergeEntities = {
  kunde: {
    Anrede: "Herr",
    Vorname: "Max",
    Nachname: "Beispiel",
    Straße: "Musterweg",
    Hausnummer: "1",
    Postleitzahl: "07545",
    Stadt: "Gera",
  },
  brille: {
    id: 42,
    Rechnungsnummer: "114400",
    Summe: 329.3,
    BrillenArt: "Bifokalbrille",
    Berater: "Robert Ulm",
    Zahlungsstatus: "bezahlt",
  },
  glasRechts: { Sph: 0.25, Cyl: -0.75, A: 173, Add: 1.5, Betrag: 159.9 },
  glasLinks: { Sph: 0, Cyl: -0.75, A: 173, Add: 1.5, Betrag: 159.9 },
  glastyp: { Bezeichnung: "RS28", Verguetung: "HSET", GlasGroesse: "65/70" },
  zusatzleistungen: [{ Bezeichnung: "Glaseinschliff", Betrag: 26.9 }],
};

describe("buildRechnungPositionen", () => {
  it("ordnet Fassung, Gläser und Zusatzleistungen wie in der Referenz", () => {
    const positionen = buildRechnungPositionen(ENTITIES);
    expect(positionen.map((p) => p.label)).toEqual([
      "Fassung :",
      "Glas rechts :",
      "Glas links :",
      "Glaseinschliff",
    ]);
    expect(positionen.map((p) => p.betrag)).toEqual([null, 159.9, 159.9, 26.9]);
    expect(positionen[0].details).toEqual(["eigenes Gestell"]);
    expect(positionen[1].werte).toBe("sph: + 0,25 cyl - 0,75 A 173  ADD 1,50");
    expect(positionen[1].details).toEqual(["RS28   HSET   DM 65/70"]);
  });

  it("zeigt bei vorhandener Fassung Bezeichnung und Lagernummer", () => {
    const [fassung] = buildRechnungPositionen({
      ...ENTITIES,
      fassung: {
        Hersteller: "Lindberg",
        Bezeichnung: "Air",
        Lagernummer: "F-1001",
        Betrag: 149,
      },
    });
    expect(fassung.betrag).toBe(149);
    expect(fassung.details).toEqual(["Lindberg Air", "F-1001"]);
  });

  it("hängt einen Rabatt als letzte, negative Position an", () => {
    const positionen = buildRechnungPositionen({
      ...ENTITIES,
      brille: {
        ...ENTITIES.brille,
        RabattProzent: 10,
        RabattBezeichnung: "Stammkundenrabatt",
      },
    });
    const rabatt = positionen[positionen.length - 1];
    expect(rabatt.label).toBe("Rabatt: Stammkundenrabatt (-10 %)");
    // Rabattbasis: Glas rechts 159,90 + Glas links 159,90 = 319,80
    expect(rabatt.betrag).toBeCloseTo(-31.98, 2);
  });

  it("zeigt weitere Leistungen bzw. Nachlass als eigene Position (#131)", () => {
    const mit = buildRechnungPositionen({
      ...ENTITIES,
      brille: { ...ENTITIES.brille, WeitereLeistungen: 42.5 },
    });
    expect(mit.at(-1)).toEqual({
      label: "Weitere Leistungen (siehe Auftrag)",
      betrag: 42.5,
    });
    const nachlass = buildRechnungPositionen({
      ...ENTITIES,
      brille: { ...ENTITIES.brille, WeitereLeistungen: -10 },
    });
    expect(nachlass.at(-1)).toEqual({
      label: "Nachlass (siehe Auftrag)",
      betrag: -10,
    });
    const ohne = buildRechnungPositionen(ENTITIES);
    expect(ohne.some((p) => p.label.includes("siehe Auftrag"))).toBe(false);
  });

  it("schreibt Sphäre immer mit Vorzeichen, Achse nur mit Zylinder", () => {
    expect(formatGlaswerte({ Sph: -1, Cyl: 0, A: 90 })).toBe("sph: - 1,00");
  });
});

describe("buildRechnungBodyHtml", () => {
  const html = buildRechnungBodyHtml({
    entities: ENTITIES,
    rechnungsnummer: "114400",
  });

  it("zeigt Rechnungsnummer, Summe und MwSt wie in der Referenz", () => {
    expect(html).toContain("114400");
    expect(html).toContain("329,30 EUR");
    // 329,30 EUR brutto bei 19 % enthalten 52,58 EUR MwSt (Netto 276,72 €)
    expect(html).toContain("52,58 EUR");
    expect(html).toContain("(Nettopreis: 276,72 €)");
    expect(html).toContain(`${RECHNUNG_ABSENDER.mwstSatz}% Mwst`);
    expect(html).toContain("RECHNUNG");
    expect(html).toContain("Sehzentrum Gera - Werdauerstr.38 - 07551 Gera");
  });

  it("zeigt Anrede, Kundenname und Berater", () => {
    expect(html).toContain("Herr");
    expect(html).toContain("Max Beispiel");
    expect(html).toContain("Es bediente Sie Robert Ulm.");
  });

  it("bittet nur bei offener Rechnung um Überweisung", () => {
    expect(html).not.toContain("Bitte überweisen");
    const offen = buildRechnungBodyHtml({
      entities: {
        ...ENTITIES,
        brille: { ...ENTITIES.brille, Zahlungsstatus: "offen" },
      },
      rechnungsnummer: "114400",
    });
    expect(offen).toContain("Bitte überweisen Sie den Rechnungsbetrag");
  });

  it("escaped Kundendaten, um HTML-Injection im Druckfenster zu verhindern", () => {
    const html2 = buildRechnungBodyHtml({
      entities: {
        ...ENTITIES,
        kunde: { ...ENTITIES.kunde, Nachname: "<script>alert(1)</script>" },
      },
      rechnungsnummer: "114400",
    });
    expect(html2).not.toContain("<script>alert(1)</script>");
    expect(html2).toContain("&lt;script&gt;");
  });
});

describe("Rechnung mit Kassenanteil", () => {
  it("zieht den Kassenanteil ab, MwSt bezieht sich auf den Eigenanteil", () => {
    const html = buildRechnungBodyHtml({
      entities: {
        ...ENTITIES,
        brille: { ...ENTITIES.brille, Summe: 232.3, KKAnteil: 38.63 },
      },
      rechnungsnummer: "114880",
    });
    expect(html).toContain("Gesamtbetrag");
    expect(html).toContain("232,30 EUR");
    expect(html).toContain("abzüglich Anteil Krankenkasse");
    expect(html).toContain("-38,63 EUR");
    expect(html).toContain("Rechnungsbetrag (Ihr Eigenanteil)");
    expect(html).toContain("193,67 EUR");
    // 193,67 brutto: Netto 162,75, MwSt 30,92
    expect(html).toContain("30,92 EUR");
    expect(html).toContain("(Nettopreis: 162,75 €)");
  });

  it("nennt eine Anzahlung und den noch offenen Betrag", () => {
    const html = buildRechnungBodyHtml({
      entities: {
        ...ENTITIES,
        brille: {
          ...ENTITIES.brille,
          Summe: 232.3,
          KKAnteil: 38.63,
          Anzahlung: 50,
          Zahlungsstatus: "teilweise offen",
        },
      },
      rechnungsnummer: "114880",
    });
    expect(html).toContain(
      "Bereits angezahlt: 50,00 EUR, noch zu zahlen: 143,67 EUR.",
    );
    expect(html).toContain("Bitte überweisen Sie den noch offenen Betrag");
  });
});

describe("buildKostenvoranschlagBodyHtml", () => {
  it("nutzt das Rechnungsdesign mit eigenem Titel und Gültigkeit", () => {
    const html = buildKostenvoranschlagBodyHtml({
      entities: { ...ENTITIES, brille: { ...ENTITIES.brille, KKAnteil: 100 } },
    });
    expect(html).toContain("KOSTENVORANSCHLAG");
    expect(html).toContain("Gesamtbetrag");
    expect(html).toContain("unverbindlich und gültig bis");
    expect(html).toContain("abzüglich Anteil Krankenkasse");
    expect(html).toContain("Ihr Eigenanteil");
    expect(html).toContain("229,30 EUR");
    expect(html).not.toContain("Rech.-Nr.");
  });
});

describe("absenderAusBetrieb (#132)", () => {
  it("übernimmt gepflegte Felder, sonst die Standardwerte", () => {
    const absender = absenderAusBetrieb({
      Firmenname: "Optik Muster",
      Strasse: "Hauptstraße 1",
      Telefon: "  ",
      MwStSatz: "7",
      ZahlungszielTage: null,
    });
    expect(absender.firma).toBe("Optik Muster");
    expect(absender.strasseLang).toBe("Hauptstraße 1");
    expect(absender.strasseKurz).toBe("Hauptstraße 1");
    expect(absender.telefon).toBe(STANDARD_ABSENDER.telefon);
    expect(absender.mwstSatz).toBe(7);
    expect(absender.zahlungszielTage).toBe(STANDARD_ABSENDER.zahlungszielTage);
    expect(absenderAusBetrieb(null)).toEqual(STANDARD_ABSENDER);
  });
});
