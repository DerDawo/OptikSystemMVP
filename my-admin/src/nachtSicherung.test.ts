import { describe, expect, it } from "vitest";
import { sicherungsAnzeige, zeitpunkt } from "./nachtSicherung";

const jetzt = new Date("2026-11-22T19:00:00Z"); // 20:00 Uhr in Berlin

const lauf = (zeit: string, ergebnis: string | null, status = "completed") => ({
  zeit,
  fertig: status === "completed" ? zeit : null,
  status,
  ergebnis,
  vonHand: false,
});

describe("Nächtliche Sicherung", () => {
  it("nennt heute, gestern und ältere Tage verständlich", () => {
    expect(zeitpunkt("2026-11-22T07:05:00Z", jetzt)).toBe("heute 08:05 Uhr");
    expect(zeitpunkt("2026-11-21T07:05:00Z", jetzt)).toBe("gestern 08:05 Uhr");
    expect(zeitpunkt("2026-11-18T07:05:00Z", jetzt)).toBe(
      "18.11.2026 08:05 Uhr",
    );
  });

  it("zeigt grün, wenn die letzte Sicherung frisch und erfolgreich ist", () => {
    const l = lauf("2026-11-22T07:05:00Z", "success");
    const a = sicherungsAnzeige({ letzte: l, letzteErfolgreiche: l }, jetzt);
    expect(a.ampel).toBe("success");
    expect(a.text).toContain("heute 08:05 Uhr");
    expect(a.laeuft).toBe(false);
  });

  it("warnt, wenn die letzte erfolgreiche Sicherung älter als ein Tag ist", () => {
    const l = lauf("2026-11-20T07:05:00Z", "success");
    const a = sicherungsAnzeige({ letzte: l, letzteErfolgreiche: l }, jetzt);
    expect(a.ampel).toBe("warning");
    expect(a.text).toContain("länger als einen Tag");
  });

  it("zeigt rot bei einem Fehlschlag und nennt die letzte gute Sicherung", () => {
    const a = sicherungsAnzeige(
      {
        letzte: lauf("2026-11-22T07:05:00Z", "failure"),
        letzteErfolgreiche: lauf("2026-11-21T07:05:00Z", "success"),
      },
      jetzt,
    );
    expect(a.ampel).toBe("error");
    expect(a.text).toContain("fehlgeschlagen");
    expect(a.text).toContain("gestern 08:05 Uhr");
  });

  it("meldet eine laufende Sicherung", () => {
    const a = sicherungsAnzeige(
      {
        letzte: lauf("2026-11-22T18:58:00Z", null, "in_progress"),
        letzteErfolgreiche: null,
      },
      jetzt,
    );
    expect(a.ampel).toBe("info");
    expect(a.laeuft).toBe(true);
  });

  it("warnt, wenn es noch gar keine Sicherung gibt", () => {
    const a = sicherungsAnzeige(
      { letzte: null, letzteErfolgreiche: null },
      jetzt,
    );
    expect(a.ampel).toBe("warning");
  });
});
