// Fragebogen für das Trockene Auge (Kategorie "Trockenes Auge"), nachgebaut
// nach dem Bogen des Sehzentrums (zwei Seiten): Seite 1 Fragebogen mit
// Punkteauswertung, Seite 2 therapeutischer Stufenplan. Vorausgefüllt werden
// Name, Vorname, Geschlecht, Geburtsdatum, Alter und Datum aus dem Kunden.
// Alle Angaben zu Beschwerden kreuzt der Kunde selbst an; Freitextfelder und
// die Auswertung lassen sich in der Vorschau eintippen oder von Hand
// ausfüllen. Punkte: Frage 5 (0-3) + Frage 6 (0-4) addieren, max. 28.
import dayjs from "dayjs";
import type { DocumentMergeEntities } from "./documentTemplateEngine";
import { RECHNUNG_ABSENDER, escapeHtml } from "./rechnungTemplate";
import { formatDatum, text } from "./werkstattauftragTemplate";
import { KAESTCHEN_STYLES, kaestchen } from "./formularVorschlaege";

export type TrockenesAugeDaten = { entities: DocumentMergeEntities };

const e = escapeHtml;

// in der Vorschau eintippbar, gedruckt wird der eingetippte Stand
const eintippen = (wert = "", hinweis = "", klasse = "") =>
  `<span class="eingabe ${klasse}" contenteditable="true" data-hinweis="${e(hinweis)}">${e(wert)}</span>`;

const BESCHWERDEN = [
  "Trockenheitsgefühl, Sandkorngefühl, Kratzen",
  "Irritation oder Schmerzen",
  "Brennen oder Tränenlaufen / feuchte Augen",
  "Müdigkeitsgefühl der Augen",
];

const VERSCHLIMMERUNG = ["Lesen", "Computer-Arbeit", "Autofahren", "Wind"];

const HAEUFIGKEIT = [
  { titel: "nie", punkte: 0 },
  { titel: "manchmal", punkte: 1 },
  { titel: "oft", punkte: 2 },
  { titel: "ständig", punkte: 3 },
];

const STAERKE = [
  { titel: "Keine Probleme", punkte: 0 },
  { titel: "nicht perfekt, aber nicht störend", punkte: 1 },
  { titel: "irritierend, aber stört nicht meinen Tagesablauf", punkte: 2 },
  { titel: "irritierend und stört meinen Tagesablauf", punkte: 3 },
  { titel: "ich kann meine täglichen Aufgaben nicht erfüllen", punkte: 4 },
];

const SCHWEREGRADE = [
  { punkte: "1–4", text: "Verdacht auf Trockenes Auge" },
  { punkte: "5–8", text: "leichtes Trockenes Auge" },
  { punkte: "9–16", text: "moderates Trockenes Auge" },
  { punkte: "17–28", text: "schweres Trockenes Auge" },
];

const GRADE = [
  { grad: "Grad 0", bereich: "≤ Bild A" },
  { grad: "Grad 1", bereich: "> A ≤ B" },
  { grad: "Grad 2", bereich: "> B ≤ C" },
  { grad: "Grad 3", bereich: "> C ≤ D" },
  { grad: "Grad 4", bereich: "> D ≤ E" },
  { grad: "Grad 5", bereich: "> Bild E" },
];

