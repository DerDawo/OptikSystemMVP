// Patientenanfrage (Kategorie "Patientenanfrage"): Brief des Kunden an eine
// Augenarztpraxis mit der Bitte um Aufnahme und einen Termin, nach dem
// Beispielbrief. Absender ist der Kunde, nicht der Betrieb.
// Automatisch übernommen: Name und Anschrift des Kunden (Absenderzeile und
// Unterschrift), Telefon und E-Mail, Datum, Geburtsdatum sowie Krankenkasse
// mit IK und Versichertennummer. Praxis, Anrede, Anliegen und alle Texte
// werden in der Vorschau eingetippt bzw. angepasst; gedruckt wird der Stand
// der Vorschau.
import dayjs from "dayjs";
import "dayjs/locale/de";
import type { DocumentMergeEntities } from "./documentTemplateEngine";
import { RECHNUNG_ABSENDER, escapeHtml } from "./rechnungTemplate";
import { formatDatum, text } from "./werkstattauftragTemplate";

export type PatientenanfrageDaten = { entities: DocumentMergeEntities };

const e = escapeHtml;

const eingabe = (wert = "", hinweis = "", klasse = "") =>
  `<span class="eingabe ${klasse}" contenteditable="true" data-hinweis="${e(hinweis)}">${e(wert)}</span>`;

const absatz = (wert = "", hinweis = "") =>
  `<div class="eingabe absatz" contenteditable="true" data-hinweis="${e(hinweis)}">${e(wert)}</div>`;

/** "Techniker Krankenkasse 101575519; VNr. E826974320" */
export const kassenText = (k: Record<string, unknown>) => {
  const kasse = [text(k.Krankenkasse), text(k.KrankenkassenNummer)]
    .filter(Boolean)
    .join(" ");
  const vnr = text(k.VersichertenNummer);
  return [kasse, vnr ? `VNr. ${vnr}` : ""].filter(Boolean).join("; ");
};

