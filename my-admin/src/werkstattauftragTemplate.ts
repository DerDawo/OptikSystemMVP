// Werkstattauftrag als eigenes HTML-Layout für die Kategorie "Werkstattkarte",
// nachgebildet nach dem bisherigen Papierformular: eine A4-Seite, oben der
// Auftrag für Werkstatt/Laden (Werte, Glas, Fassung, Positionen, Unterschrift),
// unten zum Abtrennen der Kundenabschnitt mit Pflegetipps und Preisen.
//
// Wie bei der Rechnung (rechnungTemplate.ts) braucht das Formular Tabellen und
// eine feste Seitenaufteilung, die der generische {{platzhalter}}-Fließtext
// nicht abbildet. Der Vorlagentext des "Werkstattkarte"-Datensatzes in
// `dokumentvorlage` wird daher nicht mehr verwendet.
import dayjs from "dayjs";
import type {
  DocumentMergeEntities,
  MergeSource,
} from "./documentTemplateEngine";
import {
  RECHNUNG_ABSENDER,
  buildRechnungPositionen,
  escapeHtml,
} from "./rechnungTemplate";
import { mitarbeiterAnzeige } from "./mitarbeiterNamen";

export const text = (value: unknown): string =>
  value === null || value === undefined ? "" : String(value).trim();

const asNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const round2 = (value: number) => Math.round(value * 100) / 100;

const zahl = (min: number, max: number) =>
  new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: min,
    maximumFractionDigits: max,
  });
const dioptrien = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: "exceptZero",
});
const euro = zahl(2, 2);

type Format = "dioptrie" | "achse" | "zwei" | "frei" | "visus";

// Optikerübliche Schreibweise: Sph/Cyl/Add mit Vorzeichen und zwei
// Nachkommastellen ("+0,75"), Achse ganzzahlig, Abstände ohne Nullen.
export const formatWert = (value: unknown, format: Format): string => {
  const number = asNumber(value);
  if (number === null) return text(value);
  switch (format) {
    case "dioptrie":
      return dioptrien.format(number);
    case "achse":
      return String(Math.round(number));
    case "zwei":
      return zahl(2, 2).format(number);
    case "visus":
      return zahl(1, 2).format(number);
    default:
      return zahl(0, 2).format(number);
  }
};

export const formatEuro = (value: number) => euro.format(value);

// Datum; mit uhrzeit = true und einer Uhrzeit ungleich 00:00 auch mit
// Uhrzeit ("12.01.2026 17:00")
export const formatDatum = (value: unknown, uhrzeit = false): string => {
  const raw = text(value);
  if (!raw) return "";
  const parsed = dayjs(raw);
  if (!parsed.isValid()) return raw;
  const mitZeit =
    uhrzeit &&
    raw.length > 10 &&
    (parsed.hour() !== 0 || parsed.minute() !== 0);
  return parsed.format(mitZeit ? "DD.MM.YYYY HH:mm" : "DD.MM.YYYY");
};

const WERTE_SPALTEN: { feld: string; titel: string; format: Format }[] = [
  { feld: "Sph", titel: "Sph", format: "dioptrie" },
  { feld: "Cyl", titel: "Cyl", format: "dioptrie" },
  { feld: "A", titel: "A", format: "achse" },
  { feld: "Add", titel: "Add", format: "dioptrie" },
  { feld: "Pr", titel: "Prisma", format: "zwei" },
  { feld: "B", titel: "Basis", format: "frei" },
  { feld: "PD", titel: "PD", format: "frei" },
  { feld: "y_h", titel: "Höhe", format: "frei" },
  { feld: "HSA", titel: "HSA", format: "frei" },
  { feld: "Vis", titel: "Vis", format: "visus" },
  { feld: "iod", titel: "IOD", format: "frei" },
];

// Positionsnamen wie auf dem Papierformular
const POSITIONS_NAMEN: Record<string, string> = {
  "Fassung :": "Brillenfassung",
  "Glas rechts :": "Brillenglas R.",
  "Glas links :": "Brillenglas L.",
};

export type WerkstattauftragSummen = {
  positionen: { label: string; betrag: number }[];
  gesamt: number;
  kassenanteil: number;
  endpreis: number;
  netto: number;
  mwst: number;
  anzahlung: number;
  offen: number;
};

