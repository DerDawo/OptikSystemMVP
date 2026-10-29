// Anamnesebogen des Sehzentrums (Kategorie "Anamnesebogen"), nachgebaut nach
// der Vorlage "Anamnesebogen_Sehzentrum_Gera_4" (zwei Seiten). Vorausgefüllt
// werden die persönlichen Daten aus dem Kunden und die Brillenstärken: alt
// aus dem vorherigen Brillenauftrag, neu aus dem aktuellen. Die Stärken und
// "Besonderheiten Brille und Gläser" lassen sich in der Vorschau eintippen;
// alle Gesundheitsangaben kreuzt der Kunde selbst an und unterschreibt.
import dayjs from "dayjs";
import type {
  DocumentMergeEntities,
  MergeSource,
} from "./documentTemplateEngine";
import { RECHNUNG_ABSENDER, escapeHtml } from "./rechnungTemplate";
import { formatDatum, formatWert, text } from "./werkstattauftragTemplate";
import { KAESTCHEN_STYLES, kaestchen } from "./formularVorschlaege";

export type AnamneseDaten = { entities: DocumentMergeEntities };

const e = escapeHtml;

const JA_NEIN = ["Ja", "Nein", "Weiß ich nicht"];

type Datensatz = MergeSource;

const STAERKEN = [
  { feld: "Sph", titel: "Sph", format: "dioptrie" },
  { feld: "Cyl", titel: "Cyl", format: "dioptrie" },
  { feld: "A", titel: "Achse", format: "achse" },
  { feld: "Add", titel: "Add", format: "dioptrie" },
  { feld: "Pr", titel: "Prisma", format: "zwei" },
  { feld: "B", titel: "Basis", format: "achse" },
  { feld: "Vis", titel: "Visus", format: "frei" },
] as const;

const BESONDERHEITEN = [
  "Einstärkenbrille",
  "Gleitsichtbrille",
  "Arbeitsplatz-/Bildschirmbrille",
  "Lesebrille",
  "Sportbrille",
  "Sonnenbrille mit Stärke",
  "Entspiegelung",
  "Blaulichtfilter",
  "Selbsttönend",
  "Tönung / Polarisation",
  "Dünne Gläser (hochbrechend)",
  "Kunststoff-/Bruchsicher",
];

// in der Vorschau eintippbar, gedruckt wird der eingetippte Stand
const eintippen = (wert = "", hinweis = "", klasse = "") =>
  `<div class="eingabe ${klasse}" contenteditable="true" data-hinweis="${e(hinweis)}">${e(wert)}</div>`;

const staerken = (
  titel: string,
  rechts?: Datensatz,
  links?: Datensatz,
  datum?: unknown,
) => {
  const zeile = (seite: string, glas?: Datensatz) =>
    `<tr><th>${seite}</th>${STAERKEN.map(
      (s) =>
        `<td>${eintippen(glas ? formatWert(glas[s.feld], s.format) : "")}</td>`,
    ).join("")}</tr>`;
  const vom = formatDatum(datum);
  return `<div class="staerken"><div class="glbl">${e(titel)}${vom ? ` <span class="vom">(Brille vom ${e(vom)})</span>` : ""}</div>
    <table><thead><tr><th></th>${STAERKEN.map((s) => `<th>${s.titel}</th>`).join("")}</tr></thead>
    <tbody>${zeile("R", rechts)}${zeile("L", links)}</tbody></table></div>`;
};

const feld = (label: string, wert = "", klasse = "") =>
  `<div class="feld ${klasse}"><div class="lbl">${e(label)}</div><div class="wert">${e(wert)}</div></div>`;

const auswahl = (optionen: string[], gewaehlt?: string) =>
  `<div class="optionen">${optionen
    .map((o) => `<label>${kaestchen(o === gewaehlt)}${e(o)}</label>`)
    .join("")}</div>`;

const frage = (text: string) =>
  `<div class="frage"><div class="ftext">${e(text)}</div>${auswahl(JA_NEIN)}</div>`;

const gruppe = (label: string, optionen: string[], gewaehlt?: string) =>
  `<div class="gruppe"><div class="glbl">${e(label)}</div>${auswahl(optionen, gewaehlt)}</div>`;

const eingabe = (label: string) =>
  `<div class="frage"><div class="ftext">${e(label)}</div><div class="kasten"></div></div>`;

