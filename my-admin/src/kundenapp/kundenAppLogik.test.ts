import dayjs from "dayjs";
import { describe, expect, it } from "vitest";
import {
  brillenStatus,
  einladungsLink,
  einladungsText,
  geburtsdatumLesen,
  geburtsdatumTippen,
  kanaeleAusText,
  kommendeTermine,
  kundenRechnungen,
  laufendeAuftraege,
  linsenStatus,
  schluesselAusHash,
  type PortalDaten,
} from "./kundenAppLogik";

const heute = dayjs("2026-11-22T10:00:00");
const S = "a".repeat(64);

const leer: PortalDaten = {
  betrieb: null,
  kunde: null,
  termine: [],
  anfragen: [],
  brillen: [],
  kontaktlinsen: [],
  nachrichten: [],
};

describe("Link", () => {
  it("setzt den Schlüssel hinter das # und liest ihn wieder", () => {
    const link = einladungsLink("https://x.app/", S);
    expect(link).toBe(`https://x.app/kunde#e=${S}`);
    expect(schluesselAusHash(new URL(link).hash)).toBe(S);
  });

  it("ignoriert fremde oder zu kurze Werte", () => {
    expect(schluesselAusHash("")).toBeNull();
    expect(schluesselAusHash("#e=abc")).toBeNull();
    expect(schluesselAusHash("#e=" + "z".repeat(64))).toBeNull();
  });
});

describe("geburtsdatumLesen", () => {
  it("versteht deutsche und ISO-Schreibweise", () => {
    expect(geburtsdatumLesen("17.04.1998")).toBe("1998-04-17");
    expect(geburtsdatumLesen("7.4.1998")).toBe("1998-04-07");
    expect(geburtsdatumLesen("1998-04-17")).toBe("1998-04-17");
    expect(geburtsdatumLesen("17.04.98")).toBe("1998-04-17");
  });

  it("versteht Eingabe ohne Punkte (Zifferntastatur)", () => {
    expect(geburtsdatumLesen("17041998")).toBe("1998-04-17");
    expect(geburtsdatumLesen("170498")).toBe("1998-04-17");
  });

  it("lehnt unmögliche Daten ab", () => {
    expect(geburtsdatumLesen("31.02.1990")).toBeNull();
    expect(geburtsdatumLesen("31021990")).toBeNull();
    expect(geburtsdatumLesen("1704199")).toBeNull();
    expect(geburtsdatumLesen("abc")).toBeNull();
    expect(geburtsdatumLesen("")).toBeNull();
  });
});

describe("Auftragsstatus", () => {
  it("Brille: angenommen, in Arbeit, abholbereit, abgeholt", () => {
    expect(brillenStatus({ id: 1 }, heute).text).toBe("Auftrag angenommen");
    expect(brillenStatus({ id: 1, Bestellt: "2026-11-20" }, heute).text).toBe(
      "In Arbeit",
    );
    expect(brillenStatus({ id: 1, Fertig: "2026-11-21" }, heute).text).toBe(
      "Abholbereit",
    );
    expect(brillenStatus({ id: 1, Abholung: "2026-11-22" }, heute).text).toBe(
      "Abgeholt",
    );
  });

  it("Kontaktlinsen nur über das Abholdatum", () => {
    expect(linsenStatus({ id: 1 }, heute).text).toBe("In Arbeit");
    expect(linsenStatus({ id: 1, Abholung: "2026-11-25" }, heute).text).toBe(
      "Abholbereit",
    );
    expect(linsenStatus({ id: 1, Abholung: "2026-11-01" }, heute).text).toBe(
      "Abgeholt",
    );
  });

  it("listet nur nicht abgeholte Aufträge", () => {
    const d = {
      ...leer,
      brillen: [
        { id: 1, Abholung: "2026-10-01" },
        { id: 2, Fertig: "2026-11-20", BrillenArt: "Gleitsicht" },
      ],
      kontaktlinsen: [{ id: 3 }],
    };
    expect(laufendeAuftraege(d, heute).map((a) => a.id)).toEqual([2, 3]);
  });
});

