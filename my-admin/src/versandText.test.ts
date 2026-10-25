import { describe, expect, it } from "vitest";
import { versandDateiname, versandNachricht } from "./versandText";

const kunde = { Anrede: "Frau", Vorname: "Doreen", Nachname: "Plötner" };

describe("Versandtext", () => {
  it("nimmt den Kundennamen in den Dateinamen auf", () => {
    expect(versandDateiname("Rechnung", "114918", kunde)).toBe(
      "Rechnung-114918-Plötner-Doreen.pdf",
    );
    expect(versandDateiname("Rechnung", "", null)).toBe("Rechnung.pdf");
  });

  it("schreibt eine persönliche Rechnungs-Mail", () => {
    const { betreff, text } = versandNachricht({
      art: "rechnung",
      titel: "Rechnung",
      nummer: "114918",
      kunde,
    });
    expect(betreff).toContain("Rechnung Nr. 114918");
    expect(text).toContain("Sehr geehrte Frau Plötner,");
    expect(text).toContain("herzlichen Dank");
    expect(text).toContain("Herzliche Grüße");
  });

  it("nennt bei Arbeitgeber-Rechnungen die Mitarbeiterin", () => {
    const { text, betreff } = versandNachricht({
      art: "arbeitgeberRechnung",
      titel: "Rechnung",
      nummer: "1",
      kunde,
    });
    expect(text).toContain("Sehr geehrte Damen und Herren,");
    expect(text).toContain("Doreen Plötner");
    expect(betreff).toContain("Doreen Plötner");
  });
});
