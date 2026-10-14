import { describe, expect, it } from "vitest";
import { buildAntragPrintHtml } from "./antragTemplate";

const entities = {
  kunde: {
    Anrede: "Frau",
    Vorname: "Erika",
    Nachname: "Muster",
    Straße: "Hauptstraße",
    Hausnummer: "1",
    Postleitzahl: "07545",
    Stadt: "Gera",
    Handy: "0170 1234567",
  },
  brille: { id: 42, BrillenArt: "Fernbrille", Summe: 98.7, KKAnteil: 0 },
  glasRechts: { Sph: -1, Betrag: 30 },
  glasLinks: { Sph: -1.25, Betrag: 30 },
  fassung: { Bezeichnung: "Kinderfassung", Betrag: 38.7 },
};

describe("Antrag Jugendamt", () => {
  const html = buildAntragPrintHtml("jugendamt", {
    entities,
    begruendung: "Kind <8 Jahre> braucht die Brille für die Schule.",
  } as never);

  it("Brief an das Jugendamt mit Kundendaten und Betrag", () => {
    expect(html).toContain("Antrag auf Kostenübernahme einer Brille");
    expect(html).toContain("An das Jugendamt");
    expect(html).toContain("Erika Muster");
    expect(html).toContain("07545 Gera");
    expect(html).toContain("Telefon: 0170 1234567");
    expect(html).toContain("in Höhe von 98,70 €");
    expect(html).toContain("Kostenvoranschlag des Optikers über 98,70 €");
    expect(html).toContain("Erika Muster / gesetzliche Vertretung");
    // Kostenvoranschlag liegt als Seite 2 bei
    expect(html).toContain("KOSTENVORANSCHLAG");
  });

  it("Begründung als Text, nicht als HTML", () => {
    expect(html).toContain("Kind &lt;8 Jahre&gt;");
  });

  it("nur der Kostenvoranschlag ist vorab angekreuzt", () => {
    expect(
      html.match(/type="checkbox" class="kaestchen" checked/g),
    ).toHaveLength(1);
  });
});
