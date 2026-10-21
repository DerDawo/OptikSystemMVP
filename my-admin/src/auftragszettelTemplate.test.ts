import { describe, expect, it } from "vitest";
import {
  buildAuftragszettelFelder,
  buildAuftragszettelPreviewHtml,
  buildAuftragszettelPrintHtml,
  glastypAusBrillenart,
  materialAusGlas,
  toenungAusText,
  veredelungAusText,
  werteQuelle,
} from "./auftragszettelTemplate";

// Erfundene Testdaten, keine echten Kunden
const entities = {
  kunde: {
    Anrede: "Frau",
    Vorname: "Erika",
    Nachname: "Muster",
    Straße: "Hauptstraße",
    Hausnummer: "1",
    Postleitzahl: "07545",
    Stadt: "Gera",
    Geburtsdatum: "1980-05-17",
    Handy: "0170 1234567",
    TelefonnummerPrivat: "0365 111111",
    Email: "erika@example.org",
    Kontaktweg: "eMail",
    Tätigkeit: "Buchhalterin",
  },
  brille: {
    id: 42,
    BrillenArt: "Gleitsichtbrille",
    Datum: "2026-09-15",
    Abholung: "2026-09-22T17:00:00",
    Berater: "Robert Ulm",
    Refraktion: "Robert Ulm lt. optometrischer Messung",
    Summe: 862.5,
    KKAnteil: 0,
    Anzahlung: 100,
  },
  glasRechts: {
    Sph: 0.75,
    Cyl: -0.5,
    A: 79,
    Add: 1.5,
    PD: 32,
    y_h: 21,
    Pr: 1,
    B: 270,
    Vis: 1,
    Betrag: 300,
  },
  glasLinks: { Sph: -0.5, Cyl: -1, A: 88, Add: 1.5, PD: 31.5, Betrag: 300 },
  vorherigesGlasRechts: { Sph: 0.5, Cyl: -0.25, A: 80, Add: 1 },
  vorherigesGlasLinks: { Sph: -0.25, Cyl: -0.75, A: 90, Add: 1 },
  glastyp: {
    Hersteller: "POL Optic",
    Bezeichnung: "Matrix Pro 1.60",
    Verguetung: "Superentspiegelung",
    Farbe: "braun 85 % Verlauf",
  },
  fassung: {
    Hersteller: "Lindberg",
    Bezeichnung: "Air",
    Farbe: "silber",
    Groesse: "53-17",
    Betrag: 149,
  },
  zusatzleistungen: [
    { Bezeichnung: "Refraktion", Betrag: 35 },
    { Bezeichnung: "Glaseinschliff", Betrag: 29.5 },
    { Bezeichnung: "Hartschicht / Kratzfestbeschichtung", Betrag: 30 },
    { Bezeichnung: "Ultraschall-Reinigung", Betrag: 12 },
  ],
};

