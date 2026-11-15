import { describe, expect, it } from "vitest";
import QRCode from "qrcode";
import {
  girocodeBlockHtml,
  girocodeSvg,
  girocodeText,
  ibanGueltig,
} from "./girocode";

const daten = {
  name: "Augenoptik Ulm",
  iban: "DE11 8207 0366 0067 5751 00",
  bic: "PBNKDEFF",
  betrag: 159.9,
  zweck: "Rechnung 2026-17 Max Muster",
};

describe("ibanGueltig", () => {
  it("erkennt gültige IBANs mit und ohne Leerzeichen", () => {
    expect(ibanGueltig("DE11 8207 0366 0067 5751 00")).toBe(true);
    expect(ibanGueltig("DE89370400440532013000")).toBe(true);
  });
  it("lehnt falsche Prüfziffern und Unsinn ab", () => {
    expect(ibanGueltig("DE12 8207 0366 0067 5751 00")).toBe(false);
    expect(ibanGueltig("")).toBe(false);
    expect(ibanGueltig("keine IBAN")).toBe(false);
  });
});

describe("girocodeText", () => {
  it("baut den EPC-Inhalt (Version 002, UTF-8, SCT)", () => {
    expect(girocodeText(daten)).toBe(
      [
        "BCD",
        "002",
        "1",
        "SCT",
        "PBNKDEFF",
        "Augenoptik Ulm",
        "DE11820703660067575100",
        "EUR159.90",
        "",
        "",
        "Rechnung 2026-17 Max Muster",
      ].join("\n"),
    );
  });
  it("rundet den Betrag auf Cent", () => {
    expect(girocodeText({ ...daten, betrag: 10.006 })).toContain("EUR10.01");
  });
  it("lässt eine ungültige BIC weg (in Version 002 freiwillig)", () => {
    expect(girocodeText({ ...daten, bic: "x" })?.split("\n")[4]).toBe("");
  });
  it("entfernt Zeilenumbrüche und kürzt den Zweck auf 140 Zeichen", () => {
    const zweck = girocodeText({ ...daten, zweck: `A\nB ${"x".repeat(200)}` })
      ?.split("\n")
      .at(-1);
    expect(zweck?.startsWith("A B ")).toBe(true);
    expect(zweck).toHaveLength(140);
  });
  it("kein Code ohne Betrag, ohne Namen oder mit falscher IBAN", () => {
    expect(girocodeText({ ...daten, betrag: 0 })).toBeNull();
    expect(girocodeText({ ...daten, betrag: -5 })).toBeNull();
    expect(girocodeText({ ...daten, betrag: Number.NaN })).toBeNull();
    expect(girocodeText({ ...daten, name: " " })).toBeNull();
    expect(girocodeText({ ...daten, iban: "DE00 1234" })).toBeNull();
  });
});

describe("girocodeSvg", () => {
  it("zeichnet alle dunklen Module des QR-Codes mit Ruhezone", () => {
    const inhalt = girocodeText(daten)!;
    const svg = girocodeSvg(inhalt);
    const { modules } = QRCode.create(inhalt, { errorCorrectionLevel: "M" });
    const dunkel = Array.from(modules.data).filter(Boolean).length;
    expect(svg.match(/h1v1h-1z/g)).toHaveLength(dunkel);
    expect(svg).toContain(
      `viewBox="0 0 ${modules.size + 8} ${modules.size + 8}"`,
    );
  });
});

describe("girocodeBlockHtml", () => {
  it("liefert den Block mit Hinweis oder nichts", () => {
    expect(girocodeBlockHtml(daten)).toContain("Bequem bezahlen");
    expect(girocodeBlockHtml({ ...daten, betrag: 0 })).toBe("");
  });
});
