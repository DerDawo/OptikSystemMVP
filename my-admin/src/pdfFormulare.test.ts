import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PDFCheckBox, PDFDocument, PDFDropdown, PDFTextField } from "pdf-lib";
import {
  PDF_VORLAGEN,
  fuellePdfVorlage,
  fuerPdfSchrift,
  passeAnFeldlaenge,
} from "./pdfFormulare";

const entities = {
  kunde: {
    Vorname: "Erika",
    Nachname: "Muster",
    Straße: "Hauptstraße",
    Hausnummer: "1",
    Postleitzahl: "07545",
    Stadt: "Gera",
    Geburtsdatum: "1975-06-30",
    Handy: "0170 1234567",
    Email: "erika@example.com",
    KundenNummer: "10042",
    Tätigkeit: "Sachbearbeiterin",
  },
  brille: { id: 9, Datum: "2026-10-01", Berater: "Robert Ulm", Summe: 389 },
  glasRechts: {
    Sph: 0.75,
    Cyl: -0.5,
    A: 90,
    Add: 1.25,
    PD: 32,
    Vis: 1,
    Betrag: 120,
  },
  glasLinks: { Sph: -0.25, Cyl: 0, A: 0, Add: 1.25, PD: 31.5, Betrag: 120 },
  glastyp: { Bezeichnung: "Raumglas", Verguetung: "Superentspiegelung" },
  fassung: { Hersteller: "Lindberg", Bezeichnung: "Air", Betrag: 99 },
  zusatzleistungen: [{ Bezeichnung: "Glaseinschliff", Betrag: 50 }],
  vorherigeBrille: {
    BrillenArt: "Einstärkenbrille (Fern)",
    Datum: "2021-03-01",
  },
  vorherigesGlasRechts: { Sph: 0, Cyl: -0.5, A: 85, Vis: 0.8, Add: 0.75 },
  vorherigesGlasLinks: { Sph: -0.25, Cyl: -0.5, A: 170, Add: 0.75 },
};

const lade = (datei: string) =>
  readFileSync(new URL(`../public/formulare/${datei}`, import.meta.url));

const feldwert = (pdf: PDFDocument, name: string) => {
  const feld = pdf.getForm().getField(name);
  if (feld instanceof PDFTextField) return feld.getText();
  if (feld instanceof PDFDropdown) return feld.getSelected()[0];
  if (feld instanceof PDFCheckBox) return feld.isChecked();
  return undefined;
};

describe.each(Object.entries(PDF_VORLAGEN))("PDF-Vorlage %s", (_, vorlage) => {
  it("ist leer und kennt alle zugeordneten Felder", async () => {
    const pdf = await PDFDocument.load(lade(vorlage.datei));
    const form = pdf.getForm();
    const ausgefuellt = form
      .getFields()
      .filter((f) => f instanceof PDFTextField && f.getText());
    expect(ausgefuellt.map((f) => f.getName())).toEqual([]);
    const fehlend = Object.keys(vorlage.felder(entities)).filter(
      (name) => !form.getFieldMaybe(name),
    );
    expect(fehlend).toEqual([]);
  });

  it("füllt die Felder vor und bleibt ausfüllbar", async () => {
    const bytes = await fuellePdfVorlage(
      vorlage,
      lade(vorlage.datei),
      entities,
    );
    const pdf = await PDFDocument.load(bytes);
    for (const [name, wert] of Object.entries(vorlage.felder(entities))) {
      if (wert === true) {
        expect(feldwert(pdf, name)).toBe(true);
        continue;
      }
      if (!wert) continue;
      const feld = pdf.getForm().getField(name);
      const max =
        feld instanceof PDFTextField ? feld.getMaxLength() : undefined;
      expect(feldwert(pdf, name)).toBe(passeAnFeldlaenge(wert, max));
    }
    expect(pdf.getForm().getFields().length).toBeGreaterThan(50);
  });
});

