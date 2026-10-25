// Gutachten Kinderoptometrie (Kategorie "Gutachten Kinderoptometrie"),
// nachgebaut nach der Papiervorlage auf zwei A4-Seiten.
// Automatisch übernommen: Name und Geburtsdatum des Kindes, das Alter am
// Untersuchungstag, die Refraktionswerte (subjektive Testkorrektion) und der
// Visus mit Korrektur aus dem Auftrag sowie Datum, Betrieb und Bearbeiter.
// Alles andere wird in der Vorschau direkt eingetippt (anklickbare Felder);
// gedruckt wird der Stand der Vorschau.
import dayjs from "dayjs";
import type {
  DocumentMergeEntities,
  MergeSource,
} from "./documentTemplateEngine";
import { RECHNUNG_ABSENDER, escapeHtml } from "./rechnungTemplate";
import { formatDatum, formatWert, text } from "./werkstattauftragTemplate";
import { mitarbeiterAnzeige } from "./mitarbeiterNamen";

export type GutachtenKinderoptometrieDaten = {
  entities: DocumentMergeEntities;
};

const e = escapeHtml;

// Feld zum Eintippen in der Vorschau; `hinweis` erscheint nur am Bildschirm,
// solange das Feld leer ist
const eingabe = (wert = "", hinweis = "") =>
  `<span class="eingabe" contenteditable="true" data-hinweis="${e(hinweis)}">${e(wert)}</span>`;

// Absatz zum Eintippen (mehrzeilig)
const absatz = (wert = "", hinweis = "") =>
  `<div class="eingabe absatz" contenteditable="true" data-hinweis="${e(hinweis)}">${e(wert)}</div>`;

/** Alter am Stichtag, z. B. "8 Jahre, 5 Monate". */
export const alterText = (geburtsdatum: unknown, stichtag = dayjs()) => {
  const geburt = dayjs(text(geburtsdatum));
  if (!text(geburtsdatum) || !geburt.isValid() || geburt.isAfter(stichtag))
    return "";
  const monate = stichtag.diff(geburt, "month");
  const jahre = Math.floor(monate / 12);
  const rest = monate % 12;
  return [
    `${jahre} ${jahre === 1 ? "Jahr" : "Jahre"}`,
    rest ? `${rest} ${rest === 1 ? "Monat" : "Monate"}` : "",
  ]
    .filter(Boolean)
    .join(", ");
};

/** Refraktion als "+0,50 sph / −0,50 cyl × 180°". */
export const refraktionText = (glas: MergeSource) => {
  if (!glas) return "";
  const sph = formatWert(glas.Sph, "dioptrie");
  // Zylinder 0 bzw. leer wird weggelassen
  const cyl = Number(glas.Cyl) ? formatWert(glas.Cyl, "dioptrie") : "";
  const achse = formatWert(glas.A, "achse");
  return [
    sph ? `${sph} sph` : "",
    cyl ? `${cyl} cyl${achse ? ` × ${achse}°` : ""}` : "",
  ]
    .filter(Boolean)
    .join(" / ");
};

const UMFANG = [
  "Anamnese und Beobachtung des visuellen Verhaltens",
  "Fern- und Nahsehschärfe mit und ohne Korrektur",
  "Objektive Refraktionsorientierung und subjektive Refraktionsbestimmung ohne Zykloplegie",
  "Pupillenreaktion, Fixation, Augenstellung und Augenbeweglichkeit",
  "Nahpunkt der Konvergenz, Vergenz- und Akkommodationsprüfungen als Funktionsprüfungen",
  "Äußere Augenbeurteilung und orientierende Untersuchung des vorderen Augenabschnitts mit fokaler Beleuchtung",
];

const UEBERSICHT: [string, string][] = [
  ["Anamnese", "erhoben"],
  ["Visus", "erhoben"],
  ["Refraktion", "orientierend"],
  ["Augenstellung / Motilität", "orientierend"],
  ["Binokularsehen", "Funktionsprüfung"],
  ["Augengesundheit", "keine vollständige Untersuchung"],
  ["Weiteres Vorgehen", "empfohlen"],
];

