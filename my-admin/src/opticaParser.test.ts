// Testdaten sind erfunden (Aufbau wie in den OPTICA-Unterlagen, Namen und
// Nummern ausgedacht).
import { describe, expect, it } from "vitest";
import {
  betrag,
  datum,
  dokumentAusZeilen,
  erkenneDokument,
  laeufeAusDokumenten,
  leseAbrechnungsnachweis,
  leseEkv,
  leseGebuehrenrechnung,
  leseKopf,
  leseKontoauszug,
  leseRezeptuebersicht,
  leseUmsatzstatistik,
  teileName,
} from "./opticaParser";

const KOPF = [
  "Kundennummer\tKunden-IK\tAbrechnungsmonat\tDatum\tSeite\tAnsprechpartner\tTelefon",
  "1234/56\t300000001\t8/2026-H\t20.09.2026\t1\tKundenservice\t0711 000000",
  "Kundenadresse",
  "Testbetrieb Musteroptik",
];

const NACHWEIS = [
  ...KOPF,
  "UST-ID: DE000000000",
  "Rechnr.: 11112222",
  "ABRECHNUNGSNACHWEIS",
  "Steuerabrechnung",
  "Kasse\tKasse\tPrivat\tSumme\tBitte prüfen Sie die Abrechnung auf Vollständigkeit und Richtigkeit.",
  "Brutto\t1.100,00\t0,00\t0,00\t1.100,00\tAuszahlung",
  "Skonto\t0,00\t0,00\t0,00\t0,00",
  "steuerliches Brutto\t1.100,00\t0,00\t0,00\t1.100,00",
  "Æ steuerliches Brutto\t1.100,00",
  "Netto 7%\t93,46\t0,00\t0,00\t93,46",
  "Ausgewiesene Zuzahlung / Eigenanteil\t-20,00",
  "Netto 19%\t840,34\t0,00\t0,00\t840,34",
  "ohne Inkasso",
  "steuerliches Netto\t933,80\t0,00\t0,00\t933,80",
  "übernommenes Forderungsvolumen\t1.080,00",
  "MwSt 7%\t6,54\t0,00\t0,00\t6,54",
  "MwSt 19%\t159,66\t0,00\t0,00\t159,66\tAb- / Zusetzung lfd. Monat\t-50,00",
  "Summe MwSt\t166,20\t0,00\t0,00\t166,20\tZwischensumme\t1.030,00",
  "Positive Werte (+) sind zu Ihren Gunsten / negative Werte (-) zu Ihren Lasten.\tGebühren\t-60,00",
  "Zahlungen lfd. Monat\t0,00",
  "Auszahlungsbetrag lfd. Monat\t970,00",
  "Kontosaldo Vormonat (Überzahlungen)\t-100,00",
  "Auszahlungsbetrag gesamt\t870,00",
  "DETAILÜBERSICHT",
  "Ab- / Zusetzung lfd. Monat",
];

const GEBUEHREN = [
  ...KOPF,
  "Rechn. Nr.\t11112222",
  "Rechn. Datum\t24.09.2026",
  "Zinsen und Gebühren\tNetto\tMwSt\tMwSt EUR\tBrutto",
  "Rezeptabrechnung\t44,54\t19%\t8,46\t53,00",
  "EKV-Gebühr\t5,88\t19%\t1,12\t7,00",
  "Summe Zinsen und Gebühren\t50,42\t9,58\t60,00 *",
  "* Gemäß unserer Vereinbarung verrechnen wir die eventuell angefallenen Zinsen und Gebühren mit Ihrer",
];

