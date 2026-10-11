// Erzeugt public/formulare/berechtigungsschein-gkv.pdf: das Original-Formular
// "Berechtigungsschein" des ZVA (AOK-Vertrag Sehhilfen, Anlage 4) mit
// Formularfeldern an den Positionen der Kästchen und Linien. Das Layout bleibt
// unverändert; pdfFormulare.ts füllt die Felder vor, alle bleiben im
// PDF-Viewer änderbar.
//
//   node scripts/berechtigungsschein-gkv-felder.mjs <original.pdf>
//
// Koordinaten in pt von oben links (aus dem Original ausgemessen).
import { readFileSync, writeFileSync } from "node:fs";
import { PDFDocument, StandardFonts, TextAlignment } from "pdf-lib";

const [quelle] = process.argv.slice(2);
if (!quelle) throw new Error("Pfad zum Original-PDF angeben");

const pdf = await PDFDocument.load(readFileSync(quelle));
const seite = pdf.getPage(0);
const hoehe = seite.getHeight();
const form = pdf.getForm();
const schrift = await pdf.embedFont(StandardFonts.Helvetica);

const text = (name, x1, y1, x2, y2, mitte = false) => {
  const feld = form.createTextField(name);
  feld.addToPage(seite, {
    x: x1,
    y: hoehe - y2,
    width: x2 - x1,
    height: y2 - y1,
    borderWidth: 0,
    font: schrift,
  });
  if (mitte) feld.setAlignment(TextAlignment.Center);
  feld.setFontSize(9);
};
const kaestchen = (name, x, y, groesse = 11) => {
  const feld = form.createCheckBox(name);
  feld.addToPage(seite, {
    x: x + 1,
    y: hoehe - y - groesse + 1,
    width: groesse - 2,
    height: groesse - 2,
    borderWidth: 0,
  });
};

// Versichertenfeld oben links
text("krankenkasse", 28, 24, 250, 40);
text("name", 28, 62, 196, 75);
text("geburtsdatum", 199, 62, 251, 75);
text("anschrift", 28, 81, 251, 96);
text("kassennr", 28, 108, 104, 122);
text("versichertennr", 109, 108, 196, 122);
text("status", 200, 108, 251, 122);
text("ik", 28, 132, 104, 146);
text("vk_gueltig", 109, 132, 182, 146);
text("datum", 186, 132, 251, 146);
// Rechnungs- und Belegnummer
text("rechnungsnummer", 287, 89, 520, 103);
text("belegnummer", 287, 131, 520, 145);
// Unfall / Arbeitsunfall / Versorgungsleiden
kaestchen("cb_unfall", 25, 162.9);
kaestchen("cb_arbeitsunfall", 148.9, 162.9);
kaestchen("cb_versorgungsleiden", 244.4, 162.9);
// I. Erklärung des Augenoptikers
kaestchen("cb_veraenderung", 181, 216.4);
kaestchen("cb_logmar", 181, 235.4);
kaestchen("cb_augenglasbestimmung", 25, 270.4);
text("anzahl_glaeser", 42, 289, 86, 300.5, true);
text("anzahl_kl", 157, 289, 201, 300.5, true);
kaestchen("cb_folgeversorgung", 303.4, 270.4);
text("folge_glaeser", 319.5, 303, 363, 314.5, true);
text("folge_kl", 434.3, 303, 478.3, 314.5, true);
kaestchen("cb_kl_nachlieferung", 25, 360.4);
kaestchen("cb_kl_kontrolle", 303.4, 360.4);
text("sonstiges", 78, 408, 567, 421);
// Werte und Kostenabrechnung
const spalten = [
  ["sph", 59, 109],
  ["cyl", 109, 158.5],
  ["achse", 158.5, 207.9],
  ["prisma", 207.9, 258.4],
  ["basis", 258.4, 307.4],
  ["hsa", 307.4, 357.4],
];
const abrechnung = [
  ["hmv", 357.4, 485.3],
  ["faktor", 485.3, 516.3],
  ["betrag", 516.3, 567.3],
];
const zeilen = [
  ["FR", 476.3, 492.3],
  ["FL", 492.3, 507.3],
  ["NR", 507.3, 523.3],
  ["NL", 523.3, 539.3],
];
for (const [zeile, y1, y2] of zeilen) {
  for (const [spalte, x1, x2] of spalten) {
    text(`${zeile}_${spalte}`, x1 + 1.5, y1 + 1.5, x2 - 1.5, y2 - 1.5, true);
  }
}
const abrechnungsZeilen = [
  ...zeilen.map(([, y1, y2]) => [y1, y2]),
  [539.3, 554.3],
  [554.3, 570.3],
  [570.3, 585.3],
  [585.3, 601.3],
  [601.3, 616.3],
];
abrechnungsZeilen.forEach(([y1, y2], i) => {
  for (const [spalte, x1, x2] of abrechnung) {
    text(`abr${i + 1}_${spalte}`, x1 + 1.5, y1 + 1.5, x2 - 1.5, y2 - 1.5, spalte !== "hmv");
  }
});
text("rechnungsbetrag", 518, 630, 566, 657, true);
// II. Erklärung des Versicherten
kaestchen("cb_bestimmung_ja", 200.6, 710.2);
kaestchen("cb_bestimmung_nein", 239.4, 710.2);
text("best_glaeser", 304, 708, 348, 719.5, true);
text("best_kl", 423.3, 708, 467.3, 719.5, true);
text("sonstiges_versicherter", 78, 752, 567, 765);
text("ort_datum", 28, 785, 288, 798.5);

form.updateFieldAppearances(schrift);
writeFileSync(
  new URL("../public/formulare/berechtigungsschein-gkv.pdf", import.meta.url),
  await pdf.save(),
);
console.log(`${form.getFields().length} Felder angelegt`);
