// Rechnung über den erweiterten Führerscheinsehtest (Kategorie "Rechnung
// Sehtest C/D"): Untersuchung des Sehvermögens für die Fahrerlaubnisklassen
// C1, C1E, C, CE, D1, D1E, D, DE und die Fahrgastbeförderung nach Anlage 6
// Nr. 2.1 FeV (§ 12 Abs. 6 FeV), im Rechnungsdesign des Sehzentrums
// (rechnungTemplate.ts).
//
// In der Vorschau lassen sich
//   - die Fahrerlaubnisklassen ankreuzen,
//   - jede Leistung an- und abwählen (abgewählte werden nicht gedruckt),
//   - Menge, Einzelpreis und Bezeichnung ändern, eine freie Position ergänzen,
//   - ein Rabatt in Prozent eintragen und
//   - die Zahlungsart wählen (bar/EC-Karte: "Betrag dankend erhalten",
//     Überweisung: Zahlungsziel).
// Beträge, Zwischensumme, Rabatt, Netto, MwSt und Rechnungsbetrag rechnet
// ein Skript beim Eintippen neu; es verwendet dieselben Funktionen wie der
// Code hier (euroZahl, berechneSehtestRechnung), damit Vorschau und Tests
// gleich rechnen. Gedruckt wird der Stand der Vorschau.
//
// Umsatzsteuer: Der Sehtest für die Fahrerlaubnis dient nicht der
// Heilbehandlung, sondern dem Nachweis gegenüber der Behörde; er ist daher
// nicht nach § 4 Nr. 14 UStG befreit, es gilt der Regelsteuersatz.
import dayjs from "dayjs";
import type { DocumentMergeEntities } from "./documentTemplateEngine";
import {
  BELEG_STYLES,
  RECHNUNG_ABSENDER,
  briefkopfHtml,
  escapeHtml,
  formatEuro,
  fusszeileHtml,
} from "./rechnungTemplate";
import { formatDatum, text } from "./werkstattauftragTemplate";
import { mitarbeiterAnzeige } from "./mitarbeiterNamen";

export const SEHTEST_RECHNUNG_KATEGORIE = "Rechnung Sehtest C/D";

export type SehtestRechnungDaten = {
  entities: DocumentMergeEntities;
  rechnungsnummer: string;
};

export type SehtestLeistung = {
  // kurzer Schlüssel für data-Attribute und Tests
  id: string;
  bezeichnung: string;
  beschreibung: string;
  preis: number;
  menge: number;
  // in der Vorschau vorausgewählt
  standard: boolean;
};

/**
 * Leistungskatalog. Die Prüfungen des erweiterten Sehtests (Pflichtprüfungen
 * nach Anlage 6 Nr. 2.1 FeV, Farbsinn, Gesichtsfeld, Dämmerungssehen/Blendung
 * und die Bescheinigung) sind vorausgewählt (zusammen 149,90 €); die übrigen
 * sind Zusatzleistungen. Preise lassen sich in der Vorschau ändern.
 */
