// Anträge auf Kostenübernahme für eine Brille (Kategorien "Antrag Zuschuss"
// und "Antrag Sozialamt"): Seite 1 ist der mit den Kundendaten vorausgefüllte
// Antrag des Kunden, Seite 2 der Kostenvoranschlag mit den Preisen des
// Auftrags, auf den der Antrag als Anlage verweist. Felder, die das Programm
// nicht kennt (Empfänger, Diagnose, Sozialversicherungsnummer), bleiben als
// Linie zum Ausfüllen.
import dayjs from "dayjs";
import type { DocumentMergeEntities } from "./documentTemplateEngine";
import { RECHNUNG_ABSENDER, escapeHtml } from "./rechnungTemplate";
import {
  FORMULAR_TABELLEN_STYLES,
  buildWerkstattauftragSummen,
  formatDatum,
  formatEuro,
  preisTabelle,
  text,
  werteTabelle,
} from "./werkstattauftragTemplate";

export type AntragArt = "zuschuss" | "sozialamt";

export type AntragDaten = {
  entities: DocumentMergeEntities;
};

const linie = (breite = "60mm") =>
  `<span class="linie" style="width: ${breite}"></span>`;

const kaestchen = `<span class="kaestchen"></span>`;

// Leere Zeile mit kleiner Beschriftung darunter (Empfängeranschrift)
const ausfuellzeile = (beschriftung: string) =>
  `<div class="ausfuellzeile"><span></span><small>${escapeHtml(beschriftung)}</small></div>`;

const kundenDaten = (entities: DocumentMergeEntities) => {
  const kunde: Record<string, unknown> = entities.kunde ?? {};
  const name = [kunde.Vorname, kunde.Nachname]
    .map(text)
    .filter(Boolean)
    .join(" ");
  return {
    kunde,
    name,
    strasse: [kunde.Straße, kunde.Hausnummer]
      .map(text)
      .filter(Boolean)
      .join(" "),
    ort: [kunde.Postleitzahl, kunde.Stadt].map(text).filter(Boolean).join(" "),
    stadt: text(kunde.Stadt),
    telefon: text(kunde.Handy) || text(kunde.TelefonnummerPrivat),
    email: text(kunde.Email),
    versichertennummer: text(kunde.VersichertenNummer),
    taetigkeit: text(kunde.Tätigkeit),
  };
};

const unterschrift = (name: string) => `
  <div class="unterschrift-block">
    <div class="unterschrift-linie"></div>
    <div>${escapeHtml(name || "(Unterschrift)")}</div>
  </div>`;

const antragZuschussHtml = (entities: DocumentMergeEntities) => {
  const k = kundenDaten(entities);
  const summen = buildWerkstattauftragSummen(entities);
  const heute = dayjs().format("DD.MM.YYYY");
  return `
<div class="seite brief">
  <div class="absender">
    <div class="fett">${escapeHtml(k.name)}</div>
    <div>${escapeHtml(k.strasse)}</div>
    <div>${escapeHtml(k.ort)}</div>
    <div>Versichertennummer / BG-Nummer: ${k.versichertennummer ? escapeHtml(k.versichertennummer) : linie("45mm")}</div>
  </div>
  <div class="empfaenger">
    ${ausfuellzeile("Krankenkasse / Behörde / Arbeitgeber")}
    ${ausfuellzeile("Abteilung")}
    ${ausfuellzeile("Straße, Hausnummer")}
    ${ausfuellzeile("PLZ, Ort")}
  </div>
  <div class="datum">${escapeHtml([k.stadt, heute].filter(Boolean).join(", "))}</div>
  <div class="betreff">Antrag auf Kostenübernahme / Zuschuss für eine Sehhilfe (Brille)</div>
  <p>Sehr geehrte Damen und Herren,</p>
  <p>hiermit beantrage ich die Übernahme der Kosten bzw. einen Zuschuss für eine medizinisch notwendige Sehhilfe (Brille).</p>
  <p>Eine neue Sehhilfe ist erforderlich wegen</p>
  <div class="ankreuzen">
    <div>${kaestchen} einer Veränderung meiner Sehstärke</div>
    <div>${kaestchen} Verschleiß oder Beschädigung meiner bisherigen Sehhilfe</div>
    <div>${kaestchen} Bildschirmarbeit (Bildschirmarbeitsplatzbrille)</div>
    <div>${kaestchen} Sonstiges: ${linie("100mm")}</div>
  </div>
  <p>Die Kosten betragen laut beiliegendem Kostenvoranschlag ${escapeHtml(formatEuro(summen.gesamt))} €.</p>
  <p>Dem Schreiben füge ich folgende Unterlagen bei:</p>
  <ul>
    <li>eine Kopie der aktuellen augenärztlichen Verordnung bzw. des Brillenpasses</li>
    <li>den Kostenvoranschlag von ${escapeHtml(RECHNUNG_ABSENDER.firma)} vom ${escapeHtml(heute)}</li>
  </ul>
  <p>Ich bitte um eine zeitnahe Prüfung meines Antrags und um eine schriftliche Bestätigung der Kostenübernahme.</p>
  <p>Mit freundlichen Grüßen</p>
  ${unterschrift(k.name)}
</div>`;
};

