import { describe, expect, it } from "vitest";
import {
  extractBrechungsindex,
  parseCombination,
  parseHead,
  parseLensPrice,
  parseLensType,
  parseOptions,
  parseOptionsPrice,
  parsePreisfeldTypen,
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
  line(["pricefield-01", 30], ["10", 2]),
  line(["pricefield-02", 30], ["20", 2]),
  line(["pricefield-03", 30], ["00", 2]),
  line(["pricefield-04", 30], ["00", 2]),
  line(["pricefield-05", 30], ["00", 2]),
].join("\r\n");

const lensTypeText = [
  line(["TST001", 6], ["Testglas 1.50 Basic", 56], ["", 40]),
  line(["TST002", 6], ["Testglas 1.67 Premium", 56], ["", 40]),
  line(["TST003", 6], ["Testglas ohne Index", 56], ["", 40]),
].join("\r\n");

/** Preisfeld als 7-stellige, nullgepolsterte Cent-Angabe. */
function cent(euro: number): string {
  return String(Math.round(euro * 100)).padStart(7, "0");
}

// LensPrice im 32-Zeichen-Layout (Zeiss, Hoya, Essilor, ...):
// Code(6) + Bereich(4) + Kennz.(1) + Stärkengruppe(7) + EK(7) + UVP(7).
function lensPrice32(code: string, bereich: string, ek: number, uvp: number) {
  return (
    line([code, 6], [bereich, 4], ["", 1], ["0804000", 7]) +
    cent(ek) +
    cent(uvp)
  );
}

// LensPrice im 69-Zeichen-Layout (POL, Leica, Lux-Lens): wie oben, plus
// drei weitere Preisfelder und 16 Zeichen Reserve.
function lensPrice69(code: string, bereich: string, ek: number, uvp: number) {
  return lensPrice32(code, bereich, ek, uvp) + "0".repeat(21) + " ".repeat(16);
}

const lensPriceText = [
  lensPrice32("TST001", "50", 7.4, 25),
  lensPrice32("TST001", "55", 6.1, 18),
  lensPrice32("TST002", "50", 12, 42),
  // UVP 0 = kein Preis, wird ignoriert.
  lensPrice32("TST002", "55", 3, 0),
].join("\r\n");

const lensPriceText69 = [
  lensPrice69("TST001", "50", 104, 443),
  lensPrice69("TST001", "55", 98.5, 410.5),
  lensPrice69("TST002", "50", 74, 281),
].join("\r\n");

const optionsText = [
  line(["AR1", 6], ["AR Basic", 56]),
  line(["C01", 6], ["Color full all", 56]),
].join("\r\n");

// OptionsPrice: Code(6) + Untercode(6) + Kennzeichen(6) + EK(7) + UVP(7),
// 32 Zeichen breit (Zeiss, Hoya, ...) bzw. 53 mit drei weiteren
// Preisfeldern (POL).
function optionsPrice32(code: string, ek: number, uvp: number) {
  return line([code, 12], ["001110", 6]) + cent(ek) + cent(uvp);
}
function optionsPrice53(code: string, ek: number, uvp: number) {
  return optionsPrice32(code, ek, uvp) + "0".repeat(21);
}

const optionsPriceText = [
  optionsPrice32("AR1", 14, 35),
  optionsPrice32("C01", 24, 60),
  // Zeile mit Untercode (nur für ein bestimmtes Grundglas), kein Basis-Aufpreis.
  line(["AR1", 6], ["TST002", 6], ["001111", 6]) + cent(0) + cent(20),
].join("\r\n");

