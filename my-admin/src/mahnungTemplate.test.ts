import fs from "node:fs";
import { fileURLToPath } from "node:url";
import dayjs from "dayjs";
import { describe, expect, it } from "vitest";
import {
  ZAHLUNGSERINNERUNG_TEXT,
  briefanrede,
  buildMahnungPreviewHtml,
  buildMahnungPrintHtml,
  mahnungPlatzhalter,
  mahnungText,
  rechnungsdatum,
} from "./mahnungTemplate";

// Erfundene Testdaten, keine echten Kunden
const entities = {
  kunde: {
    Anrede: "Frau",
    Vorname: "Erika",
    Nachname: "Muster",
    Straße: "Hauptstraße",
    Hausnummer: "1",
    Postleitzahl: "07545",
    Stadt: "Gera",
    KundenNummer: "10001",
  },
  brille: {
    id: 42,
    Rechnungsnummer: "114900",
    Datum: "2026-09-01",
    Abholung: "2026-09-15T10:00:00",
    Summe: 497.5,
    Anzahlung: 30,
    KKAnteil: 0,
  },
};
const daten = { entities, rechnungsnummer: "114900" };

// Texte der Migration, damit Vorlage und Platzhalter zusammenpassen
const MIGRATION = fs.readFileSync(
  fileURLToPath(
    new URL(
      "../../supabase/migrations/20261019100000_mahnung_briefkopf_texte.sql",
      import.meta.url,
    ),
  ),
  "utf8",
);
const migrationsTexte = [...MIGRATION.matchAll(/\$\$([\s\S]*?)\$\$/g)].map(
  (treffer) => treffer[1],
);

describe("Mahnung: Platzhalter", () => {
  it("redet den Kunden mit Namen an, sonst allgemein", () => {
    expect(briefanrede(entities.kunde)).toBe("Sehr geehrte Frau Muster");
    expect(briefanrede({ Anrede: "Herr", Nachname: "Beispiel" })).toBe(
      "Sehr geehrter Herr Beispiel",
    );
    expect(briefanrede({ Anrede: "Firma", Nachname: "Optik GmbH" })).toBe(
      "Sehr geehrte Damen und Herren",
    );
    expect(briefanrede(null)).toBe("Sehr geehrte Damen und Herren");
  });

  it("nimmt als Rechnungsdatum Prisma-Angabe, Abholtag oder Auftragsdatum", () => {
    const format = (brille: Record<string, unknown>) =>
      rechnungsdatum(brille)?.format("DD.MM.YYYY") ?? null;
    expect(
      format({
        PrismaAngaben: "Merkmal: X\nRechnungsdatum: 05.03.2024",
        Abholung: "2026-09-15",
      }),
    ).toBe("05.03.2024");
    expect(format(entities.brille)).toBe("15.09.2026");
    // Abholung erst geplant: dann das Auftragsdatum
    expect(
      format({
        Datum: "2026-09-01",
        Abholung: dayjs().add(3, "day").format("YYYY-MM-DD"),
      }),
    ).toBe("01.09.2026");
    expect(format({})).toBeNull();
  });

  it("füllt Rechnung, Fälligkeit, offenen Betrag, Frist und Betrieb", () => {
    const werte = mahnungPlatzhalter(daten);
    expect(werte["rechnung.nummer"]).toBe("114900");
    expect(werte["rechnung.datum"]).toBe("15.09.2026");
    expect(werte["rechnung.faellig"]).toBe("29.09.2026");
    // Summe abzüglich Anzahlung
    expect(werte["mahnung.betrag"]).toBe("467,50");
    expect(werte["mahnung.frist"]).toBe(
      dayjs().add(14, "day").format("DD.MM.YYYY"),
    );
    expect(werte["betrieb.name"]).toBe("Augenoptik Ulm");
    expect(werte["betrieb.kontakt"]).toContain("info@augenoptik-ulm.de");
    expect(werte["betrieb.bank"]).toContain("IBAN DE11");
    expect(werte["kunde.briefanrede"]).toBe("Sehr geehrte Frau Muster");
  });

  it("kennt alle Platzhalter der Mahntexte", () => {
    const bekannt = Object.keys(mahnungPlatzhalter(daten));
    expect(migrationsTexte).toHaveLength(3);
    for (const vorlage of [...migrationsTexte, ZAHLUNGSERINNERUNG_TEXT]) {
      const platzhalter = [...vorlage.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)].map(
        (treffer) => treffer[1].toLowerCase(),
      );
      expect(platzhalter.length).toBeGreaterThan(5);
      for (const name of platzhalter) expect(bekannt).toContain(name);
    }
  });
});