const antragSozialamtHtml = (entities: DocumentMergeEntities) => {
  const k = kundenDaten(entities);
  const summen = buildWerkstattauftragSummen(entities);
  const heute = dayjs().format("DD.MM.YYYY");
  return `
<div class="seite brief">
  <div class="titel">Antrag auf Kostenübernahme für eine Brille</div>
  <div class="absender">
    <div class="fett">${escapeHtml(k.name)}</div>
    <div>${escapeHtml(k.strasse)}</div>
    <div>${escapeHtml(k.ort)}</div>
    ${k.telefon ? `<div>Telefon: ${escapeHtml(k.telefon)}</div>` : ""}
    ${k.email ? `<div>E-Mail: ${escapeHtml(k.email)}</div>` : ""}
  </div>
  <p>Sozialversicherungsnummer: ${linie("55mm")}</p>
  <p>Datum: ${escapeHtml(heute)}</p>
  <div class="empfaenger">
    ${ausfuellzeile("Name des Sozialamts")}
    ${ausfuellzeile("Adresse des Sozialamts")}
    ${ausfuellzeile("PLZ, Ort")}
  </div>
  <div class="betreff">Betreff: Antrag auf Kostenübernahme für eine Brille</div>
  <p>Sehr geehrte Damen und Herren,</p>
  <p>hiermit beantrage ich die Kostenübernahme für eine Brille, die dringend benötigt wird. Aufgrund meiner Seheinschränkung ist eine Brille für meinen Alltag und meine berufliche Tätigkeit notwendig.</p>
  <p class="zwischentitel">Begründung:</p>
  <ul class="striche">
    <li>Diagnose: ${linie("70mm")} (ärztlicher Befund liegt bei).</li>
    <li>Die bisherigen Sehhilfen sind nicht mehr ausreichend.</li>
    <li>Als ${k.taetigkeit ? escapeHtml(k.taetigkeit) : linie("45mm")} benötige ich eine Sehhilfe für meine beruflichen Anforderungen.</li>
  </ul>
  <p class="zwischentitel">Unterlagen:</p>
  <ol>
    <li>Ärztlicher Befund (siehe Anhang)</li>
    <li>Kostenvoranschlag vom Optiker über ${escapeHtml(formatEuro(summen.gesamt))} € (siehe Anhang)</li>
    <li>Nachweis meiner finanziellen Situation (z. B. Einkommensnachweis)</li>
  </ol>
  <p>Ich bitte um eine zügige Bearbeitung meines Antrags und stehe für Rückfragen jederzeit zur Verfügung.</p>
  <p class="ort-datum">Ort, Datum: ${escapeHtml(k.stadt || "")}${k.stadt ? ", den " : ""}${escapeHtml(heute)}</p>
  ${unterschrift(k.name)}
</div>`;
};

