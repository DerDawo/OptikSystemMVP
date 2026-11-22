// Testdaten sind erfunden.
import { describe, expect, it } from "vitest";
import type { Kassenrezept } from "./kassenrezept";
import {
  type KundeTreffer,
  type OpticaAbrechnung,
  type OpticaAbsetzung,
  abrechnungAusLauf,
  absetzungJeRezept,
  absetzungenNachGrund,
  absetzungenNachKasse,
  dateiPfad,
  findeKunde,
  grundKategorie,
  jahreDerLaeufe,
  jahresSummen,
  kassenrezeptAusOptica,
  leistungenNachPosition,
  rezeptAbgleich,
} from "./optica";
import type { OpticaLauf } from "./opticaParser";

const lauf = (teil: Partial<OpticaAbrechnung>): OpticaAbrechnung => ({
  id: 1,
  Abrechnungsmonat: "2026-01",
  Abrechnungsdatum: null,
  Rechnungsnummer: null,
  Rechnungsdatum: null,
  Brutto: 0,
  Netto: 0,
  MwSt: 0,
  Zuzahlung: 0,
  Forderung: 0,
  Absetzungen: 0,
  Gebuehren: 0,
  GebuehrenRezepte: 0,
  GebuehrenEkv: 0,
  Zahlungen: 0,
  AuszahlungMonat: 0,
  SaldoVormonat: 0,
  Auszahlung: 0,
  RezepteEingesendet: null,
  RezepteAbgerechnet: null,
  RezepteZurueck: null,
  Steuersaetze: [],
  Kassenrechnungen: [],
  Umsatzstatistik: null,
  Dateien: [],
  Bemerkung: null,
  ...teil,
});

const absetzung = (teil: Partial<OpticaAbsetzung>): OpticaAbsetzung => ({
  id: 1,
  abrechnung_id: 1,
  Abrechnungsmonat: "2026-01",
  Lfd: 1,
  Kostentraeger: "IKK classic",
  Grund: null,
  Rechnungsnummer: null,
  Belegnummer: null,
  MwStSatz: 19,
  Betrag: -10,
  kassenrezept_id: null,
  kunde_id: null,
  Erledigt: false,
  Notiz: null,
  ...teil,
});

describe("abrechnungAusLauf", () => {
  const gelesen: OpticaLauf = {
    monat: "2026-08",
    abrechnungsdatum: "2026-09-20",
    kundennummer: "1/1",
    nachweis: {
      rechnungsnummer: "111",
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
      steuersaetze: [],
    },
    gebuehren: {
      rechnungsnummer: "111",
      rechnungsdatum: "2026-09-24",
      rezepte: 53,
      ekv: 7,
      summe: 60,
      posten: [],
    },
    konto: {
      kassenrechnungen: [],
      absetzungen: [],
      absetzungenSumme: -50,
      forderung: 1080,
      gesamtforderung: 1030,
      rezepteEingesendet: 6,
      rezepteAbgerechnet: 5,
      rezepteZurueck: 1,
    },
    ekv: [],
    rezepte: [],
    umsatz: null,
    dokumente: [],
    hinweise: [],
  };

  it("übernimmt alle Beträge des Laufs", () => {
    expect(abrechnungAusLauf(gelesen)).toMatchObject({
      Abrechnungsmonat: "2026-08",
      Abrechnungsdatum: "2026-09-20",
      Rechnungsnummer: "111",
      Rechnungsdatum: "2026-09-24",
      Brutto: 1100,
      Forderung: 1080,
      Absetzungen: -50,
      Gebuehren: 60,
      GebuehrenRezepte: 53,
      GebuehrenEkv: 7,
      SaldoVormonat: -100,
      Auszahlung: 870,
      RezepteEingesendet: 6,
      RezepteAbgerechnet: 5,
      RezepteZurueck: 1,
    });
  });

  it("nimmt ohne Nachweis die Werte aus Kontoauszug und Gebührenrechnung", () => {
    expect(abrechnungAusLauf({ ...gelesen, nachweis: null })).toMatchObject({
      Rechnungsnummer: "111",
      Forderung: 1080,
      Absetzungen: -50,
      Gebuehren: 60,
      Auszahlung: 0,
    });
  });
});

