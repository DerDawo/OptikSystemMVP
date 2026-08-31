// Issue #90: eigenständige HTML/CSS-Vorlage für die Kategorie
// "Berechtigungsschein" (Berechtigungsschein zur Abrechnung von Sehhilfen
// gemäß § 33 Abs. 2 bis 4 SGB V, Folgeversorgung/Direktabrechnung).
//
// Wie bei der Rechnung (rechnungTemplate.ts) braucht dieses Formular echte
// Tabellen/Ankreuzfelder und Unterschriftszeilen - das lässt sich nicht
// sinnvoll in einem frei editierbaren {{platzhalter}}-Fließtext (siehe
// documentTemplateEngine.ts) abbilden. Der Vorlagentext des
// "Berechtigungsschein"-Datensatzes in `dokumentvorlage` dient daher nur
// dazu, dass "Berechtigungsschein erstellen" (FormulareDialog.tsx) einen
// aktiven Datensatz dieser Kategorie findet; das tatsächliche Layout kommt
// aus dieser Datei.
import dayjs from "dayjs";
import type {
  DocumentMergeEntities,
  MergeSource,
} from "./documentTemplateEngine";
import { escapeHtml } from "./rechnungTemplate";

// Voraussetzungen für die Direktabrechnung nach § 33 Abs. 2/3 SGB V (siehe
// Abschnitt 4 des Referenzformulars): Zuschussalter für Gläser/
// Augenglasbestimmung sowie die Dioptrien-Mindestwerte, ab denen die
// Krankenkasse unabhängig vom Alter leistungspflichtig ist.
const ZUSCHUSS_ALTER_MIN = 14;
const ZUSCHUSS_ALTER_MAX = 18;
const SEHSCHWAECHE_SPH_GRENZE = 6.25;
const HORNHAUTVERKRUEMMUNG_CYL_GRENZE = 4.25;

const formatDatum = (value: unknown): string => {
  if (!value) {
    return "";
  }
  const parsed = dayjs(String(value));
  return parsed.isValid() ? parsed.format("DD.MM.YYYY") : "";
};

const formatDioptrie = (value: unknown): string => {
  const n = Number(value);
  if (
    !Number.isFinite(n) ||
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "";
  }
  return `${n > 0 ? "+" : ""}${n.toFixed(2)}`;
};

const formatWert = (value: unknown, einheit = ""): string => {
  if (value === null || value === undefined || value === "") {
    return "";
  }
  return `${value}${einheit}`;
};

const berechneAlterAm = (
  geburtsdatum: unknown,
  stichtag: dayjs.Dayjs,
): number | null => {
  if (!geburtsdatum) {
    return null;
  }
  const geboren = dayjs(String(geburtsdatum));
  if (!geboren.isValid()) {
    return null;
  }
  return stichtag.diff(geboren, "year");
};

const ueberschreitetGrenze = (
  glas: MergeSource,
  feld: "Sph" | "Cyl",
  grenze: number,
): boolean => {
  const wert = Number(glas?.[feld]);
  return Number.isFinite(wert) && Math.abs(wert) >= grenze;
};

export type BerechtigungsscheinVoraussetzungen = {
  alterErfuellt: boolean;
  sehschwaecheErfuellt: boolean;
  hornhautverkruemmungErfuellt: boolean;
  erstverordnungVorhanden: boolean;
};

// Die ersten drei Kriterien lassen sich aus vorhandenen Stammdaten ableiten
// (Geburtsdatum, Sph/Cyl beider Gläser) und werden daher vorbelegt - bleiben
// im Formular aber als reine Ankreuzfelder zur fachlichen Prüfung markiert,
// die automatische Ermittlung ersetzt nicht die Prüfung durch den Optiker.
export const ermittleVoraussetzungen = (
  entities: DocumentMergeEntities,
  stichtag: dayjs.Dayjs,
): BerechtigungsscheinVoraussetzungen => {
  const alter = berechneAlterAm(entities.kunde?.Geburtsdatum, stichtag);
  const glaeser = [entities.glasLinks, entities.glasRechts];

  return {
    alterErfuellt:
      alter !== null &&
      alter >= ZUSCHUSS_ALTER_MIN &&
      alter <= ZUSCHUSS_ALTER_MAX,
    sehschwaecheErfuellt: glaeser.some((glas) =>
      ueberschreitetGrenze(glas, "Sph", SEHSCHWAECHE_SPH_GRENZE),
    ),
    hornhautverkruemmungErfuellt: glaeser.some((glas) =>
      ueberschreitetGrenze(glas, "Cyl", HORNHAUTVERKRUEMMUNG_CYL_GRENZE),
    ),
    erstverordnungVorhanden:
      entities.brille?.ErstverordnungMuster8Vorhanden === true,
  };
};

