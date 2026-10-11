// Berechtigungsschein nach dem Muster des Zentralverbands der Augenoptiker
// und Optometristen (AOK-Vertrag Sehhilfen, Anlage 4), Kategorie
// "Berechtigungsschein AOK". Aufbau und Positionen entsprechen dem Original
// (Maße in mm, aus der A4-Vorlage übernommen), damit der Ausdruck wie das
// gewohnte Formular aussieht. Vom Programm eingesetzte Werte stehen in
// Schreibmaschinenschrift; Ankreuzfelder und Unterschriften bleiben leer,
// weil sie eine fachliche Entscheidung bzw. eigenhändig sind.
import dayjs from "dayjs";
import type {
  DocumentMergeEntities,
  MergeSource,
} from "./documentTemplateEngine";
import { escapeHtml } from "./rechnungTemplate";
import { formatDatum, formatWert, text } from "./werkstattauftragTemplate";

export type AokBerechtigungsscheinDaten = {
  entities: DocumentMergeEntities;
  betrieb?: { IKNummer?: string | null } | null;
};

type Werte = Partial<Record<"Sph" | "Cyl" | "A" | "Pr" | "B" | "HSA", unknown>>;

const asNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

// Ferne/Nähe: Einstärken-Nahbrillen stehen in der Zeile N; bei Mehrstärken-
// gläsern mit Addition ergibt sich die Nähe aus Sph + Add (Cyl/Achse gleich).
export const verteileWerte = (
  brillenArt: unknown,
  glas: MergeSource,
): { ferne: Werte; naehe: Werte } => {
  if (!glas) return { ferne: {}, naehe: {} };
  const art = text(brillenArt).toLowerCase();
  const nurNah =
    /nah|lese/.test(art) && !/gleitsicht|bifokal|trifokal|mehrst/.test(art);
  const alle: Werte = {
    Sph: glas.Sph,
    Cyl: glas.Cyl,
    A: glas.A,
    Pr: glas.Pr,
    B: glas.B,
    HSA: glas.HSA,
  };
  if (nurNah) return { ferne: {}, naehe: alle };
  const sph = asNumber(glas.Sph);
  const add = asNumber(glas.Add);
  const naehe: Werte =
    add !== null && add > 0
      ? { Sph: (sph ?? 0) + add, Cyl: glas.Cyl, A: glas.A }
      : {};
  return { ferne: alle, naehe };
};

const wert = (value: string) =>
  value ? `<span class="wert">${escapeHtml(value)}</span>` : "";

const box = (x: number, y: number) =>
  `<span class="box" style="left:${x}mm;top:${y}mm"></span>`;

const at = (x: number, y: number, inhalt: string, klasse = "") =>
  `<div class="at ${klasse}" style="left:${x}mm;top:${y}mm">${inhalt}</div>`;

const linie = (x1: number, x2: number, y: number) =>
  `<div class="hline" style="left:${x1}mm;top:${y}mm;width:${x2 - x1}mm"></div>`;

const werteZellen = (werte: Werte) =>
  [
    formatWert(werte.Sph, "dioptrie"),
    formatWert(werte.Cyl, "dioptrie"),
    formatWert(werte.A, "achse"),
    formatWert(werte.Pr, "zwei"),
    formatWert(werte.B, "frei"),
    formatWert(werte.HSA, "frei"),
  ]
    .map((v) => `<td class="mitte">${wert(v)}</td>`)
    .join("");

const abrechnungsZellen = `<td></td><td></td><td></td>`;

