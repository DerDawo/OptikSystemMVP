// Issue #88: eigenständige HTML/CSS-Vorlage für die Kategorie "Rechnung",
// die das 1:1-Design der Referenzrechnung (BR1Rechnung_AH_N.pdf) nachbildet.
//
// Anders als die generische Vorlagen-Engine (documentTemplateEngine.ts,
// {{entität.feld}}-Platzhalter in einem <pre>-Textblock) braucht dieses
// Design echte Tabellen, graue Balken und ein Logo - das lässt sich nicht
// sinnvoll in einem frei editierbaren Fließtext abbilden. Der Vorlagentext
// des "Rechnung"-Datensatzes in `dokumentvorlage` dient daher nur noch dazu,
// dass "Rechnung erstellen" (FormulareDialog.tsx) einen aktiven Datensatz der
// Kategorie "Rechnung" findet; das tatsächliche Layout kommt aus dieser Datei.
import type { DocumentMergeEntities } from "./documentTemplateEngine";
import dayjs from "dayjs";

// Firmen-/Bankstammdaten: es gibt (noch) keine eigene Stammdaten-Tabelle
// (siehe Kommentar in der Rechnungs-Seed-Migration) - für die Rechnung sind
// diese Angaben aber Pflichtbestandteil des Designs, daher hier als
// Konstanten hinterlegt.
export const RECHNUNG_ABSENDER = {
  firma: "Augenoptik Ulm",
  inhaber: "Robert Ulm",
  strasseLang: "Werdauer Straße 38",
  strasseKurz: "Werdauerstr.38",
  plz: "07551",
  ort: "Gera",
  telefon: "0365 - 710 35 70",
  fax: "0365 - 20 41 65 75",
  email: "info@augenoptik-ulm.de",
  web: "www.augenoptik-ulm.de",
  ustId: "DE299317258",
  bankName: "FYRST BANK",
  iban: "DE11 8207 0366 0067 5751 00",
  bic: "PBNKDEFF",
  mwstSatz: 19,
  zahlungszielTage: 14,
};

export const escapeHtml = (value: string): string =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Betrag wie im Referenz-Design ("169.00 EUR", Punkt statt Komma) - bewusst
// abweichend vom sonst in der App üblichen "169,00 €" (siehe formatBetrag in
// documentTemplateEngine.ts), da dieses Format Teil des 1:1 nachzubildenden
// Rechnungslayouts ist.
const formatEuro = (value: number): string => `${value.toFixed(2)} EUR`;

// Dioptrienwerte (Sph/Cyl) werden mit Vorzeichen angegeben.
const formatDioptrie = (value: unknown): string | null => {
  const n = Number(value);
  if (!Number.isFinite(n) || value === null || value === undefined) {
    return null;
  }
  return `${n > 0 ? "+" : ""}${n.toFixed(2)}`;
};

type RechnungPosition = {
  label: string;
  betrag: number;
  detailZeilen?: string[];
};

const buildGlasDetailZeilen = (
  glas: DocumentMergeEntities["glasLinks"],
  glastyp: DocumentMergeEntities["glastyp"],
): string[] => {
  if (!glas) {
    return [];
  }
  const sph = formatDioptrie(glas.Sph);
  const cyl = formatDioptrie(glas.Cyl);
  const achse = glas.A;
  const werteTeile: string[] = [];
  if (sph !== null) {
    werteTeile.push(`sph:${sph}`);
  }
  if (cyl !== null) {
    werteTeile.push(`cyl:${cyl}`);
  }
  if (achse !== null && achse !== undefined && achse !== "") {
    werteTeile.push(`A:${achse}`);
  }
  const zeilen = werteTeile.length > 0 ? [werteTeile.join(" ")] : [];
  const bezeichnung = glastyp?.Bezeichnung ? String(glastyp.Bezeichnung) : "";
  if (bezeichnung) {
    zeilen.push(bezeichnung);
  }
  const verguetung = glastyp?.Verguetung ? String(glastyp.Verguetung) : "";
  if (verguetung) {
    zeilen.push(verguetung);
  }
  return zeilen;
};