// Betriebsstammdaten des Leistungserbringers (Abschnitt 2 des Formulars) -
// werden über die neue `betrieb`-Tabelle (Migration
// 20260831150100_create_betrieb.sql) gepflegt, damit IK-Nummer und
// Präqualifizierung ohne Code-Deploy aktuell gehalten werden können.
export type Betrieb = {
  Name?: string | null;
  IKNummer?: string | null;
  Praequalifiziert?: boolean | null;
};

const checkbox = (checked: boolean): string =>
  `<span class="checkbox${checked ? " checked" : ""}">${checked ? "&#10003;" : ""}</span>`;

const auge = (label: string, glas: MergeSource): string => `
  <tr>
    <td class="auge-label">${escapeHtml(label)}</td>
    <td>${escapeHtml(formatDioptrie(glas?.Sph))}</td>
    <td>${escapeHtml(formatDioptrie(glas?.Cyl))}</td>
    <td>${escapeHtml(formatWert(glas?.A, "&deg;"))}</td>
    <td>${escapeHtml(formatWert(glas?.Pr))}</td>
    <td>${escapeHtml(formatWert(glas?.B))}</td>
    <td>${escapeHtml(formatWert(glas?.Vis))}</td>
  </tr>`;

export type BerechtigungsscheinDaten = {
  entities: DocumentMergeEntities;
  betrieb: Betrieb | null | undefined;
};

// Innerer Inhalt der Seite (ohne <html>/<head>) - wird sowohl für die
// Live-Vorschau im Formulare-Dialog als auch (eingebettet in
// buildBerechtigungsscheinPrintHtml) für Druck/PDF verwendet.
export const buildBerechtigungsscheinBodyHtml = ({
  entities,
  betrieb,
}: BerechtigungsscheinDaten): string => {
  const { kunde, brille, glasLinks, glasRechts } = entities;
  const stichtag = dayjs();
  const voraussetzungen = ermittleVoraussetzungen(entities, stichtag);

  const vollername = [kunde?.Anrede, kunde?.Vorname, kunde?.Nachname]
    .filter(Boolean)
    .join(" ");

  return `
<div class="berechtigungsschein">
  <h1>Berechtigungsschein zur Abrechnung von Sehhilfen (GKV)</h1>
  <p class="untertitel">Gemäß § 33 Abs. 2 bis 4 SGB V (Folgeversorgung / Direktabrechnung)</p>

  <div class="abschnitt">
    <div class="abschnitt-titel">1. Daten des Versicherten</div>
    <table class="feld-tabelle">
      <tr><td class="feld-label">Name, Vorname</td><td class="feld-wert">${escapeHtml(vollername)}</td></tr>
      <tr><td class="feld-label">Geburtsdatum</td><td class="feld-wert">${escapeHtml(formatDatum(kunde?.Geburtsdatum))}</td></tr>
      <tr><td class="feld-label">Krankenkasse</td><td class="feld-wert">${escapeHtml(formatWert(kunde?.KrankenversicherungsTyp))}</td></tr>
      <tr><td class="feld-label">Versichertennummer</td><td class="feld-wert">${escapeHtml(formatWert(kunde?.VersichertenNummer))}</td></tr>
    </table>
  </div>

  <div class="abschnitt">
    <div class="abschnitt-titel">2. Angaben zum Leistungserbringer (Optiker)</div>
    <table class="feld-tabelle">
      <tr><td class="feld-label">Betrieb/Stempel</td><td class="feld-wert">${escapeHtml(formatWert(betrieb?.Name))}</td></tr>
      <tr><td class="feld-label">IK-Nummer (Institutionskennzeichen)</td><td class="feld-wert">${escapeHtml(formatWert(betrieb?.IKNummer))}</td></tr>
      <tr><td class="feld-label">Präqualifiziert gemäß § 126 SGB V</td><td class="feld-wert">${checkbox(betrieb?.Praequalifiziert === true)} Ja</td></tr>
    </table>
  </div>

  <div class="abschnitt">
    <div class="abschnitt-titel">3. Refraktionsdaten / Ermittelte Sehwerte</div>
    <table class="werte-tabelle">
      <thead>
        <tr>
          <th></th><th>Sph</th><th>Cyl</th><th>Achse</th><th>Pris</th><th>Basis</th><th>Visus</th>
        </tr>
      </thead>
      <tbody>
        ${auge("Rechtes Auge (R)", glasRechts)}
        ${auge("Linkes Auge (L)", glasLinks)}
      </tbody>
    </table>
  </div>

  <div class="abschnitt">
    <div class="abschnitt-titel">4. Voraussetzungen für die Direktabrechnung</div>
    <p class="hinweis">Automatisch anhand hinterlegter Daten ermittelt - bitte vor Verwendung fachlich prüfen.</p>
    <table class="voraussetzungen-tabelle">
      <tr>
        <td>${checkbox(voraussetzungen.alterErfuellt)}</td>
        <td>Der Versicherte ist zwischen ${ZUSCHUSS_ALTER_MIN} und ${ZUSCHUSS_ALTER_MAX} Jahren alt (Zuschuss zu Gläsern und Augenglasbestimmung).</td>
      </tr>
      <tr>
        <td>${checkbox(voraussetzungen.sehschwaecheErfuellt)}</td>
        <td>Es liegt eine Sehschwäche von mindestens ${SEHSCHWAECHE_SPH_GRENZE.toString().replace(".", ",")} Dioptrien bei Kurz-/Weitsichtigkeit vor.</td>
      </tr>
      <tr>
        <td>${checkbox(voraussetzungen.hornhautverkruemmungErfuellt)}</td>
        <td>Es liegt eine Hornhautverkrümmung von mindestens ${HORNHAUTVERKRUEMMUNG_CYL_GRENZE.toString().replace(".", ",")} Dioptrien vor.</td>
      </tr>
      <tr>
        <td>${checkbox(voraussetzungen.erstverordnungVorhanden)}</td>
        <td>Eine augenärztliche Erstverordnung (Muster 8) liegt im System vor bzw. wurde am
          <span class="feld-wert unterstrichen">${escapeHtml(formatDatum(brille?.ErstverordnungMuster8Datum)) || "&nbsp;".repeat(20)}</span>
          ausgestellt.</td>
      </tr>
    </table>
  </div>

  <div class="abschnitt">
    <div class="abschnitt-titel">5. Bestätigung des Versicherten</div>
    <p>Ich bestätige den Erhalt der oben spezifizierten Sehhilfe. Ich wurde über eventuelle Mehrkosten
      (Eigenanteil außerhalb der Festbetragsregelung) aufgeklärt.</p>
    <p class="ort-datum">Ort, Datum: <span class="linie"></span></p>
    <div class="unterschriften">
      <div class="unterschrift">
        <span class="linie"></span>
        <div>Unterschrift des Versicherten</div>
      </div>
      <div class="unterschrift">
        <span class="linie"></span>
        <div>Unterschrift/Stempel Optiker</div>
      </div>
    </div>
  </div>
</div>`;
};

