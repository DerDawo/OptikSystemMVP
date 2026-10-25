// Anträge auf Kostenübernahme für eine Brille (Kategorien "Antrag Zuschuss",
// "Antrag Sozialamt" und "Antrag Jugendamt"): Seite 1 ist der mit den Kundendaten vorausgefüllte
// Antrag des Kunden, Seite 2 der Kostenvoranschlag mit den Preisen des
// Auftrags, auf den der Antrag als Anlage verweist. Felder, die das Programm
// nicht kennt (Empfänger, Diagnose, Sozialversicherungsnummer), bleiben als
// Linie zum Ausfüllen.
import dayjs from "dayjs";
import type { DocumentMergeEntities } from "./documentTemplateEngine";
import {
  BELEG_STYLES,
  RECHNUNG_ABSENDER,
  buildKostenvoranschlagBodyHtml,
  escapeHtml,
} from "./rechnungTemplate";
import {
  buildWerkstattauftragSummen,
  formatEuro,
  text,
} from "./werkstattauftragTemplate";
import {
  KAESTCHEN_STYLES,
  brillenartKategorie,
  kaestchen,
  sehstaerkeVeraendert,
} from "./formularVorschlaege";

export type AntragArt = "zuschuss" | "sozialamt" | "jugendamt";

export type AntragDaten = {
  entities: DocumentMergeEntities;
  // frei formulierte bzw. per KI vorgeschlagene Begründung
  begruendung?: string;
};

const begruendungHtml = (begruendung?: string) =>
  begruendung?.trim()
    ? `<p class="freitext">${escapeHtml(begruendung.trim())}</p>`
    : "";

const linie = (breite = "60mm") =>
  `<span class="linie" style="width: ${breite}"></span>`;

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

