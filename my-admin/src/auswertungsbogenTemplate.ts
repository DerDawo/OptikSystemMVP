// Auswertungsbogen (Kategorie "Auswertungsbogen"): Ergebnis der
// optometrischen Untersuchung für den Kunden auf einer A4-Seite.
// Automatisch übernommen: Name, Geburtsdatum und Alter des Kunden, Datum und
// Berater des Auftrags, die Refraktionswerte samt Prisma, PD und HSA, der
// erreichte Visus und der Augeninnendruck (IOD) aus dem Auftrag.
// Alles andere wird in der Vorschau eingetippt bzw. angekreuzt; gedruckt wird
// der Stand der Vorschau. Stempel und Unterschrift aus den Einstellungen.
import dayjs from "dayjs";
import type {
  DocumentMergeEntities,
  MergeSource,
} from "./documentTemplateEngine";
import { RECHNUNG_ABSENDER, escapeHtml } from "./rechnungTemplate";
import { formatDatum, formatWert, text } from "./werkstattauftragTemplate";
import { mitarbeiterAnzeige } from "./mitarbeiterNamen";
import {
  type BetriebBilder,
  betriebBilder,
  bildUrl,
} from "./betriebBilderCache";
import { KAESTCHEN_STYLES, kaestchen } from "./formularVorschlaege";

export type AuswertungsbogenDaten = {
  entities: DocumentMergeEntities;
  // Stempel/Unterschrift; ohne Angabe die privat gespeicherten Bilder
  bilder?: BetriebBilder;
};

const e = escapeHtml;

// Feld zum Eintippen in der Vorschau; `hinweis` nur am Bildschirm, solange leer
const eingabe = (wert = "", hinweis = "") =>
  `<span class="eingabe" contenteditable="true" data-hinweis="${e(hinweis)}">${e(wert)}</span>`;

const absatz = (wert = "", hinweis = "") =>
  `<div class="eingabe absatz" contenteditable="true" data-hinweis="${e(hinweis)}">${e(wert)}</div>`;

const wahl = (beschriftung: string, angekreuzt = false) =>
  `<label class="wahl">${kaestchen(angekreuzt)}${e(beschriftung)}</label>`;

/** Alter in Jahren am Stichtag, sonst leer. */
export const alterJahre = (geburtsdatum: unknown, stichtag = dayjs()) => {
  const geburt = dayjs(text(geburtsdatum));
  if (!text(geburtsdatum) || !geburt.isValid() || geburt.isAfter(stichtag))
    return "";
  return String(stichtag.diff(geburt, "year"));
};

// Prüfungen mit Methode (vorgeschlagen, änderbar) und Ergebnis
export const AUSWERTUNG_PRUEFUNGEN: [string, string][] = [
  ["Motilität (Augenbeweglichkeit)", "H-Test, Folgebewegungen"],
  ["Augenstellung / Phorie", "Cover-Test, MKH"],
  ["Binokularsehen / Stereosehen", "Lang-Test, Titmus"],
  ["Konvergenznahpunkt", "RAF-Lineal"],
  ["Farbsehen", "Ishihara, Farnsworth D-15"],
  ["Gesichtsfeld", "Fingerperimetrie, Perimeter"],
  ["Amsler-Netz (Makula)", "monokular"],
  ["Kontrastsehen", "Pelli-Robson"],
  ["Pupillenreaktion", "direkt / konsensuell / RAPD"],
  ["Vorderer Augenabschnitt", "Spaltlampe"],
  ["Tränenfilm", "BUT, Schirmer"],
  ["Augenhintergrund", "Funduskamera"],
];

