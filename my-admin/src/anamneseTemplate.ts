// Anamnesebogen des Sehzentrums (Kategorie "Anamnesebogen"), nachgebaut nach
// der bisherigen Vorlage (zwei Seiten). Vorausgefüllt werden nur die
// persönlichen Daten und die Krankenversicherung aus dem Kunden; alle
// Gesundheitsangaben kreuzt der Kunde selbst an und unterschreibt. In der
// Vorschau lassen sich die Kästchen anklicken.
import dayjs from "dayjs";
import type { DocumentMergeEntities } from "./documentTemplateEngine";
import { RECHNUNG_ABSENDER, escapeHtml } from "./rechnungTemplate";
import { formatDatum, text } from "./werkstattauftragTemplate";
import { KAESTCHEN_STYLES, kaestchen } from "./formularVorschlaege";

export type AnamneseDaten = { entities: DocumentMergeEntities };

const e = escapeHtml;

const JA_NEIN = ["Ja", "Nein", "Weiß ich nicht"];

// Versichertenstatus der eGK: 1… Mitglied, 3… Familienversichert, 5… Rentner
export const versichertenStatusText = (wert: unknown) => {
  const roh = text(wert);
  const art = { "1": "Mitglied", "3": "Familienversichert", "5": "Rentner" }[
    roh.charAt(0)
  ];
  return art ? `${art} (${roh})` : roh;
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
  const typ = text(k.KrankenversicherungsTyp).toLowerCase();
  const versicherung = typ.startsWith("gesetzlich")
    ? "Gesetzlich versichert"
    : typ.startsWith("privat")
      ? "Privat versichert"
      : undefined;
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

  <h2>Krankenversicherung</h2>
  <div class="block">${gruppe("Versicherungsstatus *", ["Gesetzlich versichert", "Privat versichert", "Selbstzahler"], versicherung)}</div>
  <div class="block">
    <div class="reihe">${feld("Name der Krankenkasse *", text(k.Krankenkasse), "breit")}${feld("Versichertennummer *", text(k.VersichertenNummer))}</div>
    <div class="reihe">${feld("Versicherten-Status (Mitglied/Familienvers.)", versichertenStatusText(k.Versichertenstatus))}${feld("Kostenträger-Nr. / IK (falls bekannt)", text(k.KrankenkassenNummer))}</div>
  </div>
  <div class="block">${frage("Liegt eine ärztliche Verordnung / ein Kostenvoranschlag vor?")}</div>

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
  body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #1f2937; font-size: 8.5pt; line-height: 1.3; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .seite { width: 210mm; min-height: 297mm; padding: 14mm 15mm 16mm; background: #fff; position: relative; }
  .seite + .seite { break-before: page; page-break-before: always; }
  h1 { font-size: 20pt; margin: 0; color: #1e2b4a; }
  .untertitel { font-size: 8pt; color: #6b7280; margin-bottom: 4mm; }
  h2 { font-size: 10.5pt; color: #1e2b4a; margin: 4mm 0 1.5mm; padding-bottom: 1mm; border-bottom: 0.3mm solid #d1d5db; break-after: avoid; }
  .block { background: #f3f4f6; border: 0.25mm solid #e5e7eb; padding: 2mm 3.5mm; margin-bottom: 1.5mm; break-inside: avoid; }
  .reihe { display: flex; gap: 3mm; margin-bottom: 1.2mm; }
  .feld { flex: 1; }
  .feld.breit { flex: 2.2; }
  .feld.schmal { flex: 0.8; }
  .lbl, .glbl { font-weight: bold; font-size: 7.5pt; }
  .wert { background: #fff; border: 0.25mm solid #d1d5db; min-height: 6.2mm; padding: 1mm 1.5mm; font-size: 9.5pt; }
  .optionen { display: flex; gap: 6mm; flex-wrap: wrap; }
  .optionen label, .raster3 label, .einwilligung label { display: inline-flex; align-items: center; gap: 1.5mm; white-space: nowrap; }
  .gruppe { padding: 1mm 0; border-bottom: 0.2mm solid #e5e7eb; }
  .frage { display: flex; justify-content: space-between; align-items: center; gap: 4mm; padding: 1mm 0; border-bottom: 0.2mm solid #e5e7eb; }
  .frage .ftext { font-weight: bold; font-size: 7.8pt; }
  .frage .optionen { gap: 4mm; flex: none; width: 62mm; }
  .kasten { background: #fff; border: 0.25mm solid #d1d5db; height: 6mm; width: 75mm; flex: none; }
  .kasten.klein { width: 35mm; }
  .kasten.gross { width: 100%; height: 9mm; margin-top: 1mm; }
  .raster3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1mm 4mm; margin-top: 1mm; }
  .kaestchen { width: 3.4mm; height: 3.4mm; border: 0.25mm solid #374151; margin: 0; flex: none; }
  .einwilligung { margin-top: 3mm; }
  .unterschrift { display: flex; gap: 20mm; margin-top: 12mm; font-weight: bold; font-size: 7.8pt; }
  .unterschrift > div { flex: 1; }
  .strich { border-top: 0.25mm solid #9ca3af; margin-bottom: 1mm; }
  .fuss { position: absolute; left: 15mm; right: 15mm; bottom: 8mm; display: flex; justify-content: space-between; font-size: 7pt; color: #9ca3af; }
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
</head>
<body>
${buildAnamneseBodyHtml(daten)}
</body>
</html>`;
