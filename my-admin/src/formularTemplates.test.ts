import { describe, expect, it } from "vitest";
import { buildAntragPrintHtml } from "./antragTemplate";
import { buildErprobungsprotokollPrintHtml } from "./erprobungsprotokollTemplate";
import { buildRezeptanfragePrintHtml } from "./rezeptanfrageTemplate";
import {
  buildAokBerechtigungsscheinPrintHtml,
  verteileWerte,
} from "./aokBerechtigungsscheinTemplate";
import {
  buildOptometrischeVerordnungPrintHtml,
  buildVerordnungKurzPrintHtml,
} from "./optometrischeVerordnungTemplate";

const entities = {
  kunde: {
    Anrede: "Herr",
    Vorname: "Max",
    Nachname: "Beispiel",
    Straße: "Ringstraße",
    Hausnummer: "5",
    Postleitzahl: "07545",
    Stadt: "Gera",
    Geburtsdatum: "1970-03-01",
    KrankenkassenNummer: "101234567",
    VersichertenNummer: "A123456789",
    Tätigkeit: "Buchhalter",
  },
  brille: {
    id: 7,
    BrillenArt: "Gleitsichtbrille",
    Rechnungsnummer: "R-2026-0042",
    Summe: 480,
    KKAnteil: 0,
  },
  glasRechts: { Sph: 1.25, Cyl: -0.5, A: 10, Add: 2, PD: 32, Betrag: 200 },
  glasLinks: { Sph: 1, Cyl: -0.75, A: 170, Add: 2, PD: 31.5, Betrag: 200 },
  fassung: { Hersteller: "Lindberg", Bezeichnung: "Air", Betrag: 80 },
};

describe("Antrag auf Kostenübernahme", () => {
  it("füllt den Zuschuss-Antrag und hängt den Kostenvoranschlag an", () => {
    const html = buildAntragPrintHtml("zuschuss", { entities });
    expect(html).toContain("Max Beispiel");
    expect(html).toContain("A123456789");
    expect(html).toContain("Kostenvoranschlag");
    expect(html).toContain("480,00 €");
    expect(html).toContain("KOSTENVORANSCHLAG");
    expect(html).toContain("Glas rechts :");
  });

  it("übernimmt beim Sozialamt-Antrag den Beruf in die Begründung", () => {
    const html = buildAntragPrintHtml("sozialamt", { entities });
    expect(html).toContain("Als Buchhalter benötige ich eine Sehhilfe");
    expect(html).toContain("Sozialversicherungsnummer");
    expect(html).toContain("Nachweis meiner finanziellen Situation");
  });
});

describe("Berechtigungsschein (AOK, Anlage 4)", () => {
  it("leitet die Nähe bei Gleitsicht aus Sph + Add ab", () => {
    const { ferne, naehe } = verteileWerte(
      "Gleitsichtbrille",
      entities.glasRechts,
    );
    expect(ferne.Sph).toBe(1.25);
    expect(naehe.Sph).toBe(3.25);
  });

  it("trägt Einstärken-Nahbrillen nur in die Zeile N ein", () => {
    const { ferne, naehe } = verteileWerte(
      "Einstärkenbrille (Nah/Lesebrille)",
      {
        Sph: 2.5,
      },
    );
    expect(ferne).toEqual({});
    expect(naehe.Sph).toBe(2.5);
  });

  it("füllt Versichertendaten, IK und Rechnungsnummer", () => {
    const html = buildAokBerechtigungsscheinPrintHtml({
      entities,
      betrieb: { IKNummer: "123456789" },
    });
    expect(html).toContain("Beispiel, Max");
    expect(html).toContain("101234567");
    expect(html).toContain("R-2026-0042");
    expect(html).toContain("123456789");
    expect(html).toContain("+3,25");
  });
});

describe("Optometrische Verordnung", () => {
  it("füllt die GKV-Verordnung mit Kästchen statt schwarzer Vierecke", () => {
    const html = buildOptometrischeVerordnungPrintHtml({ entities });
    expect(html).toContain("Beispiel, Max");
    expect(html).toContain("Ringstraße 5, 07545 Gera");
    expect(html).toContain("ADD");
    expect(html).not.toContain("■");
    expect(html).toContain('class="kaestchen"');
  });

  it("rechnet in der kurzen Verordnung die PD zusammen", () => {
    const html = buildVerordnungKurzPrintHtml({ entities });
    expect(html).toContain("Max Beispiel");
    expect(html).toContain("63,5");
    expect(html).toContain("+2,00");
  });
});

describe("Erprobungsprotokoll", () => {
  it("füllt nur Versichertendaten, IK und Datum vor", () => {
    const html = buildErprobungsprotokollPrintHtml({
      entities,
      betrieb: { IKNummer: "311600000" },
    });
    expect(html).toContain("Beispiel, Max");
    expect(html).toContain("A123456789");
    expect(html).toContain("IK 311600000");
    expect(html).toContain("Hellfeldlupe");
    expect(html).toContain("Zusammenfassende Beurteilung");
  });
});

describe("Rezeptanfrage an den Augenarzt", () => {
  it("füllt Patientendaten, Refraktion und PD vor", () => {
    const html = buildRezeptanfragePrintHtml({ entities });
    expect(html).toContain("Beispiel");
    expect(html).toContain("A123456789");
    expect(html).toContain("+1,25");
    expect(html).toContain("63,5");
    expect(html).toContain("Hornhautverkrümmung");
    expect(html).not.toContain("Hornhautverkruemmung");
  });
});

describe("Vorgeschlagene Kreuze", () => {
  const mitVorherigerBrille = {
    ...entities,
    vorherigesGlasRechts: { Sph: 0.5, Cyl: -0.5 },
    vorherigesGlasLinks: { Sph: 1, Cyl: -0.75 },
  };

  it("kreuzt im AOK-Berechtigungsschein die Veränderung an", () => {
    const html = buildAokBerechtigungsscheinPrintHtml({
      entities: mitVorherigerBrille,
    });
    expect(html.match(/class="box"[^>]* checked/g)?.length).toBe(2);
  });

  it("schlägt in der GKV-Verordnung 'keine Veränderung' vor", () => {
    const html = buildOptometrischeVerordnungPrintHtml({
      entities: {
        ...entities,
        vorherigesGlasRechts: entities.glasRechts,
        vorherigesGlasLinks: entities.glasLinks,
      },
    });
    expect(html).toMatch(/checked \/>keine Veränderung/);
  });

  it("kreuzt in der Rezeptanfrage Diagnosen und Versorgung an", () => {
    const html = buildRezeptanfragePrintHtml({ entities });
    expect(html).toMatch(/checked \/>Hyperopie/);
    expect(html).toMatch(/checked \/>Presbyopie/);
    expect(html).toMatch(/checked \/>Gleitsichtglas/);
    expect(html).not.toMatch(/checked \/>Myopie/);
  });
});
