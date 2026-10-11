import { describe, expect, it, vi } from "vitest";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("./utils", () => ({ supabase: { functions: { invoke } } }));

import { begruendungVorschlagen, kiEingabe } from "./kiBegruendung";

const entities = {
  kunde: {
    Vorname: "Erika",
    Nachname: "Muster",
    Straße: "Hauptstraße",
    Hausnummer: "1",
    Geburtsdatum: "1950-01-01",
    VersichertenNummer: "A123456789",
    KundenNummer: "10042",
    Email: "erika@example.com",
    Tätigkeit: "Rentnerin",
  },
  brille: { BrillenArt: "Lupenbrille", Diagnose: "H35.3 Makuladegeneration" },
  glasRechts: { Sph: 2, Cyl: -0.5, A: 90, Vis: 0.3 },
  glasLinks: { Sph: 2.5, Vis: 0.2 },
};

describe("kiEingabe", () => {
  it("überträgt nur pseudonymisierte Angaben", () => {
    const eingabe = kiEingabe("erprobungsprotokoll", entities);
    const json = JSON.stringify(eingabe);
    for (const geheim of [
      "Erika",
      "Muster",
      "Hauptstraße",
      "1950",
      "A123456789",
      "10042",
      "erika@example.com",
    ]) {
      expect(json).not.toContain(geheim);
    }
    expect(eingabe.alterJahre).toBeGreaterThanOrEqual(76);
    expect(eingabe.diagnose).toBe("H35.3 Makuladegeneration");
    expect(eingabe.rechts).toEqual({
      sph: 2,
      cyl: -0.5,
      achse: 90,
      add: undefined,
      visus: 0.3,
    });
  });
});

describe("begruendungVorschlagen", () => {
  it("gibt den Text der Function zurück", async () => {
    invoke.mockResolvedValueOnce({
      data: { begruendung: "Vorschlag" },
      error: null,
    });
    await expect(
      begruendungVorschlagen("antrag-zuschuss", entities),
    ).resolves.toBe("Vorschlag");
    expect(invoke).toHaveBeenCalledWith("begruendung-vorschlagen", {
      body: expect.objectContaining({ formular: "antrag-zuschuss" }),
    });
  });

  it("reicht die Fehlermeldung der Function weiter", async () => {
    invoke.mockResolvedValueOnce({
      data: null,
      error: {
        context: {
          json: async () => ({
            error: "KI-Vorschläge sind nicht eingerichtet.",
          }),
        },
      },
    });
    await expect(
      begruendungVorschlagen("antrag-zuschuss", entities),
    ).rejects.toThrow("KI-Vorschläge sind nicht eingerichtet.");
  });
});