export const SEHTEST_LEISTUNGEN: SehtestLeistung[] = [
  {
    id: "visus_sc",
    bezeichnung: "Sehschärfe ohne Korrektur",
    beschreibung:
      "Tagessehschärfe rechts, links, beidäugig (DIN 58220, Anl. 6 Nr. 2.1.1 FeV)",
    preis: 25,
    menge: 1,
    standard: true,
  },
  {
    id: "visus_cc",
    bezeichnung: "Sehschärfe mit Korrektur",
    beschreibung:
      "mit Brille bzw. Kontaktlinsen; Grenzwerte je Auge 0,8, beidäugig 1,0",
    preis: 25,
    menge: 1,
    standard: true,
  },
  {
    id: "korrektur",
    bezeichnung: "Prüfung der Korrektur",
    beschreibung:
      "Scheitelbrechwert der Brille, sphärisches Äquivalent höchstens +8,0 dpt",
    preis: 19.9,
    menge: 1,
    standard: true,
  },
  {
    id: "farbsinn",
    bezeichnung: "Farbsinnprüfung",
    beschreibung: "Farbsehen mit Tafeln nach Ishihara (orientierend)",
    preis: 15,
    menge: 1,
    standard: true,
  },
  {
    id: "gesichtsfeld",
    bezeichnung: "Gesichtsfeld",
    beschreibung: "Screening des Gesichtsfeldes (orientierend)",
    preis: 20,
    menge: 1,
    standard: true,
  },
  {
    id: "daemmerung",
    bezeichnung: "Dämmerungssehen / Blendempfindlichkeit",
    beschreibung:
      "mit OCULUS Mesotest II, Dämmerungssehen und Blendempfindlichkeit nach DIN 58220 Teil 7",
    preis: 25,
    menge: 1,
    standard: true,
  },
  {
    id: "bescheinigung",
    bezeichnung: "Bescheinigung über das Sehvermögen",
    beschreibung:
      "amtliches Muster, Teil 1 (Betrieb) und Teil 2 (Fahrerlaubnisbehörde)",
    preis: 20,
    menge: 1,
    standard: true,
  },
  {
    id: "refraktion",
    bezeichnung: "Subjektive Refraktion (Vollkorrektion)",
    beschreibung:
      "bestmögliche Korrektur, wenn die Grenzwerte nicht erreicht werden",
    preis: 20,
    menge: 1,
    standard: false,
  },
  {
    id: "zweitschrift",
    bezeichnung: "Zweitschrift der Bescheinigung",
    beschreibung: "weitere Ausfertigung von Teil 2, z. B. für den Arbeitgeber",
    preis: 5,
    menge: 1,
    standard: false,
  },
];

export const FAHRERLAUBNISKLASSEN = [
  "C1",
  "C1E",
  "C",
  "CE",
  "D1",
  "D1E",
  "D",
  "DE",
  "Fahrgastbeförderung (FzF)",
] as const;

/**
 * Betrag aus einer Eingabe wie "12,50", "12.50", "1.234,50 €" oder
 * "12,50 EUR"; leere oder ungültige Eingaben ergeben 0. Wird auch im Skript
 * der Vorschau verwendet und muss deshalb ohne äußere Bezüge auskommen.
 */
export const euroZahl = (eingabe: unknown): number => {
  if (typeof eingabe === "number") return isFinite(eingabe) ? eingabe : 0;
  let s = String(eingabe == null ? "" : eingabe)
    .replace(/eur|€|\s/gi, "")
    .replace(/[^0-9,.-]/g, "");
  if (s.indexOf(",") >= 0) s = s.replace(/\./g, "").replace(",", ".");
  const zahl = parseFloat(s);
  return isFinite(zahl) ? zahl : 0;
};

export type SehtestRechnungZeile = { menge: number; preis: number };

export type SehtestRechnungSumme = {
  betraege: number[];
  zwischensumme: number;
  rabatt: number;
  brutto: number;
  netto: number;
  mwst: number;
};

/**
 * Beträge je Zeile, Zwischensumme, Rabatt (Prozent, 0 bis 100), Brutto,
 * Netto und enthaltene MwSt, alles auf Cent gerundet. Wird auch im Skript
 * der Vorschau verwendet und muss deshalb ohne äußere Bezüge auskommen.
 */
export const berechneSehtestRechnung = (
  zeilen: SehtestRechnungZeile[],
  rabattProzent: number,
  mwstSatz: number,
): SehtestRechnungSumme => {
  const rund = (wert: number) => Math.round(wert * 100) / 100;
  const betraege = zeilen.map((z) =>
    rund((isFinite(z.menge) ? z.menge : 0) * (isFinite(z.preis) ? z.preis : 0)),
  );
  const zwischensumme = rund(betraege.reduce((s, b) => s + b, 0));
  const prozent = Math.min(
    100,
    Math.max(0, isFinite(rabattProzent) ? rabattProzent : 0),
  );
  const rabatt = rund((zwischensumme * prozent) / 100);
  const brutto = rund(zwischensumme - rabatt);
  const netto = rund(brutto / (1 + mwstSatz / 100));
  return {
    betraege,
    zwischensumme,
    rabatt,
    brutto,
    netto,
    mwst: rund(brutto - netto),
  };
};

