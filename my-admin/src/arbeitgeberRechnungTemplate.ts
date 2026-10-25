// Rechnungen an den Arbeitgeber im Rechnungsdesign (rechnungTemplate.ts):
//   - "Rechnung Bildschirmarbeitsplatzbrille" (ArbMedVV, Anhang Teil 4
//     Abs. 2 Nr. 1, Angebotsvorsorge)
//   - "Rechnung Arbeitsschutzbrille" (Korrektionsschutzbrille, DIN EN 166)
// Fassung, Gläser, Zusatzleistungen, Rabatt und Rechnungsbetrag kommen aus
// dem Auftrag. Auf der Rechnung stehen bewusst keine Sehwerte. Empfänger
// (Arbeitgeber), Mitarbeiter/in, Vorgangsnummer und Lieferdatum werden in
// der Vorschau eingetippt; die E-Mail-Adresse des Arbeitgebers dient nur dem
// Versand und wird nicht mitgedruckt.
import dayjs from "dayjs";
import type { DocumentMergeEntities } from "./documentTemplateEngine";
import {
  BELEG_STYLES,
  RECHNUNG_ABSENDER,
  briefkopfHtml,
  buildRechnungPositionen,
  escapeHtml,
  formatEuro,
  fusszeileHtml,
  type RechnungPosition,
} from "./rechnungTemplate";
import {
  type BetriebBilder,
  betriebBilder,
  bildUrl,
} from "./betriebBilderCache";
import { text } from "./werkstattauftragTemplate";

export type ArbeitgeberRechnungArt = "bildschirm" | "schutz";

export type ArbeitgeberRechnungDaten = {
  entities: DocumentMergeEntities;
  rechnungsnummer: string;
  // Stempel/Unterschrift; ohne Angabe die privat gespeicherten Bilder
  bilder?: BetriebBilder;
};

export const ARBEITGEBER_RECHNUNG_KATEGORIEN = {
  bildschirm: "Rechnung Bildschirmarbeitsplatzbrille",
  schutz: "Rechnung Arbeitsschutzbrille",
} as const;

const ZWECK: Record<ArbeitgeberRechnungArt, string> = {
  bildschirm:
    "für eine Bildschirmarbeitsplatzbrille auf Veranlassung des Arbeitgebers (ArbMedVV, Anhang Teil 4 Abs. 2 Nr. 1)",
  schutz:
    "für eine Arbeitsschutzbrille mit Sehstärke (Korrektionsschutzbrille nach DIN EN 166) als persönliche Schutzausrüstung",
};

const e = escapeHtml;
const a = RECHNUNG_ABSENDER;
const rund = (wert: number) => Math.round(wert * 100) / 100;
const zahl2 = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const eingabe = (wert = "", hinweis = "", klasse = "") =>
  `<span class="eingabe ${klasse}" contenteditable="true" data-hinweis="${e(hinweis)}">${e(wert)}</span>`;

const eingabeZeile = (wert = "", hinweis = "") =>
  `<div class="eingabe" contenteditable="true" data-hinweis="${e(hinweis)}">${e(wert)}</div>`;

/**
 * Positionen der Rechnung an den Arbeitgeber: wie die Kundenrechnung, aber die
 * beiden Gläser werden zu einer Position "(1 Paar)" ohne Glaswerte
 * zusammengefasst (Datensparsamkeit gegenüber dem Arbeitgeber).
 */
export const arbeitgeberPositionen = (
  entities: DocumentMergeEntities,
): RechnungPosition[] => {
  const alle = buildRechnungPositionen(entities);
  const glaeser = alle.filter((p) => /^Glas (rechts|links)/.test(p.label));
  const ohneGlas = alle.filter((p) => !glaeser.includes(p));
  if (!glaeser.length) return alle;
  const paar: RechnungPosition = {
    label: "Brillengläser (1 Paar) :",
    betrag: rund(glaeser.reduce((s, p) => s + (p.betrag ?? 0), 0)),
    details: glaeser[0].details,
  };
  // Reihenfolge: Fassung, Gläser, dann Rest
  const fassungen = ohneGlas.filter((p) => p.label.startsWith("Fassung"));
  const rest = ohneGlas.filter((p) => !fassungen.includes(p));
  return [...fassungen, paar, ...rest];
};

const stempelBlock = (bilder: BetriebBilder): string => {
  const stempel = bildUrl(bilder.stempel);
  const unterschrift = bildUrl(bilder.unterschrift);
  if (!stempel && !unterschrift) return "";
  return `<div class="stempelblock">${
    stempel ? `<img class="stempel" src="${stempel}" alt="" />` : ""
  }${
    unterschrift
      ? `<img class="unterschrift" src="${unterschrift}" alt="" />`
      : ""
  }</div>`;
};

