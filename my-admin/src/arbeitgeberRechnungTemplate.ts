// Rechnungen an den Arbeitgeber im Rechnungsdesign (rechnungTemplate.ts):
//   - "Rechnung Bildschirmarbeitsplatzbrille" (ArbMedVV, Anhang Teil 4
//     Abs. 2 Nr. 1, Angebotsvorsorge)
//   - "Rechnung Arbeitsschutzbrille" (Korrektionsschutzbrille, DIN EN 166)
// Fassung, Gläser, Zusatzleistungen, Rabatt und Rechnungsbetrag kommen aus
// dem Auftrag. Gläser einzeln mit Werten (RA/LA). Empfänger
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
import { formatDatum, text } from "./werkstattauftragTemplate";

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

// Einleitung der Rechnung; der Zusatz "nach optometrischer Verordnung vom ..."
// wird in buildArbeitgeberRechnungBodyHtml angehängt
const ZWECK: Record<ArbeitgeberRechnungArt, string> = {
  bildschirm:
    "für eine Bildschirmarbeitsplatzbrille (ArbMedVV, Anhang Teil 4 Abs. 2 Nr. 1)",
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

const eingabe = (wert = "", hinweis = "", klasse = "", feld = "") =>
  `<span class="eingabe ${klasse}" contenteditable="true" data-hinweis="${e(hinweis)}" data-ag="${feld}">${e(wert)}</span>`;

// Mehrzeiliges Feld für die ganze Firmenadresse: Einfügen aus der Zwischenablage
// bleibt reiner Text mit Zeilenumbrüchen (plaintext-only)
const eingabeBlock = (wert = "", hinweis = "", feld = "") =>
  `<div class="eingabe adressblock" contenteditable="plaintext-only" data-hinweis="${e(hinweis)}" data-ag="${feld}">${e(wert)}</div>`;

// Arbeitgeber, der beim Kunden gespeichert ist (Spalte "Arbeitgeber", jsonb):
// "anschrift" (ganze Firmenadresse) und "email"; ältere Einträge haben die
// Anschrift in firma/abteilung/strasse/ort
export type ArbeitgeberAnschrift = {
  anschrift?: string;
  firma?: string;
  abteilung?: string;
  strasse?: string;
  ort?: string;
  email?: string;
};

const dez = (wert: unknown): number | null => {
  if (wert === null || wert === undefined || wert === "") return null;
  const n = Number(wert);
  return Number.isFinite(n) ? n : null;
};

/** "RA: sph + 1,75 cyl - 0,50 A 10 Degression 0,75 Vcc 1,00" (Nahstärke) */
export const arbeitgeberGlasZeile = (
  seite: "RA" | "LA",
  glas: DocumentMergeEntities["glasRechts"],
): string => {
  if (!glas) return "";
  const teile: string[] = [];
  // Nahstärke (Sph + Addition) mit der dazugehörigen Degression (Addition)
  const add = dez(glas.Add);
  const fern = dez(glas.Sph);
  const sph = fern === null ? null : fern + (add !== null && add > 0 ? add : 0);
  if (sph !== null)
    teile.push(`sph ${sph < 0 ? "-" : "+"} ${zahl2.format(Math.abs(sph))}`);
  const cyl = dez(glas.Cyl);
  if (cyl !== null && cyl !== 0) {
    teile.push(`cyl ${cyl < 0 ? "-" : "+"} ${zahl2.format(Math.abs(cyl))}`);
    const achse = dez(glas.A);
    if (achse !== null) teile.push(`A ${Math.round(achse)}`);
  }
  if (add !== null && add > 0) teile.push(`Degression ${zahl2.format(add)}`);
  const vis = dez(glas.Vis);
  if (vis !== null && vis > 0) teile.push(`Vcc ${zahl2.format(vis)}`);
  return `${seite}: ${teile.join(" ")}`;
};

/**
 * Positionen der Rechnung an den Arbeitgeber: Fassung, Überschrift
 * "Brillengläser:", dann jedes Glas einzeln (RA/LA mit Werten und
 * Glasbezeichnung), danach Zusatzleistungen wie die Refraktion und Rabatt.
 */
export const arbeitgeberPositionen = (
  entities: DocumentMergeEntities,
): RechnungPosition[] => {
  const alle = buildRechnungPositionen(entities);
  const seiten = { "Glas rechts :": "RA", "Glas links :": "LA" } as const;
  const ergebnis: RechnungPosition[] = [];
  let ueberschrift = false;
  for (const p of alle) {
    const seite = seiten[p.label as keyof typeof seiten];
    if (!seite) {
      ergebnis.push(p);
      continue;
    }
    if (!ueberschrift) {
      ergebnis.push({ label: "Brillengläser:", betrag: null });
      ueberschrift = true;
    }
    ergebnis.push({
      ...p,
      label: "",
      werte: arbeitgeberGlasZeile(
        seite,
        seite === "RA" ? entities.glasRechts : entities.glasLinks,
      ),
    });
  }
  return ergebnis;
};

// Briefkopf und Fußzeile mit ausgeschriebener Straße ("Werdauer Straße 38")
const langeStrasse = (html: string) =>
  html.split(e(a.strasseKurz)).join(e(a.strasseLang));

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
  const ag: ArbeitgeberAnschrift =
    typeof k.Arbeitgeber === "object" && k.Arbeitgeber !== null
      ? (k.Arbeitgeber as ArbeitgeberAnschrift)
      : {};
  const anschriftText =
    ag.anschrift ??
    [ag.firma, ag.abteilung, ag.strasse, ag.ort].filter(Boolean).join("\n");
  const anschrift = [
    eingabeBlock(
      anschriftText,
      "Firmenadresse hier einfügen (Firma, Abteilung, Straße, PLZ Ort)",
      "anschrift",
    ),
    `<div class="nur-vorschau" data-nur-vorschau>E-Mail für den Versand: ${eingabe(ag.email, "E-Mail-Adresse des Arbeitgebers", "versand-email", "email")}</div>`,
  ].join("");

  const positionenHtml = positionen
    .map((p) =>
      p.label
        ? `
    <div class="position${p.betrag === null && !p.details?.length ? " ueberschrift" : ""}">
      <div class="zeile"><span>${e(p.label)}</span><span>${p.betrag === null ? "" : e(formatEuro(p.betrag))}</span></div>
      ${(p.details ?? []).map((d) => `<div class="detail">${e(d)}</div>`).join("")}
    </div>`
        : `
    <div class="position glas">
      <div class="zeile"><span class="glaswerte">${e(p.werte ?? "")}</span><span>${p.betrag === null ? "" : e(formatEuro(p.betrag))}</span></div>
      ${(p.details ?? []).map((d) => `<div class="detail">${e(d)}</div>`).join("")}
    </div>`,
    )
    .join("");

  const zahlbarBis = heute.add(a.zahlungszielTage, "day").format("DD.MM.YYYY");

  return `
<div class="beleg">
  ${langeStrasse(briefkopfHtml(k, datenbox, "RECHNUNG", anschrift))}
  <div class="inhalt">
   <div class="inhalt-block">
    <p class="zweck">${e(ZWECK[art])}${
      art === "bildschirm"
        ? ` nach optometrischer Verordnung vom ${eingabe(formatDatum(brille.Datum), "TT.MM.JJJJ")}.`
        : ""
    }</p>
    <div class="mitarbeiterzeile"><span>Mitarbeiter/in: ${eingabe(mitarbeiter, "Name", "kursiv")}</span><span>Vorgangsnummer des Arbeitgebers: ${eingabe("", "falls vorhanden")}</span></div>
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
  ${langeStrasse(fusszeileHtml())}
</div>`;
};

const BILDSCHIRM_STYLES = `<style data-bildschirm>
  .eingabe { outline: none; background: #f3f8ff; border-radius: 2px; cursor: text; }
  .eingabe:focus { background: #e3efff; }
  .eingabe:empty::before { content: attr(data-hinweis); color: #9aa8bb; font-style: italic; }
  .beleg .anschrift .eingabe { display: block; min-height: 1.45em; }
  .beleg .anschrift .adressblock { min-height: 5.8em; }
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
  .beleg .adressblock { white-space: pre-wrap; }
  .beleg .mitarbeiterzeile { display: flex; justify-content: space-between; margin-bottom: 5mm; }
  .beleg .kursiv { font-style: italic; }
  .beleg .position { margin-bottom: 3.2mm; }
  .beleg .position.glas { margin-bottom: 2.6mm; }
  .beleg .position.ueberschrift { margin-bottom: 1.2mm; }
  .beleg .position .glaswerte { font-size: 8.5pt; }
  .beleg .stempelblock { position: relative; height: 24mm; margin-top: 3mm; }
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