export const buildWerkstattauftragSummen = (
  entities: DocumentMergeEntities,
): WerkstattauftragSummen => {
  const positionen = buildRechnungPositionen(entities)
    .filter((position) => position.betrag !== null)
    .map((position) => ({
      label: POSITIONS_NAMEN[position.label] ?? position.label,
      betrag: position.betrag ?? 0,
    }));
  const brille: Record<string, unknown> = entities.brille ?? {};
  const gesamt =
    asNumber(brille.Summe) ??
    round2(positionen.reduce((sum, position) => sum + position.betrag, 0));
  const kassenanteil = asNumber(brille.KKAnteil) ?? 0;
  const anzahlung = asNumber(brille.Anzahlung) ?? 0;
  const endpreis = round2(gesamt - kassenanteil);
  // MwSt wie auf der Rechnung aus dem Gesamtpreis herausgerechnet
  const netto = round2(gesamt / (1 + RECHNUNG_ABSENDER.mwstSatz / 100));
  return {
    positionen,
    gesamt,
    kassenanteil,
    endpreis,
    netto,
    mwst: round2(gesamt - netto),
    anzahlung,
    offen: round2(endpreis - anzahlung),
  };
};

const zeile = (label: string, wert: string) =>
  `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(wert)}</td></tr>`;

const angaben = (paare: [string, string][]) =>
  `<table class="angaben">${paare.map(([l, w]) => zeile(l, w)).join("")}</table>`;

// Zwei Spalten Label/Wert nebeneinander, spart Höhe in der oberen Hälfte
const angabenZweispaltig = (paare: [string, string][]) => {
  const reihen: string[] = [];
  for (let i = 0; i < paare.length; i += 2) {
    const [l1, w1] = paare[i];
    const [l2, w2] = paare[i + 1] ?? ["", ""];
    reihen.push(
      `<tr><th>${escapeHtml(l1)}</th><td>${escapeHtml(w1)}</td><th>${escapeHtml(l2)}</th><td>${escapeHtml(w2)}</td></tr>`,
    );
  }
  return `<table class="angaben zweispaltig">${reihen.join("")}</table>`;
};

export const werteTabelle = (rechts: MergeSource, links: MergeSource) => {
  const kopf = WERTE_SPALTEN.map((s) => `<th>${s.titel}</th>`).join("");
  const reihe = (seite: string, glas: MergeSource) =>
    `<tr><th>${seite}</th>${WERTE_SPALTEN.map(
      (s) => `<td>${escapeHtml(formatWert(glas?.[s.feld], s.format))}</td>`,
    ).join("")}</tr>`;
  return `<table class="werte"><thead><tr><th></th>${kopf}</tr></thead><tbody>${reihe("R", rechts)}${reihe("L", links)}</tbody></table>`;
};

export const preisTabelle = (
  summen: WerkstattauftragSummen,
  mitOffen: boolean,
) => {
  const positionen = summen.positionen
    .map(
      (p) =>
        `<tr><td>${escapeHtml(p.label)}</td><td class="betrag">${escapeHtml(formatEuro(p.betrag))}</td></tr>`,
    )
    .join("");
  const offen =
    mitOffen && summen.anzahlung > 0
      ? `<tr><td>Anzahlung</td><td class="betrag">${escapeHtml(formatEuro(summen.anzahlung))}</td></tr>
         <tr class="fett"><td>Offen</td><td class="betrag">${escapeHtml(formatEuro(summen.offen))}</td></tr>`
      : "";
  return `
  <table class="preise">
    <thead><tr><th>Positionen</th><th class="betrag">Preis (EUR)</th></tr></thead>
    <tbody>${positionen}</tbody>
  </table>
  <table class="preise summen">
    <tr class="summenlinie"><td>Gesamtpreis</td><td class="betrag">${escapeHtml(formatEuro(summen.gesamt))}</td></tr>
    <tr><td>abzügl. Kassenanteil</td><td class="betrag">${escapeHtml(formatEuro(summen.kassenanteil))}</td></tr>
    <tr class="endpreis"><td>Endpreis</td><td class="betrag">${escapeHtml(formatEuro(summen.endpreis))}</td></tr>
    <tr class="klein"><td>Nettopreis</td><td class="betrag">${escapeHtml(formatEuro(summen.netto))}</td></tr>
    <tr class="klein"><td>${RECHNUNG_ABSENDER.mwstSatz} % MwSt.</td><td class="betrag">${escapeHtml(formatEuro(summen.mwst))}</td></tr>
    ${offen}
  </table>`;
};

