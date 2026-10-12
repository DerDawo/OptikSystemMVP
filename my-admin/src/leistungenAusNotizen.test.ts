import { describe, expect, it } from "vitest";
import {
  leistungenAusNotizen,
  leistungsText,
  setzeNotizLeistungBetrag,
  weitereLeistungenPositionen,
} from "./leistungenAusNotizen";
import { buildRechnungPositionen } from "./rechnungTemplate";

const notizen = [
  "Leistungen:",
  "- Glaseinschliff: 29,50 €",
  "Kassenabrechnung: 00JA 30000 BARMER",
].join("\n");

describe("leistungenAusNotizen", () => {
  it("liest die Leistungen des Prisma-Imports", () => {
    expect(leistungenAusNotizen(notizen)).toEqual([
      { bezeichnung: "Glaseinschliff", betrag: 29.5 },
    ]);
    expect(
      leistungenAusNotizen(
        "Memo\nLeistungen:\n- Refraktion: 28,90 €\n- Nachlass Treue: -10,00 €\n- Fassung ohne Preis\n- Großauftrag: 1.234,00 €",
      ),
    ).toEqual([
      { bezeichnung: "Refraktion", betrag: 28.9 },
      { bezeichnung: "Nachlass Treue", betrag: -10 },
      { bezeichnung: "Großauftrag", betrag: 1234 },
    ]);
    expect(leistungenAusNotizen("")).toEqual([]);
    expect(leistungenAusNotizen(null)).toEqual([]);
  });
});

describe("weitereLeistungenPositionen", () => {
  it("führt die Einzelleistungen auf, wenn sie die Summe ergeben", () => {
    expect(weitereLeistungenPositionen(29.5, notizen)).toEqual([
      { bezeichnung: "Glaseinschliff", betrag: 29.5 },
    ]);
  });

  it("weist einen Rest als Weitere Leistungen bzw. Nachlass aus", () => {
    expect(weitereLeistungenPositionen(40, notizen)).toEqual([
      { bezeichnung: "Glaseinschliff", betrag: 29.5 },
      { bezeichnung: "Weitere Leistungen (siehe Auftrag)", betrag: 10.5 },
    ]);
    expect(weitereLeistungenPositionen(20, notizen)).toEqual([
      { bezeichnung: "Glaseinschliff", betrag: 29.5 },
      { bezeichnung: "Nachlass (siehe Auftrag)", betrag: -9.5 },
    ]);
    expect(weitereLeistungenPositionen(15, "ohne Leistungen")).toEqual([
      { bezeichnung: "Weitere Leistungen (siehe Auftrag)", betrag: 15 },
    ]);
    expect(weitereLeistungenPositionen(0, notizen)).toEqual([]);
  });
});

describe("Rechnung mit Leistungen eines Prisma-Auftrags", () => {
  it("listet Glaseinschliff einzeln statt 'Weitere Leistungen'", () => {
    const positionen = buildRechnungPositionen({
      brille: { WeitereLeistungen: 29.5, Notizen: notizen },
      fassung: { Bezeichnung: "FO 4126", Betrag: 129 },
      glasRechts: { Betrag: 36.9 },
      glasLinks: { Betrag: 36.9 },
    });
    expect(positionen.map((p) => [p.label, p.betrag])).toEqual([
      ["Fassung :", 129],
      ["Glas rechts :", 36.9],
      ["Glas links :", 36.9],
      ["Glaseinschliff", 29.5],
    ]);
  });

  it("listet gebuchte Zusatzleistungen mit Bezeichnung", () => {
    const positionen = buildRechnungPositionen({
      brille: {},
      zusatzleistungen: [{ Bezeichnung: "Refraktion", Betrag: 28.9 }],
    });
    expect(positionen.at(-1)).toEqual({ label: "Refraktion", betrag: 28.9 });
  });
});

describe("leistungsText", () => {
  it("liest die Leistungen aus PrismaAngaben, die Notizen bleiben frei", () => {
    const brille = {
      Notizen: "Kunde wünscht Etui",
      PrismaAngaben: "Leistungen:\n- Glaseinschliff: 29,50 €",
      WeitereLeistungen: 29.5,
    };
    expect(weitereLeistungenPositionen(29.5, leistungsText(brille))).toEqual([
      { bezeichnung: "Glaseinschliff", betrag: 29.5 },
    ]);
    expect(leistungsText({ Notizen: null, PrismaAngaben: undefined })).toBe("");
  });
});

describe("setzeNotizLeistungBetrag", () => {
  const text =
    "Leistungen:\n- Glaseinschliff: 19,50 €\n- Refraktion: 24,50 €\nSonstiges";

  it("ändert genau den Betrag der gewählten Zeile", () => {
    const neu = setzeNotizLeistungBetrag(text, 1, 1234.5);
    expect(neu).toBe(
      "Leistungen:\n- Glaseinschliff: 19,50 €\n- Refraktion: 1.234,50 €\nSonstiges",
    );
    expect(leistungenAusNotizen(neu)).toEqual([
      { bezeichnung: "Glaseinschliff", betrag: 19.5 },
      { bezeichnung: "Refraktion", betrag: 1234.5 },
    ]);
  });

  it("ohne passende Zeile null", () => {
    expect(setzeNotizLeistungBetrag(text, 5, 10)).toBeNull();
    expect(setzeNotizLeistungBetrag("ohne Leistungen", 0, 10)).toBeNull();
  });
});
