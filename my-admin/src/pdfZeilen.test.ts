import { describe, expect, it } from "vitest";
import { type PdfTextStueck, zeilenAusStuecken } from "./pdfZeilen";

const normal = (
  str: string,
  x: number,
  y: number,
  width = str.length * 5,
): PdfTextStueck => ({
  str,
  transform: [10, 0, 0, 10, x, y],
  width,
});

// Querformat: Text um 90° gedreht, Zeilen laufen entlang x, Spalten entlang y
const gedreht = (
  str: string,
  zeile: number,
  pos: number,
  width = str.length * 5,
): PdfTextStueck => ({
  str,
  transform: [0, 10, -10, 0, zeile, pos],
  width,
});

describe("zeilenAusStuecken", () => {
  it("setzt Stücke zeilenweise von oben nach unten zusammen", () => {
    const zeilen = zeilenAusStuecken([
      normal("unten", 10, 100),
      normal("oben", 10, 700),
      normal("Mitte", 10, 400),
    ]);
    expect(zeilen).toEqual(["oben", "Mitte", "unten"]);
  });

  it("trennt Spalten mit Tabulator und Wörter mit Leerzeichen", () => {
    const zeilen = zeilenAusStuecken([
      normal("1.999,22", 200, 500, 40),
      normal("Brutto", 10, 500, 30),
      normal("Summe", 42, 500.8, 25), // 2 Punkte Abstand → Leerzeichen
    ]);
    expect(zeilen).toEqual(["Brutto Summe\t1.999,22"]);
  });

  it("ignoriert leere Stücke", () => {
    expect(zeilenAusStuecken([normal(" ", 0, 0), normal("A", 0, 0)])).toEqual([
      "A",
    ]);
  });

  it("liest gedrehte Seiten (Querformat) in Leserichtung", () => {
    const zeilen = zeilenAusStuecken([
      gedreht("Gebühren", 300, 540, 40),
      gedreht("-97,06", 300, 700, 30),
      gedreht("Brutto", 233, 58, 30),
      gedreht("1.999,22", 233, 191, 40),
    ]);
    expect(zeilen).toEqual(["Brutto\t1.999,22", "Gebühren\t-97,06"]);
  });
});
