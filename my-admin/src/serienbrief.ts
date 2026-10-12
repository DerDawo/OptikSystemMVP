import dayjs from "dayjs";
import logoSehzentrum from "./assets/logo-sehzentrum.jpg?inline";
import { anredeGruss } from "./aufgabenRegeln";
import {
  BELEG_STYLES,
  escapeHtml as e,
  type Absender,
} from "./rechnungTemplate";

/*
 * Serienbrief (Gehe zu -> Serienbrief): Empfängerauswahl über die Ansicht
 * `kunde_serienbrief`, Text mit Platzhaltern, Ausgabe als Briefe im
 * Briefpapier (eine Seite je Kunde) oder als E-Mail-Liste (CSV) für einen
 * Newsletter-Dienst.
 */

export type Empfaenger = {
  id: number | string;
  Anrede?: string | null;
  Vorname?: string | null;
  Nachname?: string | null;
  Straße?: string | null;
  Hausnummer?: string | null;
  Postleitzahl?: string | null;
  Stadt?: string | null;
  Email?: string | null;
  LetzteBrille?: string | null;
};

export type Gruppe =
  | "alle"
  | "sehtest"
  | "gleitsicht"
  | "kontaktlinsen"
  | "geburtstag";

export type Auswahl = {
  kanal: "post" | "email";
  gruppe: Gruppe;
  // Sehtest: letzte Brille vor mehr als so vielen Jahren
  jahre: number;
  // Geburtstag: Monat 1-12
  monat: number;
  // Postleitzahl beginnt mit
  plz: string;
  nurEinwilligung: boolean;
};

export const GRUPPEN: { id: Gruppe; name: string }[] = [
  { id: "alle", name: "Alle Kunden" },
  { id: "sehtest", name: "Letzte Brille vor mehr als … Jahren" },
  { id: "gleitsicht", name: "Gleitsichtträger" },
  { id: "kontaktlinsen", name: "Kontaktlinsenkunden" },
  { id: "geburtstag", name: "Geburtstag im Monat …" },
];

// Filter für ra-data-postgrest auf der Ansicht `kunde_serienbrief`
export const auswahlFilter = (
  a: Auswahl,
  heute = dayjs(),
): Record<string, unknown> => {
  const filter: Record<string, unknown> = {};
  if (a.kanal === "email") {
    filter["Email@like"] = "*@*";
  } else {
    filter["Straße@not.is"] = "null";
    filter["Straße@neq"] = "";
    filter["Postleitzahl@not.is"] = "null";
    filter["Postleitzahl@neq"] = "";
  }
  if (a.nurEinwilligung) filter.Werbeeinwilligung = true;
  const plz = a.plz.replace(/\D/g, "");
  if (plz) filter["Postleitzahl@like"] = `${plz}*`;
  switch (a.gruppe) {
    case "sehtest":
      filter["LetzteBrille@lt"] = heute
        .subtract(Math.max(1, a.jahre), "year")
        .format("YYYY-MM-DD");
      break;
    case "gleitsicht":
      filter.Gleitsicht = true;
      break;
    case "kontaktlinsen":
      filter.Kontaktlinsen = true;
      break;
    case "geburtstag":
      filter.Geburtsmonat = a.monat;
      break;
  }
  return filter;
};

export const PLATZHALTER: {
  name: string;
  wert: (k: Empfaenger) => string;
}[] = [
  { name: "Briefanrede", wert: (k) => anredeGruss(k) },
  { name: "Anrede", wert: (k) => String(k.Anrede ?? "").trim() },
  { name: "Vorname", wert: (k) => String(k.Vorname ?? "").trim() },
  { name: "Nachname", wert: (k) => String(k.Nachname ?? "").trim() },
  {
    name: "LetzteBrille",
    wert: (k) =>
      k.LetzteBrille ? dayjs(k.LetzteBrille).format("DD.MM.YYYY") : "",
  },
];

// {Briefanrede}, {Vorname} ... durch die Werte des Kunden ersetzen
export const fuelleText = (text: string, k: Empfaenger) =>
  PLATZHALTER.reduce((t, p) => t.split(`{${p.name}}`).join(p.wert(k)), text);

const anschrift = (k: Empfaenger) =>
  [
    String(k.Anrede ?? "").trim(),
    [k.Vorname, k.Nachname].filter(Boolean).join(" "),
    [k.Straße, k.Hausnummer].filter(Boolean).join(" "),
    [k.Postleitzahl, k.Stadt].filter(Boolean).join(" "),
  ].filter(Boolean);

