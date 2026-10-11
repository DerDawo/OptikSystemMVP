import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderMessageTemplate } from "./nachrichtenPlatzhalter";

const kunde = {
  id: "7",
  anrede: "Frau",
  vorname: "Erika",
  nachname: "Muster",
  fullName: "Erika Muster",
  email: "erika@example.com",
  phoneNumber: "0170 1234567",
};

describe("renderMessageTemplate", () => {
  it("ersetzt Kunden-, Betriebs- und Terminplatzhalter", () => {
    const text = renderMessageTemplate(
      "Hallo {Vorname}, Termin am {Termindatum} um [Terminuhrzeit] Uhr bei {{Optiker}}, Tel. {OptikerTelefon}.",
      kunde,
      { Start: "2026-10-20T09:30:00" },
    );
    expect(text).toBe(
      "Hallo Erika, Termin am 20.10.2026 um 09:30 Uhr bei Augenoptik Ulm, Tel. 0365 - 710 35 70.",
    );
  });

  it("zeigt ohne Termin, was noch einzutragen ist", () => {
    expect(
      renderMessageTemplate("am {Termindatum} um {Terminuhrzeit}", kunde),
    ).toBe("am (Datum) um (Uhrzeit)");
  });

  it("hinterlässt bei fehlender Anrede keine doppelten Leerzeichen", () => {
    expect(
      renderMessageTemplate("Guten Tag {Anrede} {Nachname},", {
        ...kunde,
        anrede: "",
      }),
    ).toBe("Guten Tag Muster,");
  });
});

describe("SMS-Vorlagen der Migration", () => {
  const sql = readFileSync(
    new URL(
      "../../supabase/migrations/20261011130000_seed_nachrichten_sms_vorlagen.sql",
      import.meta.url,
    ),
    "utf8",
  );
  const texte = [...sql.matchAll(/\(\s*'([^']+)',\s*'([^']+)'\s*\)/g)];

  it("enthält die sechs Vorlagen", () => {
    expect(texte.map((t) => t[1])).toEqual([
      "Brille fertig (Abholung)",
      "Kontaktlinsen / Pflegemittel abholbereit",
      "Terminerinnerung Sehtest / Beratung",
      "Brillengläser da – bitte um Rückruf",
      "Rechnung per WhatsApp nachgesendet",
      "Bitte um Rückruf (allgemein)",
    ]);
  });

  it.each(texte.map((t) => [t[1], t[2]]))(
    "%s: alle Platzhalter werden ersetzt",
    (_, vorlage) => {
      const text = renderMessageTemplate(vorlage, kunde, {
        Start: "2026-10-20T09:30:00",
      });
      expect(text).not.toMatch(/[{}[\]]/);
      expect(text).toContain("Augenoptik Ulm");
    },
  );
});
