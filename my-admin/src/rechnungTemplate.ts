// Rechnung (Kategorie "Rechnung") und Kostenvoranschlag (Kategorie
// "Kostenvoranschlag") im Briefpapier des Sehzentrums Gera, nachgebildet nach
// der Referenzrechnung "Rechnung HF25.pdf": Absenderzeile, Anschrift, Logo
// oben rechts, Datenbox, grauer Titelbalken, Positionen mit Glaswerten,
// Summenbalken, MwSt-Hinweis und dreispaltige Fußzeile.
//
// Anders als die generische Vorlagen-Engine (documentTemplateEngine.ts) braucht
// das Design echte Tabellen, Balken und ein Logo. Der Vorlagentext der
// Datensätze in `dokumentvorlage` wird daher nicht gerendert; das Layout kommt
// aus dieser Datei. Betriebsstempel und Unterschrift sind bewusst nicht Teil
// der Vorlage (das Repository ist öffentlich).
import type { DocumentMergeEntities } from "./documentTemplateEngine";
import dayjs from "dayjs";
import logoSehzentrum from "./assets/logo-sehzentrum.jpg?inline";
import bewertungQr from "./assets/google-bewertung-qr.png?inline";
import { mitarbeiterAnzeige } from "./mitarbeiterNamen";
import {
  leistungsText,
  weitereLeistungenPositionen,
} from "./leistungenAusNotizen";

// Firmen-/Bankstammdaten: es gibt (noch) keine eigene Stammdaten-Tabelle mit
// Adresse und Bank (siehe Kommentar in der Rechnungs-Seed-Migration), daher
// hier als Konstanten hinterlegt.
// Standardwerte, falls in der Tabelle `betrieb` (Seite "Betriebsdaten")
// ein Feld leer ist (#132).
export const STANDARD_ABSENDER = {
  firma: "Augenoptik Ulm",
  marke: "Sehzentrum Gera",
  inhaber: "Robert Ulm",
  strasseLang: "Werdauer Straße 38",
  strasseKurz: "Werdauerstr.38",
  plz: "07551",
  ort: "Gera",
  telefon: "0365 - 710 35 70",
  fax: "0365 - 20 41 65 75",
  email: "info@augenoptik-ulm.de",
  web: "www.augenoptik-ulm.de",
  ik: "311600532",
  ustId: "DE299317258",
  bankName: "FYRST BANK",
  iban: "DE11 8207 0366 0067 5751 00",
  bic: "PBNKDEFF",
  mwstSatz: 19,
  zahlungszielTage: 14,
  kostenvoranschlagGueltigTage: 28,
};

export type Absender = typeof STANDARD_ABSENDER;

// Aktuelle Absenderdaten für Belege, Formulare und SMS-Platzhalter. Das
// Objekt wird beim App-Start bzw. nach dem Speichern der Betriebsdaten über
// uebernehmeBetriebsdaten() aktualisiert; die Templates lesen es erst beim
// Erzeugen eines Belegs, sehen also immer den aktuellen Stand.
export const RECHNUNG_ABSENDER: Absender = { ...STANDARD_ABSENDER };

const textOder = (wert: unknown, standard: string) =>
  typeof wert === "string" && wert.trim() ? wert.trim() : standard;

const zahlOder = (wert: unknown, standard: number) => {
  const zahl = typeof wert === "string" ? Number(wert) : wert;
  return typeof zahl === "number" && Number.isFinite(zahl) ? zahl : standard;
};

/** Bildet eine Zeile der Tabelle `betrieb` auf die Absenderdaten ab. */
export const absenderAusBetrieb = (
  betrieb: Record<string, unknown> | null | undefined,
): Absender => {
  const b = betrieb ?? {};
  const s = STANDARD_ABSENDER;
  const strasse = textOder(b.Strasse, "");
  return {
    firma: textOder(b.Firmenname, s.firma),
    marke: textOder(b.Marke, s.marke),
    inhaber: textOder(b.Inhaber, s.inhaber),
    strasseLang: strasse || s.strasseLang,
    strasseKurz: strasse || s.strasseKurz,
    plz: textOder(b.PLZ, s.plz),
    ort: textOder(b.Ort, s.ort),
    telefon: textOder(b.Telefon, s.telefon),
    fax: textOder(b.Fax, s.fax),
    email: textOder(b.Email, s.email),
    web: textOder(b.Website, s.web),
    ik: textOder(b.IKNummer, s.ik),
    ustId: textOder(b.UStIdNr, s.ustId),
    bankName: textOder(b.Bank, s.bankName),
    iban: textOder(b.IBAN, s.iban),
    bic: textOder(b.BIC, s.bic),
    mwstSatz: zahlOder(b.MwStSatz, s.mwstSatz),
    zahlungszielTage: zahlOder(b.ZahlungszielTage, s.zahlungszielTage),
    kostenvoranschlagGueltigTage: zahlOder(
      b.KostenvoranschlagGueltigTage,
      s.kostenvoranschlagGueltigTage,
    ),
  };
};

