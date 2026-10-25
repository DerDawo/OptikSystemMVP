// Erzeugt public/formulare/abholbestaetigung.pdf: "Abholbestätigung mit
// Schuldanerkenntnis" mit Formularfeldern in den Tabellenzellen und auf den
// Linien im Text, Kästchen statt "☐" bei der Ratenzahlung. Das Layout
// bleibt unverändert; pdfFormulare.ts füllt Kunde, Auftrag und Beträge vor,
// alle Felder bleiben im PDF-Viewer änderbar.
//
//   node scripts/abholbestaetigung-felder.mjs <vorlage.pdf>
//
// Koordinaten in pt von unten links (A4), aus der Vorlage ausgelesen.
import { readFileSync, writeFileSync } from "node:fs";
import {
  PDFDocument,
  PDFName,
  StandardFonts,
  TextAlignment,
  rgb,
} from "pdf-lib";

const [quelle] = process.argv.slice(2);
if (!quelle) throw new Error("Pfad zur Vorlage angeben");

const pdf = await PDFDocument.load(readFileSync(quelle));
const seite = pdf.getPage(0);
const form = pdf.getForm();
const schrift = await pdf.embedFont(StandardFonts.Helvetica);

const feld = (name, x1, x2, y, hoehe, ausrichtung) => {
  const f = form.createTextField(name);
  f.addToPage(seite, {
    x: x1,
    y,
    width: x2 - x1,
    height: hoehe,
    borderWidth: 0,
    font: schrift,
  });
  if (ausrichtung) f.setAlignment(ausrichtung);
  f.setFontSize(9);
  // ohne Hintergrund und Rahmen (Linien/Zellen der Vorlage bleiben sichtbar)
  for (const w of f.acroField.getWidgets()) {
    const mk = w.getAppearanceCharacteristics();
    mk?.dict.delete(PDFName.of("BG"));
    mk?.dict.delete(PDFName.of("BC"));
  }
};

// Tabellenzeile: Wertespalte von x1 bis zum rechten Tabellenrand
const ZEILE = 19.276;
const RECHTS = 541.2;
const tabelle = (oben, x1, namen, rechtsbuendig = []) =>
  namen.forEach((name, i) =>
    feld(
      name,
      x1 + 3,
      RECHTS,
      oben - (i + 1) * ZEILE + 3,
      ZEILE - 6,
      rechtsbuendig.includes(name) ? TextAlignment.Right : undefined,
    ),
  );

// Linie im Text (x von/bis, Grundlinie)
const linie = (name, x1, x2, grundlinie, mitte = true) =>
  feld(
    name,
    x1,
    x2,
    grundlinie - 2,
    11,
    mitte ? TextAlignment.Center : undefined,
  );

tabelle(736.9, 243.8, [
  "name",
  "geburtsdatum",
  "anschrift",
  "telefon_email",
  "ausweis",
]);
tabelle(622.5, 243.8, [
  "auftragsnummer",
  "auftragsdatum",
  "abgabedatum",
  "leistung",
]);
const BETRAEGE = ["gesamtpreis", "kassenanteil", "anzahlung", "offener_betrag"];
tabelle(527.4, 277.8, BETRAEGE, BETRAEGE);

linie("anzahlung_datum", 165.6, 216.0, 475.8);
linie("ziel_tag", 218.9, 243.6, 438.1);
linie("ziel_monat", 251.3, 276.0, 438.1);
linie("ziel_jahr", 294.2, 318.7, 438.1);
linie("iban", 56.9, 184.1, 427.7, false);
linie("raten_anzahl", 306.2, 322.6, 306.5);
linie("raten_betrag", 427.4, 460.3, 306.5);
linie("raten_tag", 56.9, 73.2, 296.1);
linie("raten_beginn", 191.8, 249.1, 296.1);
linie("ort_datum", 95.0, 179.0, 144.3);

// Kästchen statt "☐" bei der Ratenzahlung
seite.drawRectangle({
  x: 246.5,
  y: 304.5,
  width: 10,
  height: 10,
  color: rgb(1, 1, 1),
});
const raten = form.createCheckBox("cb_ratenzahlung");
raten.addToPage(seite, {
  x: 247.3,
  y: 305.3,
  width: 8.2,
  height: 8.2,
  borderWidth: 0.8,
  borderColor: rgb(0.2, 0.2, 0.2),
});

form.updateFieldAppearances(schrift);
const ziel = new URL(
  "../public/formulare/abholbestaetigung.pdf",
  import.meta.url,
);
writeFileSync(ziel, await pdf.save());
console.log(
  `geschrieben: ${ziel.pathname} (${form.getFields().length} Felder)`,
);
