// Rezeptanfrage an den Augenarzt (Kategorie "Rezeptanfrage Augenarzt"),
// nachgebaut nach dem bisherigen Optikerformular auf einer A4-Seite.
// Vorausgefüllt: Datum, Bearbeiter, Patientendaten, Refraktionswerte und PD
// des Auftrags sowie die Angaben des zuweisenden Betriebs. Diagnosen,
// Versorgung, Dringlichkeit und Einwilligung werden angekreuzt.
import dayjs from "dayjs";
import type {
  DocumentMergeEntities,
  MergeSource,
} from "./documentTemplateEngine";
import { RECHNUNG_ABSENDER, escapeHtml } from "./rechnungTemplate";
import { formatDatum, formatWert, text } from "./werkstattauftragTemplate";
import {
  KAESTCHEN_STYLES,
  diagnoseVorschlaege,
  ermitteltViaVorschlaege,
  kaestchen,
  versorgungVorschlaege,
} from "./formularVorschlaege";
import { mitarbeiterAnzeige } from "./mitarbeiterNamen";
import {
  type BetriebBilder,
  betriebBilder,
  bildUrl,
} from "./betriebBilderCache";

export type RezeptanfrageDaten = {
  entities: DocumentMergeEntities;
  // Stempel/Unterschrift; ohne Angabe die privat gespeicherten Bilder
  bilder?: BetriebBilder;
};

const e = escapeHtml;
const a = RECHNUNG_ABSENDER;

const feld = (label: string, wert = "", breite = "1fr") =>
  `<div class="feld" style="flex:${breite}"><div class="label">${e(label)}</div><div class="wert">${e(wert)}</div></div>`;

const box = (label: string, angekreuzt = false) =>
  `<label class="option">${kaestchen(angekreuzt)}${e(label)}</label>`;

const DIAGNOSEN = [
  "Myopie (Kurzsichtigkeit)",
  "Keratokonus",
  "Hyperopie (Weitsichtigkeit)",
  "Katarakt (Grauer Star)",
  "Astigmatismus (Hornhautverkrümmung)",
  "Glaukom (Grüner Star)",
  "Presbyopie (Alterssichtigkeit)",
  "Makuladegeneration (AMD)",
  "Anisometropie (Ungleichsichtigkeit)",
  "Diabetische Retinopathie",
  "Amblyopie (Schwachsichtigkeit)",
  "Aphakie / Pseudophakie",
  "Strabismus (Schielen)",
  "Netzhautablösung (Zustand nach)",
  "Nystagmus (Augenzittern)",
  "Hornhauterkrankung (sonstige)",
  "Trockenes Auge (DED)",
  "Zustand nach refraktiver OP (LASIK etc.)",
];

const VERSORGUNG = [
  "Einstärkenglas Ferne",
  "Einstärkenglas Nähe",
  "Gleitsichtglas",
  "Bifokalglas",
  "Kontaktlinsen weich",
  "Kontaktlinsen formstabil",
  "Kantenfilterglas",
  "Prismenbrille",
  "Sportbrille / Schutzbrille",
  "Low Vision (vergr. Sehhilfe)",
  "Sonnenbrille / Tönung",
];

const werteZeile = (auge: string, glas: MergeSource) =>
  `<tr><th>${auge}</th>${[
    formatWert(glas?.Sph, "dioptrie"),
    formatWert(glas?.Cyl, "dioptrie"),
    formatWert(glas?.A, "achse"),
    formatWert(glas?.Add, "dioptrie"),
    formatWert(glas?.Pr, "zwei"),
    formatWert(glas?.B, "frei"),
    formatWert(glas?.Vis, "visus"),
  ]
    .map((w) => `<td>${e(w)}</td>`)
    .join("")}</tr>`;

