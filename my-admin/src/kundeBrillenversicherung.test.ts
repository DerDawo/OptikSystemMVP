import { describe, expect, it } from "vitest";
import {
  Brillenversicherung,
  entwurfAus,
  leererEntwurf,
  parseBetrag,
  pruefeEntwurf,
  sortiereVersicherungen,
  versichertePersonText,
  versicherungSummen,
  zeileAusEntwurf,
} from "./kundeBrillenversicherung";

const vertrag = (
  extra: Partial<Brillenversicherung> = {},
): Brillenversicherung => ({
  id: 1,
  created_at: "2026-10-25T08:00:00Z",
  kunde_id: 7,
  VersichertePerson: null,
  Tarif: "BP250",
  Vertragsnummer: null,
  Vertragsbeginn: "2026-09-01",
  Vertragsende: null,
  Verguetung: 7.35,
  Status: "Ausgezahlt",
  Gemeldet: "2026-08-25",
  Abgetreten: false,
  Bemerkung: null,
  ...extra,
});

describe("Brillenversicherungen in der Kundenkartei", () => {
  it("liest Beträge in deutscher und englischer Schreibweise", () => {
    expect(parseBetrag("26,17")).toBe(26.17);
    expect(parseBetrag("26.17")).toBe(26.17);
    expect(parseBetrag("1.234,56")).toBe(1234.56);
    expect(parseBetrag("8,49 €")).toBe(8.49);
    expect(parseBetrag("7")).toBe(7);
    expect(parseBetrag("")).toBeNull();
    expect(parseBetrag("  ")).toBeNull();
    expect(parseBetrag("abc")).toBeNaN();
    expect(parseBetrag("-5")).toBeNaN();
    expect(parseBetrag("7,123")).toBeNaN();
  });

  it("prüft die Eingabe", () => {
    const e = leererEntwurf("2026-10-25");
    expect(pruefeEntwurf(e).Tarif).toMatch(/Tarif/);
    expect(pruefeEntwurf({ ...e, Tarif: "BP250" })).toEqual({});
    expect(
      pruefeEntwurf({ ...e, Tarif: "BP250", Verguetung: "viel" }).Verguetung,
    ).toMatch(/Euro/);
    expect(
      pruefeEntwurf({
        ...e,
        Tarif: "BP250",
        Vertragsbeginn: "2026-09-01",
        Vertragsende: "2026-01-01",
      }).Vertragsende,
    ).toMatch(/Ende/);
  });

  it("macht aus der Eingabe eine Datenbankzeile und zurück", () => {
    const e = {
      ...leererEntwurf("2026-10-25"),
      Tarif: " bp400 ",
      Verguetung: "26,17",
      Vertragsbeginn: "2026-10-01",
      VersichertePerson: "  Hänsel, Leonore ",
    };
    const zeile = zeileAusEntwurf(e);
    expect(zeile).toMatchObject({
      Tarif: "BP400",
      Verguetung: 26.17,
      Vertragsbeginn: "2026-10-01",
      Vertragsende: null,
      VersichertePerson: "Hänsel, Leonore",
      Vertragsnummer: null,
      Status: "Ausstehend",
      Gemeldet: "2026-10-25",
      Abgetreten: false,
    });
    const zurueck = entwurfAus(vertrag({ Verguetung: "26.17" }));
    expect(zurueck.Verguetung).toBe("26,17");
    expect(entwurfAus(vertrag({ Verguetung: null })).Verguetung).toBe("");
  });

  it("summiert ohne Stornierte", () => {
    const liste = [
      vertrag({ id: 1, Verguetung: 7.35, Status: "Ausgezahlt" }),
      vertrag({ id: 2, Verguetung: "26.17", Status: "Ausstehend" }),
      vertrag({ id: 3, Verguetung: 7.14, Status: "Storniert" }),
      vertrag({ id: 4, Verguetung: null, Status: "Ausstehend" }),
    ];
    expect(versicherungSummen(liste)).toEqual({
      anzahl: 4,
      aktiv: 3,
      ausstehend: 26.17,
      ausgezahlt: 7.35,
      storniert: 7.14,
    });
    expect(versicherungSummen([]).anzahl).toBe(0);
  });

  it("sortiert die neuesten Verträge zuerst", () => {
    const liste = [
      vertrag({ id: 1, Vertragsbeginn: "2024-05-01" }),
      vertrag({ id: 2, Vertragsbeginn: "2026-10-01" }),
      vertrag({ id: 3, Vertragsbeginn: null }),
      vertrag({
        id: 4,
        Vertragsbeginn: "2024-05-01",
        created_at: "2026-10-26T00:00:00Z",
      }),
    ];
    expect(sortiereVersicherungen(liste).map((v) => v.id)).toEqual([
      3, 2, 4, 1,
    ]);
  });

  it("zeigt bei leerer versicherter Person den Kunden selbst", () => {
    expect(versichertePersonText(vertrag())).toBe("Kunde selbst");
    expect(
      versichertePersonText(vertrag({ VersichertePerson: " Klotz, Yannic " })),
    ).toBe("Klotz, Yannic");
  });
});