/** Absenderzeile wie im Beispiel: "Name, Straße Nr., PLZ Ort" */
export const absenderZeile = (k: Record<string, unknown>) =>
  [
    [k.Vorname, k.Nachname].map(text).filter(Boolean).join(" "),
    [k.Straße, k.Hausnummer].map(text).filter(Boolean).join(" "),
    [k.Postleitzahl, k.Stadt].map(text).filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");

const kurzname = (k: Record<string, unknown>) => {
  const vorname = text(k.Vorname);
  return [vorname ? `${vorname.charAt(0)}.` : "", text(k.Nachname)]
    .filter(Boolean)
    .join(" ");
};

export const buildPatientenanfrageBodyHtml = ({
  entities,
}: PatientenanfrageDaten): string => {
  const k: Record<string, unknown> = entities.kunde ?? {};
  const ort = text(k.Stadt) || RECHNUNG_ABSENDER.ort;
  const datum = dayjs().locale("de").format("D. MMMM YYYY");
  const kontakt = [text(k.Handy) || text(k.TelefonnummerPrivat), text(k.Email)]
    .filter(Boolean)
    .join(" · ");

  return `
<div class="brief">
  <div class="absender">${eingabe(absenderZeile(k), "Name, Straße, PLZ Ort")}</div>
  <div class="kontakt">${eingabe(kontakt, "Telefon / E-Mail (optional)")}</div>

  <div class="empfaenger">${absatz("", "Augenpraxis, Ärztin/Arzt\nStraße Nr.\nPLZ Ort")}</div>

  <p class="datum">${eingabe(`${ort}, den ${datum}`)}</p>

  <p class="betreff"><b>Betreff: ${eingabe("Anfrage zur Patientenaufnahme und Terminvereinbarung wegen Sehtrübung")}</b></p>

  ${absatz("Sehr geehrte Damen und Herren,\nsehr geehrtes Praxisteam,", "")}

  ${absatz("ich wende mich an Sie, da ich auf der Suche nach einem Augenarzt in Gera bin und mich gerne als Neupatient in Ihrer Praxis aufnehmen lassen möchte.")}

  ${absatz("Der Grund für mein Schreiben ist eine stark zunehmende Sehtrübung, die ich seit einiger Zeit bemerke. Im Rahmen einer ersten Einschätzung wurde bereits der Verdacht auf einen beginnenden Grauen Star (Katarakt) geäußert. Da Sie in Ihrer Praxis auf die Katarakt-Diagnostik spezialisiert sind und auch ambulante Operationen durchführen, würde ich die notwendigen Untersuchungen und die Beratung gerne vertrauensvoll in Ihre Hände legen.")}

  ${absatz("Da die Seheinschränkung meinen Alltag zunehmend beeinträchtigt, wäre ich Ihnen für die Vergabe eines zeitnahen Termins zur Untersuchung sehr dankbar.")}

  <p>Für die administrative Aufnahme in Ihrer Praxis finden Sie hier meine Daten:</p>
  <ul>
    <li><b>Geburtsdatum:</b> ${eingabe(formatDatum(k.Geburtsdatum), "TT.MM.JJJJ")}</li>
    <li><b>Krankenkasse:</b> ${eingabe(kassenText(k), "Kasse, IK; Versichertennummer")}</li>
  </ul>

  ${absatz("Falls Sie vorab eine ärztliche Überweisung oder weitere Informationen benötigen, lassen Sie es mich bitte wissen. Sie erreichen mich telefonisch unter der oben genannten Nummer oder per E-Mail.")}

  ${absatz("Über eine positive Rückmeldung und einen Terminvorschlag würde ich mich sehr freuen.")}

  <p class="gruss">Mit freundlichen Grüßen</p>
  <div class="unterschrift">${eingabe(kurzname(k), "Name")}</div>
</div>`;
};

const STYLES = `
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Carlito, Calibri, "Segoe UI", Arial, sans-serif; color: #222; font-size: 10.5pt; line-height: 1.45; }
  .brief { position: relative; width: 210mm; min-height: 297mm; padding: 12mm 22mm 20mm 25mm; background: #fff; }
  .absender { font-size: 9.5pt; color: #444; border-bottom: 0.2mm solid #888; padding-bottom: 0.6mm; margin-bottom: 0.6mm; }
  .kontakt { font-size: 8.5pt; color: #666; min-height: 4mm; }
  .empfaenger { margin: 10mm 0 8mm; min-height: 22mm; width: 85mm; }
  p { margin: 0 0 3mm; }
  .datum { margin-bottom: 9mm; }
  .betreff { margin-bottom: 4mm; }
  .eingabe { outline: none; white-space: pre-wrap; }
  .absatz { display: block; margin: 0 0 3mm; }
  ul { margin: 0 0 3mm; padding-left: 8mm; }
  li { margin-bottom: 1mm; }
  .gruss { margin-top: 2mm; }
  .unterschrift { margin-top: 1mm; }
`;

const BILDSCHIRM_STYLES = `
  @media screen {
    .eingabe { background: #f3f8ff; border-radius: 2px; cursor: text; }
    .eingabe:focus { background: #e3efff; }
    .eingabe:empty::before { content: attr(data-hinweis); color: #9aa8bb; font-style: italic; }
  }
  @media print { .kontakt:has(.eingabe:empty) { display: none; } }
`;

const html = (inhalt: string, extra: string) => `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8" />
<title>Patientenanfrage</title>
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

export const buildPatientenanfragePrintHtml = (
  daten: PatientenanfrageDaten,
): string => html(buildPatientenanfrageBodyHtml(daten), "");

export const buildPatientenanfragePreviewHtml = (
  daten: PatientenanfrageDaten,
): string =>
  html(
    buildPatientenanfrageBodyHtml(daten),
    `${BILDSCHIRM_STYLES}
  html { background: #eee; }
  .brief { margin: 12px auto; box-shadow: 0 1px 6px rgba(0, 0, 0, 0.2); }
  @media print { html { background: none; } .brief { margin: 0; box-shadow: none; } }`,
  );