describe("Auftragszettel: Feldzuordnung", () => {
  const f = buildAuftragszettelFelder(entities);

  it("übernimmt Auftrag und Kundendaten", () => {
    expect(f.auftragsNr).toBe("42");
    expect(f.datum).toBe("15.09.2026");
    expect([...f.auftragsart]).toEqual(["Neuauftrag"]);
    expect(f.name).toBe("Muster");
    expect(f.vorname).toBe("Erika");
    expect(f.strasse).toBe("Hauptstraße 1");
    expect(f.wohnort).toBe("07545 Gera");
    expect(f.geburtsdatum).toBe("17.05.1980");
    // Handy vor Festnetz
    expect(f.telefon).toBe("0170 1234567");
    expect(f.email).toBe("erika@example.org");
    expect([...f.meldung]).toEqual(["E-Mail"]);
    expect(f.abholung).toBe("22.09.2026");
    expect(f.ortDatum).toBe("Gera, 15.09.2026");
    expect(f.kuerzel).toBe("RU");
    expect(f.beruf).toBe("Buchhalterin");
  });

  it("trägt die Werte der Gläser und der vorherigen Brille ein", () => {
    expect(f.werte.R).toEqual({
      sph: "+0,75",
      cyl: "-0,50",
      achse: "79",
      add: "+1,50",
      pd: "32",
      nh: "21",
      prisma: "1,00 / 270",
      visus: "1,0",
    });
    expect(f.werte.L.sph).toBe("-0,50");
    expect(f.werte.L.pd).toBe("31,5");
    expect(f.werte.L.prisma).toBe("");
    expect(f.werte.Ralt.sph).toBe("+0,50");
    expect(f.werte.Lalt.achse).toBe("90");
    expect([...f.werteAus]).toEqual(["refraktion"]);
  });

  it("kreuzt Glastyp, Material, Veredelung, Tönung und Polarisation an", () => {
    expect([...f.glastyp]).toEqual(["GS"]);
    expect(f.glasBezeichnung).toBe("POL Optic Matrix Pro 1.60");
    expect([...f.material]).toEqual(["Index"]);
    expect(f.index).toBe("1,60");
    // Superentspiegelung aus dem Glastyp, Hartschicht als Zusatzleistung
    expect([...f.veredelung].sort()).toEqual(["HART", "HSET"]);
    expect([...f.toenung].sort()).toEqual(["Farbe", "Prozent", "VL"]);
    expect(f.farbe).toBe("braun");
    expect(f.prozent).toBe("85");
    expect([...f.polarisation]).toEqual(["Nein"]);
  });

  it("verteilt die Preise auf Glas, Fassung und Sonstiges", () => {
    expect(f.preise.glastyp).toEqual({ einzel: "300,00", paar: "600,00" });
    expect(f.preise.veredelung).toEqual({ einzel: "", paar: "30,00" });
    expect(f.preise.toenung).toEqual({ einzel: "", paar: "" });
    expect(f.fassung).toEqual({
      hersteller: "Lindberg",
      modell: "Air · 53-17",
      farbe: "silber",
      preis: "149,00",
    });
    expect(f.sonstiges.refraktion).toBe("35,00");
    expect(f.sonstiges.einschleifen).toBe("29,50");
    expect(f.sonstiges.bohren).toBe("");
    // nicht zuordenbare Leistungen als eigene Zeile
    expect(f.sonstiges.weitere).toEqual([
      { label: "Ultraschall-Reinigung", preis: "12,00" },
    ]);
    expect(f.gesamtpreis).toBe("862,50");
    expect(f.anzahlung).toBe("100,00");
    expect(f.restbetrag).toBe("762,50");
  });

  it("zeigt Rabatt und Kassenanteil unter Sonstiges, Gesamtpreis nach Abzug", () => {
    const mitAbzug = buildAuftragszettelFelder({
      ...entities,
      brille: {
        ...entities.brille,
        RabattProzent: 10,
        RabattBezeichnung: "Stammkunde",
        KKAnteil: 112.5,
        Anzahlung: 0,
      },
    });
    expect(mitAbzug.sonstiges.weitere).toEqual([
      { label: "Ultraschall-Reinigung", preis: "12,00" },
      { label: "Rabatt: Stammkunde (-10 %)", preis: "-74,90" },
      { label: "abzügl. Kassenanteil", preis: "-112,50" },
    ]);
    expect(mitAbzug.gesamtpreis).toBe("750,00");
    expect(mitAbzug.anzahlung).toBe("");
    expect(mitAbzug.restbetrag).toBe("750,00");
  });

  it("gibt unterschiedliche Glaspreise rechts und links einzeln an", () => {
    const felder = buildAuftragszettelFelder({
      ...entities,
      glasLinks: { ...entities.glasLinks, Betrag: 320 },
    });
    expect(felder.preise.glastyp).toEqual({
      einzel: "R 300,00\nL 320,00",
      paar: "620,00",
    });
  });

  it("vermerkt einen Auftrag ohne Fassung als eigene Fassung", () => {
    const felder = buildAuftragszettelFelder({ ...entities, fassung: null });
    expect(felder.fassung).toEqual({
      hersteller: "eigene Fassung",
      modell: "",
      farbe: "",
      preis: "",
    });
  });

  it("lässt ohne Daten alle Felder leer", () => {
    const leer = buildAuftragszettelFelder({});
    const werte = Object.values(leer).flatMap((wert) =>
      wert instanceof Set ? [...wert] : [],
    );
    expect(werte).toEqual([]);
    expect(leer.datum).toBe("");
    expect(leer.name).toBe("");
    expect(leer.gesamtpreis).toBe("");
    expect(leer.restbetrag).toBe("");
    expect(leer.ortDatum).toBe("");
    expect(leer.fassung.hersteller).toBe("");
    expect(leer.werte.R.sph).toBe("");
  });
});

