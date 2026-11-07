// Formblatt "Vom Optiker auszufüllen (Bildschirmarbeitsplatzbrille)" für
// Mitarbeiter des Jobcenters (Kategorie "Antrag Jobcenter"), nach dem
// Original-Vordruck. Automatisch übernommen: Name, Vorname und Datum; "ja"
// (spezielle Sehhilfe) ist vorangekreuzt, Einstärken-/Mehrstärkengläser
// ergeben sich aus der Addition im Auftrag. Kosten, Rabatt und Bemerkungen
// werden in der Vorschau eingetippt, alle Kästchen lassen sich umschalten;
// gedruckt wird der Stand der Vorschau. Stempel und Unterschrift kommen aus
// den Einstellungen (nicht aus dem Repo). Die Vordruck-Texte bleiben fest.
import dayjs from "dayjs";
import type { DocumentMergeEntities } from "./documentTemplateEngine";
import { escapeHtml } from "./rechnungTemplate";
import { text } from "./werkstattauftragTemplate";
import {
  type BetriebBilder,
  betriebBilder,
  bildUrl,
} from "./betriebBilderCache";
import { KAESTCHEN_STYLES, kaestchen } from "./formularVorschlaege";

export type JobcenterBildschirmbrilleDaten = {
  entities: DocumentMergeEntities;
  // Stempel/Unterschrift; ohne Angabe die privat gespeicherten Bilder
  bilder?: BetriebBilder;
};

const e = escapeHtml;

const eingabe = (wert = "", hinweis = "", klasse = "") =>
  `<span class="eingabe ${klasse}" contenteditable="true" data-hinweis="${e(hinweis)}">${e(wert)}</span>`;

const hatAddition = (entities: DocumentMergeEntities): boolean =>
  [entities.glasRechts, entities.glasLinks].some((g) => {
    const add = Number(g?.Add);
    return Number.isFinite(add) && add !== 0;
  });

export const buildJobcenterBildschirmbrilleBodyHtml = ({
  entities,
  bilder = betriebBilder(),
}: JobcenterBildschirmbrilleDaten): string => {
  const k: Record<string, unknown> = entities.kunde ?? {};
  const name = [text(k.Nachname), text(k.Vorname)].filter(Boolean).join(", ");
  const mehrstaerken = hatAddition(entities);
  const stempel = bildUrl(bilder.stempel);
  const unterschrift = bildUrl(bilder.unterschrift);

  return `
<div class="seite">
  <div class="kopf">
    <div class="kopf-name"><span class="label">Name, Vorname</span>${eingabe(name, "Name, Vorname")}</div>
    <div class="kopf-datum"><span class="label">Datum</span>${eingabe(dayjs().format("DD.MM.YYYY"), "TT.MM.JJJJ")}</div>
  </div>

  <p class="vorlage">Zur Vorlage beim Arbeitgeber</p>

  <h2>Vom Optiker auszufüllen</h2>
  <div class="untertitel">(Bildschirmarbeitsplatzbrille)</div>
  <div class="hinweis">Das Formblatt ist nur auszufüllen, wenn aus der Rechnung nicht alle notwendigen Angaben (s.u.) hervorgehen.</div>

  <div class="jn"><span>Ja</span><span>Nein</span></div>
  <div class="punkt mit-wahl">
    <span class="text">Bei der für die Kundin/den Kunden angefertigte Bildschirmarbeitsplatzbrille handelt es sich um eine spezielle Sehhilfe ausschließlich für die Arbeit an Bildschirmgeräten (Punkt 6 „Maßnahmen zur Gestaltung von Bildschirmarbeitsplätzen“ des Anhangs der ArbStättV)</span>
    <span class="wahl">${kaestchen(true, "box")}${kaestchen(false, "box")}</span>
  </div>
  <div class="punkt mit-wahl">
    <span class="text">Einstärkengläser (monofokal)</span>
    <span class="wahl">${kaestchen(!mehrstaerken, "box")}</span>
  </div>
  <div class="punkt mit-wahl">
    <span class="text">Mehrstärkengläser (bi-/trifokal)</span>
    <span class="wahl">${kaestchen(mehrstaerken, "box")}</span>
  </div>
  <div class="punkt mit-wert">
    <span class="text">Kosten des günstigsten Kunststoffglases mit <b>einfacher/preiswertester</b> Entspiegelung (rechts):</span>
    ${eingabe("", "Betrag", "wert")}
  </div>
  <div class="punkt mit-wert">
    <span class="text">Kosten des günstigsten Kunststoffglases mit <b>einfacher/preiswertester</b> Entspiegelung (links):</span>
    ${eingabe("", "Betrag", "wert")}
  </div>
  <div class="punkt">
    <span class="text">Bei <b>Rabatt/Ersparnis</b><br />Auf welche Rechnungspositionen bezieht sich die Vergünstigung:</span>
    ${eingabe("", "Rechnungspositionen", "lang")}
  </div>
  <div class="punkt">
    <span class="text">Bemerkungen/Sonstiges:</span>
    ${eingabe("", "Bemerkungen", "lang")}
    ${eingabe("", "", "lang")}
  </div>

  <div class="unterschrift">
    <div class="stempelfeld">${
      unterschrift
        ? `<img class="unterschrift-bild" src="${unterschrift}" alt="" />`
        : ""
    }${stempel ? `<img class="stempel-bild" src="${stempel}" alt="" />` : ""}</div>
    <div class="linie">Datum, Unterschrift &amp; Stempel des Optikers</div>
  </div>
</div>`;
};

