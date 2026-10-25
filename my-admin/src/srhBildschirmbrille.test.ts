import { describe, expect, it } from "vitest";
import {
  buildSrhBildschirmbrillePreviewHtml,
  buildSrhBildschirmbrillePrintHtml,
} from "./srhBildschirmbrilleTemplate";

const entities = {
  kunde: {
    Nachname: "Muster",
    Vorname: "Erika",
    Geburtsdatum: "1975-06-30",
    Straße: "Hauptstraße",
    Hausnummer: "1",
    Postleitzahl: "07545",
    Stadt: "Gera",
  },
  glasRechts: { Sph: 0.75, Cyl: -0.5, A: 90, Add: 1.5 },
  glasLinks: { Sph: -0.25, Cyl: 0, A: 0, Add: 1.5 },
} as never;

describe("Antrag SRH", () => {
  const html = buildSrhBildschirmbrillePrintHtml({ entities });

  it("übernimmt Name, Geburtsdatum, Anschrift und Refraktion", () => {
    expect(html).toContain("Muster, Erika");
    expect(html).toContain("30.06.1975");
    expect(html).toContain("Hauptstraße 1, 07545 Gera");
    expect(html).toContain("+0,75");
    expect(html).toContain("-0,25");
  });

  it("enthält den Original-Aufbau, aber weder Stempel noch Unterschrift", () => {
    expect(html).toContain("Gewährung einer Bildschirmarbeitsbrille");
    expect(html).toContain("Stellungnahme des Augenarztes");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("DEKRA");
  });

  it("Vorschau ist bearbeitbar", () => {
    expect(buildSrhBildschirmbrillePreviewHtml({ entities })).toContain(
      'contenteditable="true"',
    );
  });
});