const PFLEGETIPPS = [
  "Gläser unter handwarmem, fließendem Wasser abspülen und mit einem weichen, sauberen Tuch trocknen.",
  "Kein Spülmittel mit rückfettenden Zusätzen verwenden – es hinterlässt Schlieren auf den Gläsern.",
  "Für unterwegs eignet sich ein Mikrofasertuch, Papiertaschentücher können die Beschichtung zerkratzen.",
  "Zu anderen Brillenreinigern im Handel können wir wegen der großen Auswahl keine Empfehlung geben.",
  "Die Brille nie mit den Gläsern nach unten ablegen, am besten im festen Etui aufbewahren.",
  "Temperaturen über 80 °C schaden den Gläsern, z. B. in der Sauna oder im Sommer auf dem Armaturenbrett.",
];

export type WerkstattauftragDaten = {
  entities: DocumentMergeEntities;
};

// Auftragserteilung zum Unterschreiben (nur auf dem Abschnitt fürs
// Geschäft): Maßanfertigung zum Endpreis, Fälligkeit, Eigentumsvorbehalt
// (§ 449 BGB), Anteil des Kostenträgers, Kündigung vor Fertigstellung
// (§ 648 BGB), Gewährleistung bleibt.
const auftragserteilung = (endpreis: number) => {
  const firma = escapeHtml(RECHNUNG_ABSENDER.firma);
  return `<div class="auftragserteilung">
      <p><b>Auftragserteilung</b><br />
      Ich beauftrage ${firma} mit der Anfertigung der oben beschriebenen Brille nach meinen individuellen Werten zum Endpreis von ${escapeHtml(formatEuro(endpreis))} € inkl. MwSt.
      Der Betrag ist bei Abholung fällig; bis zur vollständigen Bezahlung bleibt die Brille Eigentum von ${firma}.
      Übernimmt ein Kostenträger (z. B. Krankenkasse, Arbeitgeber, Sozialamt) seinen Anteil nicht, zahle ich diesen selbst.
      Kündige ich den Auftrag vor Fertigstellung, kann ${firma} die vereinbarte Vergütung abzüglich ersparter Aufwendungen verlangen (§ 648 BGB).
      Meine gesetzlichen Gewährleistungsrechte bleiben unberührt.</p>
      <div class="unterschriften">
        <div class="unterschrift">${escapeHtml(RECHNUNG_ABSENDER.ort)}, Datum</div>
        <div class="unterschrift">Unterschrift Kunde/Kundin</div>
      </div>
    </div>`;
};

