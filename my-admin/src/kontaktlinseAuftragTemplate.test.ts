import { describe, expect, it } from "vitest";
import { buildKontaktlinseAuftragPrintHtml } from "./kontaktlinseAuftragTemplate";

const html = buildKontaktlinseAuftragPrintHtml({
  cl: {
    id: 827,
    Datum: "2026-10-30",
    Linsenart: "Weichlinsen",
    Anpassgrund: "Erstanpassung",
    Berater: "Robert Ulm",
    SphRechts: -0.5,
    SphLinks: -0.5,
    CylLinks: -0.75,
    AchseLinks: 180,
    RadiusRechts: 8.6,
    DurchmesserRechts: 14.2,
    HerstellerRechts: "Cooper <Vision>",
    LinsentypRechts: "MyDay",
    LotNrRechts: "L123",
    LieferscheinDatumRechts: "2026-10-28",
    PreisRechts: 32,
    PreisLinks: 32,
    Zusatzleistung1: "Anpassung",
    Zusatzbetrag1: 20,
    Summe: 84,
    KKAnteil: 10,
    Anzahlung: 20,
    Pflegemittel: "Biotrue 300 ml",
    Notizen: "Art: Weichlinsen",
  },
  kunde: {
    id: 23001,
    KundenNummer: "23001",
    Anrede: "Herr",
    Vorname: "Sören",
    Nachname: "Neupert",
    Geburtsdatum: "1990-04-02",
    Straße: "Werdauer Str.",
    Hausnummer: "38",
    Postleitzahl: "07551",
    Stadt: "Gera",
    Handy: "0170 1234567",
  },
});

describe("Kontaktlinsenauftrag (Druck, Aufbau wie Werkstattauftrag)", () => {
  it("Kopf, Kunde und Anpassung", () => {
    for (const wert of [
      "Kontaktlinsenauftrag",
      "Auftrag <b>827</b>",
      "30.10.2026",
      "Sören Neupert",
      "Werdauer Str. 38",
      "07551 Gera",
      "02.04.1990",
      "0170 1234567",
      "Weichlinsen",
      "Erstanpassung",
      "Robert Ulm",
      "Biotrue 300 ml",
    ])
      expect(html).toContain(wert);
  });

  it("gleiche Blatt-Aufteilung wie der Werkstattauftrag", () => {
    expect(html).toContain('<div class="blatt">');
    expect(html.match(/<section class="haelfte">/g)).toHaveLength(2);
    expect(html).toContain("✂ Kundenabschnitt");
    expect(html).toContain("Pflegetipps für Ihre Kontaktlinsen");
  });

  it("Linsenparameter, Linsen und Lieferung je Auge", () => {
    for (const wert of [
      "<td>-0,50</td>",
      "<td>-0,75</td>",
      "<td>180</td>",
      "<td>8,60</td>",
      "<td>14,2</td>",
      "<td>Cooper &lt;Vision&gt;</td>",
      "<td>MyDay</td>",
      "<td>L123</td>",
      "<td>28.10.2026</td>",
    ])
      expect(html).toContain(wert);
  });

  it("Preise mit Kassenanteil, Anzahlung und Offen", () => {
    expect(html).toContain("Kontaktlinse R. – MyDay");
    expect(html).toContain('<td>Anpassung</td><td class="betrag">20,00</td>');
    expect(html).toContain('<td>Gesamtpreis</td><td class="betrag">84,00</td>');
    expect(html).toContain('<td>Endpreis</td><td class="betrag">74,00</td>');
    expect(html).toContain('<td>Offen</td><td class="betrag">54,00</td>');
    expect(html).toContain("Unterschrift Kunde/Kundin");
  });
});