describe("kassenrezeptAusOptica", () => {
  it("bildet eine Zeile für kassenrezept", () => {
    const z = kassenrezeptAusOptica(
      {
        lfd: 1,
        belegnummer: "608",
        nachname: "Muster",
        vorname: "Max",
        geburtsdatum: "2015-02-01",
        versichertennummer: "A1",
        rezeptdatum: "2026-08-06",
        krankenkasse: "IKK classic",
        leistungen: [],
        netto: 32.46,
        mwst: 6.16,
        brutto: 38.62,
        zuzahlung: 0,
      },
      "2026-08",
      "2026-09-20",
      7,
    );
    expect(z).toMatchObject({
      kunde_id: 7,
      Abrechnungsmonat: "2026-08",
      Abrechnungsdatum: "2026-09-20",
      Belegnummer: "608",
      Brutto: 38.62,
    });
  });
});

describe("findeKunde", () => {
  const kunden: KundeTreffer[] = [
    {
      id: 1,
      Nachname: "Müller",
      Vorname: "Anna",
      Geburtsdatum: "1980-01-01",
      VersichertenNummer: "A123456789",
    },
    {
      id: 2,
      Nachname: "Müller",
      Vorname: "Bernd",
      Geburtsdatum: "1980-01-01",
      VersichertenNummer: null,
    },
    {
      id: 3,
      Nachname: "Schmidt",
      Vorname: "Carla",
      Geburtsdatum: "1990-05-05",
      VersichertenNummer: "X1",
    },
    {
      id: 4,
      Nachname: "Schmidt",
      Vorname: "Carla",
      Geburtsdatum: "1990-05-05",
      VersichertenNummer: "X2",
    },
  ];
  const person = (p: Partial<Parameters<typeof findeKunde>[0]>) => ({
    versichertennummer: null,
    nachname: null,
    vorname: null,
    geburtsdatum: null,
    ...p,
  });

  it("findet über die Versichertennummer", () => {
    expect(
      findeKunde(person({ versichertennummer: "a123456789" }), kunden),
    ).toBe(1);
  });

  it("findet über Name und Geburtsdatum (Umlaute egal)", () => {
    expect(
      findeKunde(
        person({
          nachname: "Mueller",
          vorname: "Bernd",
          geburtsdatum: "1980-01-01",
        }),
        kunden,
      ),
    ).toBe(2);
    expect(
      findeKunde(
        person({
          nachname: "MÜLLER",
          vorname: "Anna-Lena",
          geburtsdatum: "1980-01-01",
        }),
        kunden,
      ),
    ).toBe(1);
  });

  it("ordnet bei mehreren Treffern nicht zu", () => {
    expect(
      findeKunde(
        person({
          nachname: "Schmidt",
          vorname: "Carla",
          geburtsdatum: "1990-05-05",
        }),
        kunden,
      ),
    ).toBeNull();
    expect(
      findeKunde(
        person({ nachname: "Unbekannt", geburtsdatum: "2000-01-01" }),
        kunden,
      ),
    ).toBeNull();
  });
});