export const buildGutachtenKinderoptometrieBodyHtml = ({
  entities,
}: GutachtenKinderoptometrieDaten): string => {
  const k: Record<string, unknown> = entities.kunde ?? {};
  const brille: Record<string, unknown> = entities.brille ?? {};
  const { glasRechts: r, glasLinks: l } = entities;
  const a = RECHNUNG_ABSENDER;
  const untersuchung = text(brille.Datum) ? dayjs(text(brille.Datum)) : dayjs();
  const name = [k.Vorname, k.Nachname].map(text).filter(Boolean).join(" ");
  const geburt = formatDatum(k.Geburtsdatum);
  const visus = (glas: MergeSource) => formatWert(glas?.Vis, "visus");

  const zeile = (zellen: string[]) =>
    `<tr>${zellen.map((z) => `<td>${z}</td>`).join("")}</tr>`;

  return `
<div class="seite">
  <div class="kopf">GUTACHTEN &nbsp;|&nbsp; KINDEROPTOMETRIE</div>
  <h1>Angaben zur untersuchten Person</h1>
  <table class="tabelle zwei">
    <tr><th>Angabe</th><th>Daten</th></tr>
    ${zeile(["Name / Geburtsdatum", eingabe([name, geburt].filter(Boolean).join(" / "))])}
    ${zeile(["Alter am Untersuchungstag", eingabe(alterText(k.Geburtsdatum, untersuchung))])}
    ${zeile(["Begleitperson", eingabe("", "z. B. Mutter, Vater")])}
    ${zeile(["Schule / Klasse", eingabe("", "z. B. 3. Klasse")])}
    ${zeile(["Vorhandene Sehhilfe", eingabe("", "z. B. keine")])}
    ${zeile(["Untersuchungsbedingungen", eingabe("", "z. B. wach, kooperativ")])}
  </table>

  <h1>Anamnese</h1>
  <h2>Anlass und Beschwerden</h2>
  ${absatz("", "Beschwerden, seit wann, in welchen Situationen …")}
  <h2>Augen- und Gesundheitsanamnese</h2>
  ${absatz("", "Augenverletzungen/-operationen, frühere Untersuchungen, Gesundheit, Medikamente, Allergien, Familie …")}
  <p>Angaben beruhen auf dem Gespräch mit der Bezugsperson und dem Kind; eine unabhängige Überprüfung medizinischer Vorbefunde fand nicht statt.</p>
  <p class="zwischen">Untersuchungsumfang:</p>
  <ul>${UMFANG.map((u) => `<li>${e(u)}</li>`).join("")}</ul>
  <p>Nicht durchgeführt wurden eine medikamentöse Pupillenerweiterung bzw. Zykloplegie, eine Spaltlampenuntersuchung, Augeninnendruckmessung, Funduskopie und bildgebende Diagnostik. Diese Verfahren gehören bei entsprechender Fragestellung in ärztliche Hände. Die nichtzykloplegische Refraktion kann bei Kindern durch die Akkommodation beeinflusst sein und ist keine abschließende Refraktionsdiagnostik.</p>

  <h2>Sehschärfe</h2>
  <table class="tabelle vier">
    <tr><th>Prüfung</th><th>Rechts (OD)</th><th>Links (OS)</th><th>Beidäugig (OU)</th></tr>
    ${zeile(["Fern ohne Korrektur", eingabe(), eingabe(), eingabe()])}
    ${zeile(["Fern mit subjektiver Testkorrektion", eingabe(visus(r)), eingabe(visus(l)), eingabe()])}
    ${zeile(["Nähe ohne Korrektur (40 cm)", eingabe(), eingabe(), eingabe()])}
    ${zeile(["Nähe mit Testkorrektion", eingabe(), eingabe(), eingabe()])}
  </table>
  <div class="anmerkung">${eingabe("Sehzeichen wurden altersgerecht und monokular mit Abdeckung präsentiert.")}</div>

  <h2>Refraktion</h2>
  <table class="tabelle drei">
    <tr><th>Messung</th><th>Rechts (OD)</th><th>Links (OS)</th></tr>
    ${zeile(["Objektive Orientierung ohne Zykloplegie", eingabe(), eingabe()])}
    ${zeile(["Subjektive Testkorrektion", eingabe(refraktionText(r)), eingabe(refraktionText(l))])}
  </table>
</div>

<div class="seite">
  <table class="tabelle drei">
    <tr><th>Bereich</th><th>Ergebnis</th><th>Status</th></tr>
    ${UEBERSICHT.map(([bereich, status]) => zeile([e(bereich), eingabe(), eingabe(status)])).join("")}
  </table>
  ${absatz("Werte stellen keine Brillenverordnung dar. Wegen fehlender Zykloplegie ist eine latente Hyperopie nicht ausgeschlossen.")}

  <h2>Pupillen, Fixation und äußere Augen</h2>
  ${absatz("", "Pupillenreaktion, Fixation, Lider, Bindehaut, Hornhaut …")}
  <h2>Augenstellung und Motilität</h2>
  ${absatz("", "Abdeck-/Aufdecktest, Augenbewegungen, Nystagmus …")}
  <h2 class="linie">Zusammenfassende Beurteilung</h2>
  ${absatz("", "Zusammenfassung der Befunde …")}
  <p>Die Befunde begründen keine definitive Diagnose. Eine nichtzykloplegische subjektive Refraktion kann bei Kindern unvollständig sein.</p>

  <h2>Empfehlungen und weiteres Vorgehen</h2>
  <p>Bei plötzlich auftretendem Schielen, anhaltenden Doppelbildern, deutlichem Sehschärfenverlust, Schmerzen, Lichtscheu, Verletzung oder auffälliger Rötung unverzüglich ärztliche Hilfe einholen.</p>
  ${absatz("", "weitere Empfehlungen, z. B. erneute Funktionsprüfung, Beobachtung bis zum nächsten Termin …")}
  <p class="klein">(Zeitnahe reguläre augenärztliche Untersuchung zur vollständigen Beurteilung der Augen und zur kindgerechten Refraktionsbestimmung, gegebenenfalls unter Zykloplegie. Die Entscheidung über Medikamente und diagnostisches Vorgehen trifft die Augenärztin oder der Augenarzt.)</p>

  <div class="fuss">
    <span>Datum: ${e(dayjs().format("DD.MM.YYYY"))}</span>
    <span>${e(a.marke)} &nbsp;&nbsp; ${e(text(mitarbeiterAnzeige(brille.Berater)) || a.inhaber)}</span>
  </div>
</div>`;
};