const e = escapeHtml;
const a = RECHNUNG_ABSENDER;
const zahl2 = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const eingabe = (wert: string, hinweis: string, klasse = "", feld = "") =>
  `<span class="eingabe ${klasse}" contenteditable="plaintext-only" data-hinweis="${e(hinweis)}"${feld ? ` data-st="${feld}"` : ""}>${e(wert)}</span>`;

const kaestchen = (beschriftung: string, feld: string, an = false) =>
  `<label class="wahl"><input type="checkbox" class="box" data-st="${e(feld)}"${an ? " checked" : ""} /> ${e(beschriftung)}</label>`;

const leistungZeile = (l: SehtestLeistung, nr: number) => `
      <tr class="leistung${l.standard ? "" : " aus"}" data-zeile="${l.id}">
        <td class="an"><input type="checkbox" class="box" data-st="an"${l.standard ? " checked" : ""} /></td>
        <td class="nr">${nr}</td>
        <td class="text"><div class="bez">${eingabe(l.bezeichnung, "Leistung", "", "bez")}</div><div class="beschreibung">${eingabe(l.beschreibung, "Beschreibung")}</div></td>
        <td class="zahl">${eingabe(String(l.menge), "1", "", "menge")}</td>
        <td class="zahl">${eingabe(zahl2.format(l.preis), "0,00", "", "preis")}</td>
        <td class="zahl betrag" data-st="betrag">${e(zahl2.format(l.preis * l.menge))}</td>
      </tr>`;

const freieZeile = (nr: number) => `
      <tr class="leistung aus" data-zeile="frei">
        <td class="an"><input type="checkbox" class="box" data-st="an" /></td>
        <td class="nr">${nr}</td>
        <td class="text"><div class="bez">${eingabe("", "Weitere Leistung", "", "bez")}</div><div class="beschreibung">${eingabe("", "Beschreibung")}</div></td>
        <td class="zahl">${eingabe("1", "1", "", "menge")}</td>
        <td class="zahl">${eingabe("", "0,00", "", "preis")}</td>
        <td class="zahl betrag" data-st="betrag">0,00</td>
      </tr>`;