describe("kundenRechnungen", () => {
  it("nimmt nur Aufträge mit Rechnungsnummer und rechnet den offenen Betrag", () => {
    const d: PortalDaten = {
      ...leer,
      brillen: [
        { id: 1, Summe: 100 },
        {
          id: 2,
          Rechnungsnummer: "R-2",
          Datum: "2026-10-01",
          Summe: 450,
          Restbetrag: 150,
          Zahlungsstatus: "teilweise offen",
        },
        {
          id: 3,
          Rechnungsnummer: "R-3",
          Datum: "2026-11-01",
          Summe: 200,
          Anzahlung: 50,
          Zahlungsstatus: "bezahlt",
        },
      ],
      kontaktlinsen: [
        {
          id: 4,
          Rechnungsnummer: "R-4",
          Datum: "2026-09-01",
          Summe: 80,
          Anzahlung: 30,
        },
      ],
    };
    const r = kundenRechnungen(d);
    expect(r.map((x) => x.nummer)).toEqual(["R-3", "R-2", "R-4"]);
    expect(r[0]).toMatchObject({ offen: 0, statusText: "Bezahlt" });
    expect(r[1]).toMatchObject({ offen: 150, statusText: "Teilweise bezahlt" });
    expect(r[2]).toMatchObject({
      offen: 50,
      statusText: "Offen",
      art: "Kontaktlinsen",
    });
  });
});

describe("Termine", () => {
  it("zeigt kommende Termine zuerst nach Datum", () => {
    const d = {
      ...leer,
      termine: [
        { id: 1, Start: "2026-12-05T09:00:00Z", Ende: "2026-12-05T09:30:00Z" },
        { id: 2, Start: "2026-11-01T09:00:00Z", Ende: "2026-11-01T09:30:00Z" },
        { id: 3, Start: "2026-11-30T09:00:00Z", Ende: "2026-11-30T09:30:00Z" },
      ],
    };
    expect(kommendeTermine(d, heute.toDate()).map((t) => t.id)).toEqual([3, 1]);
  });
});

describe("Einwilligung und Einladung", () => {
  it("liest Kanäle aus dem Freitext", () => {
    expect(
      kanaeleAusText("Angebote per E-Mail, WhatsApp (Kunden-App)"),
    ).toEqual(["E-Mail", "WhatsApp"]);
    expect(kanaeleAusText("Newsletter, Sonderangebote")).toEqual(["E-Mail"]);
    expect(kanaeleAusText(null)).toEqual([]);
  });

  it("schreibt eine persönliche Einladung mit Link", () => {
    const t = einladungsText(
      { Anrede: "Frau", Nachname: "Schneider" },
      "https://x/kunde#e=1",
      "Sehzentrum",
    );
    expect(t).toContain("Liebe Frau Schneider,");
    expect(t).toContain("https://x/kunde#e=1");
    expect(t).toContain("Geburtsdatum");
  });
});

describe("geburtsdatumTippen", () => {
  it("setzt die Punkte beim Tippen von Ziffern", () => {
    expect(geburtsdatumTippen("1")).toBe("1");
    expect(geburtsdatumTippen("17")).toBe("17");
    expect(geburtsdatumTippen("170")).toBe("17.0");
    expect(geburtsdatumTippen("1704")).toBe("17.04");
    expect(geburtsdatumTippen("17041")).toBe("17.04.1");
    expect(geburtsdatumTippen("17041998")).toBe("17.04.1998");
  });

  it("lässt sich mit Rücktaste über einen Punkt löschen", () => {
    expect(geburtsdatumTippen("17.")).toBe("17");
    expect(geburtsdatumTippen("17.04.")).toBe("17.04");
  });

  it("schneidet überzählige Ziffern ab und behandelt eigene Punkte", () => {
    expect(geburtsdatumTippen("170419981")).toBe("17.04.1998");
    expect(geburtsdatumTippen("17.04.1998")).toBe("17.04.1998");
  });

  it("lässt ISO-Schreibweise und Text unverändert", () => {
    expect(geburtsdatumTippen("1998-04-17")).toBe("1998-04-17");
    expect(geburtsdatumTippen("abc")).toBe("abc");
  });
});