export const buildAuswertungsbogenBodyHtml = ({
  entities,
  bilder = betriebBilder(),
}: AuswertungsbogenDaten): string => {
  const k: Record<string, unknown> = entities.kunde ?? {};
  const brille: Record<string, unknown> = entities.brille ?? {};
  const { glasRechts: r, glasLinks: l } = entities;
  const a = RECHNUNG_ABSENDER;
  const stempel = bildUrl(bilder.stempel);
  const unterschrift = bildUrl(bilder.unterschrift);
  const datum = text(brille.Datum) ? dayjs(text(brille.Datum)) : dayjs();
  const name = [k.Vorname, k.Nachname].map(text).filter(Boolean).join(" ");
  // "Robert Ulm lt. optometrischer Messung" -> "Robert Ulm"; andere
  // Angaben (Augenarzt, "nach augenärztl. Verordnung") sind kein Untersucher
  const refraktion = text(mitarbeiterAnzeige(brille.Refraktion));
  const untersucher =
    (/\s+lt\.\s/.test(refraktion) ? refraktion.split(/\s+lt\.\s/)[0] : "") ||
    text(mitarbeiterAnzeige(brille.Berater)) ||
    a.inhaber;

  const werte = (glas: MergeSource) => {
    // Zylinder 0 bzw. leer: Achse weglassen
    const cyl = Number(glas?.Cyl);
    return [
      formatWert(glas?.Sph, "dioptrie"),
      cyl ? formatWert(glas?.Cyl, "dioptrie") : "",
      cyl ? formatWert(glas?.A, "achse") : "",
      Number(glas?.Add) ? formatWert(glas?.Add, "dioptrie") : "",
      Number(glas?.Pr) ? formatWert(glas?.Pr, "zwei") : "",
      Number(glas?.Pr) ? formatWert(glas?.B, "achse") : "",
      formatWert(glas?.PD, "frei"),
      formatWert(glas?.HSA, "frei"),
      formatWert(glas?.Vis, "visus"),
    ];
  };
  const zellen = (inhalte: string[]) =>
    inhalte.map((z) => `<td>${eingabe(z)}</td>`).join("");
  const leer = (anzahl: number) => zellen(Array(anzahl).fill(""));

  return `
<div class="seite">
  <div class="kopf">
    <div>
      <div class="titel">Auswertungsbogen</div>
      <div class="untertitel">Ergebnis Ihrer optometrischen Untersuchung</div>
    </div>
    <div class="betrieb">${e(a.marke)}<br />${e(a.strasseKurz)} · ${e(`${a.plz} ${a.ort}`)}<br />${e(a.telefon)} · ${e(a.email)}</div>
  </div>

  <table class="tabelle personen">
    <tr><th>Name</th><td>${eingabe(name)}</td><th>Geburtsdatum</th><td>${eingabe(formatDatum(k.Geburtsdatum))}</td><th>Alter</th><td>${eingabe(alterJahre(k.Geburtsdatum, datum))}</td></tr>
    <tr><th>Datum</th><td>${eingabe(datum.format("DD.MM.YYYY"))}</td><th>Untersucher</th><td colspan="3">${eingabe(untersucher)}</td></tr>
  </table>

  <h2>Anlass / Beschwerden</h2>
  ${absatz("", "z. B. Sehverschlechterung Ferne, Kopfschmerzen am Bildschirm …")}

  <h2>Sehschärfe (Visus)</h2>
  <table class="tabelle visus">
    <tr><th>Prüfung</th><th>Rechts</th><th>Links</th><th>Beidäugig</th></tr>
    <tr><td>Ferne ohne Korrektion (sc)</td>${leer(3)}</tr>
    <tr><td>Ferne mit bisheriger Brille</td>${leer(3)}</tr>
    <tr><td class="fett">Ferne mit neuer Korrektion (cc)</td>${zellen([formatWert(r?.Vis, "visus"), formatWert(l?.Vis, "visus"), ""])}</tr>
    <tr><td>Nähe mit neuer Korrektion</td>${leer(3)}</tr>
  </table>

  <h2>Refraktionswerte</h2>
  <table class="tabelle refraktion">
    <colgroup><col style="width:20%" /><col style="width:5%" /></colgroup>
    <tr><th></th><th></th><th>Sph</th><th>Cyl</th><th>Achse</th><th>Add</th><th>Prisma</th><th>Basis</th><th>PD</th><th>HSA</th><th>Visus</th></tr>
    <tr><td rowspan="2" class="art">Bisherige Brille</td><td class="auge">R</td>${leer(9)}</tr>
    <tr><td class="auge">L</td>${leer(9)}</tr>
    <tr class="neu"><td rowspan="2" class="art fett">Neue Refraktion</td><td class="auge">R</td>${zellen(werte(r))}</tr>
    <tr class="neu"><td class="auge">L</td>${zellen(werte(l))}</tr>
  </table>

  <h2>Augeninnendruck (IOD)</h2>
  <table class="tabelle iod">
    <tr><th>Rechts</th><td>${eingabe(formatWert(r?.iod, "frei"))} mmHg</td><th>Links</th><td>${eingabe(formatWert(l?.iod, "frei"))} mmHg</td><th>Methode</th><td>${eingabe("Non-Contact-Tonometer")}</td><th>Uhrzeit</th><td>${eingabe()}</td></tr>
  </table>
  <div class="klein">Richtwert: 10–21 mmHg. Der Augeninnendruck allein erlaubt keine Aussage über ein Glaukom.</div>

  <h2>Weitere Prüfungen</h2>
  <table class="tabelle pruefungen">
    <tr><th>Prüfung</th><th>Methode</th><th class="mitte">o. B.</th><th class="mitte">auffällig</th><th class="mitte">n. d.</th><th>Befund / Bemerkung</th></tr>
    ${AUSWERTUNG_PRUEFUNGEN.map(
      ([pruefung, methode]) =>
        `<tr><td>${e(pruefung)}</td><td>${eingabe(methode)}</td><td class="mitte">${kaestchen()}</td><td class="mitte">${kaestchen()}</td><td class="mitte">${kaestchen()}</td><td>${eingabe()}</td></tr>`,
    ).join("")}
  </table>
  <div class="klein">o. B. = ohne Befund, n. d. = nicht durchgeführt</div>

  <h2>Beurteilung und Empfehlung</h2>
  ${absatz("", "Zusammenfassung der Ergebnisse …")}
  <div class="wahlen">
    ${wahl("Neue Brille / Gläser empfohlen")}
    ${wahl("Bisherige Brille ausreichend")}
    ${wahl("Kontaktlinsen möglich")}
    ${wahl("Bildschirmarbeitsplatzbrille empfohlen")}
    ${wahl("Augenärztliche Kontrolle empfohlen")}
    <label class="wahl">${kaestchen()}Nächste Kontrolle in ${eingabe("", "12")} Monaten</label>
  </div>

  <p class="hinweis">Die optometrische Untersuchung ist eine Prüfung der Sehfunktionen. Sie ersetzt keine augenärztliche Untersuchung und stellt keine medizinische Diagnose. Bei plötzlicher Sehverschlechterung, Schmerzen, Lichtblitzen, Doppelbildern oder Gesichtsfeldausfällen suchen Sie bitte umgehend eine Augenärztin oder einen Augenarzt auf.</p>

  <div class="fuss">
    <div>${e(a.ort)}, ${e(dayjs().format("DD.MM.YYYY"))}</div>
    <div class="unterschrift">
      <div class="bilder">${unterschrift ? `<img class="unterschrift-bild" src="${unterschrift}" alt="" />` : ""}${stempel ? `<img class="stempel-bild" src="${stempel}" alt="" />` : ""}</div>
      <div class="linie">${e(untersucher)} · Stempel / Unterschrift</div>
    </div>
  </div>
</div>`;
};

