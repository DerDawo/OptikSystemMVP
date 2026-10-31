import { describe, expect, it } from "vitest";
import { loeschSperre } from "./auftragLoeschen";

describe("loeschSperre", () => {
  it("erlaubt leere und offene Aufträge", () => {
    expect(loeschSperre({})).toBeNull();
    expect(loeschSperre({ Summe: 0, Zahlungsstatus: "bezahlt" })).toBeNull();
    expect(loeschSperre({ Summe: 300, Zahlungsstatus: "offen" })).toBeNull();
  });

  it("sperrt abgerechnete oder bezahlte Aufträge", () => {
    expect(loeschSperre({ Rechnungsnummer: "R-12" })).toContain("R-12");
    expect(loeschSperre({ Anzahlung: 50 })).toContain("Anzahlung");
    expect(loeschSperre({ Summe: 300, Zahlungsstatus: "bezahlt" })).toContain(
      "bezahlt",
    );
  });
});