const absaetze = (text: string) =>
  text
    .trim()
    .split(/\n{2,}/)
    .map((absatz) => `<p>${e(absatz).replace(/\n/g, "<br />")}</p>`)
    .join("");

const brief = (
  k: Empfaenger,
  betreff: string,
  text: string,
  a: Absender,
  datum: string,
) => `
<div class="beleg serienbrief">
  <div class="absenderzeile">${e(`${a.marke} - ${a.strasseKurz} - ${a.plz} ${a.ort}`)}</div>
  <div class="logo"></div>
  <div class="anschrift">${anschrift(k)
    .map((z) => `<div>${e(z)}</div>`)
    .join("")}</div>
  <div class="datum">${e(`${a.ort}, ${datum}`)}</div>
  <div class="inhalt">
    ${betreff.trim() ? `<p class="betreff">${e(fuelleText(betreff, k))}</p>` : ""}
    ${absaetze(fuelleText(text, k))}
  </div>
  <div class="fusszeile">
    <div class="spalten">
      <div>${e(a.firma)}<br />Inh. : ${e(a.inhaber)}<br />${e(a.strasseKurz)}<br />${e(`${a.plz} ${a.ort}`)}</div>
      <div>Bankverbindung:<br />${e(a.bankName)}<br />${e(a.bic)}<br />${e(a.iban)}</div>
      <div>Tel: ${e(a.telefon)}<br />Fax: ${e(a.fax)}<br />Mail: ${e(a.email)}<br />${e(a.web)}</div>
    </div>
  </div>
</div>`;

// Vorschau: A4-Seite auf die Breite des Vorschaufensters verkleinern
const VORSCHAU_EINPASSEN = `<script>
(function () {
  var passe = function () {
    document.body.style.zoom = String(Math.min(1, (window.innerWidth - 24) / 794));
  };
  passe();
  window.addEventListener("resize", passe);
})();
</script>`;

/*
 * Briefe im Briefpapier, eine A4-Seite je Kunde. Das Logo steht nur einmal
 * im Stil (Hintergrundbild), damit auch einige hundert Seiten leicht bleiben.
 */
export const buildSerienbriefHtml = (
  empfaenger: Empfaenger[],
  betreff: string,
  text: string,
  absender: Absender,
  vorschau = false,
  heute = dayjs(),
) => `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8" />
<title>Serienbrief</title>
<style>
  body { margin: 0; }
  ${BELEG_STYLES}
  .serienbrief .logo { height: 44.5mm; background: url("${logoSehzentrum}") no-repeat left top / contain; }
  .serienbrief .datum { position: absolute; right: 26.2mm; top: 84mm; }
  .serienbrief .inhalt { top: 103mm; display: block; }
  .serienbrief .inhalt p { margin: 0 0 4mm; }
  .serienbrief .betreff { font-weight: 700; margin-bottom: 8mm !important; }
  .serienbrief { page-break-after: always; break-after: page; }
  ${vorschau ? "html { background: #eee; } .beleg { margin: 12px auto; box-shadow: 0 1px 6px rgba(0, 0, 0, 0.2); }" : "@page { size: A4; margin: 0; }"}
</style>
</head>
<body>
${empfaenger.map((k) => brief(k, betreff, text, absender, heute.format("DD.MM.YYYY"))).join("")}
${vorschau ? VORSCHAU_EINPASSEN : ""}
</body>
</html>`;

const csvFeld = (wert: string) =>
  /[";\n\r]/.test(wert) ? `"${wert.replace(/"/g, '""')}"` : wert;

/*
 * E-Mail-Liste für Newsletter-Dienste (Brevo, CleverReach ...): Semikolon,
 * UTF-8 mit BOM (Excel erkennt die Umlaute), je Adresse eine Zeile.
 */
export const emailListeCsv = (empfaenger: Empfaenger[]) => {
  const gesehen = new Set<string>();
  const zeilen = [["E-Mail", "Anrede", "Vorname", "Nachname", "Briefanrede"]];
  empfaenger.forEach((k) => {
    const email = String(k.Email ?? "").trim();
    const schluessel = email.toLowerCase();
    if (!email.includes("@") || gesehen.has(schluessel)) return;
    gesehen.add(schluessel);
    zeilen.push([
      email,
      String(k.Anrede ?? "").trim(),
      String(k.Vorname ?? "").trim(),
      String(k.Nachname ?? "").trim(),
      anredeGruss(k),
    ]);
  });
  return "﻿" + zeilen.map((z) => z.map(csvFeld).join(";")).join("\r\n");
};