describe("Auftragszettel: Ableitungen", () => {
  it("erkennt die Herkunft der Werte aus „Refraktion durch“", () => {
    expect(werteQuelle({ Refraktion: "Andrea Heydrich" })).toBe("refraktion");
    expect(werteQuelle({ Refraktion: "Praxis Dr. Schroth" })).toBe(
      "verordnung",
    );
    expect(werteQuelle({ Refraktion: "Dr. Voigt - Uni Jena" })).toBe(
      "verordnung",
    );
    expect(werteQuelle({ Refraktion: "Übernahme Altbrille" })).toBe(
      "altbrille",
    );
    expect(werteQuelle({ VerordnenderArzt: "Dr. Müller" })).toBe("verordnung");
    expect(werteQuelle({ Refraktion: "AOULZY123" })).toBeNull();
    expect(werteQuelle({})).toBeNull();
  });

  it("leitet den Glastyp aus der Brillenart ab", () => {
    expect(glastypAusBrillenart("Fernbrille")).toBe("Mono");
    expect(glastypAusBrillenart("Lesebrille")).toBe("Mono");
    expect(glastypAusBrillenart("Bifokalbrille")).toBe("Bifo");
    expect(glastypAusBrillenart("Gleitsichtbrille")).toBe("GS");
    expect(glastypAusBrillenart("Bildschirmarbeitsplatzbrille")).toBe("Profi");
    expect(glastypAusBrillenart("Optometrische Refraktion")).toBeNull();
    expect(glastypAusBrillenart("elektronische Sehhilfe")).toBeNull();
    expect(glastypAusBrillenart("")).toBeNull();
  });

  it("liest Material und Index aus der Glasbezeichnung", () => {
    const material = (Bezeichnung: string) => {
      const { material: m, index } = materialAusGlas({ Bezeichnung });
      return [[...m].join(","), index];
    };
    expect(material("Matrix Pro 1.50")).toEqual(["CR 39", ""]);
    expect(material("Hoya Nulux 1,67")).toEqual(["Index", "1,67"]);
    expect(material("Polycarbonat Sport")).toEqual(["PC", ""]);
    expect(material("Einstärken 1.59")).toEqual(["PC", ""]);
    expect(material("Mineral 1.6")).toEqual(["Silkt.,Index", "1,6"]);
    expect(material("Mineral 1.525")).toEqual(["Silkt.", ""]);
    expect(material("Progressiv Comfort")).toEqual(["", ""]);
  });

  it("ordnet die Vergütung den Kästchen zu", () => {
    const veredelung = (text: string) => {
      const { veredelung: v, frei } = veredelungAusText(text);
      return [[...v].sort().join(","), frei];
    };
    expect(veredelung("HSET")).toEqual(["HSET", ""]);
    expect(veredelung("Hartschicht")).toEqual(["HART", ""]);
    expect(veredelung("Superentspiegelung + Clean")).toEqual([
      "HSET,Lotus",
      "",
    ]);
    expect(veredelung("Entspiegelung Blue Protect")).toEqual([
      "HSET,frei",
      "Blaufilter",
    ]);
    expect(veredelung("Spiegelung silber")).toEqual([
      "frei",
      "Spiegelung silber",
    ]);
    expect(veredelung("ohne")).toEqual(["", ""]);
  });

  it("zerlegt die Tönung in Farbe, Prozent und Verlauf", () => {
    const toenung = (text: string) => {
      const { toenung: t, farbe, prozent } = toenungAusText(text);
      return [[...t].sort().join(","), farbe, prozent];
    };
    expect(toenung("grau 85%")).toEqual(["Farbe,Prozent", "grau", "85"]);
    expect(toenung("braun VL")).toEqual(["Farbe,VL", "braun", ""]);
    expect(toenung("Verlauf 50 %")).toEqual(["Prozent,VL", "", "50"]);
    expect(toenung("farblos")).toEqual(["", "", ""]);
  });

  it("erkennt eine Reparatur ohne Gläser an den Leistungen", () => {
    const felder = buildAuftragszettelFelder({
      brille: { id: 9, BrillenArt: "" },
      zusatzleistungen: [
        { Bezeichnung: "Lötung", Betrag: 35, Kategorie: "Reparaturen" },
      ],
    });
    expect([...felder.auftragsart]).toEqual(["Reparatur"]);
    expect([...felder.werteAus]).toEqual([]);
    expect(felder.fassung.hersteller).toBe("");
  });
});