const STUFENPLAN: {
  stufe: string;
  zeilen: { titel: string; text?: string; punkte?: string[] }[];
}[] = [
  {
    stufe: "STUFE 1 (leicht)",
    zeilen: [
      {
        titel: "Information / Edukation",
        text: "Bei beginnendem Trockenen Auge erfolgt zuerst eine Information des Patienten über Verlauf und Prognose sowie grundsätzliche therapeutische Möglichkeiten.",
      },
      {
        titel: "Prophylaxe",
        text: "Daneben ist das Wissen um die Risikofaktoren nützlich (austrocknende Umweltfaktoren, seltener Lidschlag, Diät, negative iatrogene Faktoren), die Entstehung und Fortschreiten eines trockenen Auges begünstigen.",
      },
      {
        titel: "physikalische Therapie",
        text: "Wichtig sind in dieser Phase vor allem eigene Therapieanstrengungen des Patienten in der Alltagsumgebung. Dazu gehören physikalische Therapie mit Erwärmung und Expression der Augenlider und Meibomdrüsen inklusive Lidrandhygiene.",
      },
    ],
  },
  {
    stufe: "STUFE 2 (moderat)",
    zeilen: [
      {
        titel: "",
        text: "Greift die Therapie nicht, kann der Tränenfilm therapeutisch angegangen werden:",
      },
      {
        titel: "Tränenersatzmittel",
        text: "verschiedene konservierungsmittelfreie Tränenersatzmittel (TEM) ggf. Salbe zur Nacht",
      },
      {
        titel: "Punctum Plugs",
        text: "Reduzierung des Tränenabflusses durch reversiblen Verschluss der Tränenpünktchen mit Punctum Plugs",
      },
      {
        titel: "Teebaumöl",
        text: "Reduzierung des Befalls mit Demodex-Milben durch Teebaumölwirkstoffe",
      },
      {
        titel: "intensivierte physikalische Therapie",
        text: "intensivierte physikalische Therapie in der ärztlichen Praxis, z. B.",
        punkte: [
          "abrasive maschinelle Lidrandreinigung",
          "automatisierte maschinelle Lidwärmung und Expression",
          "intensive Lichttherapie (Intense Pulsed Light Therapy, IPL)",
        ],
      },
      {
        titel: "Pharmakotherapie topisch, systemisch",
        punkte: [
          "topische Medikamente: antibiotische sowie kombiniert antibiotisch/antiinflammatorische Medikamente wie das Makrolid-Antibiotikum Azitromycin bei Meibomdrüsendysfunktion; kortikosteroidale Immunsuppressiva; nicht-kortikosteroidale Immunsuppressiva (Lymphozytenakivierungs-Hemmer wie Cyclosporin A oder Tacrolimus / Pimecrolimus); neuartige Immunmodulatoren wie Adhäsionsmolekül-Antagonisten",
          "systemische Medikamente: etablierte mehrmonatige orale Therapiezyklen mit Tetrazyklinen (Doxycyclin, Minocyclin) zur Sekretnormalisierung der Meibomdrüsen.",
        ],
      },
    ],
  },
  {
    stufe: "STUFE 3 (schwer)",
    zeilen: [
      {
        titel: "Eigenserum-Augentropfen",
        text: "Eigenserum-Augentropfen bei schwerer Sicca-Symptomatik",
      },
      {
        titel: "Sklerale Kontaktlinsen",
        text: "Therapeutische sklerale Kontaktlinsen für dauerhafte Befeuchtung und mechanischen Schutz",
      },
      {
        titel: "Drüsen-Stimulantien",
        punkte: [
          "Stimulantien der Sekretion von Tränenkomponenten (Engl.: „Secretagogues“)",
          "Pharmaka, die die Bildung der Tränenkomponenten erhöhen, erlauben eine langfristigere Wirkung",
          "Stoffe, die lediglich die Freisetzung bereits produzierter Stoffe aus Drüsenzellen auslösen, können nur kurzfristig wirken",
        ],
      },
    ],
  },
  {
    stufe: "STUFE 4 (sehr schwer)",
    zeilen: [
      {
        titel: "chirurgische Therapieoptionen",
        punkte: [
          "Chirurgischer Verschluss der Tränenpünktchen durch Kauterisierung",
          "Behebung von Fehlstellungen des Augenlides, ggf. von einem Ektropium oder Entropium",
          "Amnionmembran-Abdeckung defekter Oberflächen zur Heilung",
          "Tarsorrhaphie zur Verminderung der Tränen-Verdunstung",
          "Transplantation von Speicheldrüsen oder von deren Ausführungsgängen zur Befeuchtung der Augenoberfläche",
        ],
      },
    ],
  },
];

