import { describe, expect, it } from "vitest";
import {
  neueNummern,
  sortiereVorlagen,
  verschiebeUmEins,
  verschiebeVorlage,
} from "./vorlagenReihenfolge";

const v = (id: number, Name: string, Reihenfolge: number | null = null) => ({
  id,
  Name,
  Reihenfolge,
});
const ids = (l: { id: number }[]) => l.map((x) => x.id);

describe("Reihenfolge der Formulare", () => {
  it("sortiert eigene Reihenfolge zuerst, den Rest alphabetisch", () => {
    const l = [v(1, "Zeta"), v(2, "Beta", 2), v(3, "Alpha"), v(4, "Gamma", 1)];
    expect(ids(sortiereVorlagen(l))).toEqual([4, 2, 3, 1]);
  });

  it("verschiebt per Ziehen vor und zurück", () => {
    const l = [v(1, "A"), v(2, "B"), v(3, "C")];
    expect(ids(verschiebeVorlage(l, 3, 1))).toEqual([3, 1, 2]);
    expect(ids(verschiebeVorlage(l, 1, 3))).toEqual([2, 3, 1]);
    expect(verschiebeVorlage(l, 2, 2)).toBe(l);
    expect(verschiebeVorlage(l, 9, 2)).toBe(l);
  });

  it("verschiebt mit Pfeilen und stoppt an den Rändern", () => {
    const l = [v(1, "A"), v(2, "B"), v(3, "C")];
    expect(ids(verschiebeUmEins(l, 2, -1))).toEqual([2, 1, 3]);
    expect(ids(verschiebeUmEins(l, 2, 1))).toEqual([1, 3, 2]);
    expect(verschiebeUmEins(l, 1, -1)).toBe(l);
    expect(verschiebeUmEins(l, 3, 1)).toBe(l);
  });

  it("nummeriert neu und liefert nur Änderungen", () => {
    const l = [v(2, "B", 1), v(1, "A", 5), v(3, "C")];
    expect(neueNummern(l)).toEqual([
      { id: 1, Reihenfolge: 2 },
      { id: 3, Reihenfolge: 3 },
    ]);
  });
});
