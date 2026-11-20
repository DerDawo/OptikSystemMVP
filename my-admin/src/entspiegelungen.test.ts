import { describe, expect, it } from "vitest";
import { veredelungAusText } from "./auftragszettelTemplate";
import { ENTSPIEGELUNGEN } from "./entspiegelungen";

describe("Entspiegelungen zur Vorauswahl", () => {
  it("kreuzt auf dem Auftragszettel jeweils HSET an", () => {
    ENTSPIEGELUNGEN.forEach((e) => {
      expect(veredelungAusText(e).veredelung.has("HSET")).toBe(true);
    });
  });

  it("enthält keine doppelten Einträge", () => {
    expect(new Set(ENTSPIEGELUNGEN).size).toBe(ENTSPIEGELUNGEN.length);
  });
});