const alter = (geburtsdatum: unknown): string => {
  const roh = text(geburtsdatum);
  if (!roh) return "";
  const geboren = dayjs(roh);
  if (!geboren.isValid()) return "";
  const jahre = dayjs().diff(geboren, "year");
  return jahre >= 0 ? String(jahre) : "";
};

const kopfFeld = (label: string, wert = "", klasse = "") =>
  `<div class="kfeld ${klasse}"><span class="klbl">${e(label)}</span><span class="kwert">${e(wert)}</span></div>`;

const frageTitel = (nr: number, titel: string, zusatz = "") =>
  `<div class="frage"><span class="nr">${nr}.</span> ${titel}${zusatz ? ` <span class="zusatz">${e(zusatz)}</span>` : ""}</div>`;

const jaNein = () =>
  `<span class="jn"><label>${kaestchen()}Ja</label><label>${kaestchen()}Nein</label></span>`;

const tabelleBeschwerden = () =>
  `<table class="tab"><thead><tr><th class="links"></th><th class="schmal">Ja</th><th class="schmal">Nein</th></tr></thead><tbody>${BESCHWERDEN.map(
    (b) =>
      `<tr><td class="links">${e(b)}</td><td>${kaestchen()}</td><td>${kaestchen()}</td></tr>`,
  ).join("")}</tbody></table>`;

const tabelleHaeufigkeit = () =>
  `<table class="tab"><thead><tr><th class="links">BESCHWERDEN</th>${HAEUFIGKEIT.map(
    (h) => `<th>${e(h.titel)}<br /><span class="pkt">(${h.punkte})</span></th>`,
  ).join("")}</tr></thead><tbody>${BESCHWERDEN.map(
    (b) =>
      `<tr><td class="links">${e(b)}</td>${HAEUFIGKEIT.map(
        () => `<td>${kaestchen()}</td>`,
      ).join("")}</tr>`,
  ).join("")}</tbody></table>`;

const tabelleStaerke = () =>
  `<table class="tab"><thead><tr><th class="links">BESCHWERDEN</th>${STAERKE.map(
    (s) =>
      `<th class="klein">${e(s.titel)}<br /><span class="pkt">(${s.punkte})</span></th>`,
  ).join("")}</tr></thead><tbody>${BESCHWERDEN.map(
    (b) =>
      `<tr><td class="links">${e(b)}</td>${STAERKE.map(
        () => `<td>${kaestchen()}</td>`,
      ).join("")}</tr>`,
  ).join("")}</tbody></table>`;

const untersuchung = () => `
  <div class="untersuchung">
    <div class="grade">
      <div class="glbl">Auswertung der Fluoreszein- (HH-Beurteilung) bzw. Bengalrosa-/Lissamingrün- (BH-Beurteilung) Färbung</div>
      <table class="tab grad"><tbody>
        <tr>${GRADE.map((g) => `<td><b>${e(g.grad)}</b><br />${e(g.bereich)}<br />${kaestchen()}</td>`).join("")}</tr>
      </tbody></table>
    </div>
    <div class="ukasten">
      ${["Meibografie", "Tear-Lab", "Keratograph", "Augenarzt"]
        .map((u) => `<div class="urow"><span>${e(u)}:</span>${jaNein()}</div>`)
        .join("")}
    </div>
  </div>`;

const auswertung = () => `
  <div class="auswertung">
    <div class="abox">
      <div class="atitel">Auswertung</div>
      <div class="ahinweis">(Punktwerte bei Frage 5 und Frage 6 addieren):</div>
      <div class="punktekasten">${eintippen("", "Punkte")}</div>
    </div>
    <table class="schwere"><thead><tr><th>Punkte</th><th>Schweregrad</th></tr></thead><tbody>${SCHWEREGRADE.map(
      (s) => `<tr><td>${e(s.punkte)}</td><td><b>${e(s.text)}</b></td></tr>`,
    ).join("")}</tbody></table>
  </div>`;

