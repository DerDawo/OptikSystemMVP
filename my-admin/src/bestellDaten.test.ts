import { describe, expect, it } from "vitest";
import {
  bestellSeiten,
  bestellText,
  bestellWert,
  kommission,
  passenderHersteller,
  portalUrl,
} from "./bestellDaten";

describe("bestellWert", () => {
  it("Vorzeichen bei Sph/Cyl/Add, feste Stellen", () => {
    expect(bestellWert(1.25, { stellen: 2, vorzeichen: true })).toBe("+1.25");
    expect(bestellWert(-0.5, { stellen: 2, vorzeichen: true })).toBe("-0.50");
    expect(bestellWert(0, { stellen: 2, vorzeichen: true })).toBe("0.00");
    expect(bestellWert(90, { stellen: 0 })).toBe("90");
    expect(bestellWert("31,5", { stellen: 1 })).toBe("31.5");
    expect(bestellWert(null, { stellen: 2 })).toBe("");
  });
});

describe("Kommission und Seiten", () => {
  it("Kundenname und Auftragsnummer", () => {
    expect(kommission({ Nachname: "Muster", Vorname: "Anja" }, 49604)).toBe(
      "Muster, Anja · Auftrag 49604",
    );
    expect(kommission(undefined, 7)).toBe("Auftrag 7");
  });

  it("nur Seiten mit Liefern, sonst beide", () => {
    const r = { seite: "R", glas: { id: 1, Liefern: true } };
    const l = { seite: "L", glas: { id: 2, Liefern: false } };
    expect(bestellSeiten([r, l])).toEqual([r]);
    const l2 = { seite: "L", glas: { id: 2 } };
    expect(bestellSeiten([{ seite: "R", glas: { id: 1 } }, l2])).toHaveLength(
      2,
    );
    const ohneGlas: { seite: string; glas?: Record<string, unknown> } = {
      seite: "R",
    };
    expect(bestellSeiten([ohneGlas, l2])).toEqual([l2]);
  });
});

describe("bestellText", () => {
  it("fasst alles zum Einfügen zusammen", () => {
    expect(
      bestellText({
        kunde: { Nachname: "Muster", Vorname: "Anja" },
        auftragId: 5,
        glastyp: { Bezeichnung: "Gleitsicht 1.6", Verguetung: "Super ET" },
        fassung: { Groesse: "52-18" },
        augen: [
          { seite: "R", glas: { Sph: -1, Cyl: -0.5, A: 90, PD: 31.5 } },
          { seite: "L", glas: { Sph: 0.25 } },
        ],
      }),
    ).toBe(
      [
        "Kommission: Muster, Anja · Auftrag 5",
        "Glas: Gleitsicht 1.6",
        "Vergütung: Super ET",
        "Fassung: 52-18",
        "Rechts: Sph -1.00, Cyl -0.50, Achse 90, PD 31.5",
        "Links: Sph +0.25",
      ].join("\n"),
    );
  });
});

describe("Portal und Hersteller", () => {
  it("ergänzt https://", () => {
    expect(portalUrl("shop.example.de")).toBe("https://shop.example.de");
    expect(portalUrl("http://x.de")).toBe("http://x.de");
    expect(portalUrl("  ")).toBe("");
  });

  it("findet den Hersteller über Katalog oder Namen", () => {
    const liste = [
      { id: "a", code: "POL", name: "POC" },
      { id: "b", code: "CZ", name: "ZEISS" },
    ];
    expect(passenderHersteller(liste, "a", "")?.id).toBe("a");
    expect(passenderHersteller(liste, null, "Zeiss Vision")?.id).toBe("b");
    expect(passenderHersteller(liste, null, "pol")?.id).toBe("a");
    expect(passenderHersteller(liste, null, "Unbekannt")).toBeUndefined();
  });
});