export const buildWerkstattauftragBodyHtml = ({
  entities,
}: WerkstattauftragDaten): string => {
  const kunde: Record<string, unknown> = entities.kunde ?? {};
  const brille: Record<string, unknown> = entities.brille ?? {};
  const glastyp: Record<string, unknown> = entities.glastyp ?? {};
  const fassung: Record<string, unknown> = entities.fassung ?? {};
  const summen = buildWerkstattauftragSummen(entities);

  const name = [kunde.Vorname, kunde.Nachname].map(text).filter(Boolean);
  const strasse = [kunde.Straße, kunde.Hausnummer].map(text).filter(Boolean);
  const ort = [kunde.Postleitzahl, kunde.Stadt].map(text).filter(Boolean);
  const auftragsdatum =
    formatDatum(brille.Datum) || dayjs().format("DD.MM.YYYY");
  const fertigBis = formatDatum(brille.Abholung, true);

  const kundeninfo: [string, string][] = [
    ["Geburtsdatum", formatDatum(kunde.Geburtsdatum)],
    ["Krankenkasse", text(kunde.KrankenversicherungsTyp)],
    ["Bearbeiter", text(mitarbeiterAnzeige(brille.Berater))],
    ["Refraktion", text(mitarbeiterAnzeige(brille.Refraktion))],
    ["Werkstatt", text(brille.Werkstatt)],
  ];

  const firma = RECHNUNG_ABSENDER.firma;
  const kontakt = `${firma} · ${RECHNUNG_ABSENDER.strasseLang} · ${RECHNUNG_ABSENDER.plz} ${RECHNUNG_ABSENDER.ort} · Tel. ${RECHNUNG_ABSENDER.telefon}`;

  return `
<div class="blatt">
  <section class="haelfte">
    <div class="spalte">
      <div class="titelzeile"><span>Werkstattauftrag</span><span>${escapeHtml(auftragsdatum)}</span></div>
      <div class="kundenbox">
        <div>
          <div>${escapeHtml(text(kunde.Anrede))}</div>
          <div class="fett">${escapeHtml(name.join(" "))}</div>
          <div>${escapeHtml(strasse.join(" "))}</div>
          <div>${escapeHtml(ort.join(" "))}</div>
        </div>
        <div class="nummern">
          <div>Kd.-Nr. <b>${escapeHtml(text(kunde.KundenNummer))}</b></div>
          <div>Auftrag <b>${escapeHtml(text(brille.id))}</b></div>
          <div>Fertig bis <b>${escapeHtml(fertigBis)}</b></div>
        </div>
      </div>
      ${angaben([
        ["Telefon", text(kunde.TelefonnummerPrivat)],
        ["Mobil", text(kunde.Handy)],
        ["E-Mail", text(kunde.Email)],
      ])}
      <div class="balken">${escapeHtml(text(brille.BrillenArt) || "Brille")}</div>
      ${werteTabelle(entities.glasRechts, entities.glasLinks)}
      <div class="balken">Glasbezeichnung</div>
      ${angabenZweispaltig([
        ["Herst.", text(glastyp.Hersteller)],
        ["Glas", text(glastyp.Bezeichnung)],
        ["Größe", text(glastyp.GlasGroesse)],
        ["Oberfl.", text(glastyp.Verguetung)],
        ["Tönung", text(glastyp.Farbe)],
        ["Sonstiges", text(glastyp.Sonstiges)],
      ])}
      <div class="balken">Fassung</div>
      ${angabenZweispaltig([
        ["Herst.", text(fassung.Hersteller)],
        ["Modell", text(fassung.Bezeichnung)],
        ["Farbe", text(fassung.Farbe)],
        ["Größe", text(fassung.Groesse)],
        ["Lager-Nr.", text(fassung.Lagernummer)],
        ["Linie", text(fassung.Linie)],
      ])}
      <div class="balken"><span>Bemerkungen</span><span>Offen: ${escapeHtml(formatEuro(summen.offen))} €</span></div>
      <div class="notizen">${escapeHtml(text(brille.Notizen))}</div>
      <div class="schreiblinie"></div>
      <div class="schreiblinie"></div>
    </div>
    <div class="spalte">
      ${angaben(kundeninfo)}
      ${preisTabelle(summen, false)}
      ${auftragserteilung(summen.endpreis)}
    </div>
  </section>

  <div class="schnitt"><span>✂ Kundenabschnitt</span></div>

  <section class="haelfte">
    <div class="spalte">
      <div class="titelzeile"><span>Pflegetipps für Ihre Brille</span></div>
      <p>Gewissenhafte und richtige Pflege sorgt für eine lange Lebensdauer und gleichbleibend gute Sicht durch Ihre Brillengläser.</p>
      <ul class="tipps">${PFLEGETIPPS.map((tipp) => `<li>${escapeHtml(tipp)}</li>`).join("")}</ul>
      <p>Für weitere Tipps sprechen Sie uns einfach an.</p>
      <p>Ihr ${escapeHtml(firma)}</p>
    </div>
    <div class="spalte">
      <div class="titelzeile"><span>Ihr Auftrag ${escapeHtml(text(brille.id))}</span><span>${escapeHtml(auftragsdatum)}</span></div>
      ${angaben([
        ["Kunde", [text(kunde.Anrede), ...name].filter(Boolean).join(" ")],
        ["Fertig bis", fertigBis],
        ...kundeninfo.slice(2),
      ])}
      ${preisTabelle(summen, true)}
      <p class="kontakt">${escapeHtml(kontakt)}</p>
    </div>
  </section>
</div>`;
};

// Werte- und Preistabellen, auch im Kostenvoranschlag (antragTemplate.ts)
export const FORMULAR_TABELLEN_STYLES = `
  table { border-collapse: collapse; width: 100%; }
  .werte th, .werte td { border: 1px solid #777; padding: 0.6mm 0.8mm; text-align: right; font-size: 8pt; }
  .werte thead th { background: #f2f2f2; font-weight: normal; text-align: center; }
  .werte tbody th { text-align: center; width: 5mm; }
  .preise { margin-top: 2mm; }
  .preise th { text-align: left; border-bottom: 1px solid #555; padding-bottom: 0.6mm; }
  .preise td { padding: 0.4mm 0; }
  .betrag, .preise th.betrag { text-align: right; white-space: nowrap; }
  .summen { margin-top: 1mm; }
  .summen .summenlinie td { border-top: 1px solid #555; padding-top: 1mm; }
  .summen .endpreis td { font-weight: bold; border-bottom: 2px solid #111; }
  .summen .klein td { font-size: 7.5pt; color: #444; }
`;