const fuss = (seite: number) => {
  const a = RECHNUNG_ABSENDER;
  return `<div class="fuss"><span>${e(a.marke)} - ${e(a.strasseKurz)} - ${e(a.plz)} ${e(a.ort)}</span><span>Tel.: ${e(a.telefon)}</span><span>${e(a.email)}</span><span>${e(a.web)}</span><span>Seite ${seite}</span></div>`;
};

const stufenplan = () =>
  STUFENPLAN.map(
    (s) =>
      `<div class="stufe"><div class="stitel">${e(s.stufe)}</div>${s.zeilen
        .map(
          (z) =>
            `<div class="szeile"><div class="stext">${e(z.titel)}</div><div class="sinhalt">${z.text ? `<div>${e(z.text)}</div>` : ""}${
              z.punkte
                ? `<ul>${z.punkte.map((p) => `<li>${e(p)}</li>`).join("")}</ul>`
                : ""
            }</div></div>`,
        )
        .join("")}</div>`,
  ).join("");

export const buildTrockenesAugeBodyHtml = ({
  entities,
}: TrockenesAugeDaten): string => {
  const k: Record<string, unknown> = entities.kunde ?? {};
  const geschlecht = text(k.Geschlecht).toLowerCase();
  const maennlich = geschlecht === "männlich";
  const weiblich = geschlecht === "weiblich";
  return `
<div class="seite">
  <h1>Fragebogen für das Trockene Auge</h1>
  <div class="kopf">
    ${kopfFeld("Name:", text(k.Nachname), "gross")}
    ${kopfFeld("Vorname:", text(k.Vorname), "gross")}
    <div class="kfeld geschl"><span class="klbl">Geschlecht:</span><label>${kaestchen(maennlich)}männl.</label><label>${kaestchen(weiblich)}weibl.</label></div>
  </div>
  <div class="kopf">
    ${kopfFeld("Geburtsdatum:", formatDatum(k.Geburtsdatum), "gross")}
    ${kopfFeld("Alter:", alter(k.Geburtsdatum))}
    ${kopfFeld("Datum:", dayjs().format("DD.MM.YYYY"))}
  </div>

  <div class="abschnitt">${frageTitel(1, "<b>DAUER:</b> Wie lange etwa haben Sie schon Beschwerden einer Augenreizung?")}<div class="zeile">${eintippen("", "", "linie breit")}</div></div>

  <div class="zweispaltig">
    <div class="abschnitt">${frageTitel(2, "Bitte beschreiben Sie Ihre <b>BESCHWERDEN</b>", "(bitte ankreuzen)")}${tabelleBeschwerden()}</div>
    <div class="abschnitt rechts">
      ${frageTitel(3, "<b>Haupt-Beschwerde</b>")}<div class="zeile">${eintippen("", "", "linie breit")}</div>
      ${frageTitel(4, "<b>Verschlimmerung</b> tritt ein bei:")}
      <div class="verschl">${VERSCHLIMMERUNG.map((v) => `<label>${kaestchen()}${e(v)}</label>`).join("")}</div>
    </div>
  </div>

  <div class="abschnitt">${frageTitel(5, "In welcher <b>HÄUFIGKEIT</b> treten diese Beschwerden auf?", "(bitte ankreuzen)")}${tabelleHaeufigkeit()}</div>

  <div class="abschnitt">${frageTitel(6, "Mit welcher <b>STÄRKE</b> treten diese Beschwerden auf – und wie beeinflussen sie Ihr tägliches Leben?")}${tabelleStaerke()}</div>

  <div class="abschnitt kompakt">
    <div class="jzeile"><span class="nr">7.</span><span class="jfrage">Tragen / trugen Sie <b>Kontaktlinsen</b>?</span>${jaNein()}<span class="nach">ggf. <b>welche</b>? ${eintippen("", "", "linie")}</span><span class="nach">ggf. <b>wie lange</b>? ${eintippen("", "", "linie kurz")}</span></div>
    <div class="jzeile"><span class="nr">8.</span><span class="jfrage">Nehmen Sie regelm. <b>Augentropfen</b>?</span>${jaNein()}<span class="nach">ggf. <b>welche</b>? ${eintippen("", "", "linie")}</span><span class="nach">ggf. <b>wie häufig</b>? ${eintippen("", "", "linie kurz")}</span></div>
    <div class="jzeile"><span class="nr">9.</span><span class="jfrage">Nehmen Sie andere <b>Medikamente</b>?</span>${jaNein()}<span class="nach">ggf. <b>welche</b>? ${eintippen("", "", "linie breit")}</span></div>
    <div class="jzeile"><span class="nr">10.</span><span class="jfrage">Haben Sie chron. <b>Erkrankungen</b>?</span>${jaNein()}<span class="nach">ggf. <b>welche</b>? ${eintippen("", "", "linie")}</span><span class="hinweis">z. B. Rheuma / Schilddrüse / Bluthochdr. / Diabetes</span></div>
    <div class="therapie"><div class="ttitel">THERAPIE gegen das Trockene Auge:</div>
      <div class="jzeile"><span class="jfrage">Haben oder hatten Sie eine <b>Therapie</b>?</span>${jaNein()}<span class="nach">ggf. <b>welche</b>? ${eintippen("", "", "linie")}</span><span class="nach">ggf. <b>wie lange</b>? ${eintippen("", "", "linie kurz")}</span></div>
    </div>
  </div>

  ${untersuchung()}
  ${auswertung()}
  ${fuss(1)}
</div>

<div class="seite">
  <h1>Therapeutischer Stufenplan für das Trockene Auge</h1>
  ${stufenplan()}
  ${fuss(2)}
</div>`;
};

