import { describe, expect, it } from "vitest";
import { berechneKassenanteil, mitMwst, pluszylinder } from "./kassenanteil";

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
    expect(ergebnis.brutto).toBe(38.63);
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