// Rechnungspositionen in exakt der Reihenfolge des Referenz-Designs: Fassung,
// Glas rechts, Glas links, danach die gebuchten Zusatzleistungen (z. B.
// "Refraktion" - bereits als Katalogeintrag vorhanden, siehe
// 20260830120100_seed_zusatzleistung_katalog.sql), zuletzt ein etwaiger
// Rabatt (#22/#52, wirkt nur auf Glas + Fassung).
export const buildRechnungPositionen = (
  entities: DocumentMergeEntities,
): RechnungPosition[] => {
  const positionen: RechnungPosition[] = [];

  const fassungBetrag = Number(entities.fassung?.Betrag) || 0;
  if (entities.fassung) {
    const lagernummer = entities.fassung.Lagernummer
      ? String(entities.fassung.Lagernummer)
      : "";
    positionen.push({
      label: "Fassung :",
      betrag: fassungBetrag,
      detailZeilen: lagernummer ? [lagernummer] : [],
    });
  }

  const glasRechtsBetrag = Number(entities.glasRechts?.Betrag) || 0;
  if (entities.glasRechts) {
    positionen.push({
      label: "Glas rechts :",
      betrag: glasRechtsBetrag,
      detailZeilen: buildGlasDetailZeilen(
        entities.glasRechts,
        entities.glastyp,
      ),
    });
  }

  const glasLinksBetrag = Number(entities.glasLinks?.Betrag) || 0;
  if (entities.glasLinks) {
    positionen.push({
      label: "Glas links :",
      betrag: glasLinksBetrag,
      detailZeilen: buildGlasDetailZeilen(entities.glasLinks, entities.glastyp),
    });
  }

  (entities.zusatzleistungen ?? []).forEach((zusatzleistung) => {
    if (!zusatzleistung) {
      return;
    }
    const bezeichnung = zusatzleistung.Bezeichnung
      ? String(zusatzleistung.Bezeichnung)
      : "Zusatzleistung";
    positionen.push({
      label: bezeichnung,
      betrag: Number(zusatzleistung.Betrag) || 0,
    });
  });

  const rabattProzent = Number(entities.brille?.RabattProzent) || 0;
  if (rabattProzent > 0) {
    const rabattBasis = glasRechtsBetrag + glasLinksBetrag + fassungBetrag;
    const rabattBetrag =
      Math.round(rabattBasis * (rabattProzent / 100) * 100) / 100;
    const rabattBezeichnung = entities.brille?.RabattBezeichnung
      ? String(entities.brille.RabattBezeichnung)
      : "";
    positionen.push({
      label: `Rabatt${rabattBezeichnung ? `: ${rabattBezeichnung}` : ""} (-${rabattProzent} %)`,
      betrag: -rabattBetrag,
    });
  }

  return positionen;
};

// Stilisiertes Sehtest-Auge als Platzhalter-Logo oben rechts (kein Abbild
// des Referenz-Fotos verfügbar/lizenziert - nur die Positionierung und
// Bildwirkung im Layout werden nachgebildet).
const LOGO_SVG = `<svg width="110" height="90" viewBox="0 0 110 90" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <circle cx="70" cy="45" r="32" fill="none" stroke="#222" stroke-width="3" />
  <path d="M6 45 C 30 15, 55 15, 70 45 C 55 30, 35 30, 6 45 Z" fill="#1c3f5e" />
  <circle cx="40" cy="42" r="9" fill="#4a90c2" />
  <circle cx="40" cy="42" r="4" fill="#0a0a0a" />
  <text x="52" y="27" font-family="Arial, sans-serif" font-size="8" fill="#222">HVC</text>
  <text x="52" y="40" font-family="Arial, sans-serif" font-size="8" fill="#222">ZHVD</text>
  <text x="48" y="53" font-family="Arial, sans-serif" font-size="8" fill="#222">OCGEKM</text>
  <text x="52" y="66" font-family="Arial, sans-serif" font-size="8" fill="#222">RAD</text>
</svg>`;

const buildAnschriftZeilen = (
  kunde: DocumentMergeEntities["kunde"],
): string[] => {
  if (!kunde) {
    return [];
  }
  const zeilen: string[] = [];
  if (kunde.Anrede) {
    zeilen.push(String(kunde.Anrede));
  }
  const vollername = [kunde.Vorname, kunde.Nachname].filter(Boolean).join(" ");
  if (vollername) {
    zeilen.push(vollername);
  }
  const strassenzeile = [kunde.Straße, kunde.Hausnummer]
    .filter(Boolean)
    .join(" ");
  if (strassenzeile) {
    zeilen.push(strassenzeile);
  }
  const ortszeile = [kunde.Postleitzahl, kunde.Stadt].filter(Boolean).join(" ");
  if (ortszeile) {
    zeilen.push(ortszeile);
  }
  return zeilen;
};

