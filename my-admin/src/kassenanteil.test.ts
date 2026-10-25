import { describe, expect, it } from "vitest";
import {
  abrechnungsZeilen,
  bruttoZeilenEinzeln,
  berechneKassenanteil,
  mitMwst,
  pluszylinder,
} from "./kassenanteil";

const nummern = (augen: Parameters<typeof berechneKassenanteil>[0]) =>
  berechneKassenanteil(augen).positionen.map((p) => `${p.seite} ${p.nummer}`);

describe("pluszylinder", () => {
  it("rechnet Minuszylinder um", () => {
    expect(pluszylinder(-1, -0.25)).toEqual({ sph: -1.25, cyl: 0.25 });
    expect(pluszylinder(2.25, 0.5)).toEqual({ sph: 2.25, cyl: 0.5 });
  });
});

describe("berechneKassenanteil", () => {
  it("Einstärkengläser bis ±6 dpt (Beispiel aus der Karteikarte)", () => {
    const ergebnis = berechneKassenanteil([
      { seite: "R", glas: { Sph: 2.25, Cyl: 0.5 } },
      { seite: "L", glas: { Sph: 2.5, Cyl: 0.5 } },
    ]);
    expect(ergebnis.positionen.map((p) => p.nummer)).toEqual([
      "25.21.01.0900",
      "25.21.01.0900",
    ]);
    expect(ergebnis.netto).toBe(32.46);
    // je Glas 19,31 brutto (Kasse rechnet je Position), nicht 38,63
    expect(ergebnis.brutto).toBe(38.62);
    expect(ergebnis.hinweise).toEqual([]);
  });

  it("Zylinder- und Sphärengrenzen", () => {
    expect(nummern([{ seite: "R", glas: { Sph: -1, Cyl: 2 } }])).toEqual([
      "R 25.21.01.0900",
    ]);
    expect(nummern([{ seite: "R", glas: { Sph: 1, Cyl: 2.25 } }])).toEqual([
      "R 25.21.01.1900",
    ]);
    // -5 / -1,5 (Minuszylinder) = -6,5 / +1,5
    expect(nummern([{ seite: "R", glas: { Sph: -5, Cyl: -1.5 } }])).toEqual([
      "R 25.21.01.2900",
    ]);
    expect(nummern([{ seite: "L", glas: { Sph: -10 } }])).toEqual([
      "L 25.21.01.3900",
    ]);
    expect(nummern([{ seite: "L", glas: { Sph: 12.25 } }])).toEqual([
      "L 25.21.01.4900",
    ]);
  });

  it("Mehrstärkengläser bei Addition", () => {
    expect(
      nummern([
        { seite: "R", glas: { Sph: 1, Cyl: 0.5, Add: 2 } },
        { seite: "L", glas: { Sph: 7, Add: 2 } },
      ]),
    ).toEqual(["R 25.21.02.0900", "L 25.21.02.1900"]);
  });

  it("Zuschläge für Zylinder und Prisma", () => {
    expect(nummern([{ seite: "R", glas: { Sph: 0, Cyl: 5, Pr: 2 } }])).toEqual([
      "R 25.21.01.1900",
      "R 25.21.11.0001",
      "R 25.21.12.0001",
    ]);
    expect(nummern([{ seite: "R", glas: { Sph: 0, Pr: 8 } }])).toEqual([
      "R 25.21.01.0900",
      "R 25.21.12.2900",
    ]);
    expect(nummern([{ seite: "R", glas: { Sph: 0, Cyl: 7, Pr: 4 } }])).toEqual([
      "R 25.21.01.1900",
      "R 25.21.11.1001",
      "R 25.21.12.1001",
    ]);
  });

  it("Kostenvoranschlag wird nicht berechnet", () => {
    const ergebnis = berechneKassenanteil([
      { seite: "R", glas: { Sph: -18 } },
      { seite: "L", glas: { Sph: -1 } },
    ]);
    expect(ergebnis.positionen.map((p) => p.nummer)).toEqual(["25.21.01.0900"]);
    expect(ergebnis.hinweise[0]).toMatch(
      /^R: 25\.21\.01\.6900 .*Kostenvoranschlag/,
    );
  });

  it("Auge ohne Werte zählt nicht", () => {
    expect(
      nummern([
        { seite: "R", glas: undefined },
        { seite: "L", glas: { Sph: null, Cyl: null, Betrag: 30 } },
      ]),
    ).toEqual([]);
  });

  it("Mehrwertsteuer", () => {
    expect(mitMwst(13.44)).toBe(15.99);
  });
});

