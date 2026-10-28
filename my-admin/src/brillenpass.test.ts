import { describe, expect, it } from "vitest";
import { brillenpassHtml, brillenpassText } from "./brillenpass";
import { STANDARD_ABSENDER } from "./rechnungTemplate";

const daten = {
  brille: {
    id: 49604,
    Datum: "2026-10-11",
    BrillenArt: "Gleitsichtbrille",
    Refraktion: "lt. optometr. Verordnung",
  },
  kunde: { Anrede: "Frau", Vorname: "Anja", Nachname: "Muster" },
  glasRechts: { Sph: 1.25, Cyl: -0.5, A: 48, Add: 2, PD: 32 },
  glasLinks: { Sph: 2, Cyl: -0.75, A: 106, Add: 2, PD: 31.5 },
  glastyp: { Hersteller: "POC", Bezeichnung: "Adapta 2.0 <1.50>" },
  fassung: { Bezeichnung: "AE TR9901", Groesse: "52-18" },
};

describe("Brillenpass", () => {
  it("Karte nur mit Kopf, Werten R/L und Fußzeile", () => {
    const html = brillenpassHtml(
      { ...daten, kunde: { ...daten.kunde, Nachname: "M<u>ster" } },
      STANDARD_ABSENDER,
    );
    expect(html).toContain("Brillenpass");
    expect(html).toContain("Frau Anja M&lt;u&gt;ster");
    expect(html).toContain("Brille vom 11.10.2026 · Auftrag 49604");
    expect(html).toContain("<td>+1,25</td>");
    expect(html).toContain("<td>106</td>");
    expect(html).toContain("Bei Verlust oder Bruch");
    expect(html).not.toContain("32 / 31,5");
    expect(html).not.toContain("Adapta");
    expect(html).not.toContain("TR9901");
    expect(html).not.toContain("Gleitsichtbrille");
  });

  it("Text für SMS/E-Mail", () => {
    expect(brillenpassText(daten, STANDARD_ABSENDER)).toBe(
      [
        "Sehr geehrte Frau Muster,",
        "",
        "hier Ihr Brillenpass (Brille vom 11.10.2026, Gleitsichtbrille):",
        "Rechts: Sph +1,25, Cyl -0,50, Achse 48, Add +2,00",
        "Links: Sph +2,00, Cyl -0,75, Achse 106, Add +2,00",
        "",
        "Bei Verlust oder Bruch einfach diesen Pass vorzeigen.",
        "",
        `Ihr Team von ${STANDARD_ABSENDER.firma}`,
      ].join("\n"),
    );
  });
});