export const buildRezeptanfrageBodyHtml = ({
  entities,
  bilder = betriebBilder(),
}: RezeptanfrageDaten): string => {
  const stempel = bildUrl(bilder.stempel);
  const unterschrift = bildUrl(bilder.unterschrift);
  const optikerBilder =
    stempel || unterschrift
      ? `<div class="ortdatum stempelfeld">${
          stempel ? `<img class="stempel" src="${stempel}" alt="" />` : ""
        }${
          unterschrift
            ? `<img class="unterschrift" src="${unterschrift}" alt="" />`
            : ""
        }</div>`
      : '<div class="ortdatum"></div>';
  const k: Record<string, unknown> = entities.kunde ?? {};
  const brille: Record<string, unknown> = entities.brille ?? {};
  const { glasRechts: r, glasLinks: l } = entities;
  const heute = dayjs().format("DD.MM.YYYY");
  const diagnosen = diagnoseVorschlaege(entities);
  const versorgung = versorgungVorschlaege(entities);
  const ermittelt = ermitteltViaVorschlaege(entities);
  const pdR = Number(r?.PD);
  const pdL = Number(l?.PD);
  const pdGesamt =
    pdR > 0 && pdL > 0
      ? formatWert(pdR + pdL, "frei")
      : formatWert(r?.iod, "frei");
  const adresse = [
    [k.Straße, k.Hausnummer].map(text).filter(Boolean).join(" "),
    [k.Postleitzahl, k.Stadt].map(text).filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");

  return `
<div class="anfrage">
  <div class="titelzeile">
    <h1>Rezeptanfrage an den Augenarzt</h1>
    <div class="meta">Datum: <span class="eintrag">${e(heute)}</span><br />Bearbeiter: <span class="eintrag">${e(text(mitarbeiterAnzeige(brille.Berater)))}</span></div>
  </div>

  <h2>1 Patientendaten</h2>
  <div class="reihe">${feld("Nachname *", text(k.Nachname))}${feld("Vorname *", text(k.Vorname))}${feld("Geburtsdatum *", formatDatum(k.Geburtsdatum), "0.7")}</div>
  <div class="reihe">${feld("Adresse (Straße, PLZ, Ort)", adresse, "2")}${feld("Telefon / Mobil", text(k.Handy) || text(k.TelefonnummerPrivat))}</div>
  <div class="reihe">${feld("Krankenkasse", text(k.Krankenkasse))}${feld("Versichertennummer", text(k.VersichertenNummer))}${feld("Versicherungsstatus", text(k.KrankenversicherungsTyp))}</div>

  <h2>2 Aktuelle Refraktionswerte (Voruntersuchung Optiker)</h2>
  <table class="werte">
    <tr><th>Auge</th><th>Sphäre (sph)</th><th>Zylinder (cyl)</th><th>Achse (°)</th><th>Addition (add)</th><th>Prisma</th><th>Basis</th><th>Visus cc</th></tr>
    ${werteZeile("R (OD)", r)}
    ${werteZeile("L (OS)", l)}
  </table>
  <div class="reihe">${feld("PD rechts (mm)", formatWert(r?.PD, "frei"))}${feld("PD links (mm)", formatWert(l?.PD, "frei"))}${feld("Gesamte PD (mm)", pdGesamt)}${feld("Messdatum", formatDatum(brille.Datum))}</div>
  <div class="zeile">Werte ermittelt via: ${["Autorefraktometer", "Subjektive Refraktion", "Skiaskopie", "Übernahme Vorrezept"].map((v) => box(v, ermittelt.has(v))).join("")}</div>

  <h2>3 Krankheitsbilder / Diagnosen</h2>
  <div class="raster zwei">${DIAGNOSEN.map((d) => `<div>${box(d, diagnosen.has(d))}</div>`).join("")}</div>
  <div class="reihe">${feld("Weitere Diagnosen / ICD-10 Code", text(brille.Diagnose), "3")}${feld("Befunddatum")}</div>

  <h2>4 Gewünschte Versorgung</h2>
  <div class="raster vier">${VERSORGUNG.map((v) => `<div>${box(v, versorgung.has(v))}</div>`).join("")}<div>${box("Sonstiges:")}______</div></div>
  <div class="zeile">Indikation Kantenfiltergläser (GKV § 33 SGB V / Low Vision) – ICD: ____________________</div>
  <div class="zeile klein">Empfohlene Filterstufe / Tönung / Transmission (%), Filterwellenlänge (nm): ${["400", "420", "450", "480", "511", "527"].map((nm) => box(nm)).join("")}</div>
  <div class="reihe">${feld("Besonderer Bedarf (z. B. Bildschirmarbeit, Führerschein, Sport, Beruf)")}</div>

  <h2>5 Anfrage an die augenärztliche Praxis</h2>
  <div class="reihe">${feld("Zuweisender Optiker / Betrieb", `${a.firma} · ${a.marke}`)}${feld("Telefon / E-Mail Optiker", `${a.telefon} · ${a.email}`)}${feld("Anfragedatum", heute, "0.6")}</div>
  <div class="reihe">${feld("Letzte augenärztl. Untersuchung (ca.)")}<div class="feld" style="flex:1.4"><div class="label">Aktuelle Brillenglasstärke bekannt</div><div class="wert">${box("Ja")}${box("Nein")}${box("Unbekannt")}</div></div></div>
  <div class="zeile dringlich"><span>Dringlichkeit: ${box("Normal")}${box("Dringend")}</span><span>(Begründung:</span><span class="linie"></span><span>)</span></div>
  <div class="reihe freitext">${feld("Anliegen / Freitext an den Augenarzt")}</div>

  <h2>6 Datenschutz, Einwilligung &amp; Unterschrift</h2>
  <div class="datenschutz">(Datenschutz: Die Gesundheitsdaten werden nur zur Rezeptanfrage an den behandelnden Augenarzt verwendet; Weitergabe nur mit Einwilligung des Patienten gemäß DSGVO Art. 9.)</div>
  <div class="unterschriften">
    <div><div class="ortdatum eintrag">Gera, ${e(heute)}</div><div class="strich"></div>Ort, Datum</div>
    <div><div class="ortdatum"></div><div class="strich"></div>Unterschrift Patient / gesetzl. Vertreter</div>
    <div>${optikerBilder}<div class="strich"></div>Stempel &amp; Unterschrift Optiker</div>
  </div>
</div>`;
};

const STYLES = `
  ${KAESTCHEN_STYLES}
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #222; font-size: 8.3pt; line-height: 1.2; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .anfrage { position: relative; display: flex; flex-direction: column; width: 210mm; height: 297mm; padding: 9mm 15mm 8mm 17mm; overflow: hidden; background: #fff; }
  .titelzeile { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 0.4mm solid #222; padding-bottom: 1.6mm; margin-bottom: 2mm; }
  h1 { color: #111; font-size: 16pt; margin: 0; }
  .meta { font-size: 8pt; color: #555; min-width: 48mm; }
  h2 { color: #111; font-size: 9pt; margin: 2.2mm 0 0.9mm; padding-bottom: 0.5mm; border-bottom: 0.25mm solid #888; }
  .reihe { display: flex; gap: 6mm; border-bottom: 0.2mm solid #ccc; padding-bottom: 0.5mm; margin-bottom: 0.6mm; }
  .feld .label { font-size: 7.4pt; color: #777; }
  .eintrag, .feld .wert, .werte td { font-family: "Courier New", Courier, monospace; color: #404040; }
  .feld .wert { min-height: 4.3mm; font-size: 8.5pt; }
  .werte { width: 100%; border-collapse: collapse; margin-bottom: 1.4mm; }
  .werte th, .werte td { border: 0.2mm solid #bbb; padding: 0.6mm 1.2mm; text-align: left; height: 5mm; }
  .werte tr:first-child th { background: #f0f0f0; font-weight: normal; color: #666; font-size: 7.6pt; }
  .werte tr th:first-child { width: 14mm; }
  .zeile { margin: 0.8mm 0; }
  .klein { font-size: 7.6pt; color: #555; }
  .raster { display: grid; column-gap: 6mm; row-gap: 0; border: 0.2mm solid #ccc; padding: 0.5mm 1.6mm; margin-bottom: 0.8mm; }
  .raster > div { padding: 0.25mm 0; border-bottom: 0.2mm solid #eee; }
  .raster.zwei { grid-template-columns: 1fr 1fr; }
  .raster.vier { grid-template-columns: repeat(4, 1fr); }
  .option { display: inline-block; margin-right: 3.5mm; white-space: nowrap; }
  .kaestchen { display: inline-block; width: 2.8mm; height: 2.8mm; border: 0.25mm solid #444; margin-right: 1.2mm; vertical-align: -0.3mm; }
  .unterschriften { display: flex; gap: 10mm; margin-top: auto; padding-top: 11mm; }
  .unterschriften > div { flex: 1; color: #555; }
  .ortdatum { height: 8mm; display: flex; align-items: flex-end; font-size: 8.5pt; }
  .dringlich { display: flex; align-items: flex-end; gap: 1.2mm; }
  .dringlich .linie { flex: 1; border-bottom: 0.25mm solid #444; height: 3.6mm; }
  .freitext .wert { min-height: 11mm; font-size: 9pt; font-weight: bold; }
  .datenschutz { font-size: 6.5pt; color: #777; margin: 0.8mm 0 0; max-width: 115mm; }
  .stempelfeld { position: relative; }
  .stempelfeld img { position: absolute; bottom: 0.4mm; mix-blend-mode: multiply; }
  .stempelfeld .stempel { left: 0; max-width: 42mm; max-height: 17mm; }
  .stempelfeld .unterschrift { left: 26mm; max-width: 36mm; max-height: 11mm; }
  .strich { border-top: 0.25mm solid #999; margin-bottom: 0.8mm; }
`;

export const buildRezeptanfragePrintHtml = (
  daten: RezeptanfrageDaten,
): string => `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8" />
<title>Rezeptanfrage an den Augenarzt</title>
<style>
  ${STYLES}
  @page { size: A4; margin: 0; }
</style>
</head>
<body>
${buildRezeptanfrageBodyHtml(daten)}
</body>
</html>`;

export const buildRezeptanfragePreviewHtml = (
  daten: RezeptanfrageDaten,
): string => `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8" />
<style>
  ${STYLES}
  html { background: #eee; }
  .anfrage { margin: 12px auto; box-shadow: 0 1px 6px rgba(0, 0, 0, 0.2); }
  @page { size: A4; margin: 0; }
  @media print { html { background: none; } .anfrage { margin: 0; box-shadow: none; } }
</style>
</head>
<body>
${buildRezeptanfrageBodyHtml(daten)}
</body>
</html>`;
