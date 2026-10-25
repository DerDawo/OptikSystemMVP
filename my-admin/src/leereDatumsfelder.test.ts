import { describe, expect, it } from "vitest";
import { leereDatumsfelderZuNull } from "./leereDatumsfelder";

describe("leereDatumsfelderZuNull", () => {
  it("macht leere Datumsfelder zu null, andere Felder bleiben", () => {
    expect(
      leereDatumsfelderZuNull({
        Nachname: "Muster",
        Geburtsdatum: "",
        VersichertenkarteGueltigBis: "",
        Aufnahmedatum: "2026-10-01",
        Notizen: "",
      }),
    ).toEqual({
      Nachname: "Muster",
      Geburtsdatum: null,
      VersichertenkarteGueltigBis: null,
      Aufnahmedatum: "2026-10-01",
      Notizen: "",
    });
  });

  it("lässt Daten ohne leere Datumsfelder unverändert", () => {
    const daten = { Datum: "2026-10-12", Notizen: "" };
    expect(leereDatumsfelderZuNull(daten)).toBe(daten);
    expect(leereDatumsfelderZuNull(undefined)).toBeUndefined();
  });
});