export const buildAnamneseBodyHtml = ({ entities }: AnamneseDaten): string => {
  const k: Record<string, unknown> = entities.kunde ?? {};
  const a = RECHNUNG_ABSENDER;
  const geschlecht = text(k.Geschlecht).toLowerCase();
  const geschlechtWahl =
    geschlecht === "weiblich"
      ? "Weiblich"
      : geschlecht === "männlich"
        ? "Männlich"
        : geschlecht === "divers"
          ? "Divers"
          : undefined;
  const telefon = text(k.Handy) || text(k.TelefonnummerPrivat);
  const fuss = (seite: number) =>
    `<div class="fuss"><span>${e(a.marke)} – Anamnesebogen</span><span>Seite ${seite}</span></div>`;

  return `
<div class="seite">
  <h1>Anamnesebogen</h1>
  <div class="untertitel">${e(a.marke)} · Bitte vollständig und wahrheitsgemäß ausfüllen.</div>

  <h2>Persönliche Daten</h2>
  <div class="block">
    <div class="reihe">${feld("Vorname *", text(k.Vorname))}${feld("Nachname *", text(k.Nachname))}</div>
    <div class="reihe">${feld("Geburtsdatum *", formatDatum(k.Geburtsdatum))}${feld("Datum *", dayjs().format("DD.MM.YYYY"))}</div>
    <div class="reihe">${feld("Straße *", text(k.Straße), "breit")}${feld("Hausnr. *", text(k.Hausnummer), "schmal")}</div>
    <div class="reihe">${feld("PLZ *", text(k.Postleitzahl), "schmal")}${feld("Stadt *", text(k.Stadt), "breit")}</div>
    <div class="reihe">${feld("Land *", text(k.Straße) || text(k.Stadt) ? "Deutschland" : "")}</div>
    <div class="reihe">${feld("E-Mail *", text(k.Email))}${feld("Telefon (optional)", telefon)}</div>
  </div>

  <h2>Brille &amp; Gläser</h2>
  <div class="block">
    <div class="staerken-reihe">
      ${staerken("Alte Brillenstärken", entities.vorherigesGlasRechts, entities.vorherigesGlasLinks, entities.vorherigeBrille?.Datum)}
      ${staerken("Neue Brillenstärken", entities.glasRechts, entities.glasLinks)}
    </div>
  </div>
  <div class="block">
    <div class="glbl">Besonderheiten Brille und Gläser (Mehrfachauswahl möglich)</div>
    <div class="raster3">${BESONDERHEITEN.map((o) => `<label>${kaestchen()}${e(o)}</label>`).join("")}</div>
    <div class="glbl" style="margin-top:1.5mm">Weitere Besonderheiten (z. B. Fassung, Beschwerden mit der bisherigen Brille, Wünsche)</div>
    ${eintippen("", "hier eintippen oder von Hand ausfüllen", "gross")}
  </div>

  <h2>Allgemein</h2>
  <div class="block">
    ${gruppe("Grund der Vorstellung *", ["Neue Brille", "Vorsorge", "Beschwerden", "Sonstiges"])}
    <div class="frage"><div class="ftext">Größe &amp; Gewicht * (cm / kg)</div><div class="kasten klein"></div></div>
    ${gruppe("Geschlecht *", ["Weiblich", "Männlich", "Divers"], geschlechtWahl)}
    ${frage("Rheumatische Grunderkrankung (z. B. rheumatoide Arthritis, Psoriasis)")}
    ${frage("Schlaganfall – hatten Sie selbst schon einmal einen?")}
    ${frage("Schlaganfall – gab es in Ihrer Familie Schlaganfälle?")}
    ${frage("Herzerkrankung – haben oder hatten Sie eine?")}
    ${frage("Herzerkrankung – gab es in Ihrer Familie Herzerkrankungen?")}
    ${gruppe("Rauchen Sie?", ["Nein", "Ja, aktuell", "Ex-Raucher(in)"])}
    ${eingabe("Regelmäßige Medikamente? Wenn ja, welche?")}
    ${eingabe("Bekannte Allergien (Medikamente, Augentropfen)?")}
  </div>

  <h2>Stoffwechsel</h2>
  <div class="block">
    ${frage("Haben oder hatten Sie Bluthochdruck?")}
    ${frage("Haben oder hatten Sie Diabetes?")}
    ${frage("Haben oder hatten Sie eine Schilddrüsenerkrankung?")}
  </div>
  ${fuss(1)}
</div>

<div class="seite">
  <h2>Augen</h2>
  <div class="block">
    <div class="glbl">Bekannte Augenerkrankungen (Mehrfachauswahl möglich)</div>
    <div class="raster3">
      ${[
        "Unsicher / keine Angabe",
        "keine",
        "Fehlsichtigkeit",
        "Trockene Augen",
        "Tumorerkrankungen",
        "AMD",
        "Diabet. Retinopathie",
        "Schielfehlstellungen",
        "andere",
      ]
        .map((o) => `<label>${kaestchen()}${e(o)}</label>`)
        .join("")}
    </div>
  </div>
  <div class="block">
    ${frage("Haben Sie das Gefühl, gut sehen zu können?")}
    ${gruppe("Vorherige Augenarztbesuche / -kontrollen", ["noch nie", "selten/gelegentlich", "regelmäßig"])}
    ${gruppe("Vorherige Kontrollen / Besuche beim Optiker", ["noch nie", "selten/gelegentlich", "regelmäßig"])}
    ${frage("Haben oder hatten Sie einen Grünen Star (Glaukom)?")}
    ${frage("Haben oder hatten Sie einen Grauen Star (Katarakt)?")}
  </div>

  <h2>Sehgewohnheiten</h2>
  <div class="block">
    ${gruppe("Aktuelle Sehhilfe", ["Keine", "Brille", "Kontaktlinsen", "Beides"])}
    <div class="frage"><div class="ftext">Seit wann ungefähr wird die aktuelle Sehhilfe genutzt?</div><div class="kasten klein2"></div></div>
    ${gruppe("Tägliche Bildschirmnutzung (PC, Tablet, Smartphone)", ["< 2 Std.", "2–6 Std.", "> 6 Std."])}
    ${frage("Nehmen Sie aktiv am Straßenverkehr teil (Autofahren)?")}
    ${eingabe("Beruf / Tätigkeit (relevante Sehanforderungen)")}
  </div>

  <h2>Symptome</h2>
  <div class="block">
    ${frage("Kopfschmerzen, besonders bei Naharbeit oder Bildschirmarbeit")}
    ${frage("Doppelbilder")}
    ${frage("Lichtblitze, Schatten oder „Rußregen“ im Blickfeld")}
    ${frage("Augenjucken oder -brennen")}
    ${frage("Tränende oder trockene Augen")}
    ${frage("Fremdkörpergefühl im Auge")}
    ${frage("Schwindel bei visueller Belastung")}
  </div>

  <h2>Familienanamnese – Augen</h2>
  <div class="block">
    ${frage("Gab es in Ihrer Familie Fälle von Grünem Star (Glaukom)?")}
    ${frage("Gab es in Ihrer Familie Fälle von Makuladegeneration (AMD)?")}
  </div>

  <h2>Erweiterte Anamnese</h2>
  <div class="block">
    ${frage("Asthma oder chronische Bronchitis")}
    ${frage("Myopisierung – zunehmende Kurzsichtigkeit im Alter (normale Entwicklung)")}
    ${frage("Zunahme des Astigmatismus – Dinge wirken verschwommener/verzogen, zunehmend")}
    ${frage("Anisometropie (> 2 dpt) – unterschiedliche Sehstärke beider Augen")}
    ${frage("Cortison-Augentropfen")}
    ${frage("Zunehmend eingeschränkte Berufstauglichkeit aufgrund des Visus")}
    ${frage("Zunehmend erhöhter Lichtbedarf, besonders bei Arbeiten in der Nähe")}
    ${frage("Zunahme der Blendempfindlichkeit bei Nacht")}
    <div class="glbl" style="margin-top:2mm">Sonstige Anmerkungen</div>
    <div class="kasten gross"></div>
  </div>

  <div class="block einwilligung"><label>${kaestchen()}<b>Ich willige in die Verarbeitung meiner Daten gemäß DSGVO ein. *</b></label></div>

  <div class="unterschrift">
    <div><div class="strich"></div>Ort, Datum</div>
    <div><div class="strich"></div>Unterschrift</div>
  </div>
  ${fuss(2)}
</div>`;
};

