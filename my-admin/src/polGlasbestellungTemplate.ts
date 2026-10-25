// POL Glasbestellformular (Kategorie "Glasbestellung POL"), nachgebaut nach
// dem Bestellformular von POL Optic auf einer A4-Seite.
// Automatisch übernommen: Firma, Telefon und Datum, Kundenname mit
// Auftragsnummer, Refraktionswerte (Sph, Cyl, Achse, Add, Prisma) rechts und
// links, PD, Einschleifhöhe, HSA, Fassungsmaße aus der Größe und - soweit aus
// der Glasbezeichnung erkennbar - Index, Material und Beschichtung.
// Alle Kästchen lassen sich in der Vorschau an- und abwählen, alle Felder
// eintippen; gedruckt wird der Stand der Vorschau.
import dayjs from "dayjs";
import type {
  DocumentMergeEntities,
  MergeSource,
} from "./documentTemplateEngine";
import { RECHNUNG_ABSENDER, escapeHtml } from "./rechnungTemplate";
import { formatWert, text } from "./werkstattauftragTemplate";
import { KAESTCHEN_STYLES, kaestchen } from "./formularVorschlaege";

export type PolGlasbestellungDaten = { entities: DocumentMergeEntities };

const e = escapeHtml;

// Feld zum Eintippen in der Vorschau
const eingabe = (wert = "", klasse = "") =>
  `<div class="eingabe ${klasse}" contenteditable="true">${e(wert)}</div>`;

const box = (label: string, an = false, grau = "") =>
  `<label class="option">${kaestchen(an)}${grau ? `<span class="grau">${e(grau)}</span> ` : ""}${e(label)}</label>`;

const INDEX: [string, RegExp][] = [
  ["1.50 CR39", /\b1[.,]5(0)?\b|cr ?39/i],
  ["1.53 Trivex", /\b1[.,]53\b|trivex/i],
  ["1.56 Midle Index", /\b1[.,]56\b/],
  ["1.58 HiSaver", /\b1[.,]58\b|hisaver/i],
  ["1.59 Polycarbonate", /\b1[.,]59\b|poly ?carbonat/i],
  ["1.60 High index", /\b1[.,]6(0)?\b/],
  ["1.67 High index", /\b1[.,]67\b/],
  ["1.74 High index", /\b1[.,]74\b/],
];

const MATERIAL: [string, RegExp][] = [
  ["Weiss", /\bwei(ss|ß)\b/i],
  ["Transitions", /transitions/i],
  ["XTRActive", /xtractive/i],
  ["SunSensors", /sunsensors?/i],
  ["Photomatic", /photomatic|photochrom|phototrop/i],
  ["NuPolar", /nupolar|polari/i],
  ["DriveWear", /drivewear/i],
];

const BESCHICHTUNG: [string, string, RegExp][] = [
  ["MultiPlus", "", /multi ?plus/i],
  ["UltraGlide", "", /ultra ?glide/i],
  ["NanoGlide", "", /nano ?glide/i],
  ["PolarGlide", "", /polar ?glide/i],
  ["UV Protector", "", /uv[ -]?protect/i],
  ["BlueBlocker", "", /blue ?(blocker|control|protect)|blaulicht/i],
  ["Lens Coloring", "", /lens colou?ring|tönung|toenung/i],
  ["Silver", "Mirror", /mirror silver(?! light)|verspiegelt silber/i],
  ["Silver Light", "Mirror", /silver light/i],
  ["Gold", "Mirror", /mirror gold(?! light)/i],
  ["Gold Light", "Mirror", /gold light/i],
  ["FireRed", "Mirror", /fire ?red/i],
  ["Green", "Mirror", /mirror green/i],
  ["Red", "Mirror", /mirror red/i],
  ["Blue", "Mirror", /mirror blue/i],
];

const FARBEN: [string, string[]][] = [
  ["Transitions Farben", ["Photo Grau", "Photo Braun"]],
  ["Klassik Farben", ["Grau", "Braun", "G15"]],
];
const FARBEN_RECHTS: [string, string[]][] = [
  [
    "Royal Farben",
    ["Orange", "Lavendel", "Lila", "Rot", "Grün", "Blau", "Pink", "Rose"],
  ],
  ["Sport Farben", ["Tennis", "Golf", "Sailing", "Ski"]],
];

/** Fassungsgröße wie "52□18", "52-18" oder "52/18 140" -> Breite, Brücke. */
export const fassungsMasse = (groesse: unknown) => {
  const treffer = text(groesse).match(/(\d{2})\s*[□x×\-/ ]\s*(\d{2})/);
  return treffer
    ? { breite: treffer[1], bruecke: treffer[2] }
    : { breite: "", bruecke: "" };
};

