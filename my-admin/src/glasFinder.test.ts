import { describe, expect, it } from "vitest";
import {
  type Lagerglas,
  indexEmpfehlung,
  minusZylinder,
  nachbestellen,
  passendeLagerglaeser,
  werteText,
} from "./glasFinder";

const glas = (teil: Partial<Lagerglas>): Lagerglas => ({
  id: 1,
  Bezeichnung: "Einstärken 1.5",
  Sph: 0,
  Cyl: 0,
  Bestand: 2,
  ...teil,
});

describe("Glas-Finder", () => {
  it("rechnet Pluszylinder in Minuszylinder um", () => {
    expect(minusZylinder({ Sph: 1, Cyl: 0.5, A: 90 })).toEqual({
      sph: 1.5,
      cyl: -0.5,
      achse: 180,
    });
    expect(minusZylinder({ Sph: "-1,25", Cyl: "-0,5", A: 10 })).toEqual({
      sph: -1.25,
      cyl: -0.5,
      achse: 10,
    });
    expect(minusZylinder({ Sph: 0.25, Cyl: 0.75, A: 120 })?.achse).toBe(30);
    expect(minusZylinder({})).toBeNull();
  });

  it("findet vorrätige Lagergläser mit genau den Werten", () => {
    const lager = [
      glas({ id: 1, Sph: -1.25, Cyl: -0.5, Verkaufspreis: 59 }),
      glas({ id: 2, Sph: -1.25, Cyl: -0.5, Verkaufspreis: 39 }),
      glas({ id: 3, Sph: -1.25, Cyl: -0.5, Bestand: 0 }),
      glas({ id: 4, Sph: -1.25, Cyl: -0.75 }),
      glas({ id: 5, Sph: -1.25, Cyl: -0.5, Aktiv: false }),
    ];
    expect(
      passendeLagerglaeser({ Sph: -1.25, Cyl: -0.5, A: 10 }, lager).map(
        (g) => g.id,
      ),
    ).toEqual([2, 1]);
    // Pluszylinder findet dasselbe Glas
    expect(
      passendeLagerglaeser({ Sph: -1.75, Cyl: 0.5, A: 100 }, lager).map(
        (g) => g.id,
      ),
    ).toEqual([2, 1]);
  });

  it("schlägt bei Gleitsicht kein Lagerglas vor", () => {
    expect(
      passendeLagerglaeser({ Sph: 0, Cyl: 0, Add: 2 }, [glas({})]),
    ).toEqual([]);
  });

  it("empfiehlt den Index nach dem stärksten Hauptschnitt", () => {
    expect(indexEmpfehlung([{ Sph: -1 }, { Sph: -1.5 }])?.index).toBe(1.5);
    expect(indexEmpfehlung([{ Sph: -2, Cyl: -1.5 }])?.index).toBe(1.6);
    expect(indexEmpfehlung([{ Sph: 5 }])?.index).toBe(1.67);
    expect(indexEmpfehlung([{ Sph: -8 }])?.index).toBe(1.74);
    expect(indexEmpfehlung([{}])).toBeNull();
  });

  it("meldet Gläser zum Nachbestellen und schreibt Werte", () => {
    expect(nachbestellen(glas({ Bestand: 1, Mindestbestand: 1 }))).toBe(true);
    expect(nachbestellen(glas({ Bestand: 2, Mindestbestand: 1 }))).toBe(false);
    expect(werteText(-1.25, -0.5)).toBe("-1,25 / -0,50");
    expect(werteText(0.5, 0)).toBe("+0,50 sph");
  });
});
