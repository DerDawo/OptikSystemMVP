import { describe, expect, it } from "vitest";
import { istAlteFassungsangabe, mitarbeiterAnzeige } from "./mitarbeiterNamen";

describe("mitarbeiterAnzeige", () => {
  it("blendet alte AOULZY-Fassungsangaben aus", () => {
    expect(istAlteFassungsangabe("Aoulzy102393")).toBe(true);
    expect(istAlteFassungsangabe(" AOULZY102511 072 V22")).toBe(true);
    expect(mitarbeiterAnzeige("Aoulzy102377")).toBe("");
  });

  it("lässt Namen und Verordnungen stehen", () => {
    expect(mitarbeiterAnzeige("Robert Ulm")).toBe("Robert Ulm");
    expect(mitarbeiterAnzeige("lt. ärztl. Verordnung")).toBe(
      "lt. ärztl. Verordnung",
    );
    expect(mitarbeiterAnzeige(null)).toBe("");
  });
});
