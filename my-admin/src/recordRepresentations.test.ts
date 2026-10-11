import { describe, expect, it } from "vitest";
import {
  byField,
  fassungRepresentation,
  glassRepresentation,
  kundeRepresentation,
} from "./recordRepresentations";

describe("recordRepresentations (Anzeigenamen statt #ID)", () => {
  it("zeigt ein Glas mit Seite und Werten", () => {
    expect(
      glassRepresentation({ id: 11, Seite: "Links", Sph: -1.25, Cyl: -0.5 }),
    ).toBe("Nr. 11 · Links · Sph -1,25 · Cyl -0,50");
    expect(glassRepresentation({ id: 3, Sph: "2", Cyl: 0 })).toBe(
      "Nr. 3 · Sph +2,00 · Cyl 0,00",
    );
    expect(glassRepresentation({ id: 4, Sph: null })).toBe("Nr. 4");
  });

  it("zeigt eine Fassung mit Hersteller und Bezeichnung", () => {
    expect(
      fassungRepresentation({
        id: 1,
        Hersteller: "Ray-Ban",
        Bezeichnung: "Classic Metal Frame",
      }),
    ).toBe("Ray-Ban Classic Metal Frame");
    expect(fassungRepresentation({ id: 2 })).toBe("Nr. 2");
  });

  it("zeigt einen Kunden mit Anrede und Namen", () => {
    expect(
      kundeRepresentation({
        id: 1,
        Anrede: "Herr",
        Vorname: "David",
        Nachname: "Hammbartsumjan",
      }),
    ).toBe("Herr David Hammbartsumjan");
    expect(kundeRepresentation({ id: 7, Anrede: null })).toBe("Nr. 7");
  });

  it("nimmt das Bezeichnungsfeld und fällt sonst auf die Nummer zurück", () => {
    const bezeichnung = byField("Bezeichnung");
    expect(bezeichnung({ id: 1, Bezeichnung: "Gleitsichtglas" })).toBe(
      "Gleitsichtglas",
    );
    expect(bezeichnung({ id: 5, Bezeichnung: "" })).toBe("Nr. 5");
  });
});