const STYLES = `
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Carlito, Calibri, "Segoe UI", Arial, sans-serif; color: #222; font-size: 10.5pt; line-height: 1.4; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .seite { position: relative; width: 210mm; height: 296mm; overflow: hidden; padding: 24mm 24mm 10mm 24mm; background: #fff; }
  .kopf { display: flex; border: 0.25mm solid #333; border-bottom: 0.25mm solid #333; }
  .kopf > div { padding: 1.5mm 3mm 1mm; display: flex; flex-direction: column; min-height: 17mm; }
  .kopf-name { flex: 1; border-right: 0.25mm solid #333; justify-content: space-between; }
  .kopf-datum { width: 62mm; justify-content: space-between; }
  .label { font-size: 10pt; }
  .vorlage { margin: 16mm 0 12mm; }
  h2 { font-size: 11.5pt; margin: 0; }
  .untertitel { margin-bottom: 0.5mm; }
  .hinweis { font-size: 8.5pt; margin-bottom: 6mm; }
  .jn { display: flex; justify-content: flex-end; gap: 9mm; padding-right: 5mm; margin-bottom: 2mm; }
  .punkt { position: relative; margin: 0 0 4.5mm 6mm; padding-left: 4mm; display: flex; flex-direction: column; gap: 1mm; }
  .punkt::before { content: "\\2022"; position: absolute; left: -1mm; top: 0; }
  .punkt.mit-wahl { flex-direction: row; justify-content: space-between; gap: 6mm; }
  .punkt.mit-wahl .text { max-width: 112mm; }
  .wahl { display: flex; gap: 9.5mm; width: 25.9mm; padding-right: 6mm; align-items: flex-start; margin-top: 0.8mm; }
  .punkt.mit-wert { flex-direction: row; justify-content: space-between; align-items: flex-end; gap: 6mm; }
  .punkt.mit-wert .text { max-width: 112mm; }
  .box { width: 5.2mm; height: 5.2mm; margin: 0; border: 0.3mm solid #333; border-radius: 0.6mm; accent-color: #222; }
  .eingabe { display: block; outline: none; min-height: 1.5em; font-family: "Courier New", Courier, monospace; font-weight: bold; font-size: 10pt; color: #333; border-bottom: 0.25mm solid #333; white-space: pre-wrap; }
  .eingabe.wert { min-width: 33mm; text-align: right; }
  .eingabe.lang { width: 100%; }
  .kopf .eingabe { border-bottom: 0; }
  .unterschrift { margin-top: 12mm; width: 112mm; }
  .stempelfeld { position: relative; height: 30mm; }
  .unterschrift-bild { position: absolute; left: 4mm; bottom: 0; height: 14mm; max-width: 40mm; object-fit: contain; }
  .stempel-bild { position: absolute; left: 36mm; bottom: -2mm; height: 28mm; max-width: 60mm; object-fit: contain; }
  .linie { border-top: 0.25mm solid #333; padding-top: 1mm; font-size: 10pt; }
  ${KAESTCHEN_STYLES}
`;

const PREVIEW_STYLES = `
  @media screen {
    .eingabe { background: #f3f8ff; border-radius: 2px; cursor: text; border-bottom: 0; }
    .eingabe:focus { background: #e3efff; }
    .eingabe:empty::before { content: attr(data-hinweis); color: #9aa8bb; font-style: italic; font-weight: normal; }
  }
`;

const html = (inhalt: string, extra: string) => `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8" />
<title>Bildschirmarbeitsplatzbrille Jobcenter</title>
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

export const buildJobcenterBildschirmbrillePrintHtml = (
  daten: JobcenterBildschirmbrilleDaten,
): string => html(buildJobcenterBildschirmbrilleBodyHtml(daten), "");

export const buildJobcenterBildschirmbrillePreviewHtml = (
  daten: JobcenterBildschirmbrilleDaten,
): string =>
  html(
    buildJobcenterBildschirmbrilleBodyHtml(daten),
    `${PREVIEW_STYLES}
  html { background: #eee; }
  .seite { margin: 12px auto; box-shadow: 0 1px 6px rgba(0, 0, 0, 0.2); }
  @media print { html { background: none; } .seite { margin: 0; box-shadow: none; } }`,
  );
