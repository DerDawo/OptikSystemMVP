import { describe, expect, it } from "vitest";
import dayjs from "dayjs";
import {
  alterVorherigeBrille,
  anzahlGlaeser,
  brillenartKategorie,
  diagnoseVorschlaege,
  ermitteltViaVorschlaege,
  kaestchen,
  kassenart,
  sehstaerkeVeraendert,
  versorgungVorschlaege,
} from "./formularVorschlaege";

const aktuell = {
  brille: { BrillenArt: "Gleitsichtbrille", Refraktion: "Standard Sehtest" },
  glasRechts: { Sph: -1.25, Cyl: -0.5, A: 90, Add: 2 },
  glasLinks: { Sph: -1, Cyl: 0, A: 0, Add: 2 },
};

describe("sehstaerkeVeraendert", () => {
  it("erkennt eine Veränderung ab 0,5 dpt in Sphäre oder Zylinder", () => {
    expect(
      sehstaerkeVeraendert({
        ...aktuell,
        vorherigesGlasRechts: { Sph: -0.75, Cyl: -0.5 },
        vorherigesGlasLinks: { Sph: -1, Cyl: 0 },
      }),
    ).toBe(true);
  });

  it("meldet keine Veränderung unter 0,5 dpt", () => {
    expect(
      sehstaerkeVeraendert({
        ...aktuell,
        vorherigesGlasRechts: { Sph: -1, Cyl: -0.5 },
        vorherigesGlasLinks: { Sph: -1, Cyl: -0.25 },
      }),
    ).toBe(false);
  });

  it("gibt ohne vorherige Brille null zurück", () => {
    expect(sehstaerkeVeraendert(aktuell)).toBeNull();
  });
});

describe("Vorschläge aus den Werten", () => {
  it("leitet Diagnosen aus der Refraktion ab", () => {
    expect([...diagnoseVorschlaege(aktuell)].sort()).toEqual([
      "Astigmatismus (Hornhautverkrümmung)",
      "Myopie (Kurzsichtigkeit)",
      "Presbyopie (Alterssichtigkeit)",
    ]);
    expect(
      diagnoseVorschlaege({
        glasRechts: { Sph: 3 },
        glasLinks: { Sph: 0.5 },
      }).has("Anisometropie (Ungleichsichtigkeit)"),
    ).toBe(true);
  });

  it("leitet Versorgung und Messart aus dem Auftrag ab", () => {
    expect([...versorgungVorschlaege(aktuell)]).toEqual(["Gleitsichtglas"]);
    expect([...ermitteltViaVorschlaege(aktuell)]).toEqual([
      "Subjektive Refraktion",
    ]);
    expect([
      ...ermitteltViaVorschlaege({
        brille: { Refraktion: "lt. ärztl. Verordnung" },
      }),
    ]).toEqual(["Übernahme Vorrezept"]);
    expect([
      ...ermitteltViaVorschlaege({
        brille: { Refraktion: "Robert Ulm lt. optometrischer Messung" },
      }),
    ]).toEqual(["Subjektive Refraktion"]);
  });

  it("ordnet Brillenarten Kategorien zu", () => {
    expect(brillenartKategorie("Arbeitsplatzbrille (Office)")).toBe(
      "Officebrille",
    );
    expect(brillenartKategorie("Einstärkenbrille (Nah/Lesebrille)")).toBe(
      "Nahbrille",
    );
    expect(brillenartKategorie("Einstärkenbrille (Fern)")).toBe("Fernbrille");
    expect(brillenartKategorie("Sonnenbrille")).toBeNull();
  });

  it("zählt Gläser und berechnet das Alter der vorherigen Brille", () => {
    expect(anzahlGlaeser(aktuell)).toBe("2");
    expect(
      alterVorherigeBrille({
        vorherigeBrille: {
          Datum: dayjs().subtract(3, "year").subtract(2, "day").format(),
        },
      }),
    ).toBe(3);
  });

  it("rendert anklickbare Kästchen", () => {
    expect(kaestchen(true)).toBe(
      '<input type="checkbox" class="kaestchen" checked />',
    );
    expect(kaestchen()).not.toContain("checked");
  });
});

describe("kassenart", () => {
  it("ordnet Kassennamen der Kassenart zu", () => {
    expect(kassenart("AOK PLUS")).toBe("AOK");
    expect(kassenart("Techniker Krankenkasse (TK)")).toBe("vDAK");
    expect(kassenart("BARMER")).toBe("vDAK");
    expect(kassenart("IKK classic")).toBe("IKK");
    expect(kassenart("BKK firmus")).toBe("BKK");
    expect(kassenart("Knappschaft")).toBe("Knappschaft");
    expect(kassenart("SVLFG")).toBe("LKK");
    expect(kassenart("")).toBeNull();
  });
});