describe("abrechnungsZeilen (Berechtigungsschein)", () => {
  const augen = [
    { seite: "R" as const, glas: { Sph: 2.25, Cyl: 0.5 } },
    { seite: "L" as const, glas: { Sph: 2.5, Cyl: 0.5 } },
  ];

  it("leitet die Brillenglasbestimmung eindeutig aus dem KK-Anteil ab", () => {
    // 2 × 19,31 + 15,99 = 54,61 (je Position); ältere Anteile: 54,62
    const erwartet = {
      zeilen: [
        { nummer: "25.21.01.0900", faktor: 2, betrag: 32.46 },
        { nummer: "25.99.99.0001", faktor: 1, betrag: 13.44 },
      ],
      netto: 45.9,
      mwst: 8.71,
    };
    expect(abrechnungsZeilen({ augen, kkAnteil: 54.61 })).toEqual(erwartet);
    expect(abrechnungsZeilen({ augen, kkAnteil: 54.62 })).toEqual(erwartet);
  });

  it("ohne passenden Rest nur die Glaspositionen", () => {
    expect(
      abrechnungsZeilen({ augen, kkAnteil: 38.63 }).zeilen.map((z) => z.nummer),
    ).toEqual(["25.21.01.0900"]);
  });

  it("gleich teure Kantenfilter bleiben offen (nicht eindeutig)", () => {
    // 32,46 + 2 × 49,90 = 132,26 netto -> 157,39 brutto
    expect(
      abrechnungsZeilen({ augen, kkAnteil: 157.39 }).zeilen.map(
        (z) => z.nummer,
      ),
    ).toEqual(["25.21.01.0900"]);
  });

  it("gespeicherte Positionen aus dem KK-Rechner haben Vorrang", () => {
    const ergebnis = abrechnungsZeilen({
      augen,
      kkAnteil: 157.39,
      gespeichert: [
        { nummer: "25.21.01.0900", bezeichnung: "", faktor: 1, netto: 16.23 },
        { nummer: "25.21.01.0900", bezeichnung: "", faktor: 1, netto: 16.23 },
        { nummer: "25.21.15.3001", bezeichnung: "", faktor: 2, netto: 49.9 },
      ],
    });
    expect(ergebnis.zeilen).toEqual([
      { nummer: "25.21.01.0900", faktor: 2, betrag: 32.46 },
      { nummer: "25.21.15.3001", faktor: 2, betrag: 99.8 },
    ]);
    expect(ergebnis.mwst).toBe(25.12);
  });
});

describe("bruttoZeilenEinzeln (Berechtigungsschein brutto, je Glas)", () => {
  const augen = [
    { seite: "R" as const, glas: { Sph: 2.25, Cyl: 0.5 } },
    { seite: "L" as const, glas: { Sph: 2.5, Cyl: 0.5 } },
  ];

  it("je Glas eine Zeile mit gleichem Bruttobetrag (19,31)", () => {
    const erwartet = {
      zeilen: [
        { nummer: "25.21.01.0900", faktor: 1, betrag: 19.31 },
        { nummer: "25.21.01.0900", faktor: 1, betrag: 19.31 },
      ],
      summe: 38.62,
    };
    expect(bruttoZeilenEinzeln({ augen, kkAnteil: 38.62 })).toEqual(erwartet);
    // auch bei älterem, auf die Summe gerundetem KK-Anteil
    expect(bruttoZeilenEinzeln({ augen, kkAnteil: 38.63 })).toEqual(erwartet);
  });

  it("teilt gespeicherte Positionen mit Faktor 2 in zwei Zeilen", () => {
    const { zeilen, summe } = bruttoZeilenEinzeln({
      augen,
      kkAnteil: 157.39,
      gespeichert: [
        { nummer: "25.21.01.0900", bezeichnung: "", faktor: 1, netto: 16.23 },
        { nummer: "25.21.01.0900", bezeichnung: "", faktor: 1, netto: 16.23 },
        { nummer: "25.21.15.3001", bezeichnung: "", faktor: 2, netto: 49.9 },
      ],
    });
    expect(zeilen.map((z) => [z.nummer, z.faktor])).toEqual([
      ["25.21.01.0900", 1],
      ["25.21.01.0900", 1],
      ["25.21.15.3001", 1],
      ["25.21.15.3001", 1],
    ]);
    expect(zeilen.map((z) => z.betrag)).toEqual([19.31, 19.31, 59.38, 59.38]);
    expect(summe).toBe(157.38);
  });

  it("ohne Positionen keine Zeilen", () => {
    expect(bruttoZeilenEinzeln({ augen: [], kkAnteil: 0 })).toEqual({
      zeilen: [],
      summe: 0,
    });
  });
});