export const buildSehtestRechnungBodyHtml = ({
  entities,
  rechnungsnummer,
}: SehtestRechnungDaten): string => {
  const k: Record<string, unknown> = entities.kunde ?? {};
  const auftrag: Record<string, unknown> = entities.brille ?? {};
  const heute = dayjs();
  const leistungsdatum =
    formatDatum(auftrag.Datum) || heute.format("DD.MM.YYYY");
  const gueltigBis = dayjs(
    auftrag.Datum ? String(auftrag.Datum) : heute.toISOString(),
  )
    .add(2, "year")
    .format("DD.MM.YYYY");
  const geprueft = mitarbeiterAnzeige(auftrag.Berater);
  const name = [k.Vorname, k.Nachname].map(text).filter(Boolean).join(" ");
  const summe = berechneSehtestRechnung(
    SEHTEST_LEISTUNGEN.filter((l) => l.standard),
    0,
    a.mwstSatz,
  );
  const zahlbarBis = heute.add(a.zahlungszielTage, "day").format("DD.MM.YYYY");

  const datenbox: [string, string][] = [
    ["Rech.-Datum", heute.format("DD.MM.YYYY")],
    ["Rech.-Nr.", rechnungsnummer],
    ["Kunden-Nr.", text(k.KundenNummer)],
    ["USt.ID.", a.ustId],
  ];

  return `
<div class="beleg sehtest-rechnung">
  ${briefkopfHtml(k, datenbox, "RECHNUNG")}
  <div class="inhalt">
   <div class="inhalt-block">
    <p class="zweck">für die Untersuchung des Sehvermögens zum Erwerb bzw. zur Verlängerung der Fahrerlaubnis nach Anlage 6 Nr. 2.1 FeV (§ 12 Abs. 6 FeV)</p>
    <div class="kopfzeilen">
      <div>Untersuchte Person: ${eingabe(name, "Vorname Name", "", "person")}${k.Geburtsdatum ? `, geb. ${e(formatDatum(k.Geburtsdatum))}` : ""}</div>
      <div>Untersuchungsdatum: ${eingabe(leistungsdatum, "TT.MM.JJJJ", "", "datum")}${geprueft ? ` · Prüfer/in: ${e(geprueft)}` : ""}</div>
      <div class="klassen">Fahrerlaubnisklasse(n): ${FAHRERLAUBNISKLASSEN.map((kl) => kaestchen(kl, `klasse_${kl}`)).join("")}</div>
    </div>
    <table class="leistungen">
      <thead>
        <tr><th class="an"></th><th class="nr">Pos.</th><th class="text">Leistung</th><th class="zahl">Menge</th><th class="zahl">Einzelpreis</th><th class="zahl">Betrag</th></tr>
      </thead>
      <tbody>
      ${SEHTEST_LEISTUNGEN.map((l, i) => leistungZeile(l, i + 1)).join("")}
      ${freieZeile(SEHTEST_LEISTUNGEN.length + 1)}
      </tbody>
    </table>
    <table class="summen">
      <tr class="rabattzeile aus" data-st="rabattzeile"><td>Zwischensumme</td><td data-st="zwischensumme">${e(formatEuro(summe.zwischensumme))}</td></tr>
      <tr class="rabattzeile aus"><td>abzüglich Rabatt ${eingabe("0", "0", "kurz", "rabatt")} %</td><td data-st="rabattbetrag">${e(formatEuro(-summe.rabatt))}</td></tr>
    </table>
    <div class="summenbalken"><span>Rechnungsbetrag</span><span data-st="brutto">${e(formatEuro(summe.brutto))}</span></div>
    <p class="mwst">Im obigen Betrag sind ${a.mwstSatz}% Mwst = <span data-st="mwst">${e(formatEuro(summe.mwst))}</span> enthalten. (Nettopreis: <span data-st="netto">${e(zahl2.format(summe.netto))}</span> €)</p>
    <div class="hinweise">
      <div class="zahlungsart">Zahlungsart: ${kaestchen("bar", "zahlung_bar")}${kaestchen("EC-Karte", "zahlung_ec")}${kaestchen("Überweisung", "zahlung_ueberweisung", true)}</div>
      <div data-zahlung="sofort" class="aus">Den Rechnungsbetrag haben wir dankend erhalten.</div>
      <div data-zahlung="ueberweisung">Bitte überweisen Sie den Rechnungsbetrag bis zum ${e(zahlbarBis)} auf unser unten genanntes Konto. Verwendungszweck: Rechnung ${e(rechnungsnummer)}.</div>
      <div>Leistungsdatum ist das Untersuchungsdatum. Die Untersuchung dient dem Nachweis gegenüber der Fahrerlaubnisbehörde und ist keine Heilbehandlung; sie unterliegt daher dem Regelsteuersatz von ${a.mwstSatz} %.</div>
      <div>Die Bescheinigung darf bei Antragstellung höchstens zwei Jahre alt sein (§ 12 Abs. 7 FeV), hier also bis ${e(gueltigBis)}. Die orientierenden Prüfungen ersetzen nicht die augenärztliche Untersuchung nach Anlage 6 Nr. 2.2 FeV.</div>
    </div>
   </div>
  </div>
  ${fusszeileHtml()}
</div>`;
};

