// Merkblatt "Sehtest Lkw/Bus – Grenzwerte und Ausschlusskriterien" nach
// Anlage 6 Nr. 2.1 FeV (Kategorie "Merkblatt Sehtest Lkw/Bus"): interne
// Arbeitshilfe auf einer A4-Seite, ohne Kundendaten. Wird auch aus der
// Vorschau der Bescheinigung (sehtestFahrerlaubnisTemplate.ts) geöffnet.
import { RECHNUNG_ABSENDER, escapeHtml } from "./rechnungTemplate";

const e = escapeHtml;

// Stand der Rechtslage, auf den sich das Merkblatt bezieht
export const MERKBLATT_STAND = "11/2026";

export const buildMerkblattSehtestLkwBodyHtml = (): string => {
  const a = RECHNUNG_ABSENDER;
  return `
<div class="seite">
<div class="kopf">
  <div>
    <h1>Sehtest Lkw/Bus – Grenzwerte und Ausschlusskriterien</h1>
    <div class="unter">Bescheinigung nach Anlage 6 Nummer 2.1 FeV · Klassen C, C1, CE, C1E, D, D1, DE, D1E und Fahrgastbeförderung · Ausstellung durch Augenoptikerbetriebe nach § 12 Abs. 6 FeV</div>
  </div>
  <div class="betrieb">${e(a.firma)}<br/>${e(a.marke)}<br/>Rechtsstand: ${MERKBLATT_STAND}</div>
</div>

<h2>1. Grenzwerte – alle müssen erfüllt sein</h2>
<table>
  <tr><th style="width:34%">Prüfung</th><th style="width:22%">Grenzwert</th><th>Prüfverfahren</th></tr>
  <tr><td>Zentrale Tagessehschärfe, jedes Auge</td><td class="wert">mind. 0,8</td><td>nach DIN 58220 Teil 6</td></tr>
  <tr><td>Zentrale Tagessehschärfe, beidäugig</td><td class="wert">mind. 1,0</td><td>nach DIN 58220 Teil 6</td></tr>
  <tr><td>Farbensehen</td><td class="wert">normal</td><td>z. B. Ishihara- oder Velhagen-Tafeln</td></tr>
  <tr><td>Gesichtsfeld</td><td class="wert">normal</td><td>automatisches Halbkugelperimeter (bis 70° horizontal / 30° vertikal, mind. 100 Prüforte je Auge) oder Goldmann (mind. 4 Marken, je mind. 12 Orte)</td></tr>
  <tr><td>Stereosehen</td><td class="wert">vorhanden</td><td>z. B. Random-Dot-Test</td></tr>
  <tr><td>Kontrast- oder Dämmerungssehen</td><td class="wert">ausreichend</td><td>standardisiertes, anerkanntes Prüfverfahren</td></tr>
</table>
<div>Die Sehschärfe darf mit Brille oder Kontaktlinsen erreicht werden → „erreicht, mit Sehhilfe“ (Auflage „Sehhilfe“ im Führerschein).</div>

<h2>2. Ausschlusskriterien – „nicht erreicht“ und „Zusatzuntersuchung ja“</h2>
<ol>
  <li><b>Ein Auge unter 0,8</b> – auch wenn das andere Auge sehr gut ist.</li>
  <li><b>Beidäugig unter 1,0.</b></li>
  <li><b>Brillenkorrektur über +8,0 dpt sphärisches Äquivalent</b> (Sphäre + ½ Zylinder).<br/>Beispiel: +8,50 sph / −0,50 cyl = +8,25 dpt → zu stark. Gilt nicht für Kontaktlinsen und Intraokularlinsen.</li>
  <li><b>Farbsinnstörung</b> (auffällige Farbtafeln).</li>
  <li><b>Gesichtsfeld nicht normal</b> (Ausfälle im Perimeter).</li>
  <li><b>Kein Stereosehen</b> (häufig bei Schielen oder schwachsichtigem Auge).</li>
  <li><b>Kontrast- oder Dämmerungssehen nicht ausreichend.</b></li>
  <li><b>Zweifel</b> – steht nicht <i>zweifelsfrei</i> fest, dass alle Anforderungen erfüllt sind, geht der Kunde zum Augenarzt.</li>
</ol>
<div class="box"><b class="rot">Kein endgültiges Aus:</b> Der Kunde braucht dann ein <b>augenärztliches Zeugnis nach Anlage 6 Nr. 2.2</b> – dort gelten mildere Grenzwerte (siehe 3).</div>

<h2>3. Zum Vergleich: augenärztliche Zusatzuntersuchung (Nr. 2.2)</h2>
<table>
  <tr><th style="width:34%">Prüfung</th><th>Anforderung beim Augenarzt</th></tr>
  <tr><td>Sehschärfe</td><td>besseres Auge bzw. beidäugig <b>0,8</b>, schlechteres Auge <b>0,5</b>; Klassen C/C1/CE/C1E im Einzelfall bis <b>0,1</b> mit augenärztlichem Gutachten</td></tr>
  <tr><td>Sehschärfe ohne Korrektur</td><td>jedes Auge mind. <b>0,05</b>, wenn die Werte nur mit Korrektur erreicht werden</td></tr>
  <tr><td>Gesichtsfeld</td><td>beidäugig mind. <b>140°</b> horizontal, zentral bis 30° normal</td></tr>
  <tr><td>Beweglichkeit / Stereosehen</td><td>keine Doppelbilder im Gebrauchsblickfeld (25° Aufblick, 30° Seitblick, 40° Abblick); kein Schielen ohne konstantes binokulares Einfachsehen</td></tr>
  <tr><td>Farbensehen</td><td>Rotschwäche kein Ausschluss; bei Anomalquotient unter 0,5 Aufklärung des Betroffenen</td></tr>
  <tr><td>Kontrast-/Dämmerungssehen</td><td>ausreichend, <b>zusätzlich Blendempfindlichkeit</b></td></tr>
</table>
<div>Fehlt nur das Farbensehen und wurde es früher schon augenärztlich nach Nr. 2.2 geprüft, ist keine erneute Zusatzuntersuchung nötig.</div>

<h2>4. Praxis-Tipps</h2>
<ul>
  <li><b>Erst ohne Brille messen:</b> Werden die Grenzwerte schon ohne Brille erreicht → „erreicht, ohne Sehhilfe“ (keine Brillenauflage).</li>
  <li><b>Identität prüfen</b> und die Ausweisnummer in Teil 2 eintragen – der Vermerk „Die Identität des Untersuchten wurde geprüft“ ist Pflicht.</li>
  <li><b>Gültigkeit:</b> Die Bescheinigung darf bei Antragstellung höchstens <b>2 Jahre</b> alt sein (§ 12 Abs. 7 FeV).</li>
  <li><b>Teil 1</b> bleibt im Betrieb, <b>Teil 2</b> bekommt der Kunde für die Fahrerlaubnisbehörde.</li>
</ul>
<div class="hinweis"><b>Im OptikSystem:</b> Formulare → „Bescheinigung Sehvermögen Lkw/Bus (FeV Anlage 6 Nr. 2.1)“. Werte unter dem Grenzwert werden rot markiert, bei über +8,0 dpt erscheint eine Warnung, und Ergebnis sowie Zusatzuntersuchung werden vorgeschlagen.</div>

<div class="fuss">Quelle: Fahrerlaubnis-Verordnung (FeV), § 12, § 67 Abs. 4 und Anlage 6, nichtamtliche Fassung auf gesetze-im-internet.de. Verbindlich ist die Fassung im Bundesgesetzblatt. Dieses Merkblatt ist eine interne Arbeitshilfe und ersetzt keine Rechtsberatung.</div>
</div>`;
};

