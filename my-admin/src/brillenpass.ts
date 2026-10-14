import dayjs from "dayjs";
import logoSehzentrum from "./assets/logo-sehzentrum.jpg?inline";
import { anredeGruss } from "./aufgabenRegeln";
import {
  RECHNUNG_ABSENDER,
  escapeHtml as e,
  type Absender,
} from "./rechnungTemplate";
import { formatWert } from "./werkstattauftragTemplate";

/*
 * Brillenpass fürs Handy: eine Karte im Handyformat (Bild, wird in WhatsApp
 * direkt angezeigt) mit den Werten der Brille, Glas und Fassung - plus
 * dieselben Angaben als Text für SMS/E-Mail.
 */

type Datensatz = Record<string, unknown>;

export type BrillenpassDaten = {
  brille: Datensatz;
  kunde?: Datensatz;
  glasRechts?: Datensatz;
  glasLinks?: Datensatz;
  glastyp?: Datensatz;
  fassung?: Datensatz;
};

// Breite der Karte in CSS-Pixeln (als PNG doppelt so groß)
export const BRILLENPASS_BREITE = 420;

const WERTE = [
  { feld: "Sph", titel: "Sph", format: "dioptrie" },
  { feld: "Cyl", titel: "Cyl", format: "dioptrie" },
  { feld: "A", titel: "Achse", format: "achse" },
  { feld: "Add", titel: "Add", format: "dioptrie" },
  { feld: "Pr", titel: "Prisma", format: "zwei" },
  { feld: "B", titel: "Basis", format: "achse" },
] as const;

const text = (wert: unknown) =>
  wert === null || wert === undefined ? "" : String(wert).trim();

type Format = Parameters<typeof formatWert>[1];

const wert = (glas: Datensatz | undefined, feld: string, format: Format) =>
  glas ? formatWert(glas[feld], format) : "";

const datum = (wert: unknown) =>
  wert ? dayjs(String(wert)).format("DD.MM.YYYY") : "";

const kundeName = (kunde?: Datensatz) =>
  [text(kunde?.Anrede), text(kunde?.Vorname), text(kunde?.Nachname)]
    .filter((t) => t && !/^keine angabe$/i.test(t))
    .join(" ");

const glasText = (glastyp?: Datensatz) =>
  [text(glastyp?.Hersteller), text(glastyp?.Bezeichnung)]
    .filter(Boolean)
    .join(" ");

const fassungText = (fassung?: Datensatz) =>
  [
    text(fassung?.Hersteller),
    text(fassung?.Bezeichnung),
    text(fassung?.Farbe) ? `Farbe ${text(fassung?.Farbe)}` : "",
    text(fassung?.Groesse),
  ]
    .filter(Boolean)
    .join(" · ");

// PD/HSA je Seite als "32 / 31,5"
const paar = (d: BrillenpassDaten, feld: string) => {
  const r = wert(d.glasRechts, feld, "frei");
  const l = wert(d.glasLinks, feld, "frei");
  return r || l ? `${r || "–"} / ${l || "–"}` : "";
};

