// Vordruck "Gewährung einer Bildschirmarbeitsbrille" für das SRH-Krankenhaus
// (Anlage 2, Kategorie "Antrag SRH"): Neuaufbau des Original-Bogens ohne
// Stempel, Unterschriften und Handzeichen. Automatisch übernommen: Name,
// Geburtsdatum und Anschrift des Beschäftigten sowie die Refraktion aus dem
// Auftrag (2.3 a). Alles andere (Arbeitsstelle, Messwerte, Kästchen,
// Bemerkungen) wird in der Vorschau eingetippt bzw. angekreuzt; gedruckt wird
// der Stand der Vorschau.
import type {
  DocumentMergeEntities,
  MergeSource,
} from "./documentTemplateEngine";
import { escapeHtml } from "./rechnungTemplate";
import { formatDatum, formatWert, text } from "./werkstattauftragTemplate";

export type SrhBildschirmbrilleDaten = { entities: DocumentMergeEntities };

const e = escapeHtml;

const eingabe = (wert = "", hinweis = "", klasse = "") =>
  `<span class="eingabe ${klasse}" contenteditable="true" data-hinweis="${e(hinweis)}">${e(wert)}</span>`;

const feld = (label: string, wert = "", hinweis = "") =>
  `<div class="feld"><span class="label">${label}</span>${eingabe(wert, hinweis)}</div>`;

const kaestchen = (beschriftung: string) =>
  `<label class="wahl"><input type="checkbox" class="box" /> ${e(beschriftung)}</label>`;

const jaNein = () => `${kaestchen("ja")}${kaestchen("nein")}`;

const refraktion = (seite: string, glas: MergeSource) => `
    <tr>
      <th>${seite}</th>
      <td>${eingabe(formatWert(glas?.Sph, "dioptrie"), "Sph")}</td>
      <td>${eingabe(formatWert(glas?.Cyl, "dioptrie"), "Cyl")}</td>
      <td>${eingabe(formatWert(glas?.A, "achse"), "Achse")}</td>
      <td>${eingabe(formatWert(glas?.Add, "dioptrie"), "Add")}</td>
    </tr>`;

