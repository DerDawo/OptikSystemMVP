// Erprobungsprotokoll vergrößernde Sehhilfen (Kategorie
// "Erprobungsprotokoll"): Stellungnahme zur Verordnung nach Muster 8A,
// nachgebaut nach dem bisherigen Protokoll, aber ohne Befunde. Vorausgefüllt
// werden nur Versichertendaten, IK und Datum; Messungen, Erprobung und
// Beurteilung trägt der Augenoptiker ein. Unterschrift und Stempel bleiben
// eigenhändig.
import dayjs from "dayjs";
import type { DocumentMergeEntities } from "./documentTemplateEngine";
import { RECHNUNG_ABSENDER, escapeHtml } from "./rechnungTemplate";
import { formatDatum, text } from "./werkstattauftragTemplate";

export type ErprobungsprotokollDaten = {
  entities: DocumentMergeEntities;
  betrieb?: { IKNummer?: string | null } | null;
};

const e = escapeHtml;
const a = RECHNUNG_ABSENDER;

const leer = (anzahl: number, spalten: number) =>
  Array.from(
    { length: anzahl },
    () => `<tr>${"<td></td>".repeat(spalten)}</tr>`,
  ).join("");

const erprobungsZeilen = (geraete: string[], leerzeilen: number) =>
  geraete
    .map((g) => `<tr><td>${e(g)}</td>${"<td></td>".repeat(4)}</tr>`)
    .join("") + leer(leerzeilen, 5);

const kopf = `<tr class="kopf"><th>Sehhilfe</th><th class="schmal">Vergr.</th><th>Lesbarkeit Zeitungsdruck</th><th>Lesegeschw. / Dauer</th><th>Beurteilung</th></tr>`;

const linien = (anzahl: number) => '<div class="linie"></div>'.repeat(anzahl);