describe("Auswertungen", () => {
  const laeufe = [
    lauf({
      id: 1,
      Abrechnungsmonat: "2026-01",
      Brutto: 1000,
      Zuzahlung: 20,
      Forderung: 980,
      Absetzungen: -98,
      Gebuehren: 49,
      AuszahlungMonat: 833,
      RezepteAbgerechnet: 10,
    }),
    lauf({
      id: 2,
      Abrechnungsmonat: "2026-02",
      Brutto: "1020.00",
      Zuzahlung: "0",
      Forderung: "1020.00",
      Absetzungen: "0",
      Gebuehren: "51.00",
      AuszahlungMonat: "969.00",
      RezepteAbgerechnet: 12,
    }),
  ];

  it("rechnet Jahressummen und Quoten", () => {
    expect(jahresSummen(laeufe)).toEqual({
      laeufe: 2,
      rezepte: 22,
      brutto: 2020,
      zuzahlung: 20,
      forderung: 2000,
      absetzungen: 98,
      gebuehren: 100,
      auszahlung: 1802,
      absetzungsquote: 4.9,
      gebuehrenquote: 5,
    });
    expect(jahresSummen([]).absetzungsquote).toBe(0);
  });

  it("listet die Jahre absteigend", () => {
    expect(
      jahreDerLaeufe([...laeufe, lauf({ Abrechnungsmonat: "2025-12" })]),
    ).toEqual(["2026", "2025"]);
  });

  it("gleicht Rezepte mit dem Lauf ab", () => {
    const rezepte = [
      { Abrechnungsmonat: "2026-01", Brutto: "600.00" },
      { Abrechnungsmonat: "2026-01", Brutto: 400 },
      { Abrechnungsmonat: "2026-02", Brutto: 5 },
    ] as Pick<Kassenrezept, "Abrechnungsmonat" | "Brutto">[];
    expect(rezeptAbgleich(laeufe[0], rezepte)).toEqual({
      anzahl: 2,
      brutto: 1000,
      differenz: 0,
      passt: false,
    });
    expect(
      rezeptAbgleich({ ...laeufe[0], RezepteAbgerechnet: 2 }, rezepte).passt,
    ).toBe(true);
    expect(rezeptAbgleich(laeufe[1], rezepte)).toMatchObject({
      differenz: -1015,
      passt: false,
    });
  });

  it("ordnet Absetzungsgründe ein", () => {
    expect(
      grundKategorie("Genehmigung fehlt/ abgelaufen/ Zeitraum überschritten"),
    ).toBe("Genehmigung fehlt/abgelaufen");
    expect(grundKategorie("Behandlung / Positionen / Abrechnung doppelt")).toBe(
      "Doppelt abgerechnet",
    );
    expect(grundKategorie("Kein Vertragspartner für diese Leistung")).toBe(
      "Kein Vertrag",
    );
    expect(grundKategorie("Nicht von der Zuzahlung befreit")).toBe(
      "Zuzahlung/Befreiung",
    );
    expect(grundKategorie("Keine Mitgliedschaft / Kostenträger falsch")).toBe(
      "Versicherten-/Kassendaten",
    );
    expect(
      grundKategorie('Empfangsbestätigung "i. V." wird nicht anerkannt'),
    ).toBe("Formfehler auf dem Rezept");
    expect(
      grundKategorie("Rechnung von Kasse nicht in voller Höhe anerkannt"),
    ).toBe("Betrag/Positionen");
    expect(grundKategorie(null)).toBe("Sonstiges");
  });

  it("fasst Absetzungen nach Grund und Kasse zusammen", () => {
    const liste = [
      absetzung({ id: 1, Grund: "doppelt", Betrag: -30, Kostentraeger: "DAK" }),
      absetzung({
        id: 2,
        Grund: "doppelt",
        Betrag: "-20.00",
        Kostentraeger: "IKK",
      }),
      absetzung({
        id: 3,
        Grund: "Genehmigung fehlt",
        Betrag: -100,
        Kostentraeger: "DAK",
      }),
    ];
    expect(absetzungenNachGrund(liste)).toEqual([
      { name: "Genehmigung fehlt/abgelaufen", anzahl: 1, betrag: 100 },
      { name: "Doppelt abgerechnet", anzahl: 2, betrag: 50 },
    ]);
    expect(absetzungenNachKasse(liste)[0]).toEqual({
      name: "DAK",
      anzahl: 2,
      betrag: 130,
    });
  });

  it("summiert Absetzungen je Rezept", () => {
    const m = absetzungJeRezept([
      { kassenrezept_id: 5, Betrag: -10 },
      { kassenrezept_id: 5, Betrag: "-2.50" },
      { kassenrezept_id: null, Betrag: -99 },
    ]);
    expect([...m.entries()]).toEqual([[5, 12.5]]);
  });

  it("zählt Leistungen nach Position", () => {
    const r = (leistungen: Kassenrezept["Leistungen"]) =>
      ({ Leistungen: leistungen }) as Kassenrezept;
    const ergebnis = leistungenNachPosition([
      r([
        {
          pzn: "1",
          text: "Glas",
          faktor: 1,
          netto: 10,
          brutto: 11.9,
          zuzahlung: 0,
          mwst: 19,
        },
        {
          pzn: "2",
          text: "Fassung",
          faktor: 1,
          netto: 30,
          brutto: 35.7,
          zuzahlung: 10,
          mwst: 19,
        },
      ]),
      r([
        {
          pzn: "1",
          text: "Glas",
          faktor: 2,
          netto: 20,
          brutto: 23.8,
          zuzahlung: 0,
          mwst: 19,
        },
      ]),
      r(null),
    ]);
    expect(ergebnis).toEqual([
      { pzn: "1", text: "Glas", anzahl: 3, brutto: 35.7, zuzahlung: 0 },
      { pzn: "2", text: "Fassung", anzahl: 1, brutto: 35.7, zuzahlung: 10 },
    ]);
  });
});

describe("dateiPfad", () => {
  it("bildet einen sicheren Speicherpfad je Monat", () => {
    expect(dateiPfad("2026-09", "Rezeptübersicht-Sammelrechnung_H.pdf")).toBe(
      "2026-09/Rezept_bersicht-Sammelrechnung_H.pdf",
    );
    expect(dateiPfad("2026-09", "eKV Uebersicht (1).pdf")).toBe(
      "2026-09/eKV_Uebersicht_1_.pdf",
    );
  });
});
