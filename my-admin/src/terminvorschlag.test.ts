import dayjs from "dayjs";
import { describe, expect, it } from "vitest";
import {
  terminZeile,
  terminvorschlagText,
  ueberschneidet,
  vorgabeZeit,
} from "./terminvorschlag";

describe("terminZeile", () => {
  it("schreibt Wochentag, Datum und Uhrzeit aus", () => {
    expect(terminZeile("2026-11-25T10:00")).toBe(
      "Mittwoch, 25.11. um 10:00 Uhr",
    );
  });
});

describe("vorgabeZeit", () => {
  it("überspringt das Wochenende", () => {
    const freitag = dayjs("2026-11-27T15:00");
    expect(vorgabeZeit(0, freitag)).toBe("2026-11-30T10:00");
    expect(vorgabeZeit(1, freitag)).toBe("2026-12-01T10:00");
  });
});

describe("ueberschneidet", () => {
  const d = (s: string) => new Date(s);
  it("erkennt Überschneidungen, nicht aber direkt anschließende Termine", () => {
    expect(
      ueberschneidet(
        d("2026-11-25T10:00"),
        d("2026-11-25T10:30"),
        d("2026-11-25T10:15"),
        d("2026-11-25T11:00"),
      ),
    ).toBe(true);
    expect(
      ueberschneidet(
        d("2026-11-25T10:00"),
        d("2026-11-25T10:30"),
        d("2026-11-25T10:30"),
        d("2026-11-25T11:00"),
      ),
    ).toBe(false);
  });
});

describe("terminvorschlagText", () => {
  it("mehrere Zeiten, sortiert, mit Anrede und Terminart", () => {
    const text = terminvorschlagText({
      kunde: { Anrede: "Frau", Nachname: "Koch" },
      art: "Sehtest",
      zeiten: ["2026-11-26T14:30", "2026-11-25T10:00", ""],
      firma: "Augenoptik Ulm",
    });
    expect(text).toBe(
      [
        "Sehr geehrte Frau Koch,",
        "",
        "gerne schlagen wir Ihnen für Ihren Termin „Sehtest“ folgende Zeiten vor:",
        "",
        "• Mittwoch, 25.11. um 10:00 Uhr",
        "• Donnerstag, 26.11. um 14:30 Uhr",
        "",
        "Bitte antworten Sie kurz, welcher Termin Ihnen am besten passt.",
        "",
        "Viele Grüße",
        "Augenoptik Ulm",
      ].join("\n"),
    );
  });

  it("eine Zeit, ohne Anrede", () => {
    const text = terminvorschlagText({
      kunde: null,
      art: "",
      zeiten: ["2026-11-25T10:00"],
      firma: "Augenoptik Ulm",
    });
    expect(text).toContain("Guten Tag,");
    expect(text).toContain("folgende Zeit vor:");
    expect(text).toContain("ob Ihnen der Termin passt");
  });
});