export const buildErprobungsprotokollBodyHtml = ({
  entities,
  betrieb,
}: ErprobungsprotokollDaten): string => {
  const k: Record<string, unknown> = entities.kunde ?? {};
  const name = [text(k.Nachname), text(k.Vorname)].filter(Boolean).join(", ");
  const anschrift = [
    [k.Straße, k.Hausnummer].map(text).filter(Boolean).join(" "),
    [k.Postleitzahl, k.Stadt].map(text).filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");
  const ik = text(betrieb?.IKNummer);

  return `
<div class="protokoll">
  <div class="briefkopf">
    <div class="fett gross">${e(`${a.firma} · ${a.marke}`)}</div>
    <div class="klein grau">${e(`${a.strasseLang} · ${a.plz} ${a.ort} · Tel. ${a.telefon} · ${a.email}${ik ? ` · IK ${ik}` : ""}`)}</div>
  </div>
  <h1>Erprobungsprotokoll vergrößernde Sehhilfen</h1>
  <div class="untertitel">Stellungnahme des Leistungserbringers zur Verordnung nach Muster 8A (§ 16 HilfsM-RL)</div>

  <h2>1. Versicherte / Verordnung</h2>
  <table class="raster vier">
    <tr><th>Name</th><td>${e(name)}</td><th>Geb.-Datum</th><td>${e(formatDatum(k.Geburtsdatum))}</td></tr>
    <tr><th>Anschrift</th><td>${e(anschrift)}</td><th>Krankenkasse</th><td></td></tr>
    <tr><th>Versicherten-Nr.</th><td>${e(text(k.VersichertenNummer))}</td><th>Kostenträger-Kennung</th><td>${e(text(k.KrankenkassenNummer))}</td></tr>
    <tr class="hoch"><th>Verordnung</th><td>Muster 8A vom</td><th>Verordnender Arzt</th><td></td></tr>
    <tr><th>Diagnose</th><td></td><th>Datum Erprobung</th><td>${e(dayjs().format("DD.MM.YYYY"))}</td></tr>
  </table>

  <h2>2. Augenärztlicher Befund (lt. Verordnung)</h2>
  <table class="raster">
    <tr class="kopf"><th></th><th>Rechts</th><th>Links</th><th>Bemerkung</th></tr>
    <tr><td>Refraktion Ferne</td><td></td><td></td><td></td></tr>
    <tr><td>Bestkorrigierter Fernvisus</td><td></td><td></td><td></td></tr>
    <tr><td>Vergrößerungsbedarf</td><td></td><td></td><td></td></tr>
  </table>

  <h2>3. Nahsehprüfung (eigene Messung, Nahsehprobentafel, 25 cm, bestkorrigiert)</h2>
  <table class="raster zwei">
    <tr class="kopf"><th>Prüfung</th><th>Ergebnis</th></tr>
    <tr><td>Nahvisus binokular mit Nahaddition ______ dpt</td><td></td></tr>
    <tr><td>Erforderliche Vergrößerung für Zeitungsdruck (0,4 M)</td><td></td></tr>
    <tr><td>Zentrales Sehfeld / Fixation</td><td></td></tr>
    <tr><td>Kontrastempfindlichkeit</td><td></td></tr>
    <tr><td>Handhabung / Motorik</td><td></td></tr>
  </table>

  <h2>4. Erprobung optisch vergrößernder Sehhilfen (vorrangige Versorgung nach § 16 Abs. 3)</h2>
  <table class="raster erprobung">
    ${kopf}
    ${erprobungsZeilen(["Hellfeldlupe", "Handleuchtlupe", "Standleuchtlupe", "Lupenbrille", "Fernrohrlupenbrille"], 1)}
  </table>
  <div class="ergebnis"><span class="fett">Ergebnis:</span>${linien(2)}</div>

  <h2>5. Erprobung elektronisch vergrößernder Sehhilfe</h2>
  <table class="raster erprobung">
    ${kopf.replace("Sehhilfe", "Gerät")}
    ${leer(2, 5)}
  </table>
  <div class="ergebnis"><span class="fett">Ergebnis:</span>${linien(2)}</div>

  <h2>6. Zusammenfassende Beurteilung</h2>
  <div class="pruefliste">
    <div><span class="kaestchen"></span>Leistungsrechtliche Voraussetzung erfüllt: Visus besseres Auge ______ → Sehbeeinträchtigung Stufe ______ (§ 12 HilfsM-RL)</div>
    <div><span class="kaestchen"></span>Vergrößerungsbedarf ______-fach augenärztlich dokumentiert und durch eigene Messung bestätigt (§ 16 Abs. 4 HilfsM-RL)</div>
    <div><span class="kaestchen"></span>Optisch vergrößernde Sehhilfen wurden vorrangig erprobt (§ 16 Abs. 3 HilfsM-RL) und sind nicht zielführend (Ziff. 4)</div>
    <div><span class="kaestchen"></span>Die/der Versicherte ist in der Lage, die elektronische Sehhilfe zielführend einzusetzen (§ 16 Abs. 2 HilfsM-RL)</div>
    <div><span class="kaestchen"></span>Die Versorgung dient dem Ausgleich der Behinderung bei Grundbedürfnissen des täglichen Lebens (Lesen) i. S. d. § 33 SGB V</div>
  </div>
  <div class="ergebnis"><span class="fett">Weitere Begründung:</span>${linien(3)}</div>

  <h2>7. Abgegebenes Hilfsmittel</h2>
  <table class="raster hilfsmittel">
    <tr><th>Produkt</th><td></td></tr>
    <tr><th>Hilfsmittelpositionsnummer</th><td></td></tr>
    <tr><th>Abgabedatum</th><td></td></tr>
    <tr><th>Preis / Kostenvoranschlag</th><td></td></tr>
  </table>

  <div class="abschluss">
    <div>${e(a.ort)}, den ____________</div>
    <div class="unterschriften">
      <div><div class="strich"></div>${e(a.inhaber)}, Augenoptikermeister</div>
      <div><div class="strich"></div>${e(a.marke)} · Stempel</div>
    </div>
  </div>
</div>`;
};

const STYLES = `
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #111; font-size: 9pt; line-height: 1.3; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .protokoll { width: 210mm; padding: 14mm 17mm; background: #fff; }
  .fett { font-weight: bold; }
  .gross { font-size: 11pt; }
  .klein { font-size: 7.5pt; }
  .grau { color: #555; }
  .briefkopf { margin-bottom: 5mm; }
  h1 { color: #1f3a6a; font-size: 15pt; margin: 0; }
  .untertitel { font-style: italic; color: #555; margin-bottom: 4mm; }
  h2 { color: #1f3a6a; font-size: 10pt; margin: 4mm 0 1mm; break-after: avoid; page-break-after: avoid; }
  table { border-collapse: collapse; width: 100%; }
  tr { break-inside: avoid; page-break-inside: avoid; }
  .raster th, .raster td { border: 0.25mm solid #888; padding: 1.2mm 1.6mm; text-align: left; vertical-align: top; height: 7mm; }
  .raster th { background: #e8e8e8; font-weight: bold; }
  .raster .kopf th { background: #e8e8e8; }
  .raster td:first-child { width: 28%; }
  .vier th { width: 18%; }
  .vier td { width: 32%; }
  .vier .hoch td, .vier .hoch th { height: 11mm; }
  .zwei td:first-child { width: 45%; }
  .erprobung td:first-child { width: 22%; }
  .erprobung .schmal { width: 9%; }
  .erprobung td, .erprobung th { height: 9mm; }
  .hilfsmittel th { width: 32%; }
  .hilfsmittel td { background: #fdf3d6; }
  .ergebnis { margin-top: 2mm; break-inside: avoid; }
  .linie { border-bottom: 0.25mm solid #999; height: 6mm; }
  .pruefliste div { margin-bottom: 1.6mm; padding-left: 6mm; text-indent: -6mm; }
  .kaestchen { display: inline-block; width: 3.2mm; height: 3.2mm; border: 0.25mm solid #333; margin-right: 2.8mm; vertical-align: -0.4mm; }
  .abschluss { margin-top: 8mm; break-inside: avoid; }
  .unterschriften { display: flex; justify-content: space-between; margin-top: 14mm; gap: 12mm; }
  .unterschriften > div { flex: 1; font-size: 8pt; }
  .strich { border-top: 0.25mm solid #111; margin-bottom: 1mm; }
`;

export const buildErprobungsprotokollPrintHtml = (
  daten: ErprobungsprotokollDaten,
): string => `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8" />
<title>Erprobungsprotokoll</title>
<style>
  ${STYLES}
  .protokoll { width: auto; padding: 0; }
  @page { size: A4; margin: 14mm 17mm; }
</style>
</head>
<body>
${buildErprobungsprotokollBodyHtml(daten)}
</body>
</html>`;

export const buildErprobungsprotokollPreviewHtml = (
  daten: ErprobungsprotokollDaten,
): string => `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8" />
<style>
  ${STYLES}
  html { background: #eee; }
  .protokoll { margin: 12px auto; box-shadow: 0 1px 6px rgba(0, 0, 0, 0.2); }
</style>
</head>
<body>
${buildErprobungsprotokollBodyHtml(daten)}
</body>
</html>`;