describe("Mahnung: Brief", () => {
  it("nimmt die erste Zeile als Überschrift, den Rest als Absätze", () => {
    const [erinnerung, mahnung, letzte] = migrationsTexte;
    const titel = (vorlagentext: string) =>
      mahnungText({ ...daten, vorlagentext }).titel;
    expect(titel(erinnerung)).toBe("Freundliche Zahlungserinnerung");
    expect(titel(mahnung)).toBe("1. Mahnung – offene Rechnung");
    expect(titel(letzte)).toBe("2. und letzte Mahnung");

    const { absaetze } = mahnungText({ ...daten, vorlagentext: mahnung });
    expect(absaetze[0]).toBe("Sehr geehrte Frau Muster,");
    expect(absaetze[1]).toBe(
      "trotz Fälligkeit konnten wir bislang keinen Zahlungseingang zu unserer Rechnung 114900 vom 15.09.2026 feststellen.",
    );
    expect(absaetze[2]).toBe(
      "Offener Rechnungsbetrag: 467,50 €\nFällig seit: 29.09.2026",
    );
    expect(absaetze.at(-1)).toContain(
      "Mit freundlichen Grüßen\nAugenoptik Ulm",
    );
  });

  it("nimmt ohne Vorlagentext die Zahlungserinnerung", () => {
    expect(mahnungText({ ...daten, vorlagentext: "" }).titel).toBe(
      "Freundliche Zahlungserinnerung",
    );
  });

  it("druckt den Brief im Briefkopf der Rechnung", () => {
    const html = buildMahnungPrintHtml({
      ...daten,
      vorlagentext: migrationsTexte[1],
    });
    expect(html).toContain("@page { size: A4; margin: 0; }");
    expect(html).toContain('<img class="logo"');
    expect(html).toContain('<div class="absenderzeile">');
    expect(html).toContain(
      '<div class="titelbalken">1. Mahnung – offene Rechnung</div>',
    );
    expect(html).toContain("<div>Frau</div><div>Erika Muster</div>");
    expect(html).toContain("<td>Rech.-Nr.</td><td>114900</td>");
    expect(html).toContain("<td>Kd.-Nr.</td><td>10001</td>");
    expect(html).toContain("Offener Rechnungsbetrag: 467,50 €<br />");
    expect(html).toContain("Bankverbindung:");
    // kein Dank für den Kauf und keine Bewertungs-Einladung auf Mahnungen
    expect(html).not.toContain("Vielen Dank für Ihr Vertrauen, das Sie uns");
    expect(html).not.toContain('class="bewertung"');
    expect(html).not.toContain("{{");
    expect(html).toContain(
      "<title>1. Mahnung – offene Rechnung 114900</title>",
    );
  });

  it("setzt Daten und Vorlagentext als Text ein, nicht als HTML", () => {
    const html = buildMahnungPreviewHtml({
      entities: {
        ...entities,
        kunde: { ...entities.kunde, Nachname: "<b>Muster</b>" },
      },
      rechnungsnummer: "114900",
      vorlagentext: "Titel <i>x</i>\n\n{{kunde.briefanrede}},",
    });
    expect(html).toContain("Sehr geehrte Frau &lt;b&gt;Muster&lt;/b&gt;,");
    expect(html).toContain("Titel &lt;i&gt;x&lt;/i&gt;");
    expect(html).not.toContain("<b>Muster</b>");
  });
});