export const brillenpassHtml = (
  d: BrillenpassDaten,
  absender: Absender = RECHNUNG_ABSENDER,
) => {
  const zeile = (seite: "R" | "L", glas?: Datensatz) =>
    `<tr><th>${seite}</th>${WERTE.map(
      (w) => `<td>${e(wert(glas, w.feld, w.format))}</td>`,
    ).join("")}</tr>`;
  const angaben = [
    ["Brillenart", text(d.brille.BrillenArt)],
    ["PD R / L", paar(d, "PD")],
    ["HSA R / L", paar(d, "HSA")],
    ["Gläser", glasText(d.glastyp)],
    ["Vergütung", text(d.glastyp?.Verguetung)],
    ["Fassung", fassungText(d.fassung)],
    ["Refraktion", text(d.brille.Refraktion)],
  ].filter(([, w]) => w);
  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body { margin: 0; width: ${BRILLENPASS_BREITE}px; font-family: Arial, Helvetica, sans-serif; color: #14213d; background: #fff; }
  .pass { margin: 12px; border-radius: 18px; overflow: hidden; border: 1px solid #d6dde8; background: #fff; }
  .kopf { display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: #1d4e8f; color: #fff; }
  .kopf img { width: 56px; height: 44px; object-fit: contain; background: #fff; border-radius: 8px; padding: 2px; }
  .kopf .titel { font-size: 20px; font-weight: 700; letter-spacing: 0.02em; }
  .kopf .firma { font-size: 12px; opacity: 0.9; }
  .inhalt { padding: 14px 16px 16px; }
  .name { font-size: 17px; font-weight: 700; }
  .datum { font-size: 12.5px; color: #55657e; margin-top: 2px; }
  table.werte { width: 100%; border-collapse: collapse; margin: 14px 0 12px; font-size: 14px; }
  .werte th, .werte td { border: 1px solid #d6dde8; padding: 6px 2px; text-align: center; }
  .werte thead th { background: #eef3fa; font-size: 11.5px; font-weight: 700; color: #3a4a63; }
  .werte tbody th { width: 30px; background: #eef3fa; }
  .angaben { width: 100%; border-collapse: collapse; font-size: 13px; }
  .angaben th { text-align: left; font-weight: 400; color: #55657e; width: 92px; padding: 3px 8px 3px 0; vertical-align: top; }
  .angaben td { padding: 3px 0; vertical-align: top; }
  .fuss { border-top: 1px solid #d6dde8; padding: 10px 16px 12px; font-size: 11.5px; color: #55657e; line-height: 1.45; background: #f7f9fc; }
</style>
</head>
<body>
<div class="pass">
  <div class="kopf">
    <img src="${logoSehzentrum}" alt="" />
    <div><div class="titel">Brillenpass</div><div class="firma">${e(absender.firma)}</div></div>
  </div>
  <div class="inhalt">
    <div class="name">${e(kundeName(d.kunde))}</div>
    <div class="datum">Brille vom ${e(datum(d.brille.Datum))}${d.brille.id != null ? ` · Auftrag ${e(text(d.brille.id))}` : ""}</div>
    <table class="werte">
      <thead><tr><th></th>${WERTE.map((w) => `<th>${w.titel}</th>`).join("")}</tr></thead>
      <tbody>${zeile("R", d.glasRechts)}${zeile("L", d.glasLinks)}</tbody>
    </table>
    <table class="angaben">${angaben
      .map(([t, w]) => `<tr><th>${e(t)}</th><td>${e(w)}</td></tr>`)
      .join("")}</table>
  </div>
  <div class="fuss">
    Bei Verlust oder Bruch einfach diesen Pass vorzeigen.<br />
    ${e(absender.firma)} · ${e(absender.strasseLang)} · ${e(`${absender.plz} ${absender.ort}`)}<br />
    Tel. ${e(absender.telefon)} · ${e(absender.web)}
  </div>
</div>
</body>
</html>`;
};

// Werte als Text (SMS, E-Mail, Begleittext in WhatsApp)
export const brillenpassText = (
  d: BrillenpassDaten,
  absender: Absender = RECHNUNG_ABSENDER,
) => {
  const seite = (name: string, glas?: Datensatz) =>
    `${name}: ${
      WERTE.map((w) => [w.titel, wert(glas, w.feld, w.format)])
        .filter(([, v]) => v)
        .map(([t, v]) => `${t} ${v}`)
        .join(", ") || "–"
    }`;
  const zeilen = [
    `${anredeGruss(d.kunde)},`,
    "",
    `hier Ihr Brillenpass (Brille vom ${datum(d.brille.Datum)}${text(d.brille.BrillenArt) ? `, ${text(d.brille.BrillenArt)}` : ""}):`,
    seite("Rechts", d.glasRechts),
    seite("Links", d.glasLinks),
    paar(d, "PD") ? `PD R / L: ${paar(d, "PD")}` : null,
    glasText(d.glastyp) ? `Gläser: ${glasText(d.glastyp)}` : null,
    "",
    "Bei Verlust oder Bruch einfach diesen Pass vorzeigen.",
    "",
    `Ihr Team von ${absender.firma}`,
  ];
  return zeilen.filter((z) => z !== null).join("\n");
};
