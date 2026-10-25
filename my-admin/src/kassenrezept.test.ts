import { describe, expect, it } from "vitest";
import {
  Kassenrezept,
  csvAus,
  doppelteIds,
  fehlendeMonate,
  filtereRezepte,
  kassenanteil,
  leererFilter,
  leistungenText,
  monatKurz,
  monatName,
  nachKasse,
  nachMonat,
  rezeptSummen,
  sortiereRezepte,
} from "./kassenrezept";

let nr = 0;
const rezept = (teil: Partial<Kassenrezept>): Kassenrezept => {
  nr += 1;
  return {
    id: nr,
    created_at: "2026-10-25T00:00:00Z",
    kunde_id: null,
    Abrechnungsmonat: "2026-01",
    Abrechnungsdatum: "2026-02-20",
    Belegnummer: `6017028${String(nr).padStart(4, "0")}`,
    Nachname: "Muster",
    Vorname: "Maria",
    Geburtsdatum: "1960-05-01",
    Versichertennummer: "A123456789",
    Krankenkasse: "AOK Plus Sachsen und Thüringen",
    Rezeptdatum: "2026-01-10",
    Leistungen: [],
    Netto: 0,
    MwSt: 0,
    Brutto: 0,
    Zuzahlung: 0,
    Bemerkung: null,
    ...teil,
  };
};

describe("rezeptSummen", () => {
  it("summiert und rundet; Kassenanteil = Brutto - Zuzahlung", () => {
    const s = rezeptSummen([
      rezept({ Netto: "16.23", MwSt: "3.08", Brutto: "19.31", Zuzahlung: 0 }),
      rezept({ Netto: 101.68, MwSt: 19.32, Brutto: 121, Zuzahlung: "10.00" }),
    ]);
    expect(s).toEqual({
      anzahl: 2,
      netto: 117.91,
      mwst: 22.4,
      brutto: 140.31,
      zuzahlung: 10,
      kassenanteil: 130.31,
    });
  });

  it("kommt mit leerer Liste und fehlenden Werten zurecht", () => {
    expect(rezeptSummen([]).brutto).toBe(0);
    expect(kassenanteil(rezept({ Brutto: null, Zuzahlung: null }))).toBe(0);
  });
});

describe("Monate", () => {
  it("formatiert Monate", () => {
    expect(monatKurz("2026-03")).toBe("03/2026");
    expect(monatName("2026-03")).toBe("März 2026");
  });

  it("gruppiert nach Abrechnungsmonat aufsteigend", () => {
    const zeilen = nachMonat([
      rezept({ Abrechnungsmonat: "2026-03", Brutto: 10 }),
      rezept({ Abrechnungsmonat: "2026-01", Brutto: 5 }),
      rezept({ Abrechnungsmonat: "2026-03", Brutto: 20 }),
    ]);
    expect(zeilen.map((z) => [z.monat, z.anzahl, z.brutto])).toEqual([
      ["2026-01", 1, 5],
      ["2026-03", 2, 30],
    ]);
  });

  it("findet fehlende Monate zwischen erstem und letztem", () => {
    expect(
      fehlendeMonate([
        "2026-01",
        "2026-02",
        "2026-03",
        "2026-04",
        "2026-05",
        "2026-07",
        "2026-08",
      ]),
    ).toEqual(["2026-06"]);
    expect(fehlendeMonate(["2025-11", "2026-02"])).toEqual([
      "2025-12",
      "2026-01",
    ]);
    expect(fehlendeMonate(["2026-01"])).toEqual([]);
  });
});

describe("nachKasse", () => {
  it("sortiert nach Brutto absteigend, leere Kasse wird benannt", () => {
    const zeilen = nachKasse([
      rezept({ Krankenkasse: "TK", Brutto: 10 }),
      rezept({ Krankenkasse: "AOK", Brutto: 30 }),
      rezept({ Krankenkasse: null, Brutto: 5 }),
      rezept({ Krankenkasse: "TK", Brutto: 25 }),
    ]);
    expect(zeilen.map((z) => [z.kasse, z.anzahl, z.brutto])).toEqual([
      ["TK", 2, 35],
      ["AOK", 1, 30],
      ["(ohne Angabe)", 1, 5],
    ]);
  });
});