// Kostenvoranschlag des Augenoptikers als Anlage (Seite 2)
export const buildKostenvoranschlagHtml = (
  entities: DocumentMergeEntities,
): string => {
  const k = kundenDaten(entities);
  const brille: Record<string, unknown> = entities.brille ?? {};
  const glastyp: Record<string, unknown> = entities.glastyp ?? {};
  const fassung: Record<string, unknown> = entities.fassung ?? {};
  const summen = buildWerkstattauftragSummen(entities);
  const a = RECHNUNG_ABSENDER;
  const glas = [
    [glastyp.Hersteller, glastyp.Bezeichnung]
      .map(text)
      .filter(Boolean)
      .join(" "),
    text(glastyp.Verguetung),
  ]
    .filter(Boolean)
    .join(", ");
  const fassungText = [
    [fassung.Hersteller, fassung.Bezeichnung]
      .map(text)
      .filter(Boolean)
      .join(" "),
    text(fassung.Groesse) ? `Größe ${text(fassung.Groesse)}` : "",
    text(fassung.Farbe),
  ]
    .filter(Boolean)
    .join(", ");
  return `
<div class="seite kva">
  <div class="kopf">
    <div>
      <div class="absenderzeile">${escapeHtml(`${a.firma} · ${a.strasseLang} · ${a.plz} ${a.ort}`)}</div>
      <div>${escapeHtml(text(k.kunde.Anrede))}</div>
      <div class="fett">${escapeHtml(k.name)}</div>
      <div>${escapeHtml(k.strasse)}</div>
      <div>${escapeHtml(k.ort)}</div>
    </div>
    <table class="infobox">
      <tr><th>Datum</th><td>${escapeHtml(dayjs().format("DD.MM.YYYY"))}</td></tr>
      <tr><th>Auftrag</th><td>${escapeHtml(text(brille.id))}</td></tr>
      <tr><th>Kd.-Nr.</th><td>${escapeHtml(text(k.kunde.KundenNummer))}</td></tr>
    </table>
  </div>
  <div class="titelbalken">Kostenvoranschlag</div>
  <p>für eine ${escapeHtml(text(brille.BrillenArt) || "Brille")} für ${escapeHtml(k.name)}${
    formatDatum(k.kunde.Geburtsdatum)
      ? `, geb. ${escapeHtml(formatDatum(k.kunde.Geburtsdatum))}`
      : ""
  }${k.versichertennummer ? `, Vers.-Nr. ${escapeHtml(k.versichertennummer)}` : ""}</p>
  ${werteTabelle(entities.glasRechts, entities.glasLinks)}
  <table class="angaben">
    ${glas ? `<tr><th>Gläser</th><td>${escapeHtml(glas)}</td></tr>` : ""}
    ${fassungText ? `<tr><th>Fassung</th><td>${escapeHtml(fassungText)}</td></tr>` : ""}
  </table>
  ${preisTabelle(summen, false)}
  <p class="hinweis">Unverbindlicher Kostenvoranschlag. Alle Preise in EUR inkl. ${a.mwstSatz} % MwSt.${
    text(brille.Berater)
      ? ` Es berät Sie ${escapeHtml(text(brille.Berater))}.`
      : ""
  }</p>
  <div class="fusszeile">
    <div>${escapeHtml(a.firma)}<br />Inh. ${escapeHtml(a.inhaber)}<br />${escapeHtml(a.strasseLang)}<br />${escapeHtml(`${a.plz} ${a.ort}`)}</div>
    <div>Tel. ${escapeHtml(a.telefon)}<br />${escapeHtml(a.email)}<br />${escapeHtml(a.web)}</div>
    <div>USt-IdNr. ${escapeHtml(a.ustId)}</div>
  </div>
</div>`;
};

export const buildAntragBodyHtml = (art: AntragArt, daten: AntragDaten) =>
  (art === "sozialamt"
    ? antragSozialamtHtml(daten.entities)
    : antragZuschussHtml(daten.entities)) +
  buildKostenvoranschlagHtml(daten.entities);

