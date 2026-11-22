import { describe, expect, it } from "vitest";
import {
  istZahlungserinnerung,
  mahnKnopfText,
  mahnstufeText,
  naechsteMahnstufe,
  normalisiereMahnstufe,
  vorlageFuerStufe,
} from "./mahnstufen";

describe("mahnstufen", () => {
  it("erster Klick ist die Zahlungserinnerung", () => {
    expect(mahnKnopfText(0)).toBe("Zahlungserinnerung");
    expect(istZahlungserinnerung(0)).toBe(true);
    expect(naechsteMahnstufe(0)).toBe(1);
    expect(vorlageFuerStufe(naechsteMahnstufe(0))).toBe("Zahlungserinnerung");
  });

  it("danach 1. und 2. Mahnung", () => {
    expect(mahnKnopfText(1)).toBe("1. Mahnung");
    expect(vorlageFuerStufe(2)).toBe("1. Mahnung");
    expect(mahnKnopfText(2)).toBe("2. Mahnung");
    expect(vorlageFuerStufe(3)).toBe("2. Mahnung (Inkasso-Ankündigung)");
    expect(istZahlungserinnerung(1)).toBe(false);
  });

  it("bei Stufe 3 bleibt es bei der 2. Mahnung", () => {
    expect(naechsteMahnstufe(3)).toBe(3);
    expect(mahnKnopfText(3)).toBe("2. Mahnung erneut");
  });

  it("Spalte zeigt, was zuletzt verschickt wurde", () => {
    expect(mahnstufeText(0)).toBe("noch nichts");
    expect(mahnstufeText(1)).toBe("Zahlungserinnerung");
    expect(mahnstufeText(2)).toBe("1. Mahnung");
    expect(mahnstufeText(3)).toBe("2. Mahnung");
  });

  it("ungültige Werte gelten als Stufe 0 bzw. höchstens 3", () => {
    expect(normalisiereMahnstufe(null)).toBe(0);
    expect(normalisiereMahnstufe(undefined)).toBe(0);
    expect(normalisiereMahnstufe("x")).toBe(0);
    expect(normalisiereMahnstufe(-2)).toBe(0);
    expect(normalisiereMahnstufe(7)).toBe(3);
    expect(vorlageFuerStufe(null)).toBe("Zahlungserinnerung");
  });
});