const STYLES = `
  ${KAESTCHEN_STYLES}
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #1f2937; font-size: 8pt; line-height: 1.25; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .seite { width: 210mm; min-height: 297mm; padding: 10mm 14mm 13mm; background: #fff; position: relative; }
  .seite + .seite { break-before: page; page-break-before: always; }
  h1 { font-size: 17pt; margin: 0; color: #1e2b4a; }
  .untertitel { font-size: 7.5pt; color: #6b7280; margin-bottom: 2mm; }
  h2 { font-size: 10pt; color: #1e2b4a; margin: 2.2mm 0 1mm; padding-bottom: 0.6mm; border-bottom: 0.3mm solid #d1d5db; break-after: avoid; }
  .block { background: #f3f4f6; border: 0.25mm solid #e5e7eb; padding: 1.2mm 3mm; margin-bottom: 1.2mm; break-inside: avoid; }
  .reihe { display: flex; gap: 3mm; margin-bottom: 0.8mm; }
  .feld { flex: 1; }
  .feld.breit { flex: 2.2; }
  .feld.schmal { flex: 0.8; }
  .lbl, .glbl { font-weight: bold; font-size: 7.5pt; }
  .wert { background: #fff; border: 0.25mm solid #d1d5db; min-height: 5.4mm; padding: 0.6mm 1.5mm; font-size: 9pt; }
  .optionen { display: flex; gap: 6mm; flex-wrap: wrap; }
  .optionen label, .raster3 label, .einwilligung label { display: inline-flex; align-items: center; gap: 1.5mm; white-space: nowrap; }
  .gruppe { padding: 0.5mm 0; border-bottom: 0.2mm solid #e5e7eb; }
  .frage { display: flex; justify-content: space-between; align-items: center; gap: 4mm; padding: 0.45mm 0; border-bottom: 0.2mm solid #e5e7eb; }
  .frage .ftext { font-weight: bold; font-size: 7.8pt; }
  .frage .optionen { gap: 4mm; flex: none; width: 62mm; }
  .kasten { background: #fff; border: 0.25mm solid #d1d5db; height: 5mm; width: 75mm; flex: none; }
  .kasten.klein { width: 35mm; }
  .kasten.klein2 { width: 45mm; }
  .kasten.gross { width: 100%; height: 8mm; margin-top: 0.5mm; }
  .staerken-reihe { display: flex; gap: 4mm; }
  .staerken { flex: 1; }
  .staerken .vom { font-weight: normal; color: #6b7280; }
  .staerken table { width: 100%; border-collapse: collapse; margin-top: 1mm; background: #fff; table-layout: fixed; }
  .staerken th, .staerken td { border: 0.25mm solid #d1d5db; padding: 0.6mm 0.4mm; text-align: center; font-size: 8pt; }
  .staerken thead th { font-size: 7pt; background: #e5e7eb; }
  .staerken tbody th { width: 6mm; background: #e5e7eb; }
  .eingabe { min-height: 4.6mm; outline: none; white-space: pre-wrap; }
  .eingabe.gross { background: #fff; border: 0.25mm solid #d1d5db; min-height: 10mm; margin-top: 0.5mm; padding: 1mm 1.5mm; text-align: left; }
  .raster3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.6mm 4mm; margin-top: 0.6mm; }
  .kaestchen { width: 3.1mm; height: 3.1mm; border: 0.25mm solid #374151; margin: 0; flex: none; }
  .einwilligung { margin-top: 1.5mm; }
  .unterschrift { display: flex; gap: 20mm; margin-top: 9mm; font-weight: bold; font-size: 7.8pt; }
  .unterschrift > div { flex: 1; }
  .strich { border-top: 0.25mm solid #9ca3af; margin-bottom: 1mm; }
  .fuss { position: absolute; left: 14mm; right: 14mm; bottom: 6mm; display: flex; justify-content: space-between; font-size: 7pt; color: #9ca3af; }
`;

export const buildAnamnesePrintHtml = (
  daten: AnamneseDaten,
): string => `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8" />
<title>Anamnesebogen</title>
<style>
  ${STYLES}
  @page { size: A4; margin: 0; }
</style>
</head>
<body>
${buildAnamneseBodyHtml(daten)}
</body>
</html>`;

export const buildAnamnesePreviewHtml = (
  daten: AnamneseDaten,
): string => `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8" />
<style>
  ${STYLES}
  html { background: #eee; }
  .seite { margin: 12px auto; box-shadow: 0 1px 6px rgba(0, 0, 0, 0.2); }
  @page { size: A4; margin: 0; }
  @media print { html { background: none; } .seite { margin: 0; box-shadow: none; } }
</style>
<style data-bildschirm>
  .eingabe { background: #eef5ff; cursor: text; }
  .eingabe:focus { background: #e0ecff; }
  .eingabe:empty::before { content: attr(data-hinweis); color: #9aa8bb; font-style: italic; }
</style>
</head>
<body>
${buildAnamneseBodyHtml(daten)}
</body>
</html>`;