const KONTOAUSZUG = [
  ...KOPF,
  "KONTOAUSZUG",
  "Forderungsaufstellung der abgerechneten Kassenrezepte",
  "lfd.\tKassen\tRechnungs-\tNeu\tRezept\tSkonto\tZuzahlung/\tRezeptumsatz",
  "Kostenträger / Rechnungsstelle",
  "Nr.\tArt\tnummer\tab.\tAnzahl\tEigenanteil\tNetto EUR",
  "1\tAOK\tAOK Plus Sachsen und Thüringen c/ o ku-\t33000001\t3\t0,00\t10,00\t600,00",
  "bus- IT",
  "2\tTechniker Krankenkasse\t33000002\t1\t0,00\t10,00\t280,00",
  "3\tIKK\tIKK classic\t33000003\t1\t0,00\t0,00\t200,00",
  "Summe\t5\t0,00\t20,00\t1.080,00",
  "Absetzungen",
  "lfd.\tRechnungs-\tMwSt\tBetrag",
  "Kostenträger\tBeschreibung",
  "Nr.\tnummer\tSatz\tEUR",
  "1\tKaufmännische Kran-\tGenehmigung fehlt/ abgelaufen/ Zeitraum überschritten, Abset-\t32000001/7\t19\t-30,00",
  "kenkasse\tzungsunterlagen im Original an Sie zurück Muster, Max Be-",
  "legnr: 60770000011",
  "2\tIKK classic\tKeine Mitgliedschaft / Kostenträger falsch laut Mitteilung des\t32000002/7\t19\t-20,00",
  "Kostenträgers. Beispiel, Erika Belegnr: 60770000022",
  "Summe: Absetzungen\tMwSt Satz\tMwSt\tNetto\tBrutto\t-50,00",
  "19%\t-7,98\t-42,02\t-50,00",
  "Zusammenfassung KONTOAUSZUG",
  "Netto",
  "Forderung GKV u. div. Kostenträger",
  "EUR\t1.080,00",
  "Zu- und Absetzungen\tEUR\t-50,00",
  "Gesamtforderung\tEUR\t1.030,00",
  "Rezeptabstimmung",
  "Eingesendete Rezepte\t6",
  "Abgerechnete Rezepte\t5",
  "Rückgabe Rezept\t1",
];

const EKV = [
  ...KOPF,
  "eKV-Übersicht",
  "Einzelposten-Übersicht elektronischer Kostenvoranschläge",
  "Zu-\tBrutto\tErstatt.\tKZ-",
  "KV-Nr.\tKasse\tKV-Datum\tGenehmigt\tGenehm.-Nr.\tGebühr\tVers.-Nr.\tName\tgeb. am",
  "zahlung\tbeantragt\tbetrag\tbetrag",
  "1000001\tAOK PLUS\t04.08.2026\t10.08.2026\tG2600000001\t0,60\t10,00\t552,16\t542,16\tA000000001\tMuster, Max\t01.02.1950",
  "(Sachsen)",
  "2000002\tKnappschaft\t09.08.2026\t19.08.2026\tG2600000002\t0,50\t0,00\t496,48\t496,48\tB000000002\tBeispiel, Erika",
  "Gesamt:\tAnzahl: 2\t1,10\t10,00\t1.048,64\t1.038,64",
];

const REZEPTE = [
  ...KOPF,
  "REZEPTÜBERSICHT",
  "Sammelrechnung",
  "Belegnr.\tVersnr.\tRezDatum PZN/HimiNr.\tLeistungsbeschreibung\tStatus Faktor\teBetrag\tBrutto\tZuzahl. *M",
  "1 Muster, Max Moritz 01.02.2015\t2521010900 Einstärkengläser sphärisch\tnzV\t1\t16,23 *N\t19,31\t0,00\t19",
  "2521010900 Einstärkengläser sphärisch\tnzV\t1\t16,23 *N\t19,31\t0,00\t19",
  "60870000001\tA000000001\t06.08.2026\tAOK Plus Sachsen und Thüringen\tGesamt\t38,62\t0,00",
  "2 Beispiel, Erika 03.04.1960\t2500000530 Organische Gläser, Einstärkenglä\tnzV\t2\t35,20 *B\t70,40\t10,00\t19",
  "60870000002\t000000000000\t12.03.2026\tBAPersBw\tGesamt\t70,40\t10,00",
  "3 Ohne, Nummer 05.06.2010\t2521010900 Einstärkengläser sphärisch\tnzV\t1\t16,23 *N\t19,31\t0,00\t19",
  "60870000003\t23.09.2026\tIKK classic\tGesamt\t19,31\t0,00",
  "31 Rezepte\tBrutto ohne Zuzahlung 118,33",
];

