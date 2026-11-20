import { describe, expect, it } from "vitest";
import {
  hornhautAstigmatismus,
  hornhautDpt,
  untersuchungTitel,
} from "./klUntersuchung";

describe("Hornhautwerte", () => {
  it("rechnet den Radius in Dioptrien um (337,5 / r)", () => {
    expect(hornhautDpt(7.8)).toBe(43.27);
    expect(hornhautDpt("7,5".replace(",", "."))).toBe(45);
  });
  it("leer oder 0 ergibt keinen Wert", () => {
    expect(hornhautDpt(null)).toBeNull();
    expect(hornhautDpt("")).toBeNull();
    expect(hornhautDpt(0)).toBeNull();
  });
  it("Astigmatismus = steil minus flach", () => {
    expect(hornhautAstigmatismus(7.8, 7.6)).toBe(1.14);
    expect(hornhautAstigmatismus(7.8, null)).toBeNull();
  });
});

describe("untersuchungTitel", () => {
  it("zeigt Art und Datum", () => {
    expect(untersuchungTitel({ Art: "Topometrie", Datum: "2026-07-26" })).toBe(
      "Topometrie 26.07.2026",
    );
    expect(untersuchungTitel({ Art: "Kontrolle" })).toBe("Kontrolle");
  });
});