export type RechnungDaten = {
  entities: DocumentMergeEntities;
  rechnungsnummer: string;
};

// Innerer Inhalt der Rechnungsseite (ohne <html>/<head>) - wird sowohl für
// die Live-Vorschau im Formulare-Dialog als auch (eingebettet in
// buildRechnungPrintHtml) für Druck/PDF verwendet.
export const buildRechnungBodyHtml = ({
  entities,
  rechnungsnummer,
}: RechnungDaten): string => {
  const { brille, kunde } = entities;
  const heute = dayjs();
  const zahlungsfrist = heute.add(RECHNUNG_ABSENDER.zahlungszielTage, "day");

  const positionen = buildRechnungPositionen(entities);
  const summe = Number(brille?.Summe) || 0;
  const mwstBetrag =
    Math.round((summe - summe / (1 + RECHNUNG_ABSENDER.mwstSatz / 100)) * 100) /
    100;

  const brillenArt = brille?.BrillenArt ? String(brille.BrillenArt) : "Brille";
  const berater = brille?.Berater ? String(brille.Berater) : "";

  const anschriftZeilen = buildAnschriftZeilen(kunde);

  const positionenHtml = positionen
    .map(
      (position) => `
      <tr class="position-zeile">
        <td class="position-label">${escapeHtml(position.label)}</td>
        <td class="position-betrag">${escapeHtml(formatEuro(position.betrag))}</td>
      </tr>
      ${(position.detailZeilen ?? [])
        .map(
          (zeile) =>
            `<tr class="position-detail"><td colspan="2">${escapeHtml(zeile)}</td></tr>`,
        )
        .join("")}`,
    )
    .join("");

  return `
<div class="rechnung">
  <div class="kopf">
    <div class="kopf-links">
      <div class="absenderzeile">${escapeHtml(
        `${RECHNUNG_ABSENDER.firma} - ${RECHNUNG_ABSENDER.strasseLang} - ${RECHNUNG_ABSENDER.plz} ${RECHNUNG_ABSENDER.ort}`,
      )}</div>
      <div class="anschrift">
        ${anschriftZeilen.map((zeile) => `<div>${escapeHtml(zeile)}</div>`).join("")}
      </div>
    </div>
    <div class="kopf-rechts">${LOGO_SVG}</div>
  </div>

  <table class="daten-tabelle">
    <tbody>
      <tr>
        <td>Rech.-Datum</td>
        <td>${escapeHtml(heute.format("DD.MM.YYYY"))}</td>
      </tr>
      <tr class="grau">
        <td>Rech.-Nr.</td>
        <td>${escapeHtml(rechnungsnummer)}</td>
      </tr>
      <tr>
        <td>USt.ID.</td>
        <td>${escapeHtml(RECHNUNG_ABSENDER.ustId)}</td>
      </tr>
    </tbody>
  </table>

  <div class="titelbalken">RECHNUNG</div>

  <p class="zweckzeile">für eine neue ${escapeHtml(brillenArt)} lt. Verordnung lt. optometr. Verordnung</p>

  <table class="positionen-tabelle">
    <tbody>
      ${positionenHtml}
    </tbody>
  </table>

  <div class="summenbalken">
    <span>Rechnungsbetrag</span>
    <span>${escapeHtml(formatEuro(summe))}</span>
  </div>
  <p class="mwst-hinweis">Im obigen Betrag sind ${RECHNUNG_ABSENDER.mwstSatz}% Mwst = ${escapeHtml(
    formatEuro(mwstBetrag),
  )} enthalten</p>

  ${berater ? `<p>Es bediente Sie ${escapeHtml(berater)}.</p>` : ""}
  <p>Rechnungsdatum ist Liefer-/Leistungsdatum</p>
  <p class="fett">Wir bitten um Überweisung bis zum ${escapeHtml(
    zahlungsfrist.format("DD.MM.YYYY"),
  )} auf unser Konto:</p>
  <p class="fett">${escapeHtml(RECHNUNG_ABSENDER.bankName)}&nbsp;&nbsp;IBAN: ${escapeHtml(
    RECHNUNG_ABSENDER.iban,
  )} BIC: ${escapeHtml(RECHNUNG_ABSENDER.bic)}</p>

  <div class="fusszeile">
    <p class="dank">
      Vielen Dank für Ihr Vertrauen, das Sie uns entgegengebracht haben. Unser Service endet aber nicht mit der Bezahlung!<br />
      Gern stehen wir Ihnen jederzeit mit unserem Wissen, Können und unserer fachlichen Kompetenz zur Seite!
    </p>
    <div class="fusszeile-spalten">
      <div>
        <div>${escapeHtml(RECHNUNG_ABSENDER.firma)}</div>
        <div>Inh.: ${escapeHtml(RECHNUNG_ABSENDER.inhaber)}</div>
        <div>${escapeHtml(RECHNUNG_ABSENDER.strasseKurz)}</div>
        <div>${escapeHtml(`${RECHNUNG_ABSENDER.plz} ${RECHNUNG_ABSENDER.ort}`)}</div>
      </div>
      <div>
        <div>Bankverbindung:</div>
        <div>${escapeHtml(RECHNUNG_ABSENDER.bankName)}</div>
        <div>${escapeHtml(RECHNUNG_ABSENDER.bic)}</div>
        <div>${escapeHtml(RECHNUNG_ABSENDER.iban)}</div>
      </div>
      <div>
        <div>Tel: ${escapeHtml(RECHNUNG_ABSENDER.telefon)}</div>
        <div>Fax: ${escapeHtml(RECHNUNG_ABSENDER.fax)}</div>
        <div>Mail: ${escapeHtml(RECHNUNG_ABSENDER.email)}</div>
        <div>${escapeHtml(RECHNUNG_ABSENDER.web)}</div>
      </div>
    </div>
  </div>
</div>`;
};

