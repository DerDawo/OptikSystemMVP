import { describe, expect, it } from "vitest";
import {
  extractBrechungsindex,
  parseCombination,
  parseHead,
  parseLensPrice,
  parseLensType,
  parseOptions,
  parseSf6Katalog,
} from "./sf6Format";

/**
 * Baut eine fixed-width SF6-Zeile aus (Wert, Breite)-Paaren zusammen. Werte
 * werden links ausgerichtet und rechts mit Leerzeichen aufgefüllt/abgeschnitten -
 * exakt wie in den echten .dat-Dateien beobachtet.
 */
function line(...fields: Array<[string, number]>): string {
  return fields
    .map(([value, width]) => value.padEnd(width, " ").slice(0, width))
    .join("");
}

// Kleine, synthetische Beispieldateien, die dieselbe Feldbreiten-Struktur wie
// der reale POL-Optic-Katalog aus Issue #23 verwenden (siehe sf6Format.ts).
const headText = [
  line(["version", 31], ["6.10.1", 10]),
  line(["manufacturer-code", 31], ["TST", 10]),
  line(["manufacturer-name", 31], ["Testglas GmbH", 20]),
].join("\r\n");

const lensTypeText = [
  line(["TST001", 6], ["Testglas 1.50 Basic", 56], ["", 40]),
  line(["TST002", 6], ["Testglas 1.67 Premium", 56], ["", 40]),
  line(["TST003", 6], ["Testglas ohne Index", 56], ["", 40]),
].join("\r\n");

// code(6) + range(4) + flag(1) + sentinel(4) + Feld1(8) + Preisfeld(8) in Cent.
const lensPriceText = [
  line(
    ["TST001", 6],
    ["50", 4],
    ["", 1],
    ["9999", 4],
    ["00000000", 8],
    ["00002500", 8],
  ),
  line(
    ["TST001", 6],
    ["55", 4],
    ["", 1],
    ["9999", 4],
    ["00000000", 8],
    ["00001800", 8],
  ),
  line(
    ["TST002", 6],
    ["50", 4],
    ["", 1],
    ["9999", 4],
    ["00000000", 8],
    ["00004200", 8],
  ),
  // Ausreißer über der Plausibilitätsgrenze - wird als "nicht verfügbar" ignoriert.
  line(
    ["TST002", 6],
    ["99", 4],
    ["", 1],
    ["9999", 4],
    ["00000000", 8],
    ["80000790", 8],
  ),
].join("\r\n");

const optionsText = [
  line(["AR1", 6], ["AR Basic", 56]),
  line(["C01", 6], ["Color full all", 56]),
].join("\r\n");

// code(12) + Füllfeld(13) + Preis(5), Preis in EUR (siehe sf6Format.ts).
const optionsPriceText = [
  line(["AR1", 12], ["0", 13], ["00035", 5]),
  line(["C01", 12], ["0", 13], ["00060", 5]),
].join("\r\n");

const optionsColorText = [
  line(["119", 3], ["C01", 3], ["Blau Verlauf", 20]),
].join("\r\n");

// code(6) + Slot(1) + Optionscode(6, "*"-gefüllte Zeilen ohne Optionsbezug).
const combinationText = [
  line(["TST001", 6], ["0", 1], ["******", 6]),
  line(["TST001", 6], ["1", 1], ["AR1", 6]),
  line(["TST001", 6], ["2", 1], ["C01", 6]),
  line(["TST002", 6], ["1", 1], ["AR1", 6]),
].join("\r\n");

describe("extractBrechungsindex", () => {
  it("liest den Brechungsindex aus der Freitext-Bezeichnung", () => {
    expect(extractBrechungsindex("Testglas 1.50 Basic")).toBe(1.5);
    expect(extractBrechungsindex("3ZONE 1.60 REMUVE 420 PBX")).toBe(1.6);
  });

  it("liefert null, wenn kein Index in der Bezeichnung steht", () => {
    expect(extractBrechungsindex("Testglas ohne Index")).toBeNull();
  });
});

describe("parseHead", () => {
  it("liest Herstellercode und -name", () => {
    expect(parseHead(headText)).toEqual({ code: "TST", name: "Testglas GmbH" });
  });
});

describe("parseLensType", () => {
  it("liest ESD-Code, Bezeichnung und Brechungsindex je Grundglas", () => {
    expect(parseLensType(lensTypeText)).toEqual([
      {
        esdCode: "TST001",
        bezeichnung: "Testglas 1.50 Basic",
        brechungsindex: 1.5,
      },
      {
        esdCode: "TST002",
        bezeichnung: "Testglas 1.67 Premium",
        brechungsindex: 1.67,
      },
      {
        esdCode: "TST003",
        bezeichnung: "Testglas ohne Index",
        brechungsindex: null,
      },
    ]);
  });
});

describe("parseLensPrice", () => {
  it("ermittelt je Grundglas den niedrigsten gültigen Preis in Euro", () => {
    const basispreise = parseLensPrice(lensPriceText);
    expect(basispreise.get("TST001")).toBe(18);
    expect(basispreise.get("TST002")).toBe(42);
  });

  it("ignoriert Ausreißer weit über dem üblichen Preisniveau", () => {
    const basispreise = parseLensPrice(lensPriceText);
    // 80000790 Cent (= 800.007,90 €) ist ein Platzhalterwert, kein echter Preis.
    expect(basispreise.get("TST002")).not.toBeGreaterThan(1000);
  });
});

describe("parseOptions", () => {
  it("ordnet Options.dat-Codes anhand OptionsColor.dat als Farbe oder Beschichtung ein und übernimmt den Preis", () => {
    const optionen = parseOptions(
      optionsText,
      optionsPriceText,
      optionsColorText,
    );
    expect(optionen).toEqual([
      { code: "AR1", bezeichnung: "AR Basic", typ: "beschichtung", preis: 35 },
      { code: "C01", bezeichnung: "Color full all", typ: "farbe", preis: 60 },
    ]);
  });
});

describe("parseCombination", () => {
  it('sammelt die je Grundglas verfügbaren Optionscodes und ignoriert "*"-Füllwerte', () => {
    const verfuegbar = parseCombination(combinationText);
    expect(verfuegbar.get("TST001")).toEqual(new Set(["AR1", "C01"]));
    expect(verfuegbar.get("TST002")).toEqual(new Set(["AR1"]));
  });
});

describe("parseSf6Katalog", () => {
  it("kombiniert alle Teildateien zu einem vollständigen Katalog", () => {
    const katalog = parseSf6Katalog({
      head: headText,
      lensType: lensTypeText,
      lensPrice: lensPriceText,
      options: optionsText,
      optionsPrice: optionsPriceText,
      optionsColor: optionsColorText,
      combination: combinationText,
    });

    expect(katalog.hersteller).toEqual({ code: "TST", name: "Testglas GmbH" });
    expect(katalog.produkte).toHaveLength(3);
    expect(katalog.optionen).toHaveLength(2);
    expect(katalog.basispreise.get("TST001")).toBe(18);
    expect(katalog.verfuegbareOptionen.get("TST001")).toEqual(
      new Set(["AR1", "C01"]),
    );
  });
});
