// Optometrische Verordnung (GKV) des Sehzentrums Gera, Kategorie
// "Optometrische Verordnung", nach dem bisherigen Formular. Die schwarzen
// Vierecke der Vorlage sind leere Kästchen zum Ankreuzen; vorausgefüllt
// werden Versichertendaten, Ausstellungsdatum und die Werte des Auftrags.
import dayjs from "dayjs";
import type {
  DocumentMergeEntities,
  MergeSource,
} from "./documentTemplateEngine";
import { RECHNUNG_ABSENDER, escapeHtml } from "./rechnungTemplate";
import { formatDatum, formatWert, text } from "./werkstattauftragTemplate";
import {
  KAESTCHEN_STYLES,
  anzahlGlaeser,
  kaestchen as kaestchenInput,
  kassenart,
  sehstaerkeVeraendert,
} from "./formularVorschlaege";

export type OptometrischeVerordnungDaten = {
  entities: DocumentMergeEntities;
};

const AUSSTELLER = {
  name: RECHNUNG_ABSENDER.marke,
  strasse: RECHNUNG_ABSENDER.strasseKurz.replace(/\.(\d)/, ". $1"),
  ort: `${RECHNUNG_ABSENDER.plz} ${RECHNUNG_ABSENDER.ort}`,
  inhaber: RECHNUNG_ABSENDER.inhaber,
};

const KASSEN = ["AOK", "LKK", "BKK", "IKK", "vDAK", "AEV", "Knappschaft"];

const kaestchen = (label: string, angekreuzt = false) =>
  `<label class="option">${kaestchenInput(angekreuzt)}${escapeHtml(label)}</label>`;

const wert = (value: string) =>
  value ? `<span class="wert">${escapeHtml(value)}</span>` : "";

const ferneZellen = (glas: MergeSource) =>
  [
    formatWert(glas?.Sph, "dioptrie"),
    formatWert(glas?.Cyl, "dioptrie"),
    formatWert(glas?.A, "achse"),
    formatWert(glas?.Pr, "zwei"),
    formatWert(glas?.B, "frei"),
  ]
    .map((v) => `<td>${wert(v)}</td>`)
    .join("");

const addZelle = (glas: MergeSource) => {
  const add = formatWert(glas?.Add, "dioptrie");
  return `<td>ADD ${wert(add)}</td><td></td><td></td><td></td><td></td>`;
};