// Neuberechnung beim Eintippen und Anklicken (nur in der Vorschau; das
// Ergebnis steht danach im Dokument und wird so gedruckt)
const vorschauSkript = () => `
<script data-nur-vorschau>
(function () {
  var euroZahl = ${euroZahl.toString()};
  var berechne = ${berechneSehtestRechnung.toString()};
  var mwstSatz = ${Number(a.mwstSatz)};
  var d = document;
  var fmt = function (n) {
    return n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  var feld = function (wurzel, name) { return wurzel.querySelector('[data-st="' + name + '"]'); };
  var neu = function () {
    var zeilen = [];
    var nr = 0;
    d.querySelectorAll("tr.leistung").forEach(function (tr) {
      var an = feld(tr, "an").checked;
      tr.classList.toggle("aus", !an);
      var menge = euroZahl(feld(tr, "menge").textContent);
      var preis = euroZahl(feld(tr, "preis").textContent);
      var betrag = an ? berechne([{ menge: menge, preis: preis }], 0, mwstSatz).betraege[0] : 0;
      feld(tr, "betrag").textContent = fmt(betrag);
      if (an) {
        nr += 1;
        zeilen.push({ menge: menge, preis: preis });
      }
      tr.querySelector(".nr").textContent = an ? String(nr) : "";
    });
    var rabatt = euroZahl(feld(d, "rabatt").textContent);
    var s = berechne(zeilen, rabatt, mwstSatz);
    d.querySelectorAll(".rabattzeile").forEach(function (z) { z.classList.toggle("aus", !(s.rabatt > 0)); });
    feld(d, "zwischensumme").textContent = fmt(s.zwischensumme) + " EUR";
    feld(d, "rabattbetrag").textContent = fmt(-s.rabatt) + " EUR";
    feld(d, "brutto").textContent = fmt(s.brutto) + " EUR";
    feld(d, "netto").textContent = fmt(s.netto);
    feld(d, "mwst").textContent = fmt(s.mwst) + " EUR";
    var ueberweisung = feld(d, "zahlung_ueberweisung").checked;
    d.querySelector('[data-zahlung="sofort"]').classList.toggle("aus", ueberweisung || !(feld(d, "zahlung_bar").checked || feld(d, "zahlung_ec").checked));
    d.querySelector('[data-zahlung="ueberweisung"]').classList.toggle("aus", !ueberweisung);
    passend();
  };
  // Seite voll? Tabelle schrittweise verkleinern (bis 80 %), damit nichts
  // über die Fußzeile läuft
  var passend = function () {
    var tabelle = d.querySelector("table.leistungen");
    var block = d.querySelector(".inhalt-block");
    var fuss = d.querySelector(".fusszeile");
    if (!tabelle || !block || !fuss) return;
    for (var skala = 1; skala >= 0.8; skala -= 0.05) {
      tabelle.style.setProperty("--skala", String(skala));
      if (block.getBoundingClientRect().bottom <= fuss.getBoundingClientRect().top - 2) return;
    }
  };
  // Zahlungsart: genau eine
  d.addEventListener("change", function (ev) {
    var name = ev.target.getAttribute && ev.target.getAttribute("data-st");
    if (name && name.indexOf("zahlung_") === 0 && ev.target.checked) {
      ["zahlung_bar", "zahlung_ec", "zahlung_ueberweisung"].forEach(function (f) {
        if (f !== name) feld(d, f).checked = false;
      });
    }
    neu();
  });
  d.addEventListener("input", neu);
  // Preise beim Verlassen des Feldes einheitlich schreiben ("10" -> "10,00")
  d.addEventListener("focusout", function (ev) {
    var t = ev.target;
    if (t && t.getAttribute && t.getAttribute("data-st") === "preis" && t.textContent.trim()) {
      t.textContent = fmt(euroZahl(t.textContent));
    }
  });
  neu();
})();
</script>`;