const antragZuschussHtml = (
  entities: DocumentMergeEntities,
  begruendung?: string,
) => {
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
    <div>${kaestchen(sehstaerkeVeraendert(entities) === true)} einer Veränderung meiner Sehstärke</div>
    <div>${kaestchen()} Verschleiß oder Beschädigung meiner bisherigen Sehhilfe</div>
    <div>${kaestchen(brillenartKategorie(entities.brille?.BrillenArt) === "Officebrille")} Bildschirmarbeit (Bildschirmarbeitsplatzbrille)</div>
    <div>${kaestchen()} Sonstiges: ${linie("100mm")}</div>
  </div>
  ${begruendungHtml(begruendung)}
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

const antragSozialamtHtml = (
  entities: DocumentMergeEntities,
  begruendung?: string,
) => {
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
  ${begruendungHtml(begruendung)}
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

// Antrag an das Jugendamt (Kostenübernahme, oft für ein Kind): Betrag ist
// der Endpreis nach Abzug eines Kassenanteils; Empfänger, Diagnose und
// Angaben zur betroffenen Person bleiben zum Ausfüllen, die Unterlagen zum
// Ankreuzen (Kostenvoranschlag liegt als Seite 2 bei und ist angekreuzt).
const antragJugendamtHtml = (
  entities: DocumentMergeEntities,
  begruendung?: string,
) => {
  const k = kundenDaten(entities);
  const summen = buildWerkstattauftragSummen(entities);
  const betrag = escapeHtml(formatEuro(summen.endpreis));
  const heute = dayjs().format("DD.MM.YYYY");
  return `
<div class="seite brief kompakt">
  <div class="titel gross">Antrag auf Kostenübernahme einer Brille</div>
  <div class="absender">
    <div class="fett">Antragstellerin / Antragsteller</div>
    <div>${escapeHtml(k.name)}</div>
    <div>${escapeHtml(k.strasse)}</div>
    <div>${escapeHtml(k.ort)}</div>
    ${k.telefon ? `<div>Telefon: ${escapeHtml(k.telefon)}</div>` : ""}
  </div>
  <div class="empfaenger breit">
    <div>An das Jugendamt</div>
    ${ausfuellzeile("Stadt / Landkreis, Abteilung (z. B. Amtsvormundschaft)")}
    ${ausfuellzeile("E-Mail")}
    ${ausfuellzeile("Postanschrift")}
    ${ausfuellzeile("PLZ, Ort")}
  </div>
  <p>${escapeHtml([k.stadt, heute].filter(Boolean).join(", "))}</p>
  <div class="betreff">Betreff: Antrag auf Übernahme der Kosten für eine dringend benötigte Brille</div>
  <p>Sehr geehrte Damen und Herren,</p>
  <p>hiermit beantrage ich die Übernahme der Kosten für eine Brille in Höhe von ${betrag} €. Die Brille wird aufgrund einer Sehbeeinträchtigung dringend benötigt und ist für den Alltag erforderlich. Ich bitte Sie, meinen Antrag zu prüfen und mir die Kostenübernahme vor dem Kauf schriftlich zu bestätigen.</p>
  <p class="zwischentitel fett">Zur Begründung</p>
  <p>Es liegt folgende ärztlich festgestellte Sehbeeinträchtigung vor: ${linie("75mm")}. Die bisherige Sehhilfe ist nicht mehr ausreichend. Der beigefügte ärztliche Befund und der Kostenvoranschlag des Optikers belegen den Bedarf und die voraussichtlichen Kosten.</p>
  ${begruendungHtml(begruendung)}
  <p class="zwischentitel fett">Angaben zur betroffenen Person (falls abweichend von der antragstellenden Person)</p>
  <p>Name: ${linie("70mm")} &nbsp; Geburtsdatum: ${linie("30mm")}<br />
  Gesetzliche Vertretung / Verhältnis zum Kind: ${linie("70mm")}</p>
  <p class="zwischentitel fett">Beigefügte Unterlagen</p>
  <div class="ankreuzen">
    <div>${kaestchen()} Ärztlicher Befund / Verordnung</div>
    <div>${kaestchen(true)} Kostenvoranschlag des Optikers über ${betrag} €</div>
    <div>${kaestchen()} Nachweis der finanziellen Situation (z. B. Einkommensnachweis)</div>
    <div>${kaestchen()} Weitere Nachweise: ${linie("95mm")}</div>
  </div>
  <p>Bitte teilen Sie mir mit, falls weitere Unterlagen benötigt werden. Für Rückfragen erreichen Sie mich unter der oben angegebenen Telefonnummer.</p>
  <p>Mit freundlichen Grüßen</p>
  ${unterschrift(k.name ? `${k.name} / gesetzliche Vertretung` : "")}
</div>`;
};

export const buildAntragBodyHtml = (art: AntragArt, daten: AntragDaten) =>
  (art === "sozialamt"
    ? antragSozialamtHtml(daten.entities, daten.begruendung)
    : art === "jugendamt"
      ? antragJugendamtHtml(daten.entities, daten.begruendung)
      : antragZuschussHtml(daten.entities, daten.begruendung)) +
  buildKostenvoranschlagBodyHtml({ entities: daten.entities });

const ANTRAG_STYLES = `
  ${KAESTCHEN_STYLES}
  ${BELEG_STYLES}
  .beleg { page-break-before: always; break-before: page; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #111; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .seite { width: 210mm; height: 297mm; padding: 18mm 20mm 16mm 25mm; position: relative; overflow: hidden; background: #fff; page-break-after: always; break-after: page; }
  .seite:last-child { page-break-after: auto; break-after: auto; }
  .brief { font-size: 10.5pt; line-height: 1.45; }
  .brief p { margin: 0 0 3.5mm; }
  .fett { font-weight: bold; }
  .titel { font-weight: bold; font-size: 12pt; margin-bottom: 6mm; }
  .titel.gross { font-size: 17pt; color: #1e2a3a; margin-bottom: 5mm; }
  .empfaenger.breit { width: 110mm; }
  .kompakt { font-size: 10pt; line-height: 1.38; padding-top: 14mm; }
  .kompakt p { margin-bottom: 2.6mm; }
  .kompakt .absender, .kompakt .empfaenger, .kompakt .betreff { margin-bottom: 4mm; }
  .kompakt .ausfuellzeile span { height: 5mm; }
  .kompakt .ankreuzen div { margin-bottom: 0.6mm; }
  .kompakt .unterschrift-block { margin-top: 11mm; }
  .absender { margin-bottom: 7mm; }
  .empfaenger { width: 85mm; margin-bottom: 6mm; }
  .ausfuellzeile span { display: block; border-bottom: 1px solid #555; height: 6mm; }
  .ausfuellzeile small { display: block; font-size: 7pt; color: #666; margin-bottom: 0.5mm; }
  .datum { text-align: right; margin-bottom: 7mm; }
  .betreff { font-weight: bold; margin-bottom: 6mm; }
  .zwischentitel { margin-bottom: 1mm !important; }
  .linie { display: inline-block; border-bottom: 1px solid #555; height: 1em; vertical-align: baseline; }
  .kaestchen { display: inline-block; width: 3.2mm; height: 3.2mm; border: 1px solid #333; margin: 0 1.5mm 0 0; vertical-align: -0.3mm; }
  .ankreuzen { margin: 0 0 3.5mm 4mm; }
  .ankreuzen div { margin-bottom: 1.2mm; }
  ul, ol { margin: 0 0 3.5mm; padding-left: 6mm; }
  ul.striche { list-style: none; padding-left: 0; }
  ul.striche li::before { content: "– "; }
  .freitext { white-space: pre-wrap; }
  .ort-datum { margin-top: 6mm !important; }
  .unterschrift-block { margin-top: 14mm; width: 70mm; }
  .unterschrift-linie { border-top: 1px solid #111; margin-bottom: 1mm; }
`;

const TITEL: Record<AntragArt, string> = {
  zuschuss: "Antrag auf Kostenübernahme / Zuschuss",
  sozialamt: "Antrag auf Kostenübernahme (Sozialamt)",
  jugendamt: "Antrag auf Kostenübernahme (Jugendamt)",
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
  .seite, .beleg { margin: 12px auto; box-shadow: 0 1px 6px rgba(0, 0, 0, 0.2); }
  @page { size: A4; margin: 0; }
  @media print { html { background: none; } .seite, .beleg { margin: 0; box-shadow: none; } }
</style>
</head>
<body>
${buildAntragBodyHtml(art, daten)}
</body>
</html>`;
