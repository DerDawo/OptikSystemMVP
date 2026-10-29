import { describe, expect, it } from "vitest";
import {
  absageText,
  bestaetigungText,
  einbauCode,
  nachTagen,
  terminText,
  uhrzeit,
} from "./buchungLogik";

const anfrage = {
  id: 1,
  terminart: "Sehtest",
  // 09:00 Berliner Zeit (Winterzeit, UTC+1)
  Start: "2026-11-05T08:00:00+00:00",
  Ende: "2026-11-05T08:30:00+00:00",
  vorname: "Anja",
  nachname: "Muster",
};

describe("Online-Terminbuchung", () => {
  it("zeigt Uhrzeiten in Berliner Zeit", () => {
    expect(uhrzeit(anfrage.Start)).toBe("09:00");
    // Sommerzeit: UTC+2
    expect(uhrzeit("2026-07-01T07:30:00Z")).toBe("09:30");
    expect(terminText(anfrage)).toBe(
      "Donnerstag, 5. November 2026 um 09:00 Uhr",
    );
  });

  it("ordnet freie Zeiten nach Tagen", () => {
    const tage = nachTagen([
      "2026-11-06T08:00:00Z",
      "2026-11-05T13:00:00Z",
      "2026-11-05T08:00:00Z",
      // 23:30 UTC ist in Berlin schon der nächste Tag
      "2026-11-06T23:30:00Z",
    ]);
    expect(tage.map((t) => t.tag)).toEqual([
      "2026-11-05",
      "2026-11-06",
      "2026-11-07",
    ]);
    expect(tage[0].zeiten.map(uhrzeit)).toEqual(["09:00", "14:00"]);
  });

  it("Texte für Bestätigung und Absage", () => {
    const b = bestaetigungText(anfrage, "Augenoptik Ulm");
    expect(b).toContain("Guten Tag Anja Muster,");
    expect(b).toContain(
      "Termin „Sehtest“ am Donnerstag, 5. November 2026 um 09:00 Uhr",
    );
    expect(b).toContain("Ihr Team von Augenoptik Ulm");
    expect(absageText(anfrage, "Augenoptik Ulm")).toContain(
      "Leider können wir den Termin",
    );
  });

  it("Einbau-Code mit Seitenadresse", () => {
    const code = einbauCode("https://optik-system-mvp.vercel.app/buchen");
    expect(code).toContain('src="https://optik-system-mvp.vercel.app/buchen"');
    expect(code).toContain("unicorn-buchung-hoehe");
  });
});