export const buildOptometrischeVerordnungBodyHtml = ({
  entities,
}: OptometrischeVerordnungDaten): string => {
  const kunde: Record<string, unknown> = entities.kunde ?? {};
  const veraendert = sehstaerkeVeraendert(entities);
  const name = [text(kunde.Nachname), text(kunde.Vorname)]
    .filter(Boolean)
    .join(", ");
  const adresse = [
    [kunde.Straße, kunde.Hausnummer].map(text).filter(Boolean).join(" "),
    [kunde.Postleitzahl, kunde.Stadt].map(text).filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");

  return `
<div class="seite">
  <h1>Optometrische Verordnung</h1>
  <table class="kassen">
    <tr>${KASSEN.map((kasse) => `<td>${kaestchen(kasse, kassenart(kunde.Krankenkasse) === kasse)}</td>`).join("")}</tr>
  </table>
  <table class="versicherter">
    <tr><th>Name, Vorname:</th><td>${wert(name)}</td><th>geb. am:</th><td>${wert(formatDatum(kunde.Geburtsdatum))}</td></tr>
    <tr><th>Adresse:</th><td>${wert(adresse)}</td><th>Ausgestellt am:</th><td>${wert(dayjs().format("DD.MM.YYYY"))}</td></tr>
    <tr><th>Kassen-Nr.:</th><td>${wert(text(kunde.KrankenkassenNummer))}</td><th>Versicherten-Nr.:</th><td>${wert(text(kunde.VersichertenNummer))}</td></tr>
    <tr><th>Status:</th><td>${wert(text(kunde.Versichertenstatus))}</td><th>VK gültig bis:</th><td>${wert(formatDatum(kunde.VersichertenkarteGueltigBis))}</td></tr>
  </table>

  <h2>I. Erklärung des Optometristen</h2>
  <p>Die Prüfung der Sehschärfe ergab:</p>
  <div class="optionen">
    ${kaestchen("eine Veränderung von mindestens 0,5 dpt und/oder", veraendert === true)}
    ${kaestchen("eine Verbesserung von mindestens 20 Prozentpunkten (Visus)")}
    ${kaestchen("keine Veränderung", veraendert === false)}
  </div>
  <p>Aufgrund der Augenbestimmung ist/sind <span class="luecke">${veraendert === true ? wert(anzahlGlaeser(entities)) : ""}</span> Glas/Gläser mit/ohne Brillenfassung(en) erforderlich.</p>

  <h2>Kontaktlinsen</h2>
  <p>Der Versicherte trägt <span class="luecke"></span> optometrisch / ärztlich verordnete Kontaktlinse(n).</p>
  <div class="optionen zweispaltig">
    ${kaestchen("Nachlieferung innerhalb von 6 Monaten")}
    ${kaestchen("Ersatzlieferung nach 6 Monaten")}
    ${kaestchen("Formstabile (harte) Linsen")}
    ${kaestchen("Flexible (weiche) Linsen")}
    ${kaestchen("Kontrolle in Verbindung mit Aufarbeiten der Kontaktlinsen")}
    ${kaestchen("Intensivreinigung weicher Kontaktlinsen")}
  </div>

  <table class="werte">
    <tr class="kopf"><td></td><td>Sphärisch</td><td>Zylinder</td><td>Achse</td><td>Prisma</td><td>Basis</td></tr>
    <tr><td>F R</td>${ferneZellen(entities.glasRechts)}</tr>
    <tr><td>F L</td>${ferneZellen(entities.glasLinks)}</tr>
    <tr><td>N R</td>${addZelle(entities.glasRechts)}</tr>
    <tr><td>N L</td>${addZelle(entities.glasLinks)}</tr>
  </table>

  <table class="kosten">
    <tr><td colspan="3">Kostenrechnung des Optometristen</td></tr>
    <tr><td>Pos.-Nr.</td><td>Betrag €</td><td></td></tr>
    <tr><td></td><td></td><td></td></tr>
    <tr><td>abzgl. gesetzl. Zuzahlung</td><td>0,00</td><td></td></tr>
    <tr><td>Gesamtbetrag</td><td></td><td></td></tr>
  </table>

  <div class="aussteller">
    <div>${escapeHtml(AUSSTELLER.name)}</div>
    <div>${escapeHtml(AUSSTELLER.strasse)}</div>
    <div>${escapeHtml(AUSSTELLER.ort)}</div>
    <div class="abstand">Inhaber: ${escapeHtml(AUSSTELLER.inhaber)}</div>
    <div>Augenoptikermeister</div>
  </div>
  <div class="stempel"><div class="linie"></div>Firmenstempel / Unterschrift</div>
</div>`;
};

const VERORDNUNG_STYLES = `
  ${KAESTCHEN_STYLES}
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #111; font-size: 10pt; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .seite { width: 210mm; height: 297mm; padding: 10mm 15mm 12mm 12.5mm; position: relative; overflow: hidden; background: #fff; }
  h1 { text-align: center; font-size: 17pt; margin: 0 0 6mm; }
  h2 { font-size: 12pt; font-style: italic; margin: 9mm 0 2mm; }
  p { margin: 0 0 2mm; line-height: 1.3; }
  table { border-collapse: collapse; }
  td, th { border: 0.25mm solid #333; padding: 0 2mm; height: 6.3mm; text-align: left; font-weight: normal; vertical-align: middle; }
  .kassen { width: 171.5mm; margin: 0 0 3.5mm 5.9mm; table-layout: fixed; }
  .kassen td { text-align: center; white-space: nowrap; padding: 0 1mm; font-size: 9.5pt; }
  .kassen .option { margin: 0; }
  .versicherter { width: 157.5mm; margin-left: 12.9mm; table-layout: fixed; }
  .versicherter th:nth-child(1), .versicherter th:nth-child(3) { width: 31.5mm; }
  .versicherter td:nth-child(2) { width: 59.5mm; }
  .kaestchen { display: inline-block; width: 3.4mm; height: 3.4mm; border: 0.25mm solid #222; margin-right: 1.4mm; vertical-align: -0.4mm; background: #fff; }
  .option { display: inline-block; margin: 0 4mm 1.6mm 0; }
  .optionen { margin: 0 0 2.5mm 4mm; }
  .optionen .option { display: block; }
  .optionen.zweispaltig { display: grid; grid-template-columns: 1fr 1fr; column-gap: 6mm; }
  .luecke { display: inline-block; width: 14mm; border-bottom: 0.25mm solid #333; text-align: center; }
  .werte { width: 133mm; margin: 5mm 0 4mm 25.1mm; table-layout: fixed; }
  .werte td:first-child { width: 14mm; }
  .werte .kopf td { background: #ddd; }
  .kosten { width: 140mm; margin-left: 21.6mm; table-layout: fixed; }
  .kosten td:nth-child(1) { width: 70mm; }
  .wert { font-family: "Courier New", Courier, monospace; font-weight: bold; }
  .aussteller { margin-top: 8mm; line-height: 1.35; }
  .aussteller .abstand { margin-top: 3.5mm; }
  .stempel { margin-top: 14mm; width: 75mm; }
  .stempel .linie { border-top: 0.25mm solid #333; margin-bottom: 1mm; }
`;

export const buildOptometrischeVerordnungPrintHtml = (
  daten: OptometrischeVerordnungDaten,
): string => `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8" />
<title>Optometrische Verordnung</title>
<style>
  ${VERORDNUNG_STYLES}
  @page { size: A4; margin: 0; }
</style>
</head>
<body>
${buildOptometrischeVerordnungBodyHtml(daten)}
</body>
</html>`;

export const buildOptometrischeVerordnungPreviewHtml = (
  daten: OptometrischeVerordnungDaten,
): string => `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8" />
<style>
  ${VERORDNUNG_STYLES}
  html { background: #eee; }
  .seite { margin: 12px auto; box-shadow: 0 1px 6px rgba(0, 0, 0, 0.2); }
  @page { size: A4; margin: 0; }
  @media print { html { background: none; } .seite { margin: 0; box-shadow: none; } }
</style>
</head>
<body>
${buildOptometrischeVerordnungBodyHtml(daten)}
</body>
</html>`;

// Kurze optometrische Verordnung (Kategorie "Optometrische Verordnung"):
// halbe A4-Seite mit Schnittlinie, Werte in Kästchen. Über der ersten Reihe
// stehen klein die Spaltennamen, die das Papierformular nicht hat.
const pdGesamt = (rechts: MergeSource, links: MergeSource): string => {
  const r = Number(rechts?.PD);
  const l = Number(links?.PD);
  if (Number.isFinite(r) && Number.isFinite(l) && r > 0 && l > 0) {
    return formatWert(r + l, "frei");
  }
  return formatWert(rechts?.iod ?? links?.iod, "frei");
};

const addition = (rechts: MergeSource, links: MergeSource): string => {
  const r = formatWert(rechts?.Add, "dioptrie");
  const l = formatWert(links?.Add, "dioptrie");
  return r && l && r !== l ? `${r} / ${l}` : r || l;
};

const wertKaestchen = (glas: MergeSource) =>
  [
    formatWert(glas?.Sph, "dioptrie"),
    formatWert(glas?.Cyl, "dioptrie"),
    formatWert(glas?.A, "achse"),
    formatWert(glas?.Pr, "zwei"),
    formatWert(glas?.B, "frei"),
  ]
    .map((v) => `<span class="feld">${wert(v)}</span>`)
    .join("");

export const buildVerordnungKurzBodyHtml = ({
  entities,
}: OptometrischeVerordnungDaten): string => {
  const kunde: Record<string, unknown> = entities.kunde ?? {};
  const name = [text(kunde.Vorname), text(kunde.Nachname)]
    .filter(Boolean)
    .join(" ");
  const { glasRechts, glasLinks } = entities;
  const ausfuellen = (value: string, breite: string) =>
    `<span class="eintrag" style="width:${breite}">${wert(value)}</span>`;
  return `
<div class="blatt-kurz">
  <div class="kopf-kurz">
    <div class="titel-kurz">Optometrische Verordnung</div>
    <div>${escapeHtml(`${AUSSTELLER.name} · Inhaber: ${AUSSTELLER.inhaber} · Augenoptikermeister`)}</div>
    <div>${escapeHtml(`${AUSSTELLER.strasse} · ${AUSSTELLER.ort}`)}</div>
  </div>
  <div class="zeile fett">Verordnungs-Nr.: ${dayjs().year()}-${ausfuellen("", "10.6mm")}</div>
  <div class="zeile zwei">
    <span>Name: ${ausfuellen(name, "68.5mm")}</span>
    <span>Datum: ${ausfuellen(dayjs().format("DD.MM.YYYY"), "25.7mm")}</span>
  </div>
  <div class="zeile">Geb.-Datum: ${ausfuellen(formatDatum(kunde.Geburtsdatum), "25.5mm")}&nbsp;&nbsp; PD: ${ausfuellen(pdGesamt(glasRechts, glasLinks), "10.6mm")} mm</div>
  <div class="zeile refraktion">Refraktion:</div>
  <div class="werte-kurz">
    <span></span><div class="spalten"><span>Sph</span><span>Cyl</span><span>Achse</span><span>Prisma</span><span>Basis</span></div>
    <span>Ferne R</span><div class="felder">${wertKaestchen(glasRechts)}</div>
    <span>Ferne L</span><div class="felder">${wertKaestchen(glasLinks)}</div>
    <span>Nähe ADD</span><div class="felder"><span class="feld">${wert(addition(glasRechts, glasLinks))}</span></div>
  </div>
  <div class="zeile unterschrift-kurz">Stempel / Unterschrift: <span class="eintrag" style="width:70.9mm"></span></div>
</div>
<div class="schnitt-kurz"><span>✂</span></div>`;
};

const VERORDNUNG_KURZ_STYLES = `
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #111; font-size: 11pt; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .seite-kurz { width: 210mm; height: 297mm; position: relative; overflow: hidden; background: #fff; }
  .blatt-kurz { height: 148.5mm; padding: 6mm 15mm 0 10.7mm; }
  .kopf-kurz { margin-left: 62mm; text-align: center; line-height: 1.5; }
  .titel-kurz { font-size: 17pt; font-weight: bold; margin-bottom: 1mm; }
  .zeile { margin-top: 4.6mm; }
  .zeile.zwei { display: flex; justify-content: space-between; padding-right: 32mm; }
  .fett { font-weight: bold; }
  .eintrag { display: inline-block; border-bottom: 0.3mm solid #111; min-height: 5mm; vertical-align: bottom; padding: 0 1mm; }
  .refraktion { margin-top: 6mm; }
  .werte-kurz { display: grid; grid-template-columns: 47.2mm auto; row-gap: 2.3mm; margin-top: 1mm; align-items: center; }
  .spalten, .felder { display: flex; gap: 4mm; }
  .spalten span { width: 15.3mm; text-align: center; font-size: 7.5pt; color: #666; }
  .feld { width: 15.3mm; height: 6.2mm; border: 0.5mm solid #111; display: flex; align-items: center; justify-content: center; }
  .unterschrift-kurz { margin-top: 9mm; }
  .wert { font-family: "Courier New", Courier, monospace; font-weight: bold; font-size: 10pt; }
  .schnitt-kurz { border-top: 0.25mm dashed #999; position: relative; }
  .schnitt-kurz span { position: absolute; left: 4mm; top: -2.6mm; background: #fff; color: #999; font-size: 9pt; padding: 0 1mm; }
`;

export const buildVerordnungKurzPrintHtml = (
  daten: OptometrischeVerordnungDaten,
): string => `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8" />
<title>Optometrische Verordnung</title>
<style>
  ${VERORDNUNG_KURZ_STYLES}
  @page { size: A4; margin: 0; }
</style>
</head>
<body>
<div class="seite-kurz">${buildVerordnungKurzBodyHtml(daten)}</div>
</body>
</html>`;

export const buildVerordnungKurzPreviewHtml = (
  daten: OptometrischeVerordnungDaten,
): string => `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8" />
<style>
  ${VERORDNUNG_KURZ_STYLES}
  html { background: #eee; }
  .seite-kurz { margin: 12px auto; box-shadow: 0 1px 6px rgba(0, 0, 0, 0.2); }
  @page { size: A4; margin: 0; }
  @media print { html { background: none; } .seite-kurz { margin: 0; box-shadow: none; } }
</style>
</head>
<body>
<div class="seite-kurz">${buildVerordnungKurzBodyHtml(daten)}</div>
</body>
</html>`;
