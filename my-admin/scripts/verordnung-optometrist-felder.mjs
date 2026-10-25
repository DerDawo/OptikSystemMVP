// Erzeugt public/formulare/verordnung-optometrist.pdf: das Vordruck-Formular
// "Optometrische Verordnung" (A4, Blatt mit Kassenzeile, Erklärung des
// Optometristen, Refraktionstabelle F/N und Kostenrechnung) mit
// Formularfeldern über den Kästchen und Zeilen. Stempel und Unterschrift sind
// NICHT im PDF: pdfFormulare.ts setzt die privat gespeicherten Bilder
// (Einstellungen) beim Öffnen in den Kasten "Firmenstempel". Alle Felder
// bleiben im PDF-Viewer änderbar.
//
//   node scripts/verordnung-optometrist-felder.mjs <vorlage.pdf>
//
// Koordinaten in pt, gemessen vom oberen Rand (x, oben, Breite, Höhe); die
// Umrechnung in den PDF-Ursprung unten links macht `oben()`.
import { readFileSync, writeFileSync } from "node:fs";
import { PDFDocument, PDFName, StandardFonts, TextAlignment } from "pdf-lib";

const [quelle] = process.argv.slice(2);
if (!quelle) throw new Error("Pfad zur Vorlage angeben");

const pdf = await PDFDocument.load(readFileSync(quelle));
const seite = pdf.getPage(0);
const H = seite.getHeight();
const form = pdf.getForm();
const schrift = await pdf.embedFont(StandardFonts.Courier);
const oben = (top, hoehe) => H - top - hoehe;

const text = (name, x, top, breite, hoehe, groesse = 9) => {
  const feld = form.createTextField(name);
  feld.addToPage(seite, {
    x,
    y: oben(top, hoehe),
    width: breite,
    height: hoehe,
    borderWidth: 0,
    font: schrift,
  });
  feld.setFontSize(groesse);
  for (const widget of feld.acroField.getWidgets()) {
    const mk = widget.getAppearanceCharacteristics();
    mk?.dict.delete(PDFName.of("BG"));
    mk?.dict.delete(PDFName.of("BC"));
  }
  return feld;
};

const haken = (name, mitteX, mitteTop, groesse = 7) => {
  const feld = form.createCheckBox(name);
  feld.addToPage(seite, {
    x: mitteX - groesse / 2,
    y: oben(mitteTop - groesse / 2, groesse),
    width: groesse,
    height: groesse,
    borderWidth: 0,
  });
};

// Kassenzeile (Zeile unter den Beschriftungen AOK ... Privat)
const kassen = [
  ["aok", 110, 140],
  ["lkk", 140, 165],
  ["bkk", 165, 187],
  ["ikk", 187, 215],
  ["vdak", 215, 242],
  ["aev", 242, 265],
  ["knappschaft", 265, 310],
  ["privat", 310, 341],
];
for (const [name, von, bis] of kassen) {
  text(`kasse_${name}`, von, 162, bis - von, 11, 9).setAlignment(
    TextAlignment.Center,
  );
}

// Versicherter
text("name", 113, 187, 175, 26, 9);
text("geburtsdatum", 283, 201, 57, 10, 8);
text("kassennr", 113, 246, 62, 10, 8);
text("versichertennr", 177, 246, 95, 10, 8);
text("status", 274, 246, 65, 10, 8);
text("vk_gueltig", 194, 270, 70, 10, 8);
text("datum", 267, 270, 72, 10, 8);
text("ausgestellt_am", 408, 191.5, 92, 9.5, 9);

// 1. Erklärung des Optometristen
haken("cb_veraenderung", 116.7, 323.3);
haken("cb_verbesserung", 116.7, 333.3);
haken("cb_keine", 116.7, 342.7);
text("anzahl_glaeser", 251, 345, 18, 9, 9);

// Begründung
haken("cb_bildschirm", 175.5, 424.5, 6);
haken("cb_gsb", 268.5, 424.5, 6);
haken("cb_kantenfilter", 301, 424.5, 6);
haken("cb_bifokal", 351.5, 424.5, 6);
haken("cb_mineralisch", 390, 424.5, 6);
haken("cb_arbeitsschutz", 434.5, 424.5, 6);

// Refraktionstabelle: Fern (F) / Nähe (N), rechts (R) / links (L)
const spalten = [
  ["sph", 143.5, 184],
  ["cyl", 184, 226],
  ["achse", 226, 244],
  ["prisma", 250, 272.5],
  ["basis", 272.5, 315],
  ["hsa", 315, 339],
];
const zeilen = [
  ["FR", 493.5],
  ["FL", 511.5],
  ["NR", 530],
  ["NL", 548],
];
for (const [zeile, top] of zeilen) {
  for (const [spalte, von, bis] of spalten) {
    text(`${zeile}_${spalte}`, von + 1, top + 5, bis - von - 2, 10, 8);
  }
}

// Kostenrechnung des Optometristen: Pos.-Nr. und Betrag je Zeile, Summe
zeilen.forEach(([, top], i) => {
  text(`pos${i + 1}_nr`, 344, top + 5, 82, 10, 8);
  text(`pos${i + 1}_betrag`, 450, top + 5, 48, 10, 8);
});
text("rechnungsbetrag", 450, 570, 48, 10, 8);

form.updateFieldAppearances(schrift);
const ziel = new URL(
  "../public/formulare/verordnung-optometrist.pdf",
  import.meta.url,
);
writeFileSync(ziel, await pdf.save());
console.log(
  `geschrieben: ${ziel.pathname} (${form.getFields().length} Felder)`,
);
