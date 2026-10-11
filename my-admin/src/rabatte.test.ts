import { describe, expect, it } from "vitest";
import { rabattDaten, rabattOptionen } from "./rabatte";

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
