import { describe, expect, it } from "vitest";
import {
  Grundglas,
  Vorgabe,
  durchmesserListe,
  grundglasPreis,
  optionKategorie,
  passtZuVorgaben,
} from "./glasassistentRegeln";

const glas = (teil: Partial<Grundglas>): Grundglas => ({
  bezeichnung: "Testglas 1.50",
  ...teil,
});
const vorgaben = (...v: Vorgabe[]) => new Set<Vorgabe>(v);

describe("passtZuVorgaben", () => {
  it("filtert nach Glasart und Material (oder innerhalb, und zwischen den Gruppen)", () => {
    const gleitsichtKunststoff = glas({ glasart: 3, material: 2 });
    expect(passtZuVorgaben(gleitsichtKunststoff, vorgaben("gleitsicht"))).toBe(
      true,
    );
    expect(passtZuVorgaben(gleitsichtKunststoff, vorgaben("einstaerken"))).toBe(
      false,
    );
    expect(
      passtZuVorgaben(
        gleitsichtKunststoff,
        vorgaben("einstaerken", "gleitsicht"),
      ),
    ).toBe(true);
    expect(
      passtZuVorgaben(gleitsichtKunststoff, vorgaben("gleitsicht", "mineral")),
    ).toBe(false);
    expect(passtZuVorgaben(glas({ material: 3 }), vorgaben("kunststoff"))).toBe(
      true,
    );
  });

  it("schließt Gläser ohne Glasart/Material (alte Importe) nicht aus", () => {
    expect(
      passtZuVorgaben(glas({}), vorgaben("gleitsicht", "kunststoff")),
    ).toBe(true);
  });

  it("prüft höherbrechend, asphärisch und phototrop", () => {
    expect(
      passtZuVorgaben(
        glas({ brechungsindex: 1.6 }),
        vorgaben("hoeherbrechend"),
      ),
    ).toBe(true);
    expect(
      passtZuVorgaben(
        glas({ brechungsindex: 1.5 }),
        vorgaben("hoeherbrechend"),
      ),
    ).toBe(false);
    expect(
      passtZuVorgaben(
        glas({ bezeichnung: "Leica Monovid 1.67 AS Stock" }),
        vorgaben("asphaerisch"),
      ),
    ).toBe(true);
    expect(
      passtZuVorgaben(
        glas({ bezeichnung: "RX mono 1.60 TrBr" }),
        vorgaben("phototrop"),
      ),
    ).toBe(true);
    expect(
      passtZuVorgaben(
        glas({ bezeichnung: "Trivex 1.53 Trifokal" }),
        vorgaben("phototrop"),
      ),
    ).toBe(false);
    expect(
      passtZuVorgaben(
        glas({ bezeichnung: "Sequel 2.0 1.60 Trans Grey" }),
        vorgaben("phototrop"),
      ),
    ).toBe(true);
    expect(
      passtZuVorgaben(
        glas({ bezeichnung: "3ZONE 1.50 PGX" }),
        vorgaben("phototrop"),
      ),
    ).toBe(true);
  });
});

describe("optionKategorie", () => {
  it("teilt die POL-Optionen wie in Prisma ein", () => {
    const kategorie = (bezeichnung: string) =>
      optionKategorie({ bezeichnung, typ: "beschichtung" });
    for (const name of [
      "AR/Multi",
      "Multi Plus",
      "NanoGlide",
      "MirrorBlue + UltraBS",
      "Ultra Backside_AC",
    ])
      expect(kategorie(name)).toBe("entspiegelung");
    for (const name of [
      "Cylinder von 6.00 bis 12.00",
      "Einschleifen Vollrand",
      "MDR",
      "Montage Nylor",
      "Prisma bis 5.00",
    ])
      expect(kategorie(name)).toBe("hartschicht");
    expect(optionKategorie({ bezeichnung: "BlueBlocker", typ: "farbe" })).toBe(
      "farbe",
    );
  });
});

describe("Durchmesser und Preis", () => {
  const g = glas({
    basispreis: 100,
    durchmesser: { "70": 120, "65/70": 110, "60": 100 },
  });

  it("sortiert die Durchmesser aufsteigend", () => {
    expect(durchmesserListe(g).map((d) => d.durchmesser)).toEqual([
      "60",
      "65/70",
      "70",
    ]);
    expect(durchmesserListe(glas({}))).toEqual([]);
  });

  it("nimmt den Preis des Durchmessers, sonst den Basispreis", () => {
    expect(grundglasPreis(g, "70")).toBe(120);
    expect(grundglasPreis(g, null)).toBe(100);
    expect(grundglasPreis(g, "99")).toBe(100);
    expect(grundglasPreis(null, "70")).toBe(0);
  });
});