export const buildSrhBildschirmbrilleBodyHtml = ({
  entities,
}: SrhBildschirmbrilleDaten): string => {
  const k: Record<string, unknown> = entities.kunde ?? {};
  const name = [text(k.Nachname), text(k.Vorname)].filter(Boolean).join(", ");
  const anschrift = [
    [k.Straße, k.Hausnummer].map(text).filter(Boolean).join(" "),
    [k.Postleitzahl, k.Stadt].map(text).filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");

  return `
<div class="seite">
  <div class="anlage">Anlage 2</div>
  <h1>Gewährung einer Bildschirmarbeitsbrille</h1>

  <div class="kopf">
    ${feld("Name, Vorname der/s Beschäftigten:", name, "Name, Vorname")}
    ${feld("Arbeits-/Dienststelle:", "", "Abteilung / Station")}
    ${feld("Geburtsdatum:", formatDatum(k.Geburtsdatum), "TT.MM.JJJJ")}
    ${feld("Tätigkeit:", text(k.Tätigkeit), "Tätigkeit")}
    ${feld("Anschrift:", anschrift, "Straße, PLZ Ort")}
    ${feld("Telefon dienstlich:", "", "Telefon")}
  </div>

  <h2>Angaben des Mitarbeiters zur Beschaffenheit des Bildschirmarbeitsplatzes</h2>
  <div class="kopf">
    ${feld("Sehwinkel (Horizontale–Bildschirmmitte):", "", "Grad")}
    ${feld("Bildschirmdiagonale (Zoll):", "", "Zoll")}
    ${feld("Entfernung der Augen zum Bildschirm (cm):", "", "cm")}
    ${feld("Tastatur bzw. Leseentfernung (cm):", "", "cm")}
    ${feld("Bei Erfordernis (z. B. Publikumsverkehr) zusätzliche Sehentfernung (m):", "", "m")}
  </div>

  <h2 class="abschnitt">1. Stellungnahme des Betriebsarztes bzw. des nach G 37 untersuchenden Arztes:</h2>
  <div class="zeile"><span>1.1 Eine spezielle Sehhilfe (Bildschirmarbeitsbrille) nach § 6 Bildschirmarbeitsverordnung wird aus arbeitsmedizinischer Sicht empfohlen:</span><span class="wahlgruppe">${jaNein()}</span></div>
  <div class="einzug">
    ${kaestchen("Monofokalgläser (Einstärkengläser)")}
    ${kaestchen("Bifokalgläser (Zweistärkengläser)")}
    ${kaestchen("Bildschirmarbeitsplatzbrille mit Publikumsverkehr")}
  </div>
  <div class="zeile"><span>1.2. Eine Vorstellung beim Augenarzt ist erforderlich:</span><span class="wahlgruppe">${jaNein()}</span></div>
  <div class="bemerkung">1.3. Bemerkungen (spez. Tätigkeitsmerkmale): ${eingabe("", "Bemerkungen", "lang")}</div>
  <div class="unterschriften">
    <div><span class="linie"></span>Datum</div>
    <div><span class="linie"></span>Unterschrift Betriebsarzt</div>
  </div>

  <h2 class="abschnitt">2. Stellungnahme des Augenarztes:</h2>
  <div class="zeile"><span>2.1. Die bisher verwendete normale Sehhilfe ist für die Bildschirmarbeit ausreichend.</span><span class="wahlgruppe">${jaNein()}</span></div>
  <div class="zeile"><span>2.2. Eine spezielle Sehhilfe (Bildschirmarbeitsbrille) nach § 6 Bildschirmarbeitsverordnung ist notwendig.</span><span class="wahlgruppe">${jaNein()}</span></div>
  <div class="bemerkung">2.3. Auf der Verordnung sind angegeben:</div>
  <div class="einzug">
    <div>a) Refraktion</div>
    <table class="refraktion">
      <tr><th></th><th>Sphäre</th><th>Zylinder</th><th>Achse</th><th>Add</th></tr>
      ${refraktion("rechts", entities.glasRechts)}
      ${refraktion("links", entities.glasLinks)}
    </table>
    <div>b) für Regelausstattung: Erfordernis einer Einstärken- oder Zweistärkenbrille</div>
    <div>c) für Sonderausstattung: ggf. Erfordernis einer Dreistärken- oder Gleitsichtbrille, von Leichtgläsern, von Kunststoffgläsern, von getönten oder fototropen Gläsern.</div>
  </div>
  <div class="bemerkung">2.4. Grund für die Sonderausstattung: ${eingabe("", "Begründung", "lang")}</div>
</div>`;
};

const STYLES = `
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Carlito, Calibri, "Segoe UI", Arial, sans-serif; color: #222; font-size: 10pt; line-height: 1.4; }
  .seite { position: relative; width: 210mm; height: 296mm; overflow: hidden; padding: 10mm 18mm 8mm 20mm; background: #fff; }
  .anlage { font-size: 9.5pt; }
  h1 { text-align: center; font-size: 15pt; margin: 1mm 0 5mm; }
  h2 { font-size: 9.5pt; margin: 4mm 0 2mm; }
  h2.abschnitt { border-top: 0.3mm solid #333; border-bottom: 0.3mm solid #333; padding: 1mm 0; margin: 4mm 0 2mm; }
  .kopf { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5mm 8mm; }
  .feld { display: flex; flex-direction: column; font-size: 9.5pt; }
  .label { color: #444; }
  .eingabe { outline: none; min-height: 1.3em; border-bottom: 0.2mm dotted #888; white-space: pre-wrap; }
  .eingabe.lang { display: inline-block; min-width: 100mm; }
  .zeile { display: flex; justify-content: space-between; gap: 6mm; margin: 2mm 0; }
  .wahlgruppe { white-space: nowrap; display: flex; gap: 4mm; }
  .wahl { display: inline-flex; align-items: center; gap: 1.5mm; margin-right: 2mm; }
  .einzug { margin: 1mm 0 2mm 6mm; display: flex; flex-direction: column; gap: 1mm; }
  .bemerkung { margin: 2mm 0; }
  .box { width: 3.2mm; height: 3.2mm; margin: 0; accent-color: #222; }
  .unterschriften { display: flex; justify-content: space-between; gap: 20mm; margin: 8mm 0 1mm; font-size: 9pt; }
  .unterschriften > div { flex: 1; }
  .linie { display: block; border-top: 0.25mm solid #333; margin-bottom: 1mm; }
  .refraktion { border-collapse: collapse; margin: 1mm 0 2mm; }
  .refraktion th, .refraktion td { padding: 0.5mm 3mm 0.5mm 0; text-align: left; font-weight: normal; min-width: 22mm; }
  .refraktion tr:first-child th { font-weight: 600; }
`;

const BILDSCHIRM_STYLES = `
  @media screen {
    .eingabe { background: #f3f8ff; border-radius: 2px; cursor: text; border-bottom: 0; }
    .eingabe:focus { background: #e3efff; }
    .eingabe:empty::before { content: attr(data-hinweis); color: #9aa8bb; font-style: italic; }
  }
`;

const html = (inhalt: string, extra: string) => `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8" />
<title>Gewährung einer Bildschirmarbeitsbrille</title>
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

export const buildSrhBildschirmbrillePrintHtml = (
  daten: SrhBildschirmbrilleDaten,
): string => html(buildSrhBildschirmbrilleBodyHtml(daten), "");

export const buildSrhBildschirmbrillePreviewHtml = (
  daten: SrhBildschirmbrilleDaten,
): string =>
  html(
    buildSrhBildschirmbrilleBodyHtml(daten),
    `${BILDSCHIRM_STYLES}
  html { background: #eee; }
  .seite { margin: 12px auto; box-shadow: 0 1px 6px rgba(0, 0, 0, 0.2); }
  @media print { html { background: none; } .seite { margin: 0; box-shadow: none; } }`,
  );
