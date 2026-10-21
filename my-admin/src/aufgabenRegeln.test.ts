import { describe, expect, it } from "vitest";
import {
  NACHRICHTEN,
  anredeGruss,
  istFertigungsauftrag,
  istGleitsicht,
  sehtestFaellig,
  wannText,
  zuletztBenutzt,
} from "./aufgabenRegeln";
import dayjs from "dayjs";

describe("istFertigungsauftrag", () => {
  it("Brillen ja, Sehtest/Gutschein/Kontaktlinsen nein", () => {
    expect(istFertigungsauftrag("Gleitsichtbrille")).toBe(true);
    expect(istFertigungsauftrag(null)).toBe(true);
    expect(istFertigungsauftrag("Sehüberprüfung")).toBe(false);
    expect(istFertigungsauftrag("sehtest nach ISo 9712")).toBe(false);
    expect(istFertigungsauftrag("Gutschein")).toBe(false);
    expect(istFertigungsauftrag("Beratung")).toBe(false);
    expect(istFertigungsauftrag("Reparatur")).toBe(true);
    expect(istFertigungsauftrag("Umschliff")).toBe(true);
    expect(istFertigungsauftrag("Ersatzbrille")).toBe(true);
    expect(istFertigungsauftrag("Optometrische Refraktion")).toBe(false);
    expect(istFertigungsauftrag("Kontaktlinsenanpassung")).toBe(false);
    expect(istFertigungsauftrag("CL - KK")).toBe(false);
  });
});

describe("istGleitsicht", () => {
  it("erkennt Gleitsicht in allen Schreibweisen", () => {
    expect(istGleitsicht("Gleitsichtbrille VS")).toBe(true);
    expect(istGleitsicht("Sonnenbrille Gleitsicht")).toBe(true);
    expect(istGleitsicht("Fernbrille")).toBe(false);
  });
});

describe("sehtestFaellig", () => {
  it("nimmt nur Kunden ohne neuere Brille, je Kunde einmal", () => {
    const ergebnis = sehtestFaellig(
      [
        { kunde_id: 1, Datum: "2024-10-01" },
        { kunde_id: 1, Datum: "2024-10-05" },
        { kunde_id: 2, Datum: "2024-09-20" },
        { kunde_id: 3, Datum: "2024-10-02" },
        { kunde_id: null, Datum: "2024-10-02" },
      ],
      [{ kunde_id: 3, Datum: "2025-06-01" }],
    );
    expect(ergebnis).toEqual([
      { kundeId: "2", datum: "2024-09-20" },
      { kundeId: "1", datum: "2024-10-05" },
    ]);
  });
});

describe("Nachrichten", () => {
  it("persönliche Anrede, sonst Guten Tag", () => {
    expect(anredeGruss({ Anrede: "Frau", Nachname: "Muster" })).toBe(
      "Sehr geehrte Frau Muster",
    );
    expect(anredeGruss({ Anrede: "Keine Angabe", Nachname: "Muster" })).toBe(
      "Guten Tag",
    );
    expect(NACHRICHTEN.abholen(null, "Optik")).toContain("zur Abholung bereit");
  });
});

describe("zuletztBenutzt", () => {
  it("angelegt und angesehen gemischt, je Kunde das jüngste, neueste zuerst", () => {
    const angelegt = [
      {
        id: 5,
        created_at: "2026-10-14T09:00:00Z",
        last_viewed_at: "2026-10-14T12:00:00Z",
      },
      { id: 4, created_at: "2026-10-14T08:00:00Z" },
    ];
    const angesehen = [
      {
        id: 5,
        created_at: "2026-10-14T09:00:00Z",
        last_viewed_at: "2026-10-14T12:00:00Z",
      },
      {
        id: 1,
        created_at: "2026-10-10T08:00:00Z",
        last_viewed_at: "2026-10-14T10:00:00Z",
      },
    ];
    const ergebnis = zuletztBenutzt(angelegt, angesehen, 10);
    expect(ergebnis.map((e) => [e.kunde.id, e.art])).toEqual([
      [5, "angesehen"],
      [1, "angesehen"],
      [4, "angelegt"],
    ]);
    expect(zuletztBenutzt(angelegt, angesehen, 2)).toHaveLength(2);
  });

  it("Zeitangabe", () => {
    const jetzt = dayjs("2026-10-14T15:00:00");
    expect(wannText("2026-10-14T14:32:00", jetzt)).toBe("heute 14:32");
    expect(wannText("2026-10-13T09:10:00", jetzt)).toBe("gestern 09:10");
    expect(wannText("2026-10-01T09:10:00", jetzt)).toBe("01.10.2026");
  });
});