const BERECHTIGUNGSSCHEIN_STYLES = `
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .berechtigungsschein { padding: 2cm 2cm 1.5cm; font-size: 0.85rem; }
  h1 { font-size: 1.1rem; margin: 0 0 0.2em; }
  .untertitel { margin: 0 0 1.5em; color: #333; }
  .abschnitt { margin-bottom: 1.4em; }
  .abschnitt-titel { font-weight: bold; background: #eee; padding: 4px 8px; margin-bottom: 0.6em; }
  .hinweis { margin: 0 0 0.6em; font-style: italic; color: #555; font-size: 0.8rem; }
  .feld-tabelle { width: 100%; border-collapse: collapse; }
  .feld-tabelle td { padding: 3px 0; vertical-align: bottom; }
  .feld-label { width: 40%; color: #333; }
  .feld-wert { border-bottom: 1px solid #999; padding-left: 0.5em; }
  .feld-wert.unterstrichen { border-bottom: 1px solid #999; display: inline-block; min-width: 8em; }
  .werte-tabelle { width: 100%; border-collapse: collapse; }
  .werte-tabelle th, .werte-tabelle td { border: 1px solid #999; padding: 4px 8px; text-align: center; }
  .werte-tabelle .auge-label { text-align: left; font-weight: bold; }
  .voraussetzungen-tabelle { width: 100%; border-collapse: collapse; }
  .voraussetzungen-tabelle td { padding: 4px 0; vertical-align: top; }
  .voraussetzungen-tabelle td:first-child { width: 2em; }
  .checkbox { display: inline-block; width: 1.1em; height: 1.1em; border: 1px solid #333; text-align: center; line-height: 1.1em; }
  .checkbox.checked { background: #333; color: #fff; font-weight: bold; }
  .ort-datum { margin-top: 1.5em; }
  .linie { display: inline-block; border-bottom: 1px solid #333; min-width: 12em; }
  .unterschriften { display: flex; justify-content: space-between; gap: 3em; margin-top: 3em; }
  .unterschrift { flex: 1; text-align: center; font-size: 0.8rem; }
  .unterschrift .linie { display: block; min-width: 0; margin-bottom: 0.3em; }
`;

export const buildBerechtigungsscheinPrintHtml = (
  daten: BerechtigungsscheinDaten,
): string => `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8" />
<title>Berechtigungsschein</title>
<style>
  ${BERECHTIGUNGSSCHEIN_STYLES}
  @page { margin: 0; }
</style>
</head>
<body>
${buildBerechtigungsscheinBodyHtml(daten)}
</body>
</html>`;

// Für die Live-Vorschau im Formulare-Dialog (dort ohne @page-Regel, damit
// die Vorschau nicht auf Druckseitengröße beschnitten wird).
export const buildBerechtigungsscheinPreviewHtml = (
  daten: BerechtigungsscheinDaten,
): string => `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8" />
<style>${BERECHTIGUNGSSCHEIN_STYLES}</style>
</head>
<body>
${buildBerechtigungsscheinBodyHtml(daten)}
</body>
</html>`;
