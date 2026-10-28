import { describe, expect, it } from "vitest";
import {
  formatGroesse,
  pruefeDatei,
  schlageArtVor,
  sichererDateiname,
  speicherPfad,
  zielGroesse,
} from "./kundeDokumenteSpeicher";

describe("Dokumente in der Kundenkartei", () => {
  it("schlägt die Art aus dem Dateinamen vor", () => {
    expect(schlageArtVor("Fundus_rechts.jpg")).toBe("Fundusaufnahme");
    expect(schlageArtVor("OCT Makula 2026.pdf")).toBe("Fundusaufnahme");
    expect(schlageArtVor("Befund Dr. Meier.pdf")).toBe("Befund");
    expect(schlageArtVor("Rezept_2026-10.pdf")).toBe("Rezept");
    expect(schlageArtVor("Arztbrief.pdf")).toBe("Arztbrief");
    expect(schlageArtVor("Kostenübernahme AOK.pdf")).toBe("Kostenzusage");
    expect(schlageArtVor("Gutachten Kinderoptometrie.pdf")).toBe("Formular");
    expect(schlageArtVor("IMG_0042.jpg")).toBe("Sonstiges");
  });

  it("erlaubt nur PDF und Bilder bis 25 MB", () => {
    const ok = { name: "a.pdf", type: "application/pdf", size: 1000 };
    expect(pruefeDatei(ok)).toBeNull();
    expect(pruefeDatei({ ...ok, type: "image/jpeg" })).toBeNull();
    expect(pruefeDatei({ ...ok, type: "text/html" })).toMatch(/Nur PDF/);
    expect(pruefeDatei({ ...ok, size: 26 * 1024 * 1024 })).toMatch(/25 MB/);
    expect(pruefeDatei({ ...ok, size: 0 })).toMatch(/leer/);
  });

  it("macht Dateinamen für den Speicher sicher", () => {
    expect(sichererDateiname("Befund Müller (rechts).PDF")).toBe(
      "Befund_Muller_rechts.pdf",
    );
    expect(sichererDateiname("Straße ß.jpg")).toBe("Strasse_ss.jpg");
    expect(sichererDateiname("../../etc/passwd")).toBe("passwd");
    expect(sichererDateiname("C:\\Users\\x\\Befund.pdf")).toBe("Befund.pdf");
    expect(sichererDateiname("...")).toBe("dokument");
    expect(sichererDateiname("ohne-endung")).toBe("ohne-endung");
  });

  it("legt den Pfad unter der Kunden-ID ab", () => {
    expect(speicherPfad(42, "Fundus links.jpg", "abc")).toBe(
      "42/abc-Fundus_links.jpg",
    );
  });

  it("verkleinert Bilder auf höchstens 2000 px Kantenlänge", () => {
    expect(zielGroesse(4000, 3000)).toEqual({ breite: 2000, hoehe: 1500 });
    expect(zielGroesse(3000, 4000)).toEqual({ breite: 1500, hoehe: 2000 });
    expect(zielGroesse(1200, 800)).toEqual({ breite: 1200, hoehe: 800 });
    expect(zielGroesse(10000, 1)).toEqual({ breite: 2000, hoehe: 1 });
  });

  it("formatiert Dateigrößen", () => {
    expect(formatGroesse(512)).toBe("512 B");
    expect(formatGroesse(380 * 1024)).toBe("380 KB");
    expect(formatGroesse(1.5 * 1024 * 1024)).toBe("1,5 MB");
    expect(formatGroesse(null)).toBe("");
  });
});
