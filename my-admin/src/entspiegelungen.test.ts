import { describe, expect, it } from "vitest";
import { veredelungAusText } from "./auftragszettelTemplate";
import { ENTSPIEGELUNGEN } from "./entspiegelungen";

describe("Entspiegelungen zur Vorauswahl", () => {
  it("kreuzt auf dem Auftragszettel bei jeder Entspiegelung HSET an", () => {
    ENTSPIEGELUNGEN.filter((e) => e.startsWith("Entspiegelung")).forEach(
      (e) => {
        expect(veredelungAusText(e).veredelung.has("HSET")).toBe(true);
      },
    );
  });

  it("kreuzt bei der Hartschicht HART an", () => {
    expect(
      veredelungAusText("Hartschicht (Hard Coat)").veredelung.has("HART"),
    ).toBe(true);
  });

  it("zeigt das günstigste zuerst und das teuerste zuletzt", () => {
    expect(ENTSPIEGELUNGEN[0]).toBe("Hartschicht (Hard Coat)");
    expect(ENTSPIEGELUNGEN[1]).toBe("Entspiegelung MULTI Plus");
    expect(ENTSPIEGELUNGEN.at(-1)).toBe("Entspiegelung PURE Glide");
  });

  it("nennt keine Preise in der Liste", () => {
    ENTSPIEGELUNGEN.forEach((e) => expect(e).not.toMatch(/€|\d/));
  });

  it("enthält keine doppelten Einträge", () => {
    expect(new Set(ENTSPIEGELUNGEN).size).toBe(ENTSPIEGELUNGEN.length);
  });
});