const STYLES = `
  body { margin: 0; }
  ${BELEG_STYLES}
  .sehtest-rechnung { font-size: 9pt; }
  .sehtest-rechnung .inhalt { top: 107mm; bottom: 44mm; }
  .sehtest-rechnung .zweck { line-height: 1.3; margin-bottom: 1.2mm; font-size: 8.8pt; }
  .sehtest-rechnung .kopfzeilen { font-size: 8pt; line-height: 1.45; margin-bottom: 1.2mm; }
  .sehtest-rechnung .klassen .wahl { margin-right: 1.8mm; }
  .sehtest-rechnung .wahl { display: inline-flex; align-items: center; gap: 0.7mm; white-space: nowrap; }
  .sehtest-rechnung .box { width: 2.8mm; height: 2.8mm; margin: 0; accent-color: #222; }
  .sehtest-rechnung table.leistungen { width: 100%; border-collapse: collapse; font-size: calc(8.6pt * var(--skala, 1)); }
  .sehtest-rechnung .leistungen th { font-weight: 600; font-size: 7.5pt; text-align: left; border-bottom: 0.3mm solid #555; padding: 0.4mm 0.8mm; }
  .sehtest-rechnung .leistungen td { vertical-align: top; padding: 0.5mm 0.8mm; border-bottom: 0.15mm solid #ccc; line-height: 1.2; }
  .sehtest-rechnung .leistungen .an { width: 4.5mm; padding-left: 0; }
  .sehtest-rechnung .leistungen .nr { width: 7mm; }
  .sehtest-rechnung .leistungen .zahl { text-align: right; white-space: nowrap; width: 15mm; }
  .sehtest-rechnung .leistungen th.zahl:nth-last-child(2) { width: 18mm; }
  .sehtest-rechnung .beschreibung { font-size: calc(6.8pt * var(--skala, 1)); color: #444; line-height: 1.2; }
  .sehtest-rechnung table.summen { width: 100%; border-collapse: collapse; margin-top: 0.6mm; font-size: 8.6pt; }
  .sehtest-rechnung .summen td { padding: 0.2mm 0.4mm; }
  .sehtest-rechnung .summen td:last-child { text-align: right; }
  .sehtest-rechnung .mwst { margin-top: 1.6mm; font-size: 7.8pt; }
  .sehtest-rechnung .hinweise { margin-top: 1.6mm; font-size: 7pt; line-height: 1.35; }
  .sehtest-rechnung .zahlungsart .wahl { margin-left: 2mm; }
  .sehtest-rechnung .eingabe.kurz { display: inline-block; min-width: 6mm; text-align: right; }
  .sehtest-rechnung .an .box { margin-top: 0.3mm; }
  /* abgewählte Positionen und leere Hinweise nicht drucken */
  .sehtest-rechnung .aus { display: none; }
  @page { size: A4; margin: 0; }
`;

const BILDSCHIRM_STYLES = `<style data-bildschirm>
  html { background: #eee; }
  .beleg { margin: 12px auto; box-shadow: 0 1px 6px rgba(0, 0, 0, 0.2); }
  .eingabe { outline: none; background: #f3f8ff; border-radius: 2px; cursor: text; }
  .eingabe:focus { background: #e3efff; }
  .eingabe:empty::before { content: attr(data-hinweis); color: #9aa8bb; font-style: italic; }
  /* in der Vorschau bleiben abgewählte Positionen sichtbar, aber blass */
  .sehtest-rechnung tr.leistung.aus { display: table-row; opacity: 0.45; }
  .sehtest-rechnung tr.leistung.aus .eingabe { background: transparent; }
  @media print {
    html { background: none; }
    .beleg { margin: 0; box-shadow: none; }
    .sehtest-rechnung tr.leistung.aus { display: none; }
    .eingabe { background: none; }
    .eingabe:empty::before { content: none; }
  }
</style>`;

const seite = (
  titel: string,
  body: string,
  extraStyles: string,
  skript = "",
) => `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8" />
<title>${e(titel)}</title>
<style>${STYLES}</style>
${extraStyles}
</head>
<body>
${body}
${skript}
</body>
</html>`;

const titel = (nummer: string) =>
  `Rechnung Sehtest Fahrerlaubnis C/D${nummer ? ` ${nummer}` : ""}`;

export const buildSehtestRechnungPrintHtml = (
  daten: SehtestRechnungDaten,
): string =>
  seite(titel(daten.rechnungsnummer), buildSehtestRechnungBodyHtml(daten), "");

export const buildSehtestRechnungPreviewHtml = (
  daten: SehtestRechnungDaten,
): string =>
  seite(
    titel(daten.rechnungsnummer),
    buildSehtestRechnungBodyHtml(daten),
    BILDSCHIRM_STYLES,
    vorschauSkript(),
  );
