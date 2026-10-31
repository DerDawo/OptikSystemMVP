import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import {
  erkenneAuge,
  erstelleFundusberichtPdf,
  fehlendeAngaben,
  leererAugenbefund,
  schlechtesterStatus,
  type Augenbefund,
  type FundusberichtDaten,
} from "./fundusbericht";

const PNG_1X1 = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  ),
  (c) => c.charCodeAt(0),
);

const fertig = (): Augenbefund => {
  const b = leererAugenbefund();
  b.qualitaet = "gut";
  (["papille", "makula", "gefaesse", "netzhaut"] as const).forEach((id) => {
    b.bereiche[id] = { status: "nicht_beurteilbar", text: "Text" };
  });
  return b;
};

const daten = (): FundusberichtDaten => ({
  praxis: { firma: "Praxis", marke: "Marke", adresse: "Weg 1, 00000 Ort" },
  patientennummer: "1",
  patient: "Muster, Test",
  geburtsdatum: "",
  untersuchung: "31.10.2026 10:00",
  untersucher: "Prüfer",
  methode: "",
  geraet: "",
  bilder: { OD: { bytes: PNG_1X1, typ: "image/png" } },
  befund: { OS: leererAugenbefund(), OD: fertig() },
  seitenvergleich: "",
  gesamtbeurteilung: "Gesamt",
  empfehlung: "",
});

describe("erkenneAuge", () => {
  it("erkennt die Seite aus dem Dateinamen", () => {
    expect(erkenneAuge("Fundus_rechts.jpg")).toBe("OD");
    expect(erkenneAuge("2026-10-31 OS.png")).toBe("OS");
    expect(erkenneAuge("links.jpeg")).toBe("OS");
    expect(erkenneAuge("right-eye.jpg")).toBe("OD");
  });
  it("rät nicht, wenn es unklar ist", () => {
    expect(erkenneAuge("Fundus.jpg")).toBeNull();
    expect(erkenneAuge("OD_OS.jpg")).toBeNull();
    expect(erkenneAuge("Oskar.jpg")).toBeNull();
  });
});

describe("schlechtesterStatus", () => {
  it("nimmt den kritischsten Status beider Augen", () => {
    const os = fertig();
    os.bereiche.makula.status = "kontrolle";
    expect(schlechtesterStatus({ OS: os, OD: fertig() })).toBe("kontrolle");
    expect(
      schlechtesterStatus({ OS: leererAugenbefund(), OD: leererAugenbefund() }),
    ).toBe("");
  });
});

describe("fehlendeAngaben", () => {
  it("verlangt Bewertung, Untersucher und Prüfung", () => {
    const befund = { OS: leererAugenbefund(), OD: leererAugenbefund() };
    const fehlt = fehlendeAngaben(["OD"], befund, "", false);
    expect(fehlt).toContain("Bildqualität OD");
    expect(fehlt).toContain("Papille OD");
    expect(fehlt).toContain("Untersucher");
    expect(fehlt).toContain("Bestätigung der Prüfung");
    expect(fehlt.join()).not.toContain("OS");
  });
  it("ist leer, wenn alles da ist", () => {
    const befund = { OS: leererAugenbefund(), OD: fertig() };
    expect(fehlendeAngaben(["OD"], befund, "Prüfer", true)).toEqual([]);
  });
  it("braucht mindestens ein Bild", () => {
    const befund = { OS: leererAugenbefund(), OD: leererAugenbefund() };
    expect(fehlendeAngaben([], befund, "Prüfer", true)).toEqual([
      "mindestens eine Fundusaufnahme",
    ]);
  });
});

describe("erstelleFundusberichtPdf", () => {
  it("erzeugt zwei A4-Seiten", async () => {
    const pdf = await PDFDocument.load(await erstelleFundusberichtPdf(daten()));
    expect(pdf.getPageCount()).toBe(2);
    expect(Math.round(pdf.getPage(0).getHeight())).toBe(842);
  });
  it("bricht langen Text auf weitere Seiten um", async () => {
    const d = daten();
    d.gesamtbeurteilung = "Sehr langer Befundtext mit Umlauten äöü ß − ".repeat(
      300,
    );
    const pdf = await PDFDocument.load(await erstelleFundusberichtPdf(d));
    expect(pdf.getPageCount()).toBeGreaterThan(2);
  });
});