const RECHNUNG_STYLES = `
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .rechnung { padding: 2cm 2cm 1.5cm; font-size: 0.85rem; }
  .kopf { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5em; }
  .absenderzeile { font-size: 0.75rem; border-bottom: 1px solid #111; padding-bottom: 2px; margin-bottom: 1.2em; display: inline-block; }
  .anschrift div { line-height: 1.4; }
  .daten-tabelle { border-collapse: collapse; margin-left: auto; margin-bottom: 1.5em; }
  .daten-tabelle td { border: 1px solid #999; padding: 3px 10px; }
  .daten-tabelle td:first-child { background: #eee; }
  .daten-tabelle td:last-child { text-align: right; min-width: 120px; }
  .titelbalken { background: #ddd; font-size: 1.4rem; font-weight: bold; letter-spacing: 0.05em; padding: 6px 10px; margin-bottom: 1em; }
  .zweckzeile { margin: 0 0 1.2em; }
  .positionen-tabelle { width: 100%; border-collapse: collapse; margin-bottom: 0.5em; }
  .position-zeile td { padding-top: 8px; }
  .position-label { text-align: left; }
  .position-betrag { text-align: right; white-space: nowrap; }
  .position-detail td { color: #333; padding: 0 0 0 0.5em; }
  .summenbalken { display: flex; justify-content: space-between; background: #ddd; font-weight: bold; padding: 6px 10px; margin: 0.8em 0 0.3em; }
  .mwst-hinweis { margin: 0 0 1.2em; }
  .fett { font-weight: bold; }
  .fusszeile { margin-top: 2.5em; font-size: 0.7rem; text-align: center; }
  .dank { margin-bottom: 1.5em; }
  .fusszeile-spalten { display: flex; justify-content: space-between; text-align: left; border-top: 1px solid #999; padding-top: 0.6em; }
  .fusszeile-spalten > div { flex: 1; }
  .fusszeile-spalten > div:nth-child(2) { text-align: center; }
  .fusszeile-spalten > div:nth-child(3) { text-align: right; }
`;

export const buildRechnungPrintHtml = (
  daten: RechnungDaten,
): string => `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(`Rechnung ${daten.rechnungsnummer}`)}</title>
<style>
  ${RECHNUNG_STYLES}
  @page { margin: 0; }
</style>
</head>
<body>
${buildRechnungBodyHtml(daten)}
</body>
</html>`;

// Für die Live-Vorschau im Formulare-Dialog (dort ohne @page-Regel, damit
// die Vorschau nicht auf Druckseitengröße beschnitten wird).
export const buildRechnungPreviewHtml = (
  daten: RechnungDaten,
): string => `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8" />
<style>${RECHNUNG_STYLES}</style>
</head>
<body>
${buildRechnungBodyHtml(daten)}
</body>
</html>`;
