import { describe, expect, it } from "vitest";
import {
  eingabeText,
  gleicherWert,
  leseDatum,
  leseEingabe,
  leseZahl,
} from "./karteikarteEingabe";

describe("leseZahl", () => {
  it("liest deutsche Schreibweise mit Vorzeichen", () => {
    expect(leseZahl("+2,25")).toBe(2.25);
    expect(leseZahl("-0,5")).toBe(-0.5);
    expect(leseZahl(" 32 ")).toBe(32);
    expect(leseZahl("1.234,50")).toBe(1234.5);
    expect(leseZahl("36.9")).toBe(36.9);
  });
  it("leeres Feld ist kein Wert", () => {
    expect(leseZahl("")).toBeNull();
    expect(leseZahl("  ")).toBeNull();
  });
  it("lehnt Text ab", () => {
    expect(() => leseZahl("abc")).toThrow("keine Zahl");
  });
});

describe("leseDatum", () => {
  it("liest TT.MM.JJJJ und kurze Jahre", () => {
    expect(leseDatum("16.9.2026")).toBe("2026-09-16");
    expect(leseDatum("01.02.26")).toBe("2026-02-01");
    expect(leseDatum("2026-09-16")).toBe("2026-09-16");
    expect(leseDatum("")).toBeNull();
  });
  it("lehnt ungültige Daten ab", () => {
    expect(() => leseDatum("31.2.2026")).toThrow("kein gültiges Datum");
    expect(() => leseDatum("morgen")).toThrow("kein Datum");
  });
});

describe("leseEingabe / eingabeText", () => {
  it("Text wird getrimmt, leer wird null", () => {
    expect(leseEingabe("  Fernbrille ", "text")).toBe("Fernbrille");
    expect(leseEingabe("   ", "text")).toBeNull();
  });
  it("zeigt Datenbankwerte zum Bearbeiten an", () => {
    expect(eingabeText(2.25, "zahl")).toBe("2,25");
    expect(eingabeText("36.90", "zahl")).toBe("36,9");
    expect(eingabeText(null, "zahl")).toBe("");
    expect(eingabeText("2026-09-16", "datum")).toBe("16.09.2026");
    expect(eingabeText("2026-09-16T10:00:00+00:00", "datum")).toBe(
      "16.09.2026",
    );
  });
});

describe("gleicherWert", () => {
  it("erkennt unveränderte Eingaben", () => {
    expect(gleicherWert("2.25", 2.25, "zahl")).toBe(true);
    expect(gleicherWert(null, null, "zahl")).toBe(true);
    expect(gleicherWert("", null, "text")).toBe(true);
    expect(gleicherWert("2026-09-16", "2026-09-16", "datum")).toBe(true);
    expect(gleicherWert(2, 2.25, "zahl")).toBe(false);
    expect(gleicherWert("a", "b", "text")).toBe(false);
  });
});