const STYLES = `
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #222; font-size: 8.6pt; line-height: 1.35; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .seite { position: relative; width: 210mm; height: 297mm; padding: 11mm 14mm 10mm; overflow: hidden; background: #fff; }
  .kopf { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 0.6mm solid #1f3150; padding-bottom: 2mm; margin-bottom: 2.5mm; }
  .titel { font-size: 17pt; font-weight: bold; color: #1f3150; }
  .untertitel { font-size: 9pt; color: #1f7a8c; }
  .betrieb { text-align: right; font-size: 7.6pt; color: #555; }
  h2 { color: #1f7a8c; font-size: 9.6pt; margin: 2.6mm 0 1mm; }
  .fett { font-weight: bold; }
  .klein { font-size: 7pt; color: #666; margin-top: 0.4mm; }
  .tabelle { width: 100%; border-collapse: collapse; font-size: 8.2pt; }
  .tabelle th { background: #1f3150; color: #fff; text-align: left; font-weight: bold; padding: 0.7mm 1.4mm; border: 0.2mm solid #1f3150; }
  .tabelle td { border: 0.2mm solid #555; padding: 0.5mm 1.4mm; vertical-align: middle; }
  .tabelle.personen th { width: 1%; white-space: nowrap; }
  .tabelle.visus td:first-child { width: 40%; }
  .tabelle.refraktion td, .tabelle.refraktion th { text-align: center; }
  .tabelle.refraktion td.art { text-align: left; }
  .tabelle.refraktion td.auge { font-weight: bold; }
  .tabelle.refraktion tr.neu td { background: #eef5f7; }
  .tabelle.iod th { width: 1%; white-space: nowrap; }
  .tabelle.pruefungen td:first-child { width: 27%; }
  .tabelle.pruefungen td:nth-child(2) { width: 23%; }
  .tabelle .mitte { text-align: center; width: 7%; }
  input.kaestchen { width: 3.2mm; height: 3.2mm; border: 0.25mm solid #333; margin: 0 1.2mm 0 0; vertical-align: middle; }
  .tabelle .mitte input.kaestchen { margin: 0; }
  .wahlen { display: grid; grid-template-columns: 1fr 1fr; gap: 1mm 6mm; margin-top: 1mm; }
  .wahl { display: flex; align-items: center; white-space: nowrap; }
  .wahl .eingabe { min-width: 8mm; width: 8mm; text-align: center; border-bottom: 0.2mm solid #555; margin: 0 1mm; }
  .eingabe { display: inline-block; min-width: 100%; min-height: 1.3em; outline: none; white-space: pre-wrap; }
  .tabelle.iod .eingabe { min-width: 10mm; width: auto; }
  .eingabe.absatz { display: block; min-height: 9mm; border: 0.2mm solid #999; padding: 0.8mm 1.4mm; }
  .hinweis { font-size: 7pt; color: #555; margin: 2.4mm 0 0; }
  .fuss { position: absolute; left: 14mm; right: 14mm; bottom: 10mm; display: flex; justify-content: space-between; align-items: flex-end; }
  .unterschrift { width: 75mm; text-align: center; }
  .bilder { position: relative; height: 20mm; }
  .unterschrift-bild { position: absolute; left: 2mm; bottom: 0; max-height: 14mm; max-width: 40mm; }
  .stempel-bild { position: absolute; right: 0; bottom: 0; max-height: 20mm; max-width: 40mm; opacity: 0.9; }
  .linie { border-top: 0.25mm solid #333; padding-top: 0.8mm; font-size: 7.4pt; color: #555; }
  ${KAESTCHEN_STYLES}
`;

const BILDSCHIRM_STYLES = `
  @media screen {
    .eingabe { background: #f3f8ff; border-radius: 2px; cursor: text; }
    .eingabe:focus { background: #e3efff; }
    .eingabe:empty::before { content: attr(data-hinweis); color: #9aa8bb; font-style: italic; }
  }
`;

const html = (inhalt: string, extra: string) => `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8" />
<title>Auswertungsbogen</title>
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

export const buildAuswertungsbogenPrintHtml = (
  daten: AuswertungsbogenDaten,
): string => html(buildAuswertungsbogenBodyHtml(daten), "");

export const buildAuswertungsbogenPreviewHtml = (
  daten: AuswertungsbogenDaten,
): string =>
  html(
    buildAuswertungsbogenBodyHtml(daten),
    `${BILDSCHIRM_STYLES}
  html { background: #eee; }
  .seite { margin: 12px auto; box-shadow: 0 1px 6px rgba(0, 0, 0, 0.2); }
  @media print { html { background: none; } .seite { margin: 0; box-shadow: none; } }`,
  );