export const buildAokBerechtigungsscheinBodyHtml = ({
  entities,
  betrieb,
}: AokBerechtigungsscheinDaten): string => {
  const kunde: Record<string, unknown> = entities.kunde ?? {};
  const brille: Record<string, unknown> = entities.brille ?? {};
  const rechts = verteileWerte(brille.BrillenArt, entities.glasRechts);
  const links = verteileWerte(brille.BrillenArt, entities.glasLinks);
  const name = [text(kunde.Nachname), text(kunde.Vorname)]
    .filter(Boolean)
    .join(", ");
  const kassenanteil = asNumber(brille.KKAnteil);
  const rechnungsbetrag =
    kassenanteil !== null && kassenanteil > 0
      ? formatWert(kassenanteil, "zwei")
      : "";

  return `
<div class="seite">
  <div class="kassenfeld">
    <div class="feld" style="left:0;top:0;width:79.85mm;height:9.86mm"><span class="lbl">Krankenkasse bzw. Kostenträger</span></div>
    <div class="feld" style="left:0;top:9.86mm;width:79.85mm;height:19.9mm">
      <span class="lbl">Name, Vorname des Versicherten</span>
      <span class="lbl rechts" style="top:4.6mm">geb. am</span>
      <div class="feldwert" style="top:8.6mm">${wert(name)}</div>
      <div class="feldwert rechts" style="top:8.6mm">${wert(formatDatum(kunde.Geburtsdatum))}</div>
    </div>
    <div class="feld" style="left:0;top:29.76mm;width:28mm;height:8.54mm"><span class="lbl">Kassen-Nr.</span><div class="feldwert">${wert(text(kunde.KrankenkassenNummer))}</div></div>
    <div class="feld" style="left:28mm;top:29.76mm;width:32.35mm;height:8.54mm"><span class="lbl">Versicherten-Nr.</span><div class="feldwert">${wert(text(kunde.VersichertenNummer))}</div></div>
    <div class="feld" style="left:60.35mm;top:29.76mm;width:19.5mm;height:8.54mm"><span class="lbl">Status</span></div>
    <div class="feld" style="left:0;top:38.3mm;width:28mm;height:8.5mm"><span class="lbl">Augenoptiker-IK</span><div class="feldwert">${wert(text(betrieb?.IKNummer))}</div></div>
    <div class="feld" style="left:28mm;top:38.3mm;width:27.75mm;height:8.5mm"><span class="lbl">VK gültig bis</span></div>
    <div class="feld" style="left:55.75mm;top:38.3mm;width:24.1mm;height:8.5mm"><span class="lbl">Datum</span><div class="feldwert">${wert(dayjs().format("DD.MM.YYYY"))}</div></div>
  </div>

  ${at(99.3, 5.2, "Berechtigungsschein", "titel")}
  ${at(99.3, 10.6, "Anspruch besteht nur, wenn eine Mitgliedschaft besteht und<br />die Versicherungskarte vorgelegt wird.", "untertitel")}
  ${at(99.3, 25.4, "Rechnungsnummer", "fett")}
  <div class="eingabe" style="left:99.3mm;top:30.6mm">${wert(text(brille.Rechnungsnummer))}</div>
  ${at(99.3, 40.2, "Belegnummer", "fett")}
  <div class="eingabe" style="left:99.3mm;top:45.3mm"></div>

  ${box(8.75, 57.2)}${at(13.9, 56.6, "Unfall/Unfallfolgen")}
  ${box(52.3, 57.2)}${at(57.4, 56.6, "Arbeitsunfall")}
  ${box(85.3, 57.2)}${at(90.4, 56.6, "Versorgungsleiden")}

  ${at(8.75, 69.6, "I. Erklärung des Augenoptikers:", "abschnitt")}
  ${at(8.75, 75.5, "Die Prüfung der Sehschärfe ergab")}
  ${box(63.4, 76.1)}${at(68.6, 75.5, "eine Veränderung von mindestens 0,5 dpt")}
  ${at(52, 81.9, "oder")}
  ${box(63.4, 82.5)}${at(68.6, 81.9, "eine Verbesserung von mindestens 0,2 LogMAR (2 Visus-Stufen)")}

  ${box(8.75, 94.6)}${at(13.9, 94, "Aufgrund der Augenglasbestimmung ist/sind")}
  ${linie(14, 29.6, 105.4)}${at(30.6, 101.5, "Glas/Gläser")}
  ${linie(54.6, 70.4, 105.4)}${at(71, 101.5, "Kontaktlinse(n)")}
  ${at(14, 106.4, "erforderlich")}
  ${box(106.1, 94.6)}${at(111.3, 94, "Folgeversorgung wegen Verschleiß/Verlust")}
  ${at(111.3, 98.8, "(keine Sehstärkenänderung)")}
  ${linie(111.3, 127, 110.2)}${at(128.6, 106.4, "Glas/Gläser")}
  ${linie(152, 167.4, 110.2)}${at(168.6, 106.4, "Kontaktlinse(n)")}

  ${at(8.75, 121.4, "Kontaktlinse(n):")}
  ${box(8.75, 126.6)}${at(13.9, 126, "Nachlieferung innerhalb von 6 Monaten")}
  ${box(106.1, 126.6)}${at(111.3, 126, "Kontrolle und Aufarbeiten bzw. Intensivreinigung<br />der Kontaktlinse(n)")}

  ${at(8.75, 142.4, "Sonstiges:")}${linie(25.8, 198.6, 146.4)}

  <table class="werte-aok">
    <colgroup>
      <col style="width:6.15mm" /><col style="width:6.1mm" />
      <col style="width:17.3mm" /><col style="width:17.3mm" /><col style="width:17.5mm" />
      <col style="width:17.2mm" /><col style="width:17.5mm" /><col style="width:17.3mm" />
      <col style="width:44.65mm" /><col style="width:10.95mm" /><col style="width:17.9mm" />
    </colgroup>
    <tr style="height:5.3mm">
      <td rowspan="2"></td><td rowspan="2"></td>
      <td rowspan="2" class="kopf">Sphäre</td><td rowspan="2" class="kopf">Zylinder</td>
      <td rowspan="2" class="kopf">Achse</td><td rowspan="2" class="kopf">Prisma</td>
      <td rowspan="2" class="kopf">Basis</td><td rowspan="2" class="kopf">Scheitel-<br />abstand</td>
      <td colspan="3" class="mitte">Kostenabrechnung des Augenoptikers</td>
    </tr>
    <tr style="height:10.5mm">
      <td class="kopf">7-/10-stellige Hilfsmittel-<br />positionsnummer</td>
      <td class="kopf">Faktor</td><td class="kopf">Betrag<br />EUR</td>
    </tr>
    <tr style="height:5.5mm"><td rowspan="2" class="fn">F</td><td class="mitte">R</td>${werteZellen(rechts.ferne)}${abrechnungsZellen}</tr>
    <tr style="height:5.5mm"><td class="mitte">L</td>${werteZellen(links.ferne)}${abrechnungsZellen}</tr>
    <tr style="height:5.5mm"><td rowspan="2" class="fn">N</td><td class="mitte">R</td>${werteZellen(rechts.naehe)}${abrechnungsZellen}</tr>
    <tr style="height:5.5mm"><td class="mitte">L</td>${werteZellen(links.naehe)}${abrechnungsZellen}</tr>
    <tr style="height:5.45mm"><td colspan="8" rowspan="5"></td>${abrechnungsZellen}</tr>
    <tr style="height:5.45mm">${abrechnungsZellen}</tr>
    <tr style="height:5.45mm">${abrechnungsZellen}</tr>
    <tr style="height:5.45mm">${abrechnungsZellen}</tr>
    <tr style="height:5.45mm">${abrechnungsZellen}</tr>
    <tr style="height:14.9mm">
      <td colspan="5" class="kopf">Stempel des Augenoptikers</td>
      <td colspan="3" class="kopf">Datum/Unterschrift<br />des Augenoptikermeisters</td>
      <td colspan="2" class="kopf">Rechnungsbetrag</td>
      <td class="mitte">${wert(rechnungsbetrag)}</td>
    </tr>
  </table>

  ${at(8.75, 235.6, "II. Erklärung und Empfangsbestätigung des Versicherten:", "abschnitt")}
  ${at(8.75, 241.8, "Ich bin bei der benannten Krankenkasse versichert und habe meine Versichertenkarte vorgelegt.", "klein")}
  ${at(8.75, 248.4, "Brillenglasbestimmung durchgeführt")}
  ${box(70.4, 249)}${at(75.4, 248.4, "ja")}
  ${box(83.8, 249)}${at(88.8, 248.4, "nein")}
  ${linie(106.1, 121.8, 252.4)}${at(123.6, 248.4, "Glas/Gläser")}
  ${linie(147.9, 163.4, 252.4)}${at(164.9, 248.4, "Kontaktlinse(n)")}
  ${at(8.75, 263.2, "Sonstiges:")}${linie(27.8, 198.6, 267)}
  ${linie(8.75, 101.3, 280)}${at(8.75, 281.2, "Ort, Datum")}
  ${linie(106.1, 198.6, 280)}${at(106.1, 281.2, "Unterschrift des Versicherten")}
  <div class="copyright">© Zentralverband der Augenoptiker und Optometristen</div>
</div>`;
};

