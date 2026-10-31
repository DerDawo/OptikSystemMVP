import { describe, expect, it } from "vitest";
import dayjs from "dayjs";
import { buildAntragPrintHtml } from "./antragTemplate";
import { buildAnamnesePrintHtml } from "./anamneseTemplate";
import { buildTrockenesAugePrintHtml } from "./trockenesAugeTemplate";
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
    Rechnungsnummer: "114878",
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
    expect(html).toContain("114878");
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

  it("bettet Stempel und Unterschrift nur als Bild-data-URL ein", () => {
    const png = "data:image/png;base64,iVBORw0KGgo=";
    const mit = buildRezeptanfragePrintHtml({
      entities,
      bilder: { stempel: png, unterschrift: png },
    });
    expect(mit).toContain(`class="stempel" src="${png}"`);
    expect(mit).toContain(`class="unterschrift" src="${png}"`);
    const ohne = buildRezeptanfragePrintHtml({ entities, bilder: {} });
    expect(ohne).not.toContain('<img class="stempel"');
    const boese = buildRezeptanfragePrintHtml({
      entities,
      bilder: { stempel: 'javascript:alert(1)" onerror="x' },
    });
    expect(boese).not.toContain("javascript:");
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

describe("Neue Angaben zu Kasse und Verordnung", () => {
  const mitAngaben = {
    ...entities,
    kunde: {
      ...entities.kunde,
      Krankenkasse: "AOK PLUS",
      Versichertenstatus: "1000000",
      VersichertenkarteGueltigBis: "2028-12-31",
    },
    brille: {
      ...entities.brille,
      VerordnenderArzt: "Dr. med. Seher",
      Verordnungsdatum: "2026-09-01",
      Diagnose: "H35.3 Makuladegeneration",
    },
  };

  it("füllt Kasse, Status und Kartengültigkeit im Berechtigungsschein", () => {
    const html = buildAokBerechtigungsscheinPrintHtml({ entities: mitAngaben });
    expect(html).toContain("AOK PLUS");
    expect(html).toContain("1000000");
    expect(html).toContain("31.12.2028");
  });

  it("kreuzt in der GKV-Verordnung die Kassenart an", () => {
    const html = buildOptometrischeVerordnungPrintHtml({
      entities: mitAngaben,
    });
    expect(html).toMatch(/checked \/>AOK/);
    expect(html).not.toMatch(/checked \/>BKK/);
  });

  it("übernimmt Arzt, Datum und Diagnose ins Erprobungsprotokoll", () => {
    const html = buildErprobungsprotokollPrintHtml({ entities: mitAngaben });
    expect(html).toContain("Muster 8A vom 01.09.2026");
    expect(html).toContain("Dr. med. Seher");
    expect(html).toContain("H35.3 Makuladegeneration");
  });
});

describe("Anamnesebogen", () => {
  const html = buildAnamnesePrintHtml({
    entities: {
      kunde: {
        Vorname: "Anja",
        Nachname: "Muster",
        Geburtsdatum: "1980-02-08",
        Straße: "Werdauer Str.",
        Hausnummer: "38",
        Postleitzahl: "07551",
        Stadt: "Gera",
        Email: "anja@example.org",
        Handy: "0170 1234567",
        Krankenkasse: "AOK PLUS",
        VersichertenNummer: "A123456789",
        Versichertenstatus: "30000",
        KrankenversicherungsTyp: "Gesetzlich Krankenversichert",
        Geschlecht: "weiblich",
      },
      glasRechts: { Sph: 1.25, Cyl: -0.5, A: 48, Add: 2, Vis: "1,0" },
      glasLinks: { Sph: 2, Cyl: -0.75, A: 106, Add: 2 },
      vorherigeBrille: { Datum: "2023-05-04" },
      vorherigesGlasRechts: { Sph: 0.75, Cyl: -0.25, A: 45 },
      vorherigesGlasLinks: { Sph: 1.5 },
    },
  });

  it("füllt persönliche Daten vor", () => {
    for (const wert of [
      "Anja",
      "Muster",
      "08.02.1980",
      "Werdauer Str.",
      "07551",
      "Gera",
      "Deutschland",
      "anja@example.org",
      "0170 1234567",
    ])
      expect(html).toContain(wert);
  });

  it("enthält keine Krankenkassendaten mehr", () => {
    for (const wert of [
      "Krankenversicherung",
      "Versichertennummer",
      "AOK PLUS",
      "A123456789",
      "Familienversichert",
    ])
      expect(html).not.toContain(wert);
  });

  it("trägt alte und neue Brillenstärken ein", () => {
    expect(html).toContain("Alte Brillenstärken");
    expect(html).toContain("(Brille vom 04.05.2023)");
    expect(html).toContain("Neue Brillenstärken");
    for (const wert of ["+0,75", "-0,25", "+1,50", "+1,25", "106", "1,0"])
      expect(html).toContain(`>${wert}</div>`);
  });

  it("hat Besonderheiten Brille und Gläser und die Abschnitte der Vorlage", () => {
    for (const wert of [
      "Besonderheiten Brille und Gläser",
      "Gleitsichtbrille",
      "Blaulichtfilter",
      "Weitere Besonderheiten",
      "Sehgewohnheiten",
      "Symptome",
      "Familienanamnese – Augen",
    ])
      expect(html).toContain(wert);
  });

  it("kreuzt nur das Geschlecht an", () => {
    const angekreuzt =
      html.match(/<input type="checkbox" class="kaestchen" checked \/>/g) ?? [];
    expect(angekreuzt).toHaveLength(1);
    expect(html).toMatch(/checked \/>Weiblich/);
  });
});

describe("Fragebogen Trockenes Auge", () => {
  const html = buildTrockenesAugePrintHtml({
    entities: {
      kunde: {
        Vorname: "Anja",
        Nachname: "Muster",
        Geburtsdatum: "1980-02-08",
        Geschlecht: "weiblich",
      },
    },
  });

  it("füllt Name, Geburtsdatum und Alter vor", () => {
    for (const wert of ["Anja", "Muster", "08.02.1980"])
      expect(html).toContain(wert);
    expect(html).toContain(`>${dayjs().diff(dayjs("1980-02-08"), "year")}<`);
  });

  it("kreuzt nur das Geschlecht an", () => {
    const angekreuzt =
      html.match(/<input type="checkbox" class="kaestchen" checked \/>/g) ?? [];
    expect(angekreuzt).toHaveLength(1);
    expect(html).toMatch(/checked \/>weibl\./);
  });

  it("hat Fragen 1 bis 10, Auswertung und Stufenplan", () => {
    for (const wert of [
      "HÄUFIGKEIT",
      "STÄRKE",
      "Kontaktlinsen",
      "Augentropfen",
      "chron.",
      "Punktwerte bei Frage 5 und Frage 6 addieren",
      "Verdacht auf Trockenes Auge",
      "schweres Trockenes Auge",
      "STUFE 1 (leicht)",
      "STUFE 4 (sehr schwer)",
    ])
      expect(html).toContain(wert);
  });
});