/** Prisma mit Basis, z. B. "1,00 / 270". */
const prisma = (glas: MergeSource) =>
  [formatWert(glas?.Pr, "zwei"), formatWert(glas?.B, "frei")]
    .filter(Boolean)
    .join(" / ");

/** Gesucht wird in Glasbezeichnung, Vergütung, Farbe und Sonstigem. */
export const glasText = (entities: DocumentMergeEntities) => {
  const g: Record<string, unknown> = entities.glastyp ?? {};
  return [g.Bezeichnung, g.Verguetung, g.Farbe, g.Sonstiges]
    .map(text)
    .filter(Boolean)
    .join(" ");
};

export const buildPolGlasbestellungBodyHtml = ({
  entities,
}: PolGlasbestellungDaten): string => {
  const a = RECHNUNG_ABSENDER;
  const k: Record<string, unknown> = entities.kunde ?? {};
  const brille: Record<string, unknown> = entities.brille ?? {};
  const fassung: Record<string, unknown> = entities.fassung ?? {};
  const { glasRechts: r, glasLinks: l } = entities;
  const such = glasText(entities);
  const kundenname = [
    [k.Nachname, k.Vorname].map(text).filter(Boolean).join(", "),
    text(brille.id) ? `Auftrag ${text(brille.id)}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const { breite, bruecke } = fassungsMasse(fassung.Groesse);
  const hsa = formatWert(r?.HSA, "frei") || formatWert(l?.HSA, "frei");
  const bemerkung = [
    text((entities.glastyp ?? {}).Bezeichnung),
    text((entities.glastyp ?? {}).Verguetung),
    text((entities.glastyp ?? {}).Farbe),
    text((entities.glastyp ?? {}).Sonstiges),
    [text(fassung.Bezeichnung), text(fassung.Groesse)]
      .filter(Boolean)
      .join(" "),
  ]
    .filter(Boolean)
    .join(" · ");

  const werteZeile = (auge: string, glas: MergeSource) =>
    `<tr><th>${auge}</th>${[
      formatWert(glas?.Sph, "dioptrie"),
      formatWert(glas?.Cyl, "dioptrie"),
      formatWert(glas?.A, "achse"),
      formatWert(glas?.Add, "dioptrie"),
      prisma(glas),
    ]
      .map((w) => `<td>${eingabe(w)}</td>`)
      .join("")}</tr>`;

  const farbGruppe = ([titel, farben]: [string, string[]]) =>
    `<h4>${e(titel)}</h4>${farben.map((f) => box(f)).join("")}`;

  const masse: [string, string][] = [
    ["Fass. Breite", breite],
    ["Fass. Höhe", ""],
    ["Brücke", bruecke],
    ["Rh", formatWert(r?.y_h, "frei")],
    ["Lh", formatWert(l?.y_h, "frei")],
    ["PD R", formatWert(r?.PD, "frei")],
    ["PD L", formatWert(l?.PD, "frei")],
  ];

  return `
<div class="blatt">
  <div class="kopf">
    <div class="titel"><b>POL</b> <i>Glasbestellformular</i></div>
    <div class="kontakt">Tel: 07950 / 340 99 60<br />Fax: 07950 / 340 99 89<br /><small>Email: support@poloptic.de</small></div>
  </div>

  <h2>Grunddaten</h2>
  <div class="grund">
    <label>Firma</label>${eingabe(a.firma, "breit")}
    <label>Datum</label>${eingabe(dayjs().format("DD.MM.YYYY"))}
    <label>Kundenname</label>${eingabe(kundenname, "breit")}
    <label>Telefon</label>${eingabe(a.telefon)}
  </div>

  <div class="werte-zeile">
    <table class="werte">
      <tr><th></th><th>Sph</th><th>Cyl</th><th>Achse</th><th>Add</th><th>Prisma</th></tr>
      ${werteZeile("R", r)}
      ${werteZeile("L", l)}
    </table>
    <div class="kurve">
      <label>Basiskurve</label>${eingabe()}
      <label>Ø</label>${eingabe(text((entities.glastyp ?? {}).GlasGroesse))}
    </div>
  </div>

  <div class="spalten">
    <div class="sp glasart">
      <h4>Glasart</h4>
      <div class="linie"><span>OrangeLine</span>${eingabe()}</div>
      <div class="linie"><span>GreenLine</span>${eingabe()}</div>
      <div class="linie"><span>BasicLine</span>${eingabe()}</div>
      <div class="zwei">
        <div><h4>Index</h4>${INDEX.map(([n, re]) => box(n, re.test(such))).join("")}</div>
        <div><h4>Material</h4>${MATERIAL.map(([n, re]) => box(n, re.test(such))).join("")}</div>
      </div>
    </div>
    <div class="sp">
      <h4>Beschichtung</h4>
      ${BESCHICHTUNG.map(([n, grau, re]) => box(n, re.test(such), grau)).join("")}
    </div>
    <div class="sp">
      ${FARBEN.map(farbGruppe).join("")}
      <h4>Farbtyp</h4>
      <label class="option">${kaestchen()}Standard % <span class="strich">${eingabe()}</span></label>
      <label class="option">${kaestchen()}Verlauf % <span class="strich">${eingabe()}</span></label>
    </div>
    <div class="sp">${FARBEN_RECHTS.map(farbGruppe).join("")}</div>
  </div>

  <h4 class="bem">Bemerkungen:</h4>
  ${eingabe(bemerkung, "bemerkung")}

  <h2>Fassungsdaten</h2>
  <div class="fassung">
    <div class="raster"></div>
    <div class="masse">
      ${masse.map(([n, w]) => `<label>${e(n)}</label>${eingabe(w, "mass")}`).join("")}
    </div>
    <div class="fassart">
      <h4>Die Glasform ist das:</h4>${box("Rechte Auge")}${box("Linke Auge")}
      <h4>Art der Fassung</h4>${box("Metall / Kunststoff")}${box("Nylor")}${box("Bohrbrille")}
      <h4>Minimale Randicke <span class="normal">(mm)</span></h4>${eingabe("", "kurz")}
      <h4>Die Dicke der markierten Position <span class="normal">(mm)</span></h4>${eingabe("", "kurz")}
    </div>
  </div>

  <h2>Individuelle <span class="normal">Daten</span></h2>
  <div class="individuell">
    <table class="werte klein">
      <tr><th>VN</th><th>FSW</th><th>HSA</th><th>LA</th><th>Var. inset</th></tr>
      <tr><td>${eingabe()}</td><td>${eingabe()}</td><td>${eingabe(hsa)}</td><td>${eingabe()}</td><td>${eingabe()}</td></tr>
    </table>
    <table class="werte gravur">
      <tr><th colspan="4">Initialen für Gravierung</th></tr>
      <tr><td>${eingabe()}</td><td>${eingabe()}</td><td>${eingabe()}</td><td>${eingabe()}</td></tr>
    </table>
    <table class="werte unterschrift">
      <tr><th>Unterschrift für Gravierung</th></tr>
      <tr><td>${eingabe()}</td></tr>
    </table>
  </div>
  <div class="verwendung"><label>Hauptverwendung von Gläsern:</label>${eingabe(text(brille.BrillenArt), "linie-unten")}</div>
</div>`;
};

const STYLES = `
  ${KAESTCHEN_STYLES}
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #222; font-size: 8.3pt; line-height: 1.25; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .blatt { position: relative; width: 210mm; height: 297mm; padding: 0 10mm 8mm; overflow: hidden; background: #fff; }
  .kopf { display: flex; justify-content: space-between; align-items: center; background: #2b2b2b; color: #fff; margin: 0 -10mm 3mm; padding: 3mm 12mm 3mm 46mm; height: 20mm; }
  .titel { font-size: 18pt; }
  .kontakt { font-family: Georgia, serif; font-size: 10pt; line-height: 1.35; }
  h2 { font-size: 11pt; margin: 3mm 0 2mm; border-bottom: 0.3mm dotted #777; padding-bottom: 0.5mm; }
  h4 { font-size: 8.4pt; font-style: italic; margin: 1.6mm 0 0.6mm; }
  .normal { font-weight: normal; font-style: normal; }
  .grau { color: #888; font-style: italic; }
  .eingabe { border: 0.25mm solid #333; min-height: 6mm; padding: 0.8mm 1.2mm; font-size: 9pt; outline: none; white-space: pre-wrap; }
  .grund { display: grid; grid-template-columns: 24mm 1fr 18mm 36mm; gap: 1.6mm 2mm; align-items: center; margin: 0 6mm 2mm 12mm; }
  .grund label, .kurve label, .masse label { font-weight: bold; font-style: italic; text-align: right; }
  .werte-zeile { display: flex; gap: 8mm; align-items: flex-end; margin-left: 12mm; }
  .werte { border-collapse: collapse; }
  .werte th { font-weight: normal; font-style: italic; font-size: 7.6pt; padding: 0 1mm 0.5mm; }
  .werte tr th:first-child { font-weight: bold; font-size: 9pt; width: 6mm; text-align: left; }
  .werte td { padding: 0; width: 23mm; }
  .werte td .eingabe { border-width: 0.25mm 0 0.25mm 0.25mm; }
  .werte td:last-child .eingabe { border-right-width: 0.25mm; }
  .kurve { display: grid; grid-template-columns: 22mm 26mm; gap: 1.6mm 2mm; align-items: center; }
  .spalten { display: grid; grid-template-columns: 1.85fr 0.95fr 0.85fr 0.75fr; gap: 3mm; margin: 2mm 0 0 12mm; }
  .linie { position: relative; margin-bottom: 1.4mm; }
  .linie span { position: absolute; left: 1.2mm; top: 0.4mm; font-size: 7pt; font-weight: bold; font-style: italic; color: #888; }
  .linie .eingabe { min-height: 8mm; padding-top: 3.4mm; }
  .zwei { display: grid; grid-template-columns: 1fr 1fr; gap: 2mm; }
  .option { display: block; font-style: italic; margin: 0.35mm 0; white-space: nowrap; cursor: pointer; }
  .kaestchen { display: inline-block; width: 2.6mm; height: 2.6mm; margin: 0 1.4mm 0 0; border: 0.25mm solid #333; vertical-align: -0.3mm; }
  .strich { display: inline-block; width: 10mm; vertical-align: middle; }
  .strich .eingabe { min-height: 3.6mm; padding: 0 0.6mm; border-width: 0 0 0.25mm 0.25mm; font-size: 7.5pt; }
  .bem { margin-left: 10mm; }
  .bemerkung { margin-left: 10mm; min-height: 12mm; }
  .fassung { display: grid; grid-template-columns: 80mm 38mm 1fr; gap: 4mm; margin-left: 10mm; }
  .raster { height: 80mm; border: 0.3mm solid #555; background-color: #fff;
    background-image: linear-gradient(#555 0.25mm, transparent 0.25mm), linear-gradient(90deg, #555 0.25mm, transparent 0.25mm), linear-gradient(#ccc 0.1mm, transparent 0.1mm), linear-gradient(90deg, #ccc 0.1mm, transparent 0.1mm);
    background-size: 10mm 10mm, 10mm 10mm, 1mm 1mm, 1mm 1mm; }
  .masse { display: grid; grid-template-columns: 21mm 13mm; white-space: nowrap; gap: 2.6mm 2mm; align-items: center; }
  .mass { min-height: 8mm; }
  .kurz { width: 12mm; min-height: 4mm; border-width: 0 0.25mm 0.25mm; padding: 0 0.6mm; }
  .individuell { display: flex; gap: 6mm; align-items: flex-start; margin-left: 12mm; }
  .individuell .klein td { width: 13mm; }
  .individuell th, .individuell tr th:first-child { font-weight: normal; font-size: 7.6pt; text-align: center; width: auto; }
  .gravur td { width: 9mm; }
  .unterschrift td { width: 52mm; }
  .verwendung { display: flex; gap: 3mm; align-items: flex-end; margin: 4mm 0 0 12mm; }
  .verwendung label { font-weight: bold; font-style: italic; font-size: 7.6pt; white-space: nowrap; }
  .linie-unten { flex: 1; border-width: 0 0 0.25mm; min-height: 5mm; }
`;

const BILDSCHIRM_STYLES = `
  @media screen {
    .eingabe { background: #f3f8ff; cursor: text; }
    .eingabe:focus { background: #e3efff; }
  }
`;

const html = (inhalt: string, extra: string) => `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8" />
<title>POL Glasbestellformular</title>
<style>
  ${STYLES}
  ${extra}
  @page { size: A4; margin: 0; }
</style>
</head>
<body>
${inhalt}
</body>
</html>`;

export const buildPolGlasbestellungPrintHtml = (
  daten: PolGlasbestellungDaten,
): string => html(buildPolGlasbestellungBodyHtml(daten), "");

export const buildPolGlasbestellungPreviewHtml = (
  daten: PolGlasbestellungDaten,
): string =>
  html(
    buildPolGlasbestellungBodyHtml(daten),
    `${BILDSCHIRM_STYLES}
  html { background: #eee; }
  .blatt { margin: 12px auto; box-shadow: 0 1px 6px rgba(0, 0, 0, 0.2); }
  @media print { html { background: none; } .blatt { margin: 0; box-shadow: none; } }`,
  );