const STYLES = `
  ${KAESTCHEN_STYLES}
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #111827; font-size: 8.4pt; line-height: 1.25; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .seite { width: 210mm; min-height: 297mm; padding: 9mm 13mm 14mm; background: #fff; position: relative; }
  .seite + .seite { break-before: page; page-break-before: always; }
  h1 { font-size: 15pt; margin: 0 0 3mm; text-align: center; text-decoration: underline; }
  .kopf { display: flex; gap: 5mm; margin-bottom: 1.8mm; align-items: flex-end; }
  .kfeld { display: flex; align-items: flex-end; gap: 1.5mm; flex: 1; }
  .kfeld.gross { flex: 2; }
  .klbl { font-weight: bold; white-space: nowrap; }
  .kwert { flex: 1; border-bottom: 0.25mm solid #374151; min-height: 4.8mm; padding: 0 1mm; font-size: 9.5pt; }
  .kfeld.geschl { flex: 1.3; gap: 3mm; }
  .kfeld.geschl label, .verschl label, .jn label { display: inline-flex; align-items: center; gap: 1.3mm; white-space: nowrap; }
  .abschnitt { margin-top: 2.6mm; }
  .abschnitt.kompakt { margin-top: 3mm; }
  .zweispaltig { display: flex; gap: 6mm; align-items: flex-start; }
  .zweispaltig > .abschnitt { flex: 1; }
  .zweispaltig > .abschnitt:first-child { flex: 1.25; }
  .frage { font-size: 9pt; margin-bottom: 1mm; }
  .frage .nr, .jzeile .nr { font-weight: bold; margin-right: 0.8mm; }
  .zusatz { font-weight: normal; margin-left: 3mm; }
  .zeile { margin: 1mm 0 2mm; }
  .eingabe { outline: none; white-space: pre-wrap; }
  .eingabe.linie { display: inline-block; min-width: 38mm; border-bottom: 0.25mm solid #6b7280; vertical-align: bottom; min-height: 4.4mm; padding: 0 1mm; }
  .eingabe.linie.kurz { min-width: 20mm; }
  .eingabe.linie.breit { display: block; width: 100%; }
  .punktekasten .eingabe { display: block; width: 100%; height: 100%; text-align: center; font-size: 14pt; font-weight: bold; }
  .tab { width: 100%; border-collapse: collapse; table-layout: fixed; }
  .tab th, .tab td { border: 0.3mm solid #111827; padding: 0.9mm 1mm; text-align: center; vertical-align: middle; }
  .tab th { font-size: 8pt; }
  .tab th.klein { font-size: 6.6pt; font-weight: normal; }
  .tab th.klein .pkt, .tab th .pkt { font-weight: bold; font-size: 8pt; }
  .tab .links { text-align: left; width: 38%; }
  .tab th.links { font-weight: bold; }
  .tab th.schmal { width: 12%; }
  .tab tbody td { height: 6mm; }
  .tab.grad td { font-size: 7pt; height: auto; padding: 1mm; }
  .verschl { display: flex; flex-direction: column; gap: 1.2mm; margin: 1.5mm 0 0 4mm; }
  .jzeile { display: flex; align-items: flex-end; gap: 3mm; flex-wrap: wrap; margin-bottom: 2mm; }
  .jfrage { white-space: nowrap; }
  .nach { white-space: nowrap; }
  .hinweis { font-size: 7.5pt; color: #4b5563; }
  .jn { display: inline-flex; gap: 4mm; font-weight: bold; }
  .therapie { margin-top: 3mm; }
  .ttitel { font-weight: bold; text-decoration: underline; margin-bottom: 1.5mm; }
  .untersuchung { display: flex; gap: 5mm; margin-top: 3mm; align-items: flex-start; }
  .grade { flex: 1.8; }
  .glbl { font-size: 7pt; font-weight: bold; margin-bottom: 1mm; }
  .ukasten { flex: 1; display: flex; flex-direction: column; gap: 1.4mm; }
  .urow { display: flex; justify-content: space-between; align-items: center; font-weight: bold; }
  .auswertung { display: flex; gap: 8mm; margin-top: 4mm; align-items: flex-end; }
  .abox { flex: 1; }
  .atitel { display: inline-block; font-weight: bold; font-size: 11pt; border: 0.3mm solid #111827; padding: 0.8mm 2mm; margin-bottom: 1.5mm; }
  .ahinweis { margin-bottom: 1.5mm; }
  .punktekasten { width: 24mm; height: 14mm; border: 0.4mm solid #111827; }
  .schwere { flex: 1; border-collapse: collapse; }
  .schwere th { text-align: left; border-bottom: 0.3mm solid #111827; padding: 0.6mm 2mm 0.6mm 0; }
  .schwere td { padding: 0.7mm 4mm 0.7mm 0; font-size: 9pt; }
  .kaestchen { width: 3.4mm; height: 3.4mm; border: 0.3mm solid #111827; margin: 0; flex: none; vertical-align: middle; }
  .stufe { margin-bottom: 4mm; }
  .stitel { font-weight: bold; font-size: 9.5pt; border-top: 0.3mm solid #111827; border-bottom: 0.3mm solid #111827; padding: 1mm 0; margin-bottom: 1mm; }
  .szeile { display: flex; gap: 4mm; padding: 1.1mm 0; border-bottom: 0.2mm solid #9ca3af; }
  .stext { width: 36mm; flex: none; font-size: 8.2pt; }
  .sinhalt { flex: 1; font-size: 8.4pt; }
  .sinhalt ul { margin: 0.8mm 0 0; padding-left: 4.5mm; list-style: square; }
  .sinhalt li { margin-bottom: 0.8mm; }
  .fuss { position: absolute; left: 13mm; right: 13mm; bottom: 6mm; display: flex; justify-content: space-between; font-size: 7pt; color: #374151; }
`;

export const buildTrockenesAugePrintHtml = (
  daten: TrockenesAugeDaten,
): string => `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8" />
<title>Fragebogen für das Trockene Auge</title>
<style>
  ${STYLES}
  @page { size: A4; margin: 0; }
</style>
</head>
<body>
${buildTrockenesAugeBodyHtml(daten)}
</body>
</html>`;

export const buildTrockenesAugePreviewHtml = (
  daten: TrockenesAugeDaten,
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
${buildTrockenesAugeBodyHtml(daten)}
</body>
</html>`;