export const buildArbeitgeberRechnungBodyHtml = (
  art: ArbeitgeberRechnungArt,
  {
    entities,
    rechnungsnummer,
    bilder = betriebBilder(),
  }: ArbeitgeberRechnungDaten,
): string => {
  const k: Record<string, unknown> = entities.kunde ?? {};
  const brille: Record<string, unknown> = entities.brille ?? {};
  const heute = dayjs();
  const positionen = arbeitgeberPositionen(entities);
  const summeAuftrag = Number(brille.Summe) || 0;
  const summe =
    summeAuftrag > 0
      ? summeAuftrag
      : rund(positionen.reduce((s, p) => s + (p.betrag ?? 0), 0));
  const netto = rund(summe / (1 + a.mwstSatz / 100));
  const mwst = rund(summe - netto);
  const mitarbeiter = [k.Vorname, k.Nachname]
    .map(text)
    .filter(Boolean)
    .join(" ");

  const datenbox: [string, string][] = [
    ["Rech.-Datum", heute.format("DD.MM.YYYY")],
    ["Rech.-Nr.", rechnungsnummer],
    ["USt.ID.", a.ustId],
  ];
  const anschrift = [
    eingabeZeile("", "Arbeitgeber / Firma"),
    eingabeZeile("", "Abteilung / zuständige Stelle"),
    eingabeZeile("", "Straße Hausnummer"),
    eingabeZeile("", "PLZ Ort"),
    `<div class="nur-vorschau" data-nur-vorschau>E-Mail für den Versand: ${eingabe("", "E-Mail-Adresse des Arbeitgebers", "versand-email")}</div>`,
  ].join("");

  const positionenHtml = positionen
    .map(
      (p) => `
    <div class="position">
      <div class="zeile"><span>${e(p.label)}</span><span>${p.betrag === null ? "" : e(formatEuro(p.betrag))}</span></div>
      ${(p.details ?? []).map((d) => `<div class="detail">${e(d)}</div>`).join("")}
    </div>`,
    )
    .join("");

  const zahlbarBis = heute.add(a.zahlungszielTage, "day").format("DD.MM.YYYY");

  return `
<div class="beleg">
  ${briefkopfHtml(k, datenbox, "RECHNUNG", anschrift)}
  <div class="inhalt">
   <div class="inhalt-block">
    <p class="zweck">${e(ZWECK[art])}<br />Mitarbeiter/in: ${eingabe(mitarbeiter, "Name")} · Vorgangsnummer des Arbeitgebers: ${eingabe("", "falls vorhanden")}</p>
    ${positionenHtml}
    <div class="summenbalken"><span>Rechnungsbetrag</span><span>${e(formatEuro(summe))}</span></div>
    <p class="mwst">Im obigen Betrag sind ${a.mwstSatz}% Mwst = ${e(formatEuro(mwst))} enthalten. (Nettopreis: ${e(zahl2.format(netto))} €)</p>
    <div class="hinweise">
      <div>Lieferdatum: ${eingabe(heute.format("DD.MM.YYYY"), "TT.MM.JJJJ")} · Lieferung von Waren, es gilt der Regelsteuersatz von ${a.mwstSatz} %.</div>
      <div>Bitte überweisen Sie den Rechnungsbetrag bis zum ${e(zahlbarBis)} auf unser unten genanntes Konto.</div>
      <div>Verwendungszweck: Rechnungsnummer ${e(rechnungsnummer)}</div>
    </div>
    ${stempelBlock(bilder)}
   </div>
  </div>
  ${fusszeileHtml()}
</div>`;
};

const BILDSCHIRM_STYLES = `<style data-bildschirm>
  .eingabe { outline: none; background: #f3f8ff; border-radius: 2px; cursor: text; }
  .eingabe:focus { background: #e3efff; }
  .eingabe:empty::before { content: attr(data-hinweis); color: #9aa8bb; font-style: italic; }
  .beleg .anschrift .eingabe { display: block; min-height: 1.45em; }
  .nur-vorschau { font-size: 8pt; color: #4a6a8a; margin-top: 2mm; }
  .nur-vorschau .eingabe { display: inline-block; min-width: 40mm; }
</style>`;

const seite = (
  titel: string,
  body: string,
  extra: string,
): string => `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8" />
<title>${e(titel)}</title>
<style>
  body { margin: 0; }
  ${BELEG_STYLES}
  .beleg .zweck { line-height: 1.5; }
  .beleg .stempelblock { position: relative; height: 26mm; margin-top: 7mm; }
  .beleg .stempel { position: absolute; right: 0; top: 0; width: 46mm; }
  .beleg .unterschrift { position: absolute; right: 52mm; top: 4mm; width: 34mm; }
  .nur-vorschau { display: none; }
  @page { size: A4; margin: 0; }
</style>
${extra}
</head>
<body>
${body}
</body>
</html>`;

const TITEL: Record<ArbeitgeberRechnungArt, string> = {
  bildschirm: "Rechnung Bildschirmarbeitsplatzbrille",
  schutz: "Rechnung Arbeitsschutzbrille",
};

const PREVIEW_RAHMEN = `<style data-bildschirm>
  html { background: #eee; }
  .beleg { margin: 12px auto; box-shadow: 0 1px 6px rgba(0, 0, 0, 0.2); }
  .nur-vorschau { display: block; }
  @media print { html { background: none; } .beleg { margin: 0; box-shadow: none; } .nur-vorschau { display: none; } }
</style>`;

export const buildArbeitgeberRechnungPrintHtml = (
  art: ArbeitgeberRechnungArt,
  daten: ArbeitgeberRechnungDaten,
): string =>
  seite(TITEL[art], buildArbeitgeberRechnungBodyHtml(art, daten), "");

export const buildArbeitgeberRechnungPreviewHtml = (
  art: ArbeitgeberRechnungArt,
  daten: ArbeitgeberRechnungDaten,
): string =>
  seite(
    TITEL[art],
    buildArbeitgeberRechnungBodyHtml(art, daten),
    `${BILDSCHIRM_STYLES}${PREVIEW_RAHMEN}`,
  );
