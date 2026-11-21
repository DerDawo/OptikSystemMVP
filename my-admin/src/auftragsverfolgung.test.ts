import dayjs from "dayjs";
import { describe, expect, it } from "vitest";
import {
  FRISTEN_VORGABE,
  ansichtFilter,
  auftragsNummer,
  auftragsPhase,
  code39Svg,
  tageSeit,
} from "./auftragsverfolgung";

const heute = dayjs("2026-11-17T10:00:00");

describe("auftragsPhase", () => {
  it("leitet den Stand aus den Datumsfeldern ab", () => {
    expect(auftragsPhase({}, heute)).toBe("offen");
    expect(auftragsPhase({ Bestellt: "2026-11-10" }, heute)).toBe("bestellt");
    expect(
      auftragsPhase({ Bestellt: "2026-11-10", Fertig: "2026-11-15" }, heute),
    ).toBe("fertig");
    expect(
      auftragsPhase({ Fertig: "2026-11-15", Abholung: "2026-11-17" }, heute),
    ).toBe("abgeholt");
  });

  it("wertet ein Abholdatum in der Zukunft als fertig", () => {
    expect(auftragsPhase({ Abholung: "2026-11-20" }, heute)).toBe("fertig");
  });
});

describe("tageSeit", () => {
  it("zählt ganze Kalendertage", () => {
    expect(tageSeit("2026-11-17T08:00:00", heute)).toBe(0);
    expect(tageSeit("2026-11-07", heute)).toBe(10);
    expect(tageSeit(null, heute)).toBeNull();
  });
});

describe("ansichtFilter", () => {
  const zeitraum = { von: "2026-01-01", bis: null };

  it("offene Aufträge: ohne Abholung, ab dem Zeitraum", () => {
    expect(ansichtFilter("offen", FRISTEN_VORGABE, zeitraum, heute)).toEqual({
      resource: "brille",
      filter: { "Datum@gte": "2026-01-01", "Abholung@is": "null" },
    });
  });

  it("überfällige Fertigstellung: Auftrag älter als die Frist", () => {
    const { filter } = ansichtFilter(
      "ueberfaelligFertigung",
      FRISTEN_VORGABE,
      zeitraum,
      heute,
    );
    // Frist 10 Tage: Aufträge bis einschließlich 07.11.
    expect(filter["Datum@lt"]).toBe("2026-11-08");
    expect(filter["Fertig@is"]).toBe("null");
    expect(filter["Abholung@is"]).toBe("null");
  });

  it("überfällige Fertigstellung respektiert ein früheres Bis-Datum", () => {
    const { filter } = ansichtFilter(
      "ueberfaelligFertigung",
      FRISTEN_VORGABE,
      { von: null, bis: "2026-06-30" },
      heute,
    );
    expect(filter["Datum@lt"]).toBe("2026-07-01");
  });

  it("überfällige Abholung: fertig vor der Frist, nicht abgeholt", () => {
    const { filter } = ansichtFilter(
      "ueberfaelligAbholung",
      FRISTEN_VORGABE,
      zeitraum,
      heute,
    );
    expect(filter["Fertig@lte"]).toBe("2026-11-03");
    expect(filter["Abholung@is"]).toBe("null");
  });

  it("Kontaktlinsen: Nachkontrollen bis zur Vorausfrist", () => {
    expect(
      ansichtFilter("clKontakte", FRISTEN_VORGABE, zeitraum, heute),
    ).toEqual({
      resource: "kontaktlinse",
      filter: {
        "Nachkontrolltermin@not.is": "null",
        "Nachkontrolltermin@lte": "2026-12-17",
        "Nachkontrolltermin@gte": "2026-01-01",
      },
    });
  });
});

describe("auftragsNummer", () => {
  it("liest nur Ziffern", () => {
    expect(auftragsNummer("12345")).toBe(12345);
    expect(auftragsNummer("*12345*\n")).toBe(12345);
    expect(auftragsNummer(" Nr. 77 ")).toBe(77);
  });

  it("lehnt Leeres und Unsinn ab", () => {
    expect(auftragsNummer("")).toBeNull();
    expect(auftragsNummer("abc")).toBeNull();
    expect(auftragsNummer("0")).toBeNull();
  });
});

describe("code39Svg", () => {
  it("baut Start, Ziffern und Stopp mit je 5 Strichen", () => {
    const svg = code39Svg("123");
    const striche = svg.match(/M\d+ 0h/g) ?? [];
    // *123* = 5 Zeichen à 5 Striche
    expect(striche).toHaveLength(25);
    // 5 Zeichen à 15 Module + 4 Zwischenräume + 2 x 10 Ruhezone
    expect(svg).toContain('viewBox="0 0 99 1"');
  });

  it("gibt bei ungültiger Nummer nichts aus", () => {
    expect(code39Svg("")).toBe("");
    expect(code39Svg("12a")).toBe("");
  });
});