const UMSATZ = [
  ...KOPF,
  "UMSATZ-STATISTIK",
  "Kunden-Umsatz",
  "Zeitraum",
  "07.2026\t2.703,75\t28\t96,56",
  "06.2026\t-944,63\t0\t0,00",
  "3.648,38\t386,22\t28\t0,00\t96,56\t0,00",
  "07.2026\t2.703,75\t28\t96,56",
  "07.2025\t537,31\t28\t19,19",
  "2.166,44\t403,20\t0\t0,00\t77,37\t403,18",
  "01-07.2026\t12.175,75\t151\t80,63",
  "01-07.2025\t14.361,90\t167\t86,00",
  "Durchschnitts-Umsatz Betriebe Thüringen",
  "07.2026\t3.225,93\t19\t169,79",
  "06.2026\t2.948,93\t23\t128,21",
  "Durchschnitts-Umsatz im Bundesgebiet",
  "07.2026\t2.600,00\t15\t173,33",
];

describe("Grundfunktionen", () => {
  it("liest deutsche Beträge", () => {
    expect(betrag("1.999,22")).toBe(1999.22);
    expect(betrag("-2.208,15")).toBe(-2208.15);
    expect(betrag("97,06 *")).toBe(97.06);
    expect(betrag("5,00 EUR")).toBe(5);
    expect(betrag("33777654")).toBeNull();
    expect(betrag("")).toBeNull();
  });

  it("liest Datum und Namen", () => {
    expect(datum("20.10.2026")).toBe("2026-10-20");
    expect(datum("2026")).toBeNull();
    expect(teileName("Muster, Max Moritz")).toEqual({
      nachname: "Muster",
      vorname: "Max Moritz",
    });
    expect(teileName("Einzelname")).toEqual({
      nachname: "Einzelname",
      vorname: null,
    });
  });

  it("liest den Seitenkopf mit Abrechnungsmonat", () => {
    expect(leseKopf(KOPF)).toEqual({
      kundennummer: "1234/56",
      ik: "300000001",
      monat: "2026-08",
      datum: "2026-09-20",
    });
    expect(leseKopf(["nichts"])).toBeNull();
  });

  it("erkennt die Dokumentart", () => {
    expect(erkenneDokument(NACHWEIS)).toBe("abrechnungsnachweis");
    expect(erkenneDokument(GEBUEHREN)).toBe("gebuehrenrechnung");
    expect(erkenneDokument(KONTOAUSZUG)).toBe("kontoauszug");
    expect(erkenneDokument(EKV)).toBe("ekv");
    expect(erkenneDokument(REZEPTE)).toBe("rezeptuebersicht");
    expect(erkenneDokument(UMSATZ)).toBe("umsatzstatistik");
    expect(
      erkenneDokument([...KOPF, "Ihre Abrechnung - Überzahlungssaldo"]),
    ).toBe("ueberzahlung");
    expect(erkenneDokument(["etwas anderes"])).toBe("unbekannt");
  });
});

describe("Abrechnungsnachweis", () => {
  it("liest Beträge, Auszahlung und Steuersätze", () => {
    const n = leseAbrechnungsnachweis(NACHWEIS);
    expect(n).toMatchObject({
      rechnungsnummer: "11112222",
      brutto: 1100,
      netto: 933.8,
      mwst: 166.2,
      zuzahlung: 20,
      forderung: 1080,
      absetzungen: -50,
      gebuehren: 60,
      zahlungen: 0,
      auszahlungMonat: 970,
      saldoVormonat: -100,
      auszahlung: 870,
    });
    expect(n.steuersaetze).toEqual([
      { satz: 7, netto: 93.46, mwst: 6.54, brutto: 100 },
      { satz: 19, netto: 840.34, mwst: 159.66, brutto: 1000 },
    ]);
  });
});