/** Übernimmt die Betriebsdaten in RECHNUNG_ABSENDER (#132). */
export const uebernehmeBetriebsdaten = (
  betrieb: Record<string, unknown> | null | undefined,
) => {
  Object.assign(RECHNUNG_ABSENDER, absenderAusBetrieb(betrieb));
};

export const escapeHtml = (value: string): string =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const zahl2 = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// Beträge wie in der Referenz: "159,90 EUR"
export const formatEuro = (value: number): string =>
  `${zahl2.format(value)} EUR`;

const asNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

// Glaswerte wie in der Referenz: "sph: + 0,25 cyl 0,75 A 173  ADD 1,50"
// (Sphäre immer mit Vorzeichen, Zylinder nur bei Minus, Achse ganzzahlig)
export const formatGlaswerte = (
  glas: DocumentMergeEntities["glasLinks"],
): string => {
  if (!glas) return "";
  const teile: string[] = [];
  const sph = asNumber(glas.Sph);
  if (sph !== null) {
    teile.push(`sph: ${sph < 0 ? "-" : "+"} ${zahl2.format(Math.abs(sph))}`);
  }
  const cyl = asNumber(glas.Cyl);
  if (cyl !== null && cyl !== 0) {
    teile.push(`cyl ${cyl < 0 ? "- " : ""}${zahl2.format(Math.abs(cyl))}`);
  }
  const achse = asNumber(glas.A);
  if (achse !== null && cyl !== null && cyl !== 0) {
    teile.push(`A ${Math.round(achse)}`);
  }
  const add = asNumber(glas.Add);
  if (add !== null && add > 0) {
    teile.push(` ADD ${zahl2.format(add)}`);
  }
  return teile.join(" ");
};

export type RechnungPosition = {
  label: string;
  // null: Position ohne Preis (z. B. "eigenes Gestell")
  betrag: number | null;
  // Glaswerte in normaler Schriftgröße unter der Bezeichnung
  werte?: string;
  // kleine Zusatzzeilen (Glas-/Fassungsbezeichnung)
  details?: string[];
};

const glasDetails = (glastyp: DocumentMergeEntities["glastyp"]): string[] => {
  const teile = [
    glastyp?.Bezeichnung,
    glastyp?.Verguetung,
    glastyp?.GlasGroesse ? `DM ${glastyp.GlasGroesse}` : "",
  ]
    .map((t) => (t ? String(t).trim() : ""))
    .filter(Boolean);
  return teile.length ? [teile.join("   ")] : [];
};