const STYLES = `
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #333; font-size: 9pt; line-height: 1.4; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .seite { position: relative; width: 210mm; height: 297mm; padding: 14mm 16mm 16mm 16mm; overflow: hidden; background: #fff; page-break-after: always; }
  .seite:last-child { page-break-after: auto; }
  .kopf { font-size: 8pt; font-weight: bold; color: #777; letter-spacing: 0.2mm; margin-bottom: 3mm; }
  h1 { color: #1f3150; font-size: 14pt; margin: 3mm 0 3mm; }
  h2 { color: #1f7a8c; font-size: 10.5pt; margin: 4mm 0 1.5mm; }
  h2.linie { border-bottom: 0.3mm solid #333; padding-bottom: 0.5mm; }
  p { margin: 1mm 0 1.6mm; }
  .zwischen { margin-bottom: 0.5mm; }
  ul { margin: 0 0 1.6mm 5mm; padding-left: 4mm; }
  .klein, .anmerkung { font-size: 7.4pt; color: #555; }
  .tabelle { width: 100%; border-collapse: collapse; margin: 1mm 0 1.5mm; font-size: 8.4pt; }
  .tabelle th { background: #1f3150; color: #fff; text-align: left; font-weight: bold; padding: 1mm 1.6mm; border: 0.2mm solid #1f3150; }
  .tabelle td { border: 0.2mm solid #444; padding: 0.6mm 1.6mm; vertical-align: middle; }
  .tabelle.zwei td:first-child, .tabelle.zwei th:first-child { width: 50%; }
  .tabelle.drei td:first-child { width: 31%; }
  .tabelle.vier td:first-child { width: 22%; }
  .eingabe { display: inline-block; min-width: 100%; min-height: 1.4em; outline: none; white-space: pre-wrap; }
  .eingabe.absatz { display: block; margin: 0.5mm 0 1.6mm; }
  .fuss { position: absolute; left: 16mm; right: 16mm; bottom: 10mm; display: flex; justify-content: space-between; font-size: 8pt; color: #777; font-weight: bold; }
`;

// nur am Bildschirm: Eingabefelder markieren und leere mit Hinweis zeigen
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
<title>Gutachten Kinderoptometrie</title>
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

export const buildGutachtenKinderoptometriePrintHtml = (
  daten: GutachtenKinderoptometrieDaten,
): string => html(buildGutachtenKinderoptometrieBodyHtml(daten), "");

export const buildGutachtenKinderoptometriePreviewHtml = (
  daten: GutachtenKinderoptometrieDaten,
): string =>
  html(
    buildGutachtenKinderoptometrieBodyHtml(daten),
    `${BILDSCHIRM_STYLES}
  html { background: #eee; }
  .seite { margin: 12px auto; box-shadow: 0 1px 6px rgba(0, 0, 0, 0.2); }
  @media print { html { background: none; } .seite { margin: 0; box-shadow: none; } }`,
  );
