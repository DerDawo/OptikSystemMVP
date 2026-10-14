import { describe, expect, it } from "vitest";
import {
  NACHRICHTEN,
  anredeGruss,
  istFertigungsauftrag,
  istGleitsicht,
  sehtestFaellig,
} from "./aufgabenRegeln";

describe("istFertigungsauftrag", () => {
  it("Brillen ja, Sehtest/Gutschein/Kontaktlinsen nein", () => {
    expect(istFertigungsauftrag("Gleitsichtbrille")).toBe(true);
    expect(istFertigungsauftrag(null)).toBe(true);
    expect(istFertigungsauftrag("Sehüberprüfung")).toBe(false);
    expect(istFertigungsauftrag("sehtest nach ISo 9712")).toBe(false);
    expect(istFertigungsauftrag("Gutschein")).toBe(false);
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