// Positionen in der Reihenfolge der Referenz: Fassung, Glas rechts, Glas
// links, danach die gebuchten Zusatzleistungen (z. B. "Glaseinschliff"),
// zuletzt ein etwaiger Rabatt (#22/#52, wirkt nur auf Glas + Fassung).
export const buildRechnungPositionen = (
  entities: DocumentMergeEntities,
): RechnungPosition[] => {
  const positionen: RechnungPosition[] = [];
  const { fassung, glasRechts, glasLinks, glastyp } = entities;

  const fassungBetrag = Number(fassung?.Betrag) || 0;
  if (fassung) {
    const bezeichnung = [fassung.Hersteller, fassung.Bezeichnung]
      .map((t) => (t ? String(t).trim() : ""))
      .filter(Boolean)
      .join(" ");
    const lagernummer = fassung.Lagernummer ? String(fassung.Lagernummer) : "";
    positionen.push({
      label: "Fassung :",
      betrag: fassungBetrag,
      details: [bezeichnung, lagernummer].filter(Boolean),
    });
  } else if (entities.brille) {
    positionen.push({
      label: "Fassung :",
      betrag: null,
      details: ["eigenes Gestell"],
    });
  }

  const glasRechtsBetrag = Number(glasRechts?.Betrag) || 0;
  if (glasRechts) {
    positionen.push({
      label: "Glas rechts :",
      betrag: glasRechtsBetrag,
      werte: formatGlaswerte(glasRechts),
      details: glasDetails(glastyp),
    });
  }

  const glasLinksBetrag = Number(glasLinks?.Betrag) || 0;
  if (glasLinks) {
    positionen.push({
      label: "Glas links :",
      betrag: glasLinksBetrag,
      werte: formatGlaswerte(glasLinks),
      details: glasDetails(glastyp),
    });
  }

  (entities.zusatzleistungen ?? []).forEach((zusatzleistung) => {
    if (!zusatzleistung) return;
    positionen.push({
      label: zusatzleistung.Bezeichnung
        ? String(zusatzleistung.Bezeichnung)
        : "Zusatzleistung",
      betrag: Number(zusatzleistung.Betrag) || 0,
    });
  });

  // Leistungen/Nachlässe ohne Katalogbezug (#131), z. B. die Freitext-
  // Leistungen der Prisma-Altaufträge: einzeln mit Bezeichnung (aus
  // brille."PrismaAngaben"), ein Rest als "Weitere Leistungen". Zählen wie Zusatzleistungen
  // ohne Rabatt zur Summe, damit Positionen und Rechnungsbetrag zusammenpassen.
  weitereLeistungenPositionen(
    Number(entities.brille?.WeitereLeistungen) || 0,
    leistungsText(entities.brille),
  ).forEach((leistung) => {
    positionen.push({ label: leistung.bezeichnung, betrag: leistung.betrag });
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

const buildAnschriftZeilen = (
  kunde: DocumentMergeEntities["kunde"],
): string[] => {
  if (!kunde) return [];
  const zeilen: string[] = [];
  if (kunde.Anrede) zeilen.push(String(kunde.Anrede));
  const name = [kunde.Vorname, kunde.Nachname].filter(Boolean).join(" ");
  if (name) zeilen.push(name);
  const strasse = [kunde.Straße, kunde.Hausnummer].filter(Boolean).join(" ");
  if (strasse) zeilen.push(strasse);
  const ort = [kunde.Postleitzahl, kunde.Stadt].filter(Boolean).join(" ");
  if (ort) zeilen.push(ort);
  return zeilen;
};

type BelegArt = "rechnung" | "kostenvoranschlag";

type BelegDaten = {
  art: BelegArt;
  entities: DocumentMergeEntities;
  nummer: string;
  // abweichende Positionen und Zweckzeile (Kontaktlinsen-Rechnung)
  positionen?: RechnungPosition[];
  zweck?: string;
};

const a = RECHNUNG_ABSENDER;
const e = escapeHtml;

const belegHtml = ({
  art,
  entities,
  nummer,
  positionen: eigenePositionen,
  zweck,
}: BelegDaten): string => {
  const { brille, kunde } = entities;
  const istRechnung = art === "rechnung";
  const heute = dayjs();
  const positionen = eigenePositionen ?? buildRechnungPositionen(entities);
  const rund = (wert: number) => Math.round(wert * 100) / 100;
  const summe = Number(brille?.Summe) || 0;
  const kassenanteil = Number(brille?.KKAnteil) || 0;
  const anzahlung = Number(brille?.Anzahlung) || 0;
  // Mit Kassenanteil: Gesamtbetrag minus Anteil der Krankenkasse = Betrag
  // des Kunden (Eigenanteil); MwSt-Hinweis bezieht sich auf diesen Betrag
  const eigenanteil = rund(summe - kassenanteil);
  const betrag = kassenanteil > 0 ? eigenanteil : summe;
  const netto = rund(betrag / (1 + a.mwstSatz / 100));
  const mwst = rund(betrag - netto);
  const nochZuZahlen = rund(betrag - anzahlung);
  const brillenArt = brille?.BrillenArt ? String(brille.BrillenArt) : "Brille";
  const berater = mitarbeiterAnzeige(brille?.Berater);
  const bezahlt = String(brille?.Zahlungsstatus ?? "") === "bezahlt";

  const datenbox: [string, string][] = istRechnung
    ? [
        ["Rech.-Datum", heute.format("DD.MM.YYYY")],
        ["Rech.-Nr.", nummer],
        ["USt.ID.", a.ustId],
      ]
    : [
        ["Datum", heute.format("DD.MM.YYYY")],
        ["Auftrag", nummer],
        ["USt.ID.", a.ustId],
      ];

  const positionenHtml = positionen
    .map(
      (p) => `
    <div class="position">
      <div class="zeile"><span>${e(p.label)}</span><span>${p.betrag === null ? "" : e(formatEuro(p.betrag))}</span></div>
      ${p.werte ? `<div class="werte">${e(p.werte)}</div>` : ""}
      ${(p.details ?? []).map((d) => `<div class="detail">${e(d)}</div>`).join("")}
    </div>`,
    )
    .join("");

  const hinweise = istRechnung
    ? [
        anzahlung > 0 && !bezahlt
          ? `Bereits angezahlt: ${e(formatEuro(anzahlung))}, noch zu zahlen: ${e(formatEuro(nochZuZahlen))}.`
          : "",
        berater ? `Es bediente Sie ${e(berater)}.` : "",
        "Rechnungsdatum ist Liefer-/Leistungsdatum",
        bezahlt
          ? ""
          : `Bitte überweisen Sie ${anzahlung > 0 ? "den noch offenen Betrag" : "den Rechnungsbetrag"} bis zum ${e(
              heute.add(a.zahlungszielTage, "day").format("DD.MM.YYYY"),
            )} auf unser unten genanntes Konto.`,
      ]
    : [
        berater ? `Es berät Sie ${e(berater)}.` : "",
        `Dieser Kostenvoranschlag ist unverbindlich und gültig bis ${e(
          heute.add(a.kostenvoranschlagGueltigTage, "day").format("DD.MM.YYYY"),
        )}.`,
      ];

  return `
<div class="beleg">
  <div class="absenderzeile">${e(`${a.marke} - ${a.strasseKurz} - ${a.plz} ${a.ort}`)}</div>
  <img class="logo" src="${logoSehzentrum}" alt="" />
  <div class="anschrift">
    ${buildAnschriftZeilen(kunde)
      .map((z) => `<div>${e(z)}</div>`)
      .join("")}
  </div>
  <table class="datenbox">
    ${datenbox.map(([l, w]) => `<tr><td>${e(l)}</td><td>${e(w)}</td></tr>`).join("")}
  </table>
  <div class="titelbalken">${istRechnung ? "RECHNUNG" : "KOSTENVORANSCHLAG"}</div>
  <div class="inhalt">
   <div class="inhalt-block">
    <p class="zweck">${zweck ? e(zweck) : `für eine neue ${e(brillenArt)}&nbsp; lt. optometr. Verordnung`}</p>
    ${positionenHtml}
    ${
      kassenanteil > 0
        ? `<div class="position abzug">
      <div class="zeile"><span>Gesamtbetrag</span><span>${e(formatEuro(summe))}</span></div>
      <div class="zeile"><span>abzüglich Anteil Krankenkasse</span><span>${e(formatEuro(-kassenanteil))}</span></div>
    </div>`
        : ""
    }
    <div class="summenbalken"><span>${
      istRechnung
        ? kassenanteil > 0
          ? "Rechnungsbetrag (Ihr Eigenanteil)"
          : "Rechnungsbetrag"
        : kassenanteil > 0
          ? "Ihr Eigenanteil"
          : "Gesamtbetrag"
    }</span><span>${e(formatEuro(betrag))}</span></div>
    <p class="mwst">Im obigen Betrag sind ${a.mwstSatz}% Mwst = ${e(formatEuro(mwst))} enthalten. (Nettopreis: ${e(zahl2.format(netto))} €)</p>
    <div class="hinweise">${hinweise
      .filter(Boolean)
      .map((h) => `<div>${h}</div>`)
      .join("")}</div>
   </div>
    ${istRechnung ? BEWERTUNG_HTML : ""}
  </div>
  <div class="fusszeile">
    <p class="dank">Vielen Dank für Ihr Vertrauen, das Sie uns entgegengebracht haben. Unser Service endet aber nicht mit der Bezahlung!<br />Gern stehen wir Ihnen jederzeit mit unserem Wissen, Können und unserer fachlichen Kompetenz zur Seite!</p>
    <div class="spalten">
      <div>${e(a.firma)}<br />Inh. : ${e(a.inhaber)}<br />${e(a.strasseKurz)}<br />${e(`${a.plz} ${a.ort}`)}</div>
      <div>Bankverbindung:<br />${e(a.bankName)}<br />${e(a.bic)}<br />${e(a.iban)}</div>
      <div>Tel: ${e(a.telefon)}<br />Fax: ${e(a.fax)}<br />Mail: ${e(a.email)}<br />${e(a.web)}</div>
    </div>
  </div>
</div>`;
};

// Dezente Einladung zur Google-Bewertung (nur auf Rechnungen): Ziel ist
// genau der Link aus dem QR-Code des Betriebs (Google-Eintrag "Augenoptik
// Ulm", Bewertungen). Das Bild wurde aus genau diesem Link neu erzeugt
// (Fehlerkorrektur L statt Q: Version 10, 57 Module statt 73) und wird 20 mm
// breit gedruckt (ca. 0,34 mm je Modul) - kleiner als das Original und
// trotzdem im Ausdruck sicher lesbar.
export const GOOGLE_BEWERTUNG_URL =
  "https://www.google.com/maps/place/Augenoptik+Ulm/@50.8522328,12.0867627,642m/data=!3m1!1e3!4m8!3m7!1s0x47a6cf06ebbd0651:0xc4f10eddabfaeeba!8m2!3d50.8522328!4d12.0867627!9m1!1b1!16s%252Fg%252F1thpvvx_?entry=ttu&g_ep=EgoyMDI1MDUyOC4wIKXMDSoASAFQAw%253D%253D";

const BEWERTUNG_HTML = `<div class="bewertung">
    <div class="bewertung-text">Wie zufrieden waren Sie mit Ihrem Besuch?<br />Teilen Sie Ihre Erfahrung gern auf Google.<br /><a href="${e(GOOGLE_BEWERTUNG_URL)}">Zur Bewertung auf Google</a></div>
    <img class="bewertung-qr" src="${bewertungQr}" alt="QR-Code zur Google-Bewertung" />
  </div>`;

// Reicht der Platz unter den Positionen nicht (sehr lange Rechnung), wird
// die Bewertungs-Einladung ausgeblendet statt die Fußzeile zu überdecken
const BEWERTUNG_PLATZ_PRUEFEN = `<script>
(function () {
  var b = document.querySelector(".bewertung");
  var f = document.querySelector(".fusszeile");
  if (b && f && b.getBoundingClientRect().bottom > f.getBoundingClientRect().top)
    b.style.visibility = "hidden";
})();
</script>`;

// Maße in mm nach der A4-Referenz (Logo, Datenbox, Balken)
export const BELEG_STYLES = `
  .beleg { position: relative; width: 210mm; height: 297mm; overflow: hidden; background: #fff; font-family: Arial, Helvetica, sans-serif; color: #111; font-size: 11pt; line-height: 1.3; -webkit-print-color-adjust: exact; print-color-adjust: exact; box-sizing: border-box; }
  .beleg * { box-sizing: border-box; }
  .beleg .absenderzeile { position: absolute; left: 25mm; top: 42.6mm; font-size: 7.5pt; border-bottom: 0.25mm solid #111; padding-bottom: 0.6mm; }
  .beleg .logo { position: absolute; left: 128.7mm; top: 17.4mm; width: 57.2mm; }
  .beleg .anschrift { position: absolute; left: 25mm; top: 52.2mm; line-height: 1.45; }
  .beleg .datenbox { position: absolute; left: 122mm; top: 75.4mm; width: 61.8mm; border-collapse: collapse; border: 0.25mm solid #333; }
  .beleg .datenbox td { padding: 0 0.6mm; height: 5.2mm; }
  .beleg .datenbox td:last-child { background: #e0e0e0; text-align: right; width: 50%; }
  .beleg .titelbalken { position: absolute; left: 24.7mm; right: 26.2mm; top: 96.2mm; height: 8.6mm; background: #e6e6e6; border-top: 0.3mm solid #555; border-bottom: 0.3mm solid #555; font-size: 17pt; line-height: 8.2mm; padding-left: 0.6mm; }
  .beleg .inhalt { position: absolute; left: 25mm; right: 26.2mm; top: 111mm; bottom: 46mm; display: flex; flex-direction: column; }
  .beleg .inhalt-block { flex: 0 0 auto; }
  .beleg .bewertung { margin-top: auto; padding-top: 2mm; flex: 0 0 auto; display: flex; justify-content: flex-end; align-items: center; gap: 3mm; }
  .beleg .bewertung-text { font-size: 7.5pt; line-height: 1.45; color: #666; text-align: right; }
  .beleg .bewertung-text a { color: #4a6a8a; text-decoration: none; }
  .beleg .bewertung-qr { width: 20mm; height: 20mm; image-rendering: pixelated; }
  .beleg .zweck { margin: 0 0 1.4mm; }
  .beleg .position { margin-bottom: 7mm; }
  .beleg .position .zeile { display: flex; justify-content: space-between; }
  .beleg .position .werte { margin-top: 1mm; }
  .beleg .position .detail { font-size: 8.5pt; margin-top: 0.8mm; }
  .beleg .position.abzug { margin-bottom: 1mm; padding-top: 1mm; border-top: 0.25mm solid #999; }
  .beleg .summenbalken { display: flex; justify-content: space-between; background: #e6e6e6; border: 0.25mm solid #333; height: 5.4mm; line-height: 5.2mm; padding: 0 0.4mm; margin-top: 1mm; }
  .beleg .mwst { font-size: 8.5pt; margin: 6mm 0 0; }
  .beleg .hinweise { font-size: 8.5pt; margin-top: 6mm; line-height: 1.5; }
  .beleg .fusszeile { position: absolute; left: 23.6mm; right: 26.6mm; top: 254.8mm; font-size: 7pt; }
  .beleg .dank { text-align: center; margin: 0 0 4.4mm; font-size: 7.5pt; line-height: 1.35; }
  .beleg .spalten { display: flex; justify-content: space-between; line-height: 1.3; font-size: 6.6pt; }
  .beleg .spalten > div { flex: 1; }
  .beleg .spalten > div:nth-child(2) { text-align: center; }
  .beleg .spalten > div:nth-child(3) { text-align: right; }
`;

const seite = (
  titel: string,
  body: string,
  vorschau: boolean,
) => `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8" />
<title>${e(titel)}</title>
<style>
  body { margin: 0; }
  ${BELEG_STYLES}
  ${vorschau ? "html { background: #eee; } .beleg { margin: 12px auto; box-shadow: 0 1px 6px rgba(0, 0, 0, 0.2); }" : "@page { size: A4; margin: 0; }"}
</style>
</head>
<body>
${body}
${BEWERTUNG_PLATZ_PRUEFEN}
</body>
</html>`;

export type RechnungDaten = {
  entities: DocumentMergeEntities;
  rechnungsnummer: string;
};

export const buildRechnungBodyHtml = ({
  entities,
  rechnungsnummer,
}: RechnungDaten): string =>
  belegHtml({ art: "rechnung", entities, nummer: rechnungsnummer });

export const buildRechnungPrintHtml = (daten: RechnungDaten): string =>
  seite(
    `Rechnung ${daten.rechnungsnummer}`,
    buildRechnungBodyHtml(daten),
    false,
  );

export const buildRechnungPreviewHtml = (daten: RechnungDaten): string =>
  seite(
    `Rechnung ${daten.rechnungsnummer}`,
    buildRechnungBodyHtml(daten),
    true,
  );

// Kostenvoranschlag im selben Design, auch als Anlage der Anträge
export type KostenvoranschlagDaten = { entities: DocumentMergeEntities };

export const buildKostenvoranschlagBodyHtml = ({
  entities,
}: KostenvoranschlagDaten): string =>
  belegHtml({
    art: "kostenvoranschlag",
    entities,
    nummer: entities.brille?.id ? String(entities.brille.id) : "",
  });

export const buildKostenvoranschlagPrintHtml = (
  daten: KostenvoranschlagDaten,
): string =>
  seite("Kostenvoranschlag", buildKostenvoranschlagBodyHtml(daten), false);

export const buildKostenvoranschlagPreviewHtml = (
  daten: KostenvoranschlagDaten,
): string =>
  seite("Kostenvoranschlag", buildKostenvoranschlagBodyHtml(daten), true);

// Rechnung für einen Kontaktlinsenauftrag im selben Design: Kontaktlinse
// rechts/links mit Werten, Zusatzleistungen, Rabatt; Summe, KK-Anteil und
// Anzahlung aus dem Auftrag
export type KontaktlinsenRechnungDaten = {
  kontaktlinse: Record<string, unknown>;
  kunde?: DocumentMergeEntities["kunde"];
  rechnungsnummer: string;
};

const textOderLeer = (wert: unknown) =>
  wert === null || wert === undefined ? "" : String(wert).trim();

export const buildKontaktlinsenPositionen = (
  cl: Record<string, unknown>,
): RechnungPosition[] => {
  const positionen: RechnungPosition[] = [];
  let mitPreis = 0;
  for (const [endung, label] of [
    ["Rechts", "Kontaktlinse rechts :"],
    ["Links", "Kontaktlinse links :"],
  ] as const) {
    const preis = asNumber(cl[`Preis${endung}`]);
    const werte = [
      formatGlaswerte({
        Sph: cl[`Sph${endung}`],
        Cyl: cl[`Cyl${endung}`],
        A: cl[`Achse${endung}`],
        Add: cl[`Add${endung}`],
      } as DocumentMergeEntities["glasLinks"]),
      asNumber(cl[`Radius${endung}`]) !== null
        ? `BC ${zahl2.format(Number(cl[`Radius${endung}`]))}`
        : "",
      asNumber(cl[`Durchmesser${endung}`]) !== null
        ? `DM ${zahl2.format(Number(cl[`Durchmesser${endung}`]))}`
        : "",
    ]
      .filter(Boolean)
      .join("  ");
    const typ = [
      textOderLeer(cl[`Linsentyp${endung}`]),
      textOderLeer(cl[`Hersteller${endung}`]),
    ]
      .filter(Boolean)
      .join(" – ");
    if (preis === null && !werte && !typ) continue;
    if (preis !== null) mitPreis += preis;
    positionen.push({
      label,
      betrag: preis,
      werte: werte || undefined,
      details: typ ? [typ] : [],
    });
  }
  for (const n of [1, 2, 3]) {
    const bezeichnung = textOderLeer(cl[`Zusatzleistung${n}`]);
    const betrag = asNumber(cl[`Zusatzbetrag${n}`]);
    if (!bezeichnung && betrag === null) continue;
    if (betrag !== null) mitPreis += betrag;
    positionen.push({ label: bezeichnung || "Zusatzleistung", betrag });
  }
  const prozent = asNumber(cl.RabattProzent) ?? 0;
  if (prozent > 0 && mitPreis > 0) {
    const bezeichnung = textOderLeer(cl.RabattBezeichnung);
    positionen.push({
      label: `Rabatt${bezeichnung ? `: ${bezeichnung}` : ""} (-${prozent} %)`,
      betrag: -Math.round(mitPreis * prozent) / 100,
    });
  }
  // ältere Aufträge ohne Einzelpreise: Gesamtbetrag als eine Position
  const summe = asNumber(cl.Summe) ?? 0;
  if (mitPreis === 0 && summe > 0) {
    positionen.push({ label: "Kontaktlinsen", betrag: summe });
  }
  return positionen;
};

const kontaktlinsenBeleg = ({
  kontaktlinse: cl,
  kunde,
  rechnungsnummer,
}: KontaktlinsenRechnungDaten) => {
  const positionen = buildKontaktlinsenPositionen(cl);
  // Rechnungsbetrag = Summe der Positionen (passt immer zu den Zeilen)
  const summe =
    Math.round(positionen.reduce((s, p) => s + (p.betrag ?? 0), 0) * 100) / 100;
  return belegHtml({
    art: "rechnung",
    nummer: rechnungsnummer,
    entities: {
      kunde,
      brille: {
        Summe: summe,
        KKAnteil: cl.KKAnteil,
        Anzahlung: cl.Anzahlung,
        Berater: cl.Berater,
        Zahlungsstatus: cl.Zahlungsstatus,
      },
    } as DocumentMergeEntities,
    positionen,
    zweck: `für neue Kontaktlinsen${
      textOderLeer(cl.Linsenart) ? ` (${textOderLeer(cl.Linsenart)})` : ""
    }`,
  });
};

export const buildKontaktlinsenRechnungPrintHtml = (
  daten: KontaktlinsenRechnungDaten,
): string =>
  seite(`Rechnung ${daten.rechnungsnummer}`, kontaktlinsenBeleg(daten), false);

export const buildKontaktlinsenRechnungPreviewHtml = (
  daten: KontaktlinsenRechnungDaten,
): string =>
  seite(`Rechnung ${daten.rechnungsnummer}`, kontaktlinsenBeleg(daten), true);
