import { describe, expect, it } from "vitest";
import {
  leseRabattEingabe,
  rabattDaten,
  rabattDatenBrille,
  rabattEingabeBrille,
  rabattOptionen,
} from "./rabatte";

describe("rabattDaten", () => {
  it("setzt den festen Prozentsatz", () => {
    expect(rabattDaten("Neukundenrabatt")).toEqual({
      RabattBezeichnung: "Neukundenrabatt",
      RabattProzent: 10,
    });
    expect(rabattDaten("Zweitbrille")).toEqual({
      RabattBezeichnung: "Zweitbrille",
      RabattProzent: 15,
    });
  });
  it("Sonderrabatt behält den eingetragenen Prozentsatz", () => {
    expect(rabattDaten("Sonderrabatt")).toEqual({
      RabattBezeichnung: "Sonderrabatt",
    });
  });
  it("ohne Rabatt wird beides geleert", () => {
    expect(rabattDaten(null)).toEqual({
      RabattBezeichnung: null,
      RabattProzent: null,
    });
  });
});

describe("rabattOptionen", () => {
  it("hängt einen alten Wert an", () => {
    expect(rabattOptionen("VIP-Rabatt").map((o) => o.id)).toEqual([
      "Sonderrabatt",
      "Neukundenrabatt",
      "Zweitbrille",
      "VIP-Rabatt",
    ]);
    expect(rabattOptionen("Zweitbrille")).toHaveLength(3);
  });
});

describe("leseRabattEingabe (Sonderrabatt)", () => {
  it("liest Prozent mit und ohne Zeichen", () => {
    expect(leseRabattEingabe("5", 600)).toBe(5);
    expect(leseRabattEingabe("7,5 %", 600)).toBe(7.5);
    expect(leseRabattEingabe("", 600)).toBeNull();
  });

  it("rechnet Euro in den genauen Prozentsatz um", () => {
    const prozent = leseRabattEingabe("50 €", 599.9)!;
    // Rabatt = Basis × Prozent ergibt wieder genau 50,00 €
    expect(Math.round(599.9 * prozent) / 100).toBe(50);
    expect(leseRabattEingabe("50 EUR", 500)).toBe(10);
  });

  it("meldet unmögliche Eingaben", () => {
    expect(() => leseRabattEingabe("150", 600)).toThrow();
    expect(() => leseRabattEingabe("50 €", 0)).toThrow();
    expect(() => leseRabattEingabe("700 €", 600)).toThrow();
    expect(() => leseRabattEingabe("abc", 600)).toThrow();
  });
});

describe("rabattEingabeBrille", () => {
  it("Betragsfeld: ohne Einheit Euro, mit % Prozent", () => {
    expect(rabattEingabeBrille("50", "euro")).toEqual({
      RabattProzent: null,
      RabattBetrag: 50,
    });
    expect(rabattEingabeBrille("-12,50 €", "euro")).toEqual({
      RabattProzent: null,
      RabattBetrag: 12.5,
    });
    expect(rabattEingabeBrille("10 %", "euro")).toEqual({
      RabattProzent: 10,
      RabattBetrag: null,
    });
  });

  it("Prozentfeld: ohne Einheit Prozent, mit € Euro; leer löscht", () => {
    expect(rabattEingabeBrille("7,5", "prozent")).toEqual({
      RabattProzent: 7.5,
      RabattBetrag: null,
    });
    expect(rabattEingabeBrille("30 EUR", "prozent")).toEqual({
      RabattProzent: null,
      RabattBetrag: 30,
    });
    expect(rabattEingabeBrille("  ", "euro")).toEqual({
      RabattProzent: null,
      RabattBetrag: null,
    });
    expect(() => rabattEingabeBrille("120 %", "euro")).toThrow();
  });

  it("fester Prozent-Rabatt ersetzt den Euro-Rabatt", () => {
    expect(rabattDatenBrille("Zweitbrille")).toEqual({
      RabattBezeichnung: "Zweitbrille",
      RabattProzent: 15,
      RabattBetrag: null,
    });
    expect(rabattDatenBrille("Sonderrabatt")).toEqual({
      RabattBezeichnung: "Sonderrabatt",
    });
  });
});
