import { describe, expect, it } from "vitest";
import {
  buildWerkstattauftragPrintHtml,
  buildWerkstattauftragSummen,
  formatWert,
} from "./werkstattauftragTemplate";

const entities = {
  kunde: {
    Anrede: "Frau",
    Vorname: "Erika",
    Nachname: "Muster",
    Straße: "Hauptstraße",
    Hausnummer: "1",
    Postleitzahl: "07545",
    Stadt: "Gera",
    KundenNummer: "10001",
    Geburtsdatum: "1980-05-17",
    KrankenversicherungsTyp: "Privat",
    Handy: "0170 1234567",
    Notizen: "Grauer Star links",
  },
  brille: {
    id: 42,
    BrillenArt: "Gleitsichtbrille",
    Datum: "2026-09-15",
    Abholung: "2026-09-22T17:00:00",
    Berater: "Robert Ulm",
    Refraktion: "lt. ärztl. Verordnung",
    Notizen: "Bügel <kürzen>",
    Summe: 653.9,
    KKAnteil: 0,
    Anzahlung: 100,
  },
  glasRechts: { Sph: 0.75, Cyl: -0.5, A: 79, Add: 1.5, PD: 32, Vis: 1 },
  glasLinks: { Sph: -0.5, Cyl: -1, A: 88, Add: 1.5, PD: 32, Betrag: 225 },
  glastyp: { Hersteller: "POL Optic", Bezeichnung: "Matrix Pro 1.50" },
  fassung: {
    Bezeichnung: "44324",
    Lagernummer: "L-778",
    Linie: "Classic",
    Farbe: "2",
    Groesse: "53-17",
    Betrag: 149.9,
  },
  zusatzleistungen: [{ Bezeichnung: "Glaseinschliff", Betrag: 29.5 }],
};

describe("werkstattauftragTemplate", () => {
  it("schreibt Werte optikerüblich", () => {
    expect(formatWert(0.75, "dioptrie")).toBe("+0,75");
    expect(formatWert(-1, "dioptrie")).toBe("-1,00");
    expect(formatWert(0, "dioptrie")).toBe("0,00");
    expect(formatWert(79.4, "achse")).toBe("79");
    expect(formatWert(32, "frei")).toBe("32");
    expect(formatWert(1, "visus")).toBe("1,0");
    expect(formatWert(null, "dioptrie")).toBe("");
  });

  it("rechnet Endpreis, MwSt und offenen Betrag", () => {
    const summen = buildWerkstattauftragSummen(entities);
    expect(summen.positionen.map((p) => p.label)).toEqual([
      "Brillenfassung",
      "Brillenglas R.",
      "Brillenglas L.",
      "Glaseinschliff",
    ]);
    expect(summen.endpreis).toBe(653.9);
    expect(summen.netto).toBe(549.5);
    expect(summen.mwst).toBe(104.4);
    expect(summen.offen).toBe(553.9);
  });

  it("füllt das Formular mit den Auftragsdaten", () => {
    const html = buildWerkstattauftragPrintHtml({ entities });
    expect(html).toContain("Werkstattauftrag");
    expect(html).toContain("Erika Muster");
    expect(html).toContain("Gleitsichtbrille");
    expect(html).toContain("+0,75");
    expect(html).toContain("22.09.2026 17:00");
    expect(html).toContain("Matrix Pro 1.50");
    expect(html).toContain("Offen: 553,90 €");
    expect(html).toContain("Auftragserteilung");
    expect(html).toContain("zum Endpreis von 653,90 € inkl. MwSt.");
    expect(html).toContain("§ 648 BGB");
    expect(html).toContain("Unterschrift Kunde/Kundin");
    // zu lange Spalten werden eingepasst statt an der Falz abgeschnitten
    expect(html).toContain('spalte.style.transform = "scale("');
    // nur auf dem Abschnitt fürs Geschäft, nicht auf dem Kundenabschnitt
    expect(html.match(/Auftragserteilung/g)).toHaveLength(1);
    expect(html).toContain("Kundenabschnitt");
    // Eingaben werden als Text eingesetzt, nicht als HTML
    expect(html).toContain("Bügel &lt;kürzen&gt;");
    // Notizen des Kunden stehen unter den Bemerkungen
    expect(html).toContain("<b>Kunde:</b> Grauer Star links");
  });

  it("hat Felder zum Abhaken neben den Kontaktdaten", () => {
    const html = buildWerkstattauftragPrintHtml({ entities });
    const haken = html.slice(
      html.indexOf('<div class="haken">'),
      html.indexOf('<div class="balken">'),
    );
    expect(haken.match(/class="kasten"/g)).toHaveLength(3);
    expect(haken).toContain("Hotstegs");
    expect(haken).toContain("Fassung bestellt");
    expect(haken).toContain("Sonstiges");
    expect(haken.match(/class="datum"/g)).toHaveLength(2);
  });

  it("zeigt bei der Fassung nur Hersteller, Modell, Farbe und Größe", () => {
    const html = buildWerkstattauftragPrintHtml({ entities });
    expect(html).toContain("53-17");
    expect(html).not.toContain("Lager-Nr.");
    expect(html).not.toContain("L-778");
    expect(html).not.toContain("Classic");
  });
});
