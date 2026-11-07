import { describe, expect, it } from "vitest";
import { sortiereVorlagen, verschiebe } from "./nachrichtenReihenfolge";

describe("Reihenfolge der Nachrichtenvorlagen", () => {
  it("sortiert nach Reihenfolge, ohne Wert ans Ende", () => {
    const liste = [
      { id: 1, Reihenfolge: 3 },
      { id: 2, Reihenfolge: null },
      { id: 3, Reihenfolge: 1 },
      { id: 4, Reihenfolge: 2 },
    ];
    expect(sortiereVorlagen(liste).map((v) => v.id)).toEqual([3, 4, 1, 2]);
  });

  it("tauscht mit dem Nachbarn und nummeriert neu", () => {
    const sortiert = [
      { id: 3, Reihenfolge: 1 },
      { id: 4, Reihenfolge: 2 },
      { id: 2, Reihenfolge: null },
    ];
    expect(verschiebe(sortiert, 2, -1)).toEqual([
      { id: 2, Reihenfolge: 2 },
      { id: 4, Reihenfolge: 3 },
    ]);
    expect(verschiebe(sortiert, 0, -1)).toEqual([]);
  });
});
