// Erzeugt public/formulare/erprobungsbericht-lupe.pdf: der "Bericht über die
// Erprobung einer vergrößernden Sehhilfe" (elektronische Lupe, Vorbereitung
// Muster 8A) mit Formularfeldern auf den Linien und Kästchen statt "[ ]".
// Das Layout bleibt unverändert; pdfFormulare.ts füllt die Felder vor, alle
// bleiben im PDF-Viewer änderbar.
//
//   node scripts/erprobungsbericht-lupe-felder.mjs <vorlage.pdf>
//
// Koordinaten in pt von unten links (Grundlinie der Linien bzw. "[ ]" aus
// der Vorlage ausgelesen; US-Letter 612 x 792).
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
const UNTERSTRICH = schrift.widthOfTextAtSize("_", 10);

// Textfeld auf einer Unterstrich-Linie (x, Grundlinie, Anzahl Zeichen)
const linie = (name, x, grundlinie, zeichen, mitte = false) => {
  const feld = form.createTextField(name);
  feld.addToPage(seite, {
    x,
    y: grundlinie - 2,
    width: zeichen * UNTERSTRICH,
    height: 13,
    borderWidth: 0,
    font: schrift,
  });
  if (mitte) feld.setAlignment(TextAlignment.Center);
  feld.setFontSize(10);
  // ohne Hintergrund und Rahmen, damit die Linie der Vorlage sichtbar bleibt
  for (const widget of feld.acroField.getWidgets()) {
    const mk = widget.getAppearanceCharacteristics();
    mk?.dict.delete(PDFName.of("BG"));
    mk?.dict.delete(PDFName.of("BC"));
  }
};

// Kästchen an Stelle von "[ ]" (x = Anfang der Klammer, Grundlinie)
const kaestchen = (name, x, grundlinie) => {
  const breite = schrift.widthOfTextAtSize("[ ]", 10);
  // "[ ]" der Vorlage weiß überdecken, darüber ein Kästchen mit Rahmen
  seite.drawRectangle({
    x: x - 0.5,
    y: grundlinie - 2.5,
    width: breite + 1,
    height: 11,
    color: rgb(1, 1, 1),
  });
  const feld = form.createCheckBox(name);
  feld.addToPage(seite, {
    x: x + breite / 2 - 4.5,
    y: grundlinie - 1.5,
    width: 9,
    height: 9,
    borderWidth: 0.8,
    borderColor: rgb(0.2, 0.2, 0.2),
  });
};

// 1. Stammdaten
linie("name", 177, 617, 44);
linie("geburtsdatum", 177, 595, 44);
linie("kasse_ik", 177, 573, 44);
// 2. Messwerte
linie("fern_od", 227, 488, 9, true);
linie("fern_os", 402, 488, 9, true);
linie("nah_od", 227, 468, 9, true);
linie("nah_os", 402, 468, 9, true);
linie("vergroesserung", 227, 447, 8, true);
// 3. Indikationsprüfung
kaestchen("cb_6fach", 66, 385);
kaestchen("cb_optisch", 66, 367);
kaestchen("cb_kontrast", 66, 335);
// 4. Versorgungsempfehlung
kaestchen("cb_handlupe", 187, 274);
kaestchen(
  "cb_bildschirm",
  187 +
    schrift.widthOfTextAtSize("[ ] Elektronisch vergrößernde Handlupe / ", 10),
  274,
);
linie("modell", 187, 251, 59);
linie("display_zoll", 187, 228, 7, true);
linie("hmv", 187 + schrift.widthOfTextAtSize("25.21.86.", 10), 205, 18);
// 5. Bestätigung
linie("ort_datum", 47, 76, 36);

form.updateFieldAppearances(schrift);
const ziel = new URL(
  "../public/formulare/erprobungsbericht-lupe.pdf",
  import.meta.url,
);
writeFileSync(ziel, await pdf.save());
console.log(
  `geschrieben: ${ziel.pathname} (${form.getFields().length} Felder)`,
);
