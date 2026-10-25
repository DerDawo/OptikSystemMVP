import dayjs from "dayjs";
import { describe, expect, it } from "vitest";
import {
  filtereSchuldner,
  summeOffen,
  tageOffen,
  type Schuldner,
} from "./schuldnerliste";

const z = (teil: Partial<Schuldner>): Schuldner => ({
  id: 1,
  kunde_id: null,
  Datum: "2026-09-21",
  Kunde: "Anett Burgold",
  Ort: "07548 Gera",
  Beleg: "Werkstattauftrag",
  AuftragsNr: "B49544",
  KundenNr: "K21008",
  Zahlart: "Privat",
  Offen: "527.50",
  Bemerkung: "Gleitsichtbrille",
  BezahltAm: null,
  ...teil,
});

describe("Schuldnerliste", () => {
  it("summiert die offenen Beträge (auch als Text) ohne Rundungsfehler", () => {
    expect(
      summeOffen([
        z({ Offen: "527.50" }),
        z({ Offen: 0.1 }),
        z({ Offen: 0.2 }),
      ]),
    ).toBe(527.8);
    expect(summeOffen([])).toBe(0);
  });

  it("zählt die Tage seit dem Belegdatum", () => {
    expect(tageOffen("2026-09-21", dayjs("2026-10-25"))).toBe(34);
    expect(tageOffen(null)).toBe(0);
    expect(tageOffen("2026-12-01", dayjs("2026-10-25"))).toBe(0);
  });

  it("filtert nach Kunde, Nummer und Bemerkung", () => {
    const liste = [
      z({}),
      z({
        id: 2,
        Kunde: "Dieter Brose",
        AuftragsNr: "B49582",
        Bemerkung: "PC-Brille",
      }),
    ];
    expect(filtereSchuldner(liste, "brose")).toHaveLength(1);
    expect(filtereSchuldner(liste, "b49544")).toHaveLength(1);
    expect(filtereSchuldner(liste, "pc-")).toHaveLength(1);
    expect(filtereSchuldner(liste, "  ")).toHaveLength(2);
  });
});