const WERKSTATTAUFTRAG_STYLES = `
  ${FORMULAR_TABELLEN_STYLES}
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #111; font-size: 8.5pt; line-height: 1.3; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  /* links 4 mm, rechts 18 mm: die linke Spalte (Werkstattauftrag) endet
     vor der senkrechten Falz bei 105 mm - 2x gefaltet ergibt das obere
     linke Viertel genau eine A6-Karte */
  .blatt { width: 210mm; height: 297mm; padding: 8mm 18mm 8mm 4mm; display: grid; grid-template-rows: minmax(0, 1fr) auto minmax(0, 1fr); overflow: hidden; background: #fff; }
  .haelfte { display: grid; grid-template-columns: 1.08fr 0.92fr; gap: 7mm; min-height: 0; overflow: hidden; }
  .spalte { min-width: 0; }
  .titelzeile { display: flex; justify-content: space-between; font-weight: bold; font-size: 10.5pt; margin-bottom: 1.5mm; }
  .kundenbox { display: flex; justify-content: space-between; gap: 4mm; border: 1px solid #555; padding: 1.2mm 2mm; margin-bottom: 1.2mm; }
  .nummern { text-align: right; white-space: nowrap; }
  .fett { font-weight: bold; }
  .balken { display: flex; justify-content: space-between; background: #ddd; font-weight: bold; padding: 0.5mm 1.5mm; margin: 1.6mm 0 0.8mm; }
  .angaben th { text-align: left; font-weight: normal; color: #444; width: 23mm; padding: 0.2mm 2mm 0.2mm 0; vertical-align: top; }
  .angaben td { padding: 0.2mm 0; vertical-align: top; }
  .angaben.zweispaltig th { width: 14mm; }
  .angaben.zweispaltig td { width: 30%; padding-right: 2mm; }
  .notizen { white-space: pre-wrap; min-height: 4mm; }
  .schreiblinie { border-bottom: 1px solid #999; height: 5mm; }
  .auftragserteilung { margin-top: 2.5mm; font-size: 7pt; line-height: 1.3; }
  .auftragserteilung p { margin: 0 0 6mm; text-align: justify; }
  .auftragserteilung b { font-size: 8pt; }
  .unterschriften { display: flex; gap: 5mm; }
  .unterschrift { flex: 1; border-top: 1px solid #111; padding-top: 0.8mm; font-size: 7.5pt; }
  .schnitt { border-top: 1px dashed #888; margin: 3mm 0; height: 0; text-align: center; }
  .schnitt span { position: relative; top: -2.2mm; background: #fff; padding: 0 2mm; font-size: 7pt; color: #666; }
  .tipps { margin: 1mm 0 2mm; padding-left: 4mm; }
  .tipps li { margin-bottom: 0.8mm; }
  .kontakt { margin-top: 4mm; font-size: 7.5pt; color: #444; }
  p { margin: 0 0 1.5mm; }
`;

// Passt eine Spalte nicht in ihre Hälfte (viele Positionen, lange
// Bemerkungen), wird sie stufenweise verkleinert statt an der Falz
// abgeschnitten (transform statt zoom, damit auch das PDF stimmt).
const EINPASSEN = `<script>
(function () {
  document.querySelectorAll(".haelfte").forEach(function (haelfte) {
    var hoehe = haelfte.clientHeight;
    haelfte.querySelectorAll(":scope > .spalte").forEach(function (spalte) {
      var faktor = 1;
      while (spalte.offsetHeight * faktor > hoehe + 1 && faktor > 0.7) {
        faktor = Math.round((faktor - 0.02) * 100) / 100;
        spalte.style.transformOrigin = "top left";
        spalte.style.transform = "scale(" + faktor + ")";
        spalte.style.width = 100 / faktor + "%";
      }
    });
  });
})();
</script>`;

export const buildWerkstattauftragPrintHtml = (
  daten: WerkstattauftragDaten,
): string => `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(`Werkstattauftrag ${text(daten.entities.brille?.id)}`)}</title>
<style>
  ${WERKSTATTAUFTRAG_STYLES}
  @page { size: A4; margin: 0; }
</style>
</head>
<body>
${buildWerkstattauftragBodyHtml(daten)}
${EINPASSEN}
</body>
</html>`;

// Live-Vorschau im Formulare-Dialog (ohne @page, Blatt mit leichtem Schatten)
export const buildWerkstattauftragPreviewHtml = (
  daten: WerkstattauftragDaten,
): string => `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8" />
<style>
  ${WERKSTATTAUFTRAG_STYLES}
  html { background: #eee; }
  .blatt { margin: 12px auto; box-shadow: 0 1px 6px rgba(0, 0, 0, 0.2); }
</style>
</head>
<body>
${buildWerkstattauftragBodyHtml(daten)}
${EINPASSEN}
</body>
</html>`;