describe("Gebührenrechnung", () => {
  it("trennt Rezept- und eKV-Gebühren", () => {
    expect(leseGebuehrenrechnung(GEBUEHREN)).toMatchObject({
      rechnungsnummer: "11112222",
      rechnungsdatum: "2026-09-24",
      rezepte: 53,
      ekv: 7,
      summe: 60,
    });
  });
});

describe("Kontoauszug", () => {
  const k = leseKontoauszug(KONTOAUSZUG);

  it("liest die Rechnungen an die Kostenträger", () => {
    expect(k.kassenrechnungen).toEqual([
      {
        kassenart: "AOK",
        kostentraeger: "AOK Plus Sachsen und Thüringen c/o kubus-IT",
        rechnungsnummer: "33000001",
        anzahl: 3,
        zuzahlung: 10,
        netto: 600,
      },
      {
        kassenart: "AOK",
        kostentraeger: "Techniker Krankenkasse",
        rechnungsnummer: "33000002",
        anzahl: 1,
        zuzahlung: 10,
        netto: 280,
      },
      {
        kassenart: "IKK",
        kostentraeger: "IKK classic",
        rechnungsnummer: "33000003",
        anzahl: 1,
        zuzahlung: 0,
        netto: 200,
      },
    ]);
  });

  it("liest Absetzungen über mehrere Zeilen mit Belegnummer", () => {
    expect(k.absetzungenSumme).toBe(-50);
    expect(k.absetzungen).toHaveLength(2);
    expect(k.absetzungen[0]).toMatchObject({
      lfd: 1,
      kostentraeger: "Kaufmännische Krankenkasse",
      rechnungsnummer: "32000001/7",
      belegnummer: "60770000011",
      mwstSatz: 19,
      betrag: -30,
    });
    expect(k.absetzungen[0].grund).toContain("Genehmigung fehlt");
    expect(k.absetzungen[0].grund).toContain("Absetzungsunterlagen");
    expect(k.absetzungen[0].grund).not.toContain("Belegnr");
    // Fortsetzungszeile beginnt mit "Kostenträgers." – darf nicht als Kopfzeile gelten
    expect(k.absetzungen[1].belegnummer).toBe("60770000022");
  });

  it("liest Zusammenfassung und Rezeptabstimmung", () => {
    expect(k).toMatchObject({
      forderung: 1080,
      gesamtforderung: 1030,
      rezepteEingesendet: 6,
      rezepteAbgerechnet: 5,
      rezepteZurueck: 1,
    });
  });
});

describe("eKV-Übersicht", () => {
  it("liest Kostenvoranschläge, auch ohne Geburtsdatum", () => {
    const e = leseEkv(EKV);
    expect(e).toHaveLength(2);
    expect(e[0]).toEqual({
      kvNummer: "1000001",
      kasse: "AOK PLUS (Sachsen)",
      kvDatum: "2026-08-04",
      genehmigt: "2026-08-10",
      genehmigungsnummer: "G2600000001",
      teilgenehmigt: false,
      gebuehr: 0.6,
      zuzahlung: 10,
      beantragt: 552.16,
      erstattung: 542.16,
      versichertennummer: "A000000001",
      nachname: "Muster",
      vorname: "Max",
      geburtsdatum: "1950-02-01",
    });
    expect(e[1]).toMatchObject({
      kasse: "Knappschaft",
      geburtsdatum: null,
      nachname: "Beispiel",
    });
  });
});