const ANTRAG_STYLES = `
  ${FORMULAR_TABELLEN_STYLES}
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #111; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .seite { width: 210mm; height: 297mm; padding: 18mm 20mm 16mm 25mm; position: relative; overflow: hidden; background: #fff; page-break-after: always; break-after: page; }
  .seite:last-child { page-break-after: auto; break-after: auto; }
  .brief { font-size: 10.5pt; line-height: 1.45; }
  .brief p { margin: 0 0 3.5mm; }
  .fett { font-weight: bold; }
  .titel { font-weight: bold; font-size: 12pt; margin-bottom: 6mm; }
  .absender { margin-bottom: 7mm; }
  .empfaenger { width: 85mm; margin-bottom: 6mm; }
  .ausfuellzeile span { display: block; border-bottom: 1px solid #555; height: 6mm; }
  .ausfuellzeile small { display: block; font-size: 7pt; color: #666; margin-bottom: 0.5mm; }
  .datum { text-align: right; margin-bottom: 7mm; }
  .betreff { font-weight: bold; margin-bottom: 6mm; }
  .zwischentitel { margin-bottom: 1mm !important; }
  .linie { display: inline-block; border-bottom: 1px solid #555; height: 1em; vertical-align: baseline; }
  .kaestchen { display: inline-block; width: 3.2mm; height: 3.2mm; border: 1px solid #333; margin-right: 1.5mm; vertical-align: -0.3mm; }
  .ankreuzen { margin: 0 0 3.5mm 4mm; }
  .ankreuzen div { margin-bottom: 1.2mm; }
  ul, ol { margin: 0 0 3.5mm; padding-left: 6mm; }
  ul.striche { list-style: none; padding-left: 0; }
  ul.striche li::before { content: "– "; }
  .ort-datum { margin-top: 6mm !important; }
  .unterschrift-block { margin-top: 14mm; width: 70mm; }
  .unterschrift-linie { border-top: 1px solid #111; margin-bottom: 1mm; }
  .kva { font-size: 9.5pt; line-height: 1.35; }
  .kva p { margin: 0 0 2.5mm; }
  .kopf { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8mm; }
  .absenderzeile { font-size: 7.5pt; border-bottom: 1px solid #111; display: inline-block; margin-bottom: 3mm; }
  .infobox { width: auto; }
  .infobox th, .infobox td { border: 1px solid #999; padding: 0.8mm 3mm; text-align: left; }
  .infobox th { background: #eee; font-weight: normal; }
  .titelbalken { background: #ddd; font-weight: bold; font-size: 13pt; padding: 1.5mm 3mm; margin-bottom: 3mm; }
  .angaben { margin: 2.5mm 0; }
  .angaben th { text-align: left; font-weight: normal; color: #444; width: 20mm; vertical-align: top; padding: 0.3mm 0; }
  .angaben td { padding: 0.3mm 0; }
  .werte th, .werte td { font-size: 8.5pt; }
  .hinweis { margin-top: 4mm !important; color: #333; }
  .fusszeile { position: absolute; left: 25mm; right: 20mm; bottom: 14mm; display: flex; justify-content: space-between; gap: 6mm; border-top: 1px solid #999; padding-top: 2mm; font-size: 7.5pt; color: #444; }
`;

const TITEL: Record<AntragArt, string> = {
  zuschuss: "Antrag auf Kostenübernahme / Zuschuss",
  sozialamt: "Antrag auf Kostenübernahme (Sozialamt)",
};

export const buildAntragPrintHtml = (
  art: AntragArt,
  daten: AntragDaten,
): string => `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(TITEL[art])}</title>
<style>
  ${ANTRAG_STYLES}
  @page { size: A4; margin: 0; }
</style>
</head>
<body>
${buildAntragBodyHtml(art, daten)}
</body>
</html>`;

// Live-Vorschau im Formulare-Dialog: Seiten untereinander mit Schatten
export const buildAntragPreviewHtml = (
  art: AntragArt,
  daten: AntragDaten,
): string => `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8" />
<style>
  ${ANTRAG_STYLES}
  html { background: #eee; }
  .seite { margin: 12px auto; box-shadow: 0 1px 6px rgba(0, 0, 0, 0.2); }
</style>
</head>
<body>
${buildAntragBodyHtml(art, daten)}
</body>
</html>`;
