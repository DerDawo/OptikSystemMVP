import { describe, expect, it } from "vitest";
import {
  buildJobcenterBildschirmbrillePreviewHtml,
  buildJobcenterBildschirmbrillePrintHtml,
} from "./jobcenterBildschirmbrilleTemplate";

const png = "data:image/png;base64,iVBORw0KGgo=";
const entities = {
  kunde: { Nachname: "Gottschalk", Vorname: "Dirk" },
  glasRechts: { Sph: 0.75, Add: 1.5 },
  glasLinks: { Sph: -0.25, Add: 1.5 },
} as never;

describe("Antrag Jobcenter", () => {
  const html = buildJobcenterBildschirmbrillePrintHtml({
    entities,
    bilder: {},
  });

  it("übernimmt Name und Vorname", () => {
    expect(html).toContain("Gottschalk, Dirk");
  });

  it("enthält die festen Vordruck-Texte", () => {
    expect(html).toContain("Vom Optiker auszufüllen");
    expect(html).toContain("Zur Vorlage beim Arbeitgeber");
    expect(html).toContain("ArbStättV");
    expect(html).toContain("Mehrstärkengläser (bi-/trifokal)");
  });

  it("kreuzt ja und bei Addition die Mehrstärkengläser vor", () => {
    expect(html.match(/class="box" checked/g)).toHaveLength(2);
  });

  it("kreuzt ohne Addition die Einstärkengläser vor", () => {
    const einstaerken = buildJobcenterBildschirmbrillePrintHtml({
      entities: {
        kunde: {},
        glasRechts: { Sph: 1 },
        glasLinks: { Sph: 1 },
      } as never,
      bilder: {},
    });
    expect(einstaerken.match(/class="box" checked/g)).toHaveLength(2);
    expect(einstaerken).toMatch(
      /Einstärkengläser \(monofokal\)<\/span>\s*<span class="wahl"><input type="checkbox" class="box" checked/,
    );
  });

  it("bettet Stempel und Unterschrift nur aus den Einstellungen ein", () => {
    const mit = buildJobcenterBildschirmbrillePrintHtml({
      entities,
      bilder: { stempel: png, unterschrift: png },
    });
    expect(mit).toContain(`class="stempel-bild" src="${png}"`);
    expect(html).not.toContain("<img");
    expect(html).not.toContain("3006969");
  });

  it("Vorschau ist bearbeitbar", () => {
    expect(
      buildJobcenterBildschirmbrillePreviewHtml({ entities, bilder: {} }),
    ).toContain('contenteditable="true"');
  });
});