const AOK_STYLES = `
  * { box-sizing: border-box; }
  body { margin: 0; font-family: "Arial Narrow", Arial, Helvetica, sans-serif; color: #111; font-size: 9.5pt; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .seite { width: 210mm; height: 297mm; position: relative; overflow: hidden; background: #fff; }
  .at { position: absolute; white-space: nowrap; line-height: 1.25; }
  .titel { font-weight: bold; font-size: 14pt; }
  .untertitel { font-size: 9.5pt; line-height: 1.4; }
  .fett, .abschnitt { font-weight: bold; }
  .abschnitt { font-size: 10.5pt; }
  .klein { font-size: 8.5pt; }
  .box { position: absolute; width: 3.9mm; height: 3.9mm; border: 0.25mm solid #333; }
  .hline { position: absolute; border-top: 0.2mm solid #333; }
  .kassenfeld { position: absolute; left: 8.75mm; top: 4.8mm; width: 79.85mm; height: 46.8mm; border: 0.25mm solid #333; }
  .feld { position: absolute; border-right: 0.2mm solid #333; border-bottom: 0.2mm solid #333; }
  .lbl { position: absolute; left: 0.6mm; top: 0.4mm; font-size: 5.8pt; }
  .lbl.rechts { left: auto; right: 0.8mm; }
  .feldwert { position: absolute; left: 1.2mm; bottom: 0.8mm; }
  .feld > .feldwert[style] { bottom: auto; }
  .feldwert.rechts { left: auto; right: 1.2mm; }
  .eingabe { position: absolute; width: 83.6mm; height: 5.9mm; border: 0.25mm solid #333; padding: 1.1mm 1.5mm 0; }
  .wert { font-family: "Courier New", Courier, monospace; font-size: 9.5pt; font-weight: bold; }
  .werte-aok { position: absolute; left: 8.75mm; top: 150.9mm; width: 189.85mm; border-collapse: collapse; table-layout: fixed; }
  .werte-aok td { border: 0.2mm solid #333; padding: 0 0.6mm; font-size: 9pt; vertical-align: middle; overflow: hidden; }
  .werte-aok .kopf { text-align: center; vertical-align: top; padding-top: 1mm; line-height: 1.2; }
  .werte-aok .mitte { text-align: center; }
  .werte-aok .fn { text-align: center; font-weight: bold; }
  .copyright { position: absolute; left: 1.2mm; top: 285mm; transform: rotate(-90deg); transform-origin: left top; font-size: 5.5pt; white-space: nowrap; color: #333; }
`;

export const buildAokBerechtigungsscheinPrintHtml = (
  daten: AokBerechtigungsscheinDaten,
): string => `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8" />
<title>Berechtigungsschein</title>
<style>
  ${AOK_STYLES}
  @page { size: A4; margin: 0; }
</style>
</head>
<body>
${buildAokBerechtigungsscheinBodyHtml(daten)}
</body>
</html>`;

export const buildAokBerechtigungsscheinPreviewHtml = (
  daten: AokBerechtigungsscheinDaten,
): string => `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8" />
<style>
  ${AOK_STYLES}
  html { background: #eee; }
  .seite { margin: 12px auto; box-shadow: 0 1px 6px rgba(0, 0, 0, 0.2); }
</style>
</head>
<body>
${buildAokBerechtigungsscheinBodyHtml(daten)}
</body>
</html>`;