describe("Rezeptübersicht", () => {
  const r = leseRezeptuebersicht(REZEPTE);

  it("liest jedes Rezept mit Positionen", () => {
    expect(r).toHaveLength(3);
    expect(r[0]).toMatchObject({
      lfd: 1,
      belegnummer: "60870000001",
      nachname: "Muster",
      vorname: "Max Moritz",
      geburtsdatum: "2015-02-01",
      versichertennummer: "A000000001",
      rezeptdatum: "2026-08-06",
      krankenkasse: "AOK Plus Sachsen und Thüringen",
      brutto: 38.62,
      zuzahlung: 0,
      netto: 32.46,
      mwst: 6.16,
    });
    expect(r[0].leistungen).toHaveLength(2);
    expect(r[0].leistungen[0]).toEqual({
      pzn: "2521010900",
      text: "Einstärkengläser sphärisch",
      faktor: 1,
      netto: 16.23,
      brutto: 19.31,
      zuzahlung: 0,
      mwst: 19,
    });
  });

  it("übernimmt Faktor, Bruttopreise und leere Versichertennummern", () => {
    expect(r[1].leistungen[0]).toMatchObject({
      faktor: 2,
      brutto: 70.4,
      netto: 59.16,
    });
    expect(r[1].versichertennummer).toBeNull(); // nur Nullen
    expect(r[1].zuzahlung).toBe(10);
    expect(r[2]).toMatchObject({
      versichertennummer: null,
      rezeptdatum: "2026-09-23",
      krankenkasse: "IKK classic",
    });
  });
});

describe("Umsatzstatistik", () => {
  it("liest Betrieb, Thüringen und Bund", () => {
    const u = leseUmsatzstatistik(UMSATZ);
    expect(u.betrieb.monat).toEqual({
      zeitraum: "07.2026",
      forderung: 2703.75,
      anzahl: 28,
      jeRezept: 96.56,
    });
    expect(u.betrieb.vormonat?.forderung).toBe(-944.63);
    expect(u.betrieb.vorjahresmonat?.zeitraum).toBe("07.2025");
    expect(u.betrieb.jahr).toEqual({
      zeitraum: "01-07.2026",
      forderung: 12175.75,
      anzahl: 151,
      jeRezept: 80.63,
    });
    expect(u.thueringen.monat?.forderung).toBe(3225.93);
    expect(u.bund.monat?.anzahl).toBe(15);
  });
});

describe("Lauf aus mehreren Dokumenten", () => {
  it("bündelt nach Monat und prüft die Summen", () => {
    const laeufe = laeufeAusDokumenten([
      dokumentAusZeilen("Abrechnungsnachweis_H.pdf", NACHWEIS),
      dokumentAusZeilen("Gebuehrenrechnung_H.pdf", GEBUEHREN),
      dokumentAusZeilen("Kontoauszug_H.pdf", KONTOAUSZUG),
      dokumentAusZeilen("eKV_Uebersicht_H.pdf", EKV),
      dokumentAusZeilen("ohne Kopf.pdf", ["irgendwas"]),
    ]);
    expect(laeufe).toHaveLength(1);
    const l = laeufe[0];
    expect(l.monat).toBe("2026-08");
    expect(l.abrechnungsdatum).toBe("2026-09-20");
    expect(l.ekv).toHaveLength(2);
    expect(l.dokumente.map((d) => d.art)).toEqual([
      "abrechnungsnachweis",
      "gebuehrenrechnung",
      "kontoauszug",
      "ekv",
    ]);
    expect(l.hinweise).toEqual([]);
  });

  it("meldet Widersprüche und fehlende Nachweise", () => {
    const anders = GEBUEHREN.map((z) => z.replace("60,00 *", "61,00 *"));
    const [l] = laeufeAusDokumenten([
      dokumentAusZeilen("a.pdf", NACHWEIS),
      dokumentAusZeilen("b.pdf", anders),
      dokumentAusZeilen("c.pdf", REZEPTE),
    ]);
    expect(l.hinweise.join(" ")).toMatch(/Gebühren im Nachweis/);
    expect(l.hinweise.join(" ")).toMatch(/Summe der Rezepte/);
    const [ohne] = laeufeAusDokumenten([dokumentAusZeilen("b.pdf", GEBUEHREN)]);
    expect(ohne.hinweise[0]).toMatch(/Abrechnungsnachweis fehlt/);
  });
});
