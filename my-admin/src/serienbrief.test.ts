import { describe, expect, it } from "vitest";
import dayjs from "dayjs";
import {
  auswahlFilter,
  buildSerienbriefHtml,
  emailListeCsv,
  fuelleText,
  type Auswahl,
} from "./serienbrief";
import { STANDARD_ABSENDER } from "./rechnungTemplate";

const basis: Auswahl = {
  kanal: "post",
  gruppe: "alle",
  jahre: 2,
  monat: 11,
  plz: "",
  nurEinwilligung: true,
};

const kundin = {
  id: 1,
  Anrede: "Frau",
  Vorname: "Anja",
  Nachname: "Muster",
  Straße: "Hauptstraße",
  Hausnummer: "1",
  Postleitzahl: "07551",
  Stadt: "Gera",
  Email: "anja@example.org",
  LetzteBrille: "2024-03-05",
};

describe("auswahlFilter", () => {
  it("Post: vollständige Anschrift und Einwilligung", () => {
    expect(auswahlFilter(basis)).toEqual({
      "Straße@not.is": "null",
      "Straße@neq": "",
      "Postleitzahl@not.is": "null",
      "Postleitzahl@neq": "",
      Werbeeinwilligung: true,
    });
  });

  it("E-Mail, Sehtest nach Jahren, PLZ nur Ziffern", () => {
    const f = auswahlFilter(
      { ...basis, kanal: "email", gruppe: "sehtest", jahre: 3, plz: "07 5" },
      dayjs("2026-10-12"),
    );
    expect(f).toMatchObject({
      "Email@like": "*@*",
      "LetzteBrille@lt": "2023-10-12",
      "Postleitzahl@like": "075*",
    });
    expect(f).not.toHaveProperty("Straße@neq");
  });

  it("Gruppen und ohne Einwilligung", () => {
    expect(
      auswahlFilter({ ...basis, gruppe: "geburtstag", nurEinwilligung: false }),
    ).toMatchObject({ Geburtsmonat: 11 });
    expect(
      auswahlFilter({ ...basis, nurEinwilligung: false }),
    ).not.toHaveProperty("Werbeeinwilligung");
    expect(auswahlFilter({ ...basis, gruppe: "gleitsicht" })).toMatchObject({
      Gleitsicht: true,
    });
  });
});

describe("Text und Ausgabe", () => {
  it("ersetzt Platzhalter je Kunde", () => {
    expect(fuelleText("{Briefanrede}, Brille vom {LetzteBrille}", kundin)).toBe(
      "Sehr geehrte Frau Muster, Brille vom 05.03.2024",
    );
  });

  it("eine Seite je Kunde, Text ist maskiert", () => {
    const html = buildSerienbriefHtml(
      [kundin, { ...kundin, id: 2, Nachname: "<b>X</b>" }],
      "Betreff",
      "Hallo {Nachname}\n\nZweiter Absatz",
      STANDARD_ABSENDER,
    );
    expect(html.match(/class="beleg serienbrief"/g)).toHaveLength(2);
    expect(html).toContain("Hallo Muster");
    expect(html).toContain("&lt;b&gt;X&lt;/b&gt;");
    expect(html).not.toContain("<b>X</b>");
    expect(html.match(/data:image/g)).toHaveLength(1);
  });

  it("CSV mit BOM, Semikolon, ohne doppelte Adressen", () => {
    const csv = emailListeCsv([
      kundin,
      { ...kundin, id: 2, Email: "ANJA@example.org" },
      { ...kundin, id: 3, Email: "", Nachname: "Ohne" },
      { ...kundin, id: 4, Email: "b@example.org", Nachname: 'Mül;ler "M"' },
    ]);
    expect(csv.startsWith("﻿E-Mail;Anrede;Vorname;Nachname;Briefanrede")).toBe(
      true,
    );
    const zeilen = csv.slice(1).split("\r\n");
    expect(zeilen).toHaveLength(3);
    expect(zeilen[1]).toBe(
      "anja@example.org;Frau;Anja;Muster;Sehr geehrte Frau Muster",
    );
    expect(zeilen[2]).toContain('"Mül;ler ""M"""');
  });
});
