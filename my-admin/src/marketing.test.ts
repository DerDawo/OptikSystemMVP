import dayjs from "dayjs";
import { describe, expect, it } from "vitest";
import {
  adresslisteCsv,
  kriteriumAusdruck,
  pflichtFilter,
  quote,
  selektionText,
  selektionsAusdruck,
} from "./marketing";

const heute = dayjs("2026-11-18T10:00:00");

describe("kriteriumAusdruck", () => {
  it("Alter als Bereich, auch einseitig", () => {
    expect(
      kriteriumAusdruck({ id: "1", merkmal: "alter", a: "40", b: "60" }, heute),
    ).toBe("and(Alter.gte.40,Alter.lte.60)");
    expect(
      kriteriumAusdruck({ id: "1", merkmal: "alter", a: "65" }, heute),
    ).toBe("Alter.gte.65");
    expect(kriteriumAusdruck({ id: "1", merkmal: "alter" }, heute)).toBeNull();
  });

  it("Monate zurück als Datum", () => {
    expect(
      kriteriumAusdruck(
        { id: "1", merkmal: "letzteBrilleAelter", a: "24" },
        heute,
      ),
    ).toBe("LetzteBrille.lt.2024-11-18");
    expect(
      kriteriumAusdruck({ id: "1", merkmal: "neukunde", a: "6" }, heute),
    ).toBe("KundeSeit.gte.2026-05-18");
  });

  it("Text: Platzhalter, Anführungszeichen nur bei Sonderzeichen", () => {
    expect(kriteriumAusdruck({ id: "1", merkmal: "ort", a: "Gera" })).toBe(
      "Stadt.ilike.*Gera*",
    );
    expect(
      kriteriumAusdruck({ id: "1", merkmal: "krankenkasse", a: "AOK Plus" }),
    ).toBe('Krankenkasse.ilike."*AOK Plus*"');
    expect(
      kriteriumAusdruck({ id: "1", merkmal: "ort", a: 'Bad "X", (Th.)' }),
    ).toBe('Stadt.ilike."*Bad \\"X\\", (Th.)*"');
    expect(kriteriumAusdruck({ id: "1", merkmal: "ort", a: "**" })).toBeNull();
  });

  it("PLZ nur Ziffern als Anfang", () => {
    expect(kriteriumAusdruck({ id: "1", merkmal: "plz", a: "07 5" })).toBe(
      "Postleitzahl.like.075*",
    );
  });

  it("Merkmal 1–4 als ODER-Gruppe", () => {
    expect(kriteriumAusdruck({ id: "1", merkmal: "merkmal", a: "VIP" })).toBe(
      "or(Merkmal1.ilike.*VIP*,Merkmal2.ilike.*VIP*,Merkmal3.ilike.*VIP*,Merkmal4.ilike.*VIP*)",
    );
  });

  it("ja/nein und ohne Eingabe", () => {
    expect(
      kriteriumAusdruck({ id: "1", merkmal: "gleitsicht", a: "nein" }),
    ).toBe("Gleitsicht.is.false");
    expect(kriteriumAusdruck({ id: "1", merkmal: "keineBrille" })).toBe(
      "LetzteBrille.is.null",
    );
  });
});

describe("selektionsAusdruck", () => {
  const kriterien = [
    { id: "1", merkmal: "gleitsicht" as const, a: "ja" },
    { id: "2", merkmal: "alter" as const },
    { id: "3", merkmal: "geburtsmonat" as const, a: "12" },
  ];

  it("UND: unvollständige Bedingungen zählen nicht", () => {
    expect(selektionsAusdruck({ verknuepfung: "und", kriterien }, heute)).toBe(
      "and(Gleitsicht.is.true,Geburtsmonat.eq.12)",
    );
  });

  it("ODER als einfache Liste", () => {
    expect(selektionsAusdruck({ verknuepfung: "oder", kriterien }, heute)).toBe(
      "Gleitsicht.is.true,Geburtsmonat.eq.12",
    );
  });

  it("ohne Bedingung: alle Kunden", () => {
    expect(
      selektionsAusdruck({ verknuepfung: "und", kriterien: [] }, heute),
    ).toBeNull();
  });
});

describe("pflichtFilter", () => {
  it("Einwilligung und Anschrift für Briefe", () => {
    expect(pflichtFilter({ kanal: "post", nurEinwilligung: true })).toEqual([
      ["Werbeeinwilligung", "is", true],
      ["Straße", "not.is", null],
      ["Straße", "neq", ""],
      ["Postleitzahl", "not.is", null],
      ["Postleitzahl", "neq", ""],
    ]);
  });

  it("E-Mail ohne Einwilligungspflicht", () => {
    expect(pflichtFilter({ kanal: "email", nurEinwilligung: false })).toEqual([
      ["Email", "like", "*@*"],
    ]);
  });
});

describe("Texte und Listen", () => {
  it("beschreibt die Auswahl", () => {
    expect(
      selektionText({
        verknuepfung: "oder",
        kanal: "email",
        nurEinwilligung: true,
        kriterien: [
          { id: "1", merkmal: "alter", a: "40", b: "60" },
          { id: "2", merkmal: "kontaktlinsen", a: "ja" },
        ],
      }),
    ).toBe(
      "Alter 40–60 Jahre ODER Kontaktlinsenkunde: ja · Kanal: E-Mail · nur mit Werbeeinwilligung",
    );
  });

  it("Erfolgsquote", () => {
    expect(quote(16, 300)).toBe(5.3);
    expect(quote(0, 0)).toBe(0);
  });

  it("Adressliste mit BOM und Semikolon", () => {
    const csv = adresslisteCsv([
      { Vorname: "Erika", Nachname: "Muster", Stadt: "Gera; Ost" },
    ]);
    expect(csv.startsWith("﻿KundenNummer;Anrede")).toBe(true);
    expect(csv).toContain(';Erika;Muster;;;;"Gera; Ost";;');
  });
});
