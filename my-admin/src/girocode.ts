// GiroCode (EPC-QR-Code, "Scan2Pay") für Rechnungen und Mahnungen: Der Kunde
// scannt ihn mit seiner Banking-App, Empfänger, IBAN, Betrag und
// Verwendungszweck sind dann schon ausgefüllt.
//
// Aufbau nach EPC069-12 (Version 002, UTF-8, SEPA-Überweisung):
// BCD / 002 / 1 / SCT / BIC / Name / IBAN / EUR<Betrag> / Zweckcode /
// strukturierte Referenz / Verwendungszweck (unstrukturiert).
import QRCode from "qrcode";

export type GirocodeDaten = {
  name: string;
  iban: string;
  bic?: string;
  betrag: number;
  zweck: string;
};

const ohneLeer = (wert: string) => wert.replace(/\s+/g, "").toUpperCase();

/** Prüft eine IBAN mit der Prüfziffer (Modulo 97). */
export const ibanGueltig = (iban: string): boolean => {
  const i = ohneLeer(iban);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(i)) return false;
  const umgestellt = `${i.slice(4)}${i.slice(0, 4)}`;
  let rest = 0;
  for (const zeichen of umgestellt) {
    const ziffern = /\d/.test(zeichen)
      ? zeichen
      : String(zeichen.charCodeAt(0) - 55);
    for (const z of ziffern) rest = (rest * 10 + Number(z)) % 97;
  }
  return rest === 1;
};

// Felder dürfen keine Zeilenumbrüche enthalten und haben Höchstlängen
const feld = (wert: string, max: number) =>
  wert
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

/**
 * Inhalt des GiroCodes; null, wenn kein Code möglich ist (keine gültige
 * IBAN, kein Name oder kein Betrag über 0 bzw. über der Höchstgrenze).
 */
export const girocodeText = (d: GirocodeDaten): string | null => {
  const name = feld(d.name, 70);
  const betrag = Math.round(d.betrag * 100) / 100;
  if (!name || !ibanGueltig(d.iban)) return null;
  if (!(betrag >= 0.01 && betrag <= 999999999.99)) return null;
  const bic = ohneLeer(d.bic ?? "");
  return [
    "BCD",
    "002",
    "1",
    "SCT",
    /^[A-Z0-9]{8}([A-Z0-9]{3})?$/.test(bic) ? bic : "",
    name,
    ohneLeer(d.iban),
    `EUR${betrag.toFixed(2)}`,
    "",
    "",
    feld(d.zweck, 140),
  ].join("\n");
};

/**
 * Der QR-Code als SVG (Fehlerkorrektur M wie vorgeschrieben, 4 Module
 * Ruhezone), zum direkten Einsetzen in das Beleg-HTML.
 */
export const girocodeSvg = (inhalt: string, klasse = "girocode-qr") => {
  const { modules } = QRCode.create(inhalt, { errorCorrectionLevel: "M" });
  const n = modules.size;
  const rand = 4;
  const pfad: string[] = [];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (modules.get(y, x)) pfad.push(`M${x + rand} ${y + rand}h1v1h-1z`);
    }
  }
  const groesse = n + 2 * rand;
  return `<svg class="${klasse}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${groesse} ${groesse}" shape-rendering="crispEdges" role="img" aria-label="GiroCode zum Bezahlen"><rect width="${groesse}" height="${groesse}" fill="#fff"/><path d="${pfad.join("")}" fill="#000"/></svg>`;
};

/**
 * Block "Bequem bezahlen" mit GiroCode für den Beleg; leer, wenn kein Code
 * möglich ist.
 */
export const girocodeBlockHtml = (d: GirocodeDaten): string => {
  const inhalt = girocodeText(d);
  if (!inhalt) return "";
  return `<div class="girocode">${girocodeSvg(inhalt)}<div class="girocode-text"><strong>Bequem bezahlen</strong><br />QR-Code mit Ihrer Banking-App scannen &ndash; Empfänger, Betrag und Verwendungszweck sind schon ausgefüllt.</div></div>`;
};

/**
 * Schmale Fassung für die Rechnung: QR-Code mit kurzer Unterschrift, rechts
 * neben dem Zahlungshinweis; leer, wenn kein Code möglich ist.
 */
export const girocodeSeitlichHtml = (d: GirocodeDaten): string => {
  const inhalt = girocodeText(d);
  if (!inhalt) return "";
  return `<div class="girocode-seite">${girocodeSvg(inhalt)}<div class="girocode-text">Mit Ihrer Banking-App scannen und bezahlen</div></div>`;
};

export const GIROCODE_STYLES = `
  .beleg .zahlung { display: flex; align-items: flex-start; gap: 4mm; margin-top: 6mm; }
  .beleg .zahlung .hinweise { flex: 1; margin-top: 0; }
  .beleg .girocode-seite { flex: 0 0 24mm; display: flex; flex-direction: column; align-items: center; gap: 1mm; }
  .beleg .girocode-seite .girocode-qr { width: 22mm; height: 22mm; }
  .beleg .girocode-seite .girocode-text { font-size: 5.5pt; line-height: 1.25; text-align: center; color: #555; }
  .beleg .girocode { display: flex; align-items: center; gap: 3mm; margin-top: 4mm; }
  .beleg .girocode-qr { width: 22mm; height: 22mm; flex: 0 0 auto; }
  .beleg .girocode-text { font-size: 7.5pt; line-height: 1.4; color: #333; max-width: 62mm; }
`;
