import { describe, expect, it } from "vitest";
import { farbVorschlaege, hatZusatz, zusatzUmschalten } from "./glasBemerkung";

describe("zusatzUmschalten", () => {
  it("hängt an vorhandenen Text an", () => {
    expect(zusatzUmschalten("1.500, 100077", "Sondercurve")).toBe(
      "1.500, 100077, Sondercurve",
    );
    expect(zusatzUmschalten(null, "Mustertönung")).toBe("Mustertönung");
  });

  it("nimmt einen vorhandenen Zusatz wieder heraus", () => {
    expect(zusatzUmschalten("1.500, Sondercurve, 100077", "sondercurve")).toBe(
      "1.500, 100077",
    );
    expect(zusatzUmschalten("Extra Durchmesser", "Extra Durchmesser")).toBe("");
  });
});

describe("hatZusatz", () => {
  it("erkennt den Zusatz unabhängig von Schreibweise und Leerzeichen", () => {
    expect(hatZusatz("1.500,  extra durchmesser ", "Extra Durchmesser")).toBe(
      true,
    );
    expect(hatZusatz("Mustertönung grau", "Mustertönung")).toBe(false);
    expect(hatZusatz(undefined, "Sondercurve")).toBe(false);
  });
});

describe("farbVorschlaege", () => {
  it("sortiert nach Häufigkeit und hängt neue Standard-Tönungen an", () => {
    const liste = farbVorschlaege([
      { Farbe: "F06", Anzahl: 101 },
      { Farbe: "BR", Anzahl: 162 },
      { Farbe: "grau  85%", Anzahl: 40 },
    ]);
    expect(liste.slice(0, 3)).toEqual(["BR", "F06", "grau 85%"]);
    // "Grau 85%" ist schon (anders geschrieben) dabei
    expect(liste.filter((f) => f.toLowerCase() === "grau 85%")).toHaveLength(1);
    expect(liste).toContain("Braun polarisierend");
  });

  it("ohne Daten: nur die Standard-Tönungen", () => {
    expect(farbVorschlaege([])[0]).toBe("Grau 85%");
  });
});
