import { describe, expect, it } from "vitest";
import {
  GESUNDHEITSTAG_BESCHREIBUNG,
  beschreibungVorschlag,
} from "./firmentagLeistungen";

describe("beschreibungVorschlag", () => {
  it("trägt bei Gesundheitstagen die feste Beschreibung ein", () => {
    expect(beschreibungVorschlag("Gesundheitstag Augen", "")).toBe(
      GESUNDHEITSTAG_BESCHREIBUNG,
    );
    expect(
      beschreibungVorschlag("Firmengesundheitstag – Augen und Sehen", " "),
    ).toBe(GESUNDHEITSTAG_BESCHREIBUNG);
  });
  it("überschreibt keine eigene Beschreibung und lässt andere Anlässe leer", () => {
    expect(beschreibungVorschlag("Gesundheitstag Augen", "eigener Text")).toBe(
      "eigener Text",
    );
    expect(beschreibungVorschlag("Vortrag", "")).toBe("");
  });
});