describe("Zuordnung der Felder", () => {
  it("kürzt Namen in kurzen Feldern auf Initialen", () => {
    expect(passeAnFeldlaenge("Robert Ulm", 3)).toBe("RU");
    expect(passeAnFeldlaenge("Robert Ulm")).toBe("Robert Ulm");
    expect(passeAnFeldlaenge("12345", 3)).toBe("123");
  });

  it("Beobachtungsbogen: Kopfdaten und Refraktion", () => {
    const felder = PDF_VORLAGEN.Beobachtungsbogen.felder(entities);
    expect(felder.Name).toBe("Muster");
    expect(felder.Adresse).toBe("Hauptstraße 1, 07545 Gera");
    expect(felder["SPH OD"]).toBe("0,75");
    expect(felder["SPH OS"]).toBe("-0,25");
    expect(felder["AXE OD"]).toBe("90");
  });

  it("Antrag BAP: Beschäftigte/r, Werte und Kostenvoranschlag", () => {
    const felder = PDF_VORLAGEN["Antrag BAP"].felder(entities);
    expect(felder.f_4).toBe("Muster, Erika");
    expect(felder.f_9).toBe("0170 1234567 / erika@example.com");
    expect(felder.rx_31).toBe("+0,75");
    expect(felder.f_51).toBe("240,00");
    expect(felder.f_54).toBe("389,00");
    expect(felder.pr_225).toBe("+0,75");
  });

  it("Antrag BAP: vorhandene Brille, Alter und Presbyopie", () => {
    const felder = PDF_VORLAGEN["Antrag BAP"].felder(entities);
    expect(felder.pr_86).toBe("-0,50");
    expect(felder.cb_77).toBe(true);
    expect(felder.tb_103).toBe(true);
    expect(Number(felder.tbf_104)).toBeGreaterThanOrEqual(5);
    expect(felder.tb_105).toBe(true);
  });

  it("Beobachtungsbogen: bisherige Korrektur", () => {
    const felder = PDF_VORLAGEN.Beobachtungsbogen.felder(entities);
    expect(felder["CYL OD ALT"]).toBe("-0,50");
    expect(felder["AXE OS ALT"]).toBe("170");
  });
});

describe("fuerPdfSchrift", () => {
  it("ersetzt Zeichen, die die PDF-Standardschrift nicht kennt", () => {
    expect(fuerPdfSchrift("\u22121,25")).toBe("-1,25");
    expect(fuerPdfSchrift("Visus \u2265 0,5")).toBe("Visus >= 0,5");
    expect(fuerPdfSchrift("Zeile1\nZeile2")).toBe("Zeile1 Zeile2");
    expect(fuerPdfSchrift("Weiß – 12,00 € „ok“")).toBe("Weiß – 12,00 € „ok“");
    expect(fuerPdfSchrift("a\u{1F600}b")).toBe("ab");
  });
});

describe("Berechtigungsschein GKV (Original-PDF)", () => {
  const felder = PDF_VORLAGEN["Berechtigungsschein GKV"].felder;

  it("füllt Versichertendaten, IK, Rechnungsnummer und Werte F/N", () => {
    const werte = felder({
      ...entities,
      kunde: {
        ...entities.kunde,
        Krankenkasse: "AOK PLUS",
        KrankenkassenNummer: "107299005",
        VersichertenNummer: "A123456789",
        Versichertenstatus: "10000",
      },
      brille: {
        ...entities.brille,
        BrillenArt: "Gleitsichtbrille",
        Rechnungsnummer: "RE-1",
        KKAnteil: 112.45,
      },
      glasRechts: { Sph: -1.25, Cyl: -0.5, A: 90, Add: 2 },
      glasLinks: { Sph: -1, Cyl: 0, A: 0, Add: 2 },
    });
    expect(werte).toMatchObject({
      krankenkasse: "AOK PLUS",
      kassennr: "107299005",
      versichertennr: "A123456789",
      status: "10000",
      ik: "311600532",
      rechnungsnummer: "RE-1",
      FR_sph: "-1,25",
      FR_cyl: "-0,50",
      FR_achse: "90",
      NR_sph: "+0,75",
      rechnungsbetrag: "112,45",
    });
  });

  it("trägt Hilfsmittelpositionen, Faktor, Betrag und MwSt. ein", () => {
    const werte = felder({
      ...entities,
      brille: { ...entities.brille, BrillenArt: "Fernbrille", KKAnteil: 54.62 },
      glasRechts: { Sph: 2.25, Cyl: 0.5, A: 50 },
      glasLinks: { Sph: 2.5, Cyl: 0.5, A: 152 },
    });
    expect(werte).toMatchObject({
      abr1_hmv: "25.21.01.0900",
      abr1_faktor: "2",
      abr1_betrag: "32,46",
      abr2_hmv: "25.99.99.0001",
      abr2_faktor: "1",
      abr2_betrag: "13,44",
      abr3_hmv: "zzgl. 19 % MwSt.",
      abr3_betrag: "8,72",
      rechnungsbetrag: "54,62",
    });
    expect(werte.abr4_hmv).toBeUndefined();
  });

  it("kreuzt die Sehstärkenänderung nur bei Veränderung an", () => {
    const ohne = felder({
      ...entities,
      vorherigesGlasRechts: entities.glasRechts,
      vorherigesGlasLinks: entities.glasLinks,
    });
    expect(ohne.cb_veraenderung).toBeUndefined();
  });
});