const optionsPriceText53 = [
  optionsPrice53("AR1", 9, 48),
  optionsPrice53("C01", 12, 53),
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

const BOW_PREISFELDER = ["20", "10", "00", "00", "00"];
const NUR_EK_PREISFELDER = ["10", "00", "00", "00", "00"];
const UVP_IM_DRITTEN_FELD = ["10", "00", "20", "00", "00"];

describe("parsePreisfeldTypen", () => {
  it("liest die Preisfeld-Belegung aus Head.dat", () => {
    expect(parsePreisfeldTypen(headText)).toEqual([
      "10",
      "20",
      "00",
      "00",
      "00",
    ]);
  });

  it("liefert nichts, wenn keine Preisfelder deklariert sind", () => {
    const head = line(["manufacturer-code", 30], ["TST", 3]);
    expect(parsePreisfeldTypen(head)).toEqual([]);
  });

  it("liefert nichts bei unbekannten Preis-Nachkommastellen", () => {
    const head = [headText, line(["pricefield-decimals", 30], ["2", 1])].join(
      "\r\n",
    );
    expect(parsePreisfeldTypen(head)).toEqual([]);
  });
});

describe("parseLensPrice", () => {
  it("liest die UVP im 32-Zeichen-Layout und nimmt je Grundglas die niedrigste", () => {
    const basispreise = parseLensPrice(lensPriceText);
    expect(basispreise.get("TST001")).toBe(18);
    expect(basispreise.get("TST002")).toBe(42);
  });

  it("liest die UVP im 69-Zeichen-Layout (POL)", () => {
    const basispreise = parseLensPrice(lensPriceText69);
    expect(basispreise.get("TST001")).toBe(410.5);
    expect(basispreise.get("TST002")).toBe(281);
  });

  it("liest echte Herstellerzeilen (Zeiss, Hoya) korrekt", () => {
    const basispreise = parseLensPrice(
      [
        "10653 65   080200000033800016800",
        "ABD31 6570 080400000039000009200",
      ].join("\r\n"),
    );
    expect(basispreise.get("10653")).toBe(168);
    expect(basispreise.get("ABD31")).toBe(92);
  });

  it("folgt der Preisfeld-Belegung aus Head.dat (UVP im ersten Feld, wie BOW)", () => {
    const basispreise = parseLensPrice(lensPriceText, BOW_PREISFELDER);
    expect(basispreise.get("TST001")).toBe(6.1);
  });

  it("liefert keine Preise ohne UVP-Preisfeld (z. B. nur Einkaufspreise)", () => {
    expect(parseLensPrice(lensPriceText, NUR_EK_PREISFELDER).size).toBe(0);
    expect(parseLensPrice(lensPriceText, [])).toEqual(new Map());
  });

  it("liefert keine Preise für unbekannte oder uneinheitliche Zeilenbreiten", () => {
    // Altes, synthetisches 31-Zeichen-Layout.
    expect(parseLensPrice("TST00150   99990000000000002500").size).toBe(0);
    expect(parseLensPrice(lensPriceText + "X").size).toBe(0);
    const gemischt = [
      lensPrice32("TST001", "50", 7, 25),
      lensPrice69("TST002", "50", 7, 25),
    ].join("\r\n");
    expect(parseLensPrice(gemischt).size).toBe(0);
  });

  it("liefert keine Preise, wenn das UVP-Feld im 32-Zeichen-Layout nicht existiert", () => {
    expect(parseLensPrice(lensPriceText, UVP_IM_DRITTEN_FELD).size).toBe(0);
    expect(parseLensPrice(lensPriceText69, UVP_IM_DRITTEN_FELD).size).toBe(0);
  });
});

describe("parseOptionsPrice", () => {
  it("liest die UVP im 32- und 53-Zeichen-Layout", () => {
    expect(parseOptionsPrice(optionsPriceText).get("AR1")).toBe(35);
    expect(parseOptionsPrice(optionsPriceText53)).toEqual(
      new Map([
        ["AR1", 48],
        ["C01", 53],
      ]),
    );
  });

  it("liefert keine Preise für unbekannte Zeilenbreiten", () => {
    const altesLayout = line(["AR1", 12], ["0", 13], ["00035", 5]);
    expect(parseOptionsPrice(altesLayout).size).toBe(0);
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