describe("Auftragszettel: Druckbild", () => {
  it("ist ein A5-Formular mit Anamnesebogen auf der Rückseite", () => {
    const html = buildAuftragszettelPrintHtml({ entities });
    expect(html).toContain("@page { size: A5; margin: 0; }");
    expect(html).toContain("width: 148mm; height: 210mm;");
    expect(html.match(/class="blatt /g)).toHaveLength(2);
    expect(html).toContain("Kompetenz-Zentrum für Augenoptik");
    expect(html).toContain("AUFTRAGSBEDINGUNGEN &amp; EINWILLIGUNG");
    expect(html).toContain("Anamnesebogen");
    expect(html).toContain("Wie heißt Ihr behandelnder Hausarzt?");
    // zu lange Seiten werden eingepasst statt abgeschnitten
    expect(html).toContain('inhalt.style.transform = "scale("');
  });

  it("füllt das Formular mit den Auftragsdaten", () => {
    const html = buildAuftragszettelPrintHtml({ entities });
    expect(html).toContain("<title>Auftragszettel 42</title>");
    expect(html).toContain('<span class="wert">Muster</span>');
    expect(html).toContain("erika@example.org");
    expect(html).toContain("1,00 / 270");
    expect(html).toContain(
      '<span class="glasname">POL Optic Matrix Pro 1.60</span>',
    );
    expect(html).toContain(">862,50<");
    expect(html).toContain("Gera, 15.09.2026");
    // Name und Beruf auf dem Anamnesebogen
    expect(html).toContain("Muster, Erika");
    expect(html).toContain("Buchhalterin");
    // vorgeschlagene Kreuze
    expect(html.match(/ checked/g)?.length).toBeGreaterThan(5);
  });

  it("druckt leer ohne Kunden- und Auftragsdaten", () => {
    const html = buildAuftragszettelPrintHtml({ entities, leer: true });
    expect(html).toContain("<title>Auftragszettel</title>");
    expect(html).not.toContain(" checked");
    expect(html).not.toContain("Muster");
    expect(html).not.toContain("erika@example.org");
    expect(html).not.toContain("+0,75");
    expect(html).not.toContain("862,50");
    expect(html).not.toContain("Buchhalterin");
    // Beschriftungen bleiben
    expect(html).toContain("Name:");
    expect(html).toContain("GESAMTPREIS");
    expect(html).toContain("Einschleifen, Formänd.");
  });

  it("setzt Eingaben als Text ein, nicht als HTML", () => {
    const html = buildAuftragszettelPrintHtml({
      entities: {
        ...entities,
        kunde: { ...entities.kunde, Nachname: "<b>Muster</b>" },
      },
    });
    expect(html).toContain("&lt;b&gt;Muster&lt;/b&gt;");
    expect(html).not.toContain("<b>Muster</b>");
  });

  it("druckt aus der Vorschau mit denselben Druckregeln", () => {
    const html = buildAuftragszettelPreviewHtml({ entities });
    expect(html).toContain("@page { size: A5; margin: 0; }");
    expect(html).toContain("@media print");
  });
});