describe("doppelteIds", () => {
  it("erkennt dieselbe Person mit gleichem Rezeptdatum", () => {
    const a = rezept({
      Rezeptdatum: "2026-03-13",
      Abrechnungsmonat: "2026-03",
    });
    const b = rezept({
      Rezeptdatum: "2026-03-13",
      Abrechnungsmonat: "2026-04",
    });
    const andere = rezept({
      Versichertennummer: "B999",
      Rezeptdatum: "2026-03-13",
    });
    const anderesDatum = rezept({ Rezeptdatum: "2026-04-01" });
    const ids = doppelteIds([a, b, andere, anderesDatum]);
    expect([...ids].sort()).toEqual([a.id, b.id].sort());
  });

  it("nimmt ohne Versichertennummer Name und Geburtsdatum", () => {
    const a = rezept({ Versichertennummer: null, Rezeptdatum: "2026-03-12" });
    const b = rezept({ Versichertennummer: "", Rezeptdatum: "2026-03-12" });
    const c = rezept({
      Versichertennummer: null,
      Nachname: "Anders",
      Rezeptdatum: "2026-03-12",
    });
    expect(doppelteIds([a, b, c]).size).toBe(2);
  });
});

describe("leistungenText", () => {
  it("fasst gleiche Leistungen zusammen", () => {
    const l = (text: string) => ({
      pzn: "1",
      text,
      faktor: 1,
      netto: 1,
      brutto: 1,
      zuzahlung: 0,
      mwst: 19,
    });
    expect(
      leistungenText(
        rezept({
          Leistungen: [
            l("Einstärkengläser sphärisch"),
            l("Einstärkengläser sphärisch"),
            l("Elektronische Lupe"),
          ],
        }),
      ),
    ).toBe("2× Einstärkengläser sphärisch; Elektronische Lupe");
    expect(leistungenText(rezept({ Leistungen: null }))).toBe("");
  });
});

describe("filtereRezepte und sortiereRezepte", () => {
  const liste = [
    rezept({
      Nachname: "Güttler",
      Vorname: "Andre",
      Abrechnungsmonat: "2026-01",
      Krankenkasse: "TK",
      Rezeptdatum: "2026-01-28",
    }),
    rezept({
      Nachname: "Lohde",
      Vorname: "Johanna",
      Abrechnungsmonat: "2026-02",
      Krankenkasse: "AOK",
      Rezeptdatum: "2026-02-03",
      Versichertennummer: "N660618478",
    }),
  ];

  it("filtert nach Monat, Kasse und Suche (Umlaute egal)", () => {
    const keine = new Set<number>();
    expect(
      filtereRezepte(liste, { ...leererFilter, monat: "2026-02" }, keine),
    ).toHaveLength(1);
    expect(
      filtereRezepte(liste, { ...leererFilter, kasse: "TK" }, keine),
    ).toHaveLength(1);
    expect(
      filtereRezepte(liste, { ...leererFilter, suche: "guettler" }, keine),
    ).toHaveLength(1);
    expect(
      filtereRezepte(liste, { ...leererFilter, suche: "n660 " }, keine),
    ).toHaveLength(1);
    expect(
      filtereRezepte(liste, { ...leererFilter, suche: "lohde tk" }, keine),
    ).toHaveLength(0);
  });

  it("zeigt mit 'nur auffällige' nur Rezepte aus der Prüfliste", () => {
    const f = { ...leererFilter, nurAuffaellig: true };
    expect(filtereRezepte(liste, f, new Set([liste[1].id]))).toEqual([
      liste[1],
    ]);
  });

  it("sortiert neueste Abrechnung und neuestes Rezept zuerst", () => {
    expect(sortiereRezepte(liste).map((r) => r.Nachname)).toEqual([
      "Lohde",
      "Güttler",
    ]);
  });
});

describe("csvAus", () => {
  it("erzeugt Semikolon-CSV mit Dezimalkomma für Excel", () => {
    const csv = csvAus([
      rezept({
        Abrechnungsmonat: "2026-03",
        Belegnummer: "60370307275",
        Nachname: "Becher",
        Vorname: "Adrian",
        Geburtsdatum: "2014-07-03",
        Krankenkasse: "Techniker Krankenkasse",
        Rezeptdatum: "2026-03-06",
        Netto: 45.37,
        MwSt: 8.62,
        Brutto: 53.99,
        Zuzahlung: 0,
      }),
    ]);
    const zeilen = csv.split("\r\n");
    expect(csv.startsWith("﻿Abrechnung;Belegnummer;")).toBe(true);
    expect(zeilen[1]).toBe(
      "03/2026;60370307275;Becher;Adrian;03.07.2014;A123456789;Techniker Krankenkasse;06.03.2026;;45,37;8,62;53,99;0,00;53,99",
    );
  });

  it("setzt Texte mit Semikolon in Anführungszeichen", () => {
    const csv = csvAus([rezept({ Nachname: 'Mü;ller "jun."' })]);
    expect(csv).toContain('"Mü;ller ""jun."""');
  });
});