const STYLES = `
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #222; font-size: 8.4pt; line-height: 1.28; margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .seite { position: relative; width: 210mm; height: 296mm; padding: 10mm 14mm; overflow: hidden; background: #fff; }
  .kopf { border-bottom: 0.6mm solid #1f3150; padding-bottom: 2mm; margin-bottom: 3mm; display: flex; justify-content: space-between; align-items: flex-end; }
  h1 { color: #1f3150; font-size: 15pt; margin: 0; }
  .unter { color: #555; font-size: 8.5pt; margin-top: 1mm; }
  .betrieb { white-space: nowrap; flex-shrink: 0; margin-left: 6mm; text-align: right; font-size: 8pt; color: #555; }
  h2 { color: #fff; background: #1f3150; font-size: 10pt; margin: 3mm 0 1.2mm; padding: 1mm 2.5mm; border-radius: 1mm; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 1mm; }
  th { background: #e4e9f1; text-align: left; padding: 1.2mm 2mm; border: 0.2mm solid #8a94a6; font-size: 8.6pt; }
  td { padding: 0.8mm 2mm; border: 0.2mm solid #8a94a6; vertical-align: top; }
  td.wert { font-weight: bold; white-space: nowrap; }
  ol { margin: 0; padding-left: 5mm; }
  ol li { margin: 0.6mm 0; }
  .box { border: 0.3mm solid #c0392b; background: #fdf0ee; padding: 2mm 3mm; border-radius: 1mm; margin: 2mm 0; }
  .hinweis { border: 0.3mm solid #1f7a8c; background: #eef7f9; padding: 2mm 3mm; border-radius: 1mm; margin: 2mm 0; }
  ul { margin: 0; padding-left: 5mm; }
  ul li { margin: 0.6mm 0; }
  .fuss { margin-top: 3mm; border-top: 0.2mm solid #999; padding-top: 1.5mm; font-size: 7.4pt; color: #666; }
  b.rot { color: #b03a2e; }
`;

const html = (extra: string) => `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8" />
<title>Merkblatt Sehtest Lkw/Bus</title>
<style>
  ${STYLES}
  ${extra}
  @page { size: A4; margin: 0; }
</style>
</head>
<body>
${buildMerkblattSehtestLkwBodyHtml()}
</body>
</html>`;

export const buildMerkblattSehtestLkwPrintHtml = (): string => html("");

export const buildMerkblattSehtestLkwPreviewHtml = (): string =>
  html(`
  html { background: #eee; }
  .seite { margin: 12px auto; box-shadow: 0 1px 6px rgba(0, 0, 0, 0.2); }
  @media print { html { background: none; } .seite { margin: 0; box-shadow: none; } }`);
