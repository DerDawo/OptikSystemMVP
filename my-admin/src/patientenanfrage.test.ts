import { describe, expect, it } from "vitest";
import {
  absenderZeile,
  buildPatientenanfragePrintHtml,
  kassenText,
} from "./patientenanfrageTemplate";

const kunde = {
  Vorname: "Jürgen",
  Nachname: "Göckeritz",
  Straße: "Walter Gerberstr.",
  Hausnummer: "41",
  Postleitzahl: "07551",
  Stadt: "Gera",
  Geburtsdatum: "1941-02-16",
  Krankenkasse: "Techniker Krankenkasse",
  KrankenkassenNummer: "101575519",
  VersichertenNummer: "E826974320",
};

describe("Patientenanfrage", () => {
  it("baut Absenderzeile und Kassenangabe", () => {
    expect(absenderZeile(kunde)).toBe(
      "Jürgen Göckeritz, Walter Gerberstr. 41, 07551 Gera",
    );
    expect(kassenText(kunde)).toBe(
      "Techniker Krankenkasse 101575519; VNr. E826974320",
    );
    expect(kassenText({})).toBe("");
  });

  it("übernimmt Kundendaten in den Brief", () => {
    const html = buildPatientenanfragePrintHtml({ entities: { kunde } });
    expect(html).toContain(
      "Jürgen Göckeritz, Walter Gerberstr. 41, 07551 Gera",
    );
    expect(html).toContain("16.02.1941");
    expect(html).toContain("VNr. E826974320");
    expect(html).toContain("J. Göckeritz");
    expect(html).toContain("Grauen Star (Katarakt)");
    expect(html).toMatch(/Gera, den \d{1,2}\. [A-Za-zä]+ \d{4}/);
  });
});
