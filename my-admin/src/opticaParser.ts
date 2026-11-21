// OPTICA-Abrechnungsunterlagen auslesen. Eingabe sind die Textzeilen eines
// PDFs (pdfZeilen.ts, Spalten durch Tabulator getrennt). Ohne React und ohne
// Datenbank, damit es sich testen lässt.
//
// Ein Abrechnungslauf ("311600532_H 10") besteht aus mehreren PDFs:
// Abrechnungsnachweis (Beträge und Auszahlung), Gebührenrechnung,
// Kontoauszug (Kassenrechnungen, Absetzungen, Rezeptabstimmung),
// eKV-Übersicht, Rezeptübersicht (Sammelrechnung, ein Eintrag je Rezept),
// Umsatzstatistik und weitere, die nur abgelegt werden.

import type { Leistung } from "./kassenrezept";

export type OpticaDokumentArt =
  | "abrechnungsnachweis"
  | "gebuehrenrechnung"
  | "kontoauszug"
  | "gesamt"
  | "rezeptuebersicht"
  | "ekv"
  | "leistungsstatistik"
  | "umsatzstatistik"
  | "ueberzahlung"
  | "anschreiben"
  | "unbekannt";

export const DOKUMENT_NAME: Record<OpticaDokumentArt, string> = {
  abrechnungsnachweis: "Abrechnungsnachweis",
  gebuehrenrechnung: "Gebührenrechnung",
  kontoauszug: "Kontoauszug",
  gesamt: "Gesamtübersicht",
  rezeptuebersicht: "Rezeptübersicht",
  ekv: "eKV-Übersicht",
  leistungsstatistik: "Leistungsstatistik",
  umsatzstatistik: "Umsatzstatistik",
  ueberzahlung: "Überzahlung",
  anschreiben: "Kundeninformation",
  unbekannt: "Sonstiges",
};

const runde = (n: number) => Math.round(n * 100) / 100;

/** "1.999,22" → 1999.22, "-944,63" → -944.63, "97,06 *" → 97.06; sonst null. */
export const betrag = (text: string | undefined | null): number | null => {
  if (!text) return null;
  const t = text
    .replace(/\s*\*$/, "")
    .replace(/\s*EUR$/, "")
    .trim();
  if (!/^-?\d{1,3}(\.\d{3})*,\d{2}$/.test(t)) return null;
  return Number(t.replace(/\./g, "").replace(",", "."));
};

/** "20.10.2026" → "2026-10-20"; sonst null. */
export const datum = (text: string | undefined | null): string | null => {
  const m = text?.trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
};

const spalten = (zeile: string) => zeile.split("\t").map((s) => s.trim());

/** Art des Dokuments an seinem Titel erkennen. */
export const erkenneDokument = (zeilen: string[]): OpticaDokumentArt => {
  const text = zeilen.join("\n");
  if (/Überzahlungssaldo/.test(text)) return "ueberzahlung";
  if (/^ABRECHNUNGSNACHWEIS$/m.test(text)) return "abrechnungsnachweis";
  if (
    /^Gebührenrechnung$/m.test(text) ||
    /Summe Zinsen und Gebühren/.test(text)
  )
    return "gebuehrenrechnung";
  if (/^REZEPTÜBERSICHT$/m.test(text)) return "rezeptuebersicht";
  if (/^eKV-Übersicht$/m.test(text)) return "ekv";
  if (/^KONTOAUSZUG$/m.test(text)) return "kontoauszug";
  if (/^GESAMTÜBERSICHT$/m.test(text)) return "gesamt";
  if (/^LEISTUNGSSTATISTIK$/m.test(text)) return "leistungsstatistik";
  if (/^UMSATZ-STATISTIK$/m.test(text)) return "umsatzstatistik";
  if (/^KUNDENINFORMATION$/m.test(text)) return "anschreiben";
  return "unbekannt";
};

export type OpticaKopf = {
  kundennummer: string | null;
  ik: string | null;
  monat: string; // JJJJ-MM
  datum: string | null; // JJJJ-MM-TT
};

/**
 * Kopfzeile jeder Seite: "2021/76  311600532  9/2026-H  20.10.2026  1 ...".
 * Liefert den Abrechnungsmonat als "2026-09".
 */
export const leseKopf = (zeilen: string[]): OpticaKopf | null => {
  for (const z of zeilen) {
    const s = spalten(z);
    const i = s.findIndex((t) => /^\d{1,2}\/\d{4}-[A-Z]$/.test(t));
    if (i < 0) continue;
    const [m, rest] = s[i].split("/");
    const jahr = rest.slice(0, 4);
    return {
      kundennummer: i >= 2 ? s[i - 2] : null,
      ik: i >= 1 ? s[i - 1] : null,
      monat: `${jahr}-${m.padStart(2, "0")}`,
      datum: datum(s[i + 1]),
    };
  }
  return null;
};

/** Zahlen, die in einer Zeile hinter der Spalte `label` stehen. */
const zahlenNach = (
  zeilen: string[],
  label: string | RegExp,
): number[] | null => {
  for (const z of zeilen) {
    const s = spalten(z);
    const i = s.findIndex((t) =>
      typeof label === "string" ? t === label : label.test(t),
    );
    if (i < 0) continue;
    const zahlen: number[] = [];
    for (const t of s.slice(i + 1)) {
      const b = betrag(t);
      if (b === null) break;
      zahlen.push(b);
    }
    if (zahlen.length) return zahlen;
  }
  return null;
};

const ersteZahl = (zeilen: string[], label: string | RegExp) =>
  zahlenNach(zeilen, label)?.[0] ?? null;

/** Spalte "Summe" (vierte Zahl) der Steuerabrechnung. */
const summenSpalte = (zeilen: string[], label: string | RegExp) => {
  const z = zahlenNach(zeilen, label);
  return z ? (z[3] ?? z[z.length - 1]) : null;
};

const textNach = (zeilen: string[], label: RegExp): string | null => {
  for (const z of zeilen) {
    const m = z.match(label);
    if (m) return m[1].trim();
  }
  return null;
};

// ---------------------------------------------------------------------------
// Abrechnungsnachweis

export type Steuersatz = {
  satz: number;
  netto: number;
  mwst: number;
  brutto: number;
};

export type Abrechnungsnachweis = {
  rechnungsnummer: string | null;
  brutto: number;
  netto: number;
  mwst: number;
  zuzahlung: number;
  forderung: number;
  absetzungen: number;
  gebuehren: number;
  zahlungen: number;
  auszahlungMonat: number;
  saldoVormonat: number;
  auszahlung: number;
  steuersaetze: Steuersatz[];
};

export const leseAbrechnungsnachweis = (
  zeilen: string[],
): Abrechnungsnachweis => {
  const steuersaetze: Steuersatz[] = [];
  for (const z of zeilen) {
    const m = spalten(z)[0]?.match(/^Netto (\d+)%$/);
    if (!m) continue;
    const satz = Number(m[1]);
    const netto = summenSpalte(zeilen, `Netto ${satz}%`) ?? 0;
    const mwst = summenSpalte(zeilen, `MwSt ${satz}%`) ?? 0;
    steuersaetze.push({ satz, netto, mwst, brutto: runde(netto + mwst) });
  }
  return {
    rechnungsnummer: textNach(zeilen, /Rechnr\.:\s*(\d+)/),
    brutto: summenSpalte(zeilen, "steuerliches Brutto") ?? 0,
    netto: summenSpalte(zeilen, "steuerliches Netto") ?? 0,
    mwst: summenSpalte(zeilen, "Summe MwSt") ?? 0,
    // Im Nachweis negativ (zu Lasten), gespeichert wird der Betrag.
    zuzahlung: Math.abs(
      ersteZahl(zeilen, "Ausgewiesene Zuzahlung / Eigenanteil") ?? 0,
    ),
    forderung: ersteZahl(zeilen, "übernommenes Forderungsvolumen") ?? 0,
    absetzungen: ersteZahl(zeilen, "Ab- / Zusetzung lfd. Monat") ?? 0,
    gebuehren: Math.abs(ersteZahl(zeilen, "Gebühren") ?? 0),
    zahlungen: ersteZahl(zeilen, "Zahlungen lfd. Monat") ?? 0,
    auszahlungMonat: ersteZahl(zeilen, "Auszahlungsbetrag lfd. Monat") ?? 0,
    saldoVormonat:
      ersteZahl(zeilen, "Kontosaldo Vormonat (Überzahlungen)") ?? 0,
    auszahlung: ersteZahl(zeilen, "Auszahlungsbetrag gesamt") ?? 0,
    steuersaetze,
  };
};

// ---------------------------------------------------------------------------
// Gebührenrechnung

export type Gebuehrenrechnung = {
  rechnungsnummer: string | null;
  rechnungsdatum: string | null;
  rezepte: number; // brutto
  ekv: number; // brutto
  summe: number; // brutto
  posten: { text: string; netto: number; mwst: number; brutto: number }[];
};

export const leseGebuehrenrechnung = (zeilen: string[]): Gebuehrenrechnung => {
  const posten: Gebuehrenrechnung["posten"] = [];
  let summe = 0;
  let drin = false;
  for (const z of zeilen) {
    const s = spalten(z);
    if (s[0] === "Zinsen und Gebühren") {
      drin = true;
      continue;
    }
    if (!drin) continue;
    if (s[0] === "Summe Zinsen und Gebühren") {
      summe = betrag(s[s.length - 1]) ?? 0;
      break;
    }
    // "Rezeptabrechnung  75,97  19%  14,43  90,40"
    const netto = betrag(s[1]);
    const brutto = betrag(s[s.length - 1]);
    if (netto === null || brutto === null) continue;
    posten.push({
      text: s[0],
      netto,
      mwst: betrag(s[s.length - 2]) ?? 0,
      brutto,
    });
  }
  const istEkv = (t: string) => /ekv|kostenvoranschl/i.test(t);
  const sum = (l: typeof posten) => runde(l.reduce((a, p) => a + p.brutto, 0));
  return {
    rechnungsnummer: textNach(zeilen, /^Rechn\. Nr\.\t(\S+)/),
    rechnungsdatum: datum(textNach(zeilen, /^Rechn\. Datum\t(\S+)/)),
    rezepte: sum(posten.filter((p) => !istEkv(p.text))),
    ekv: sum(posten.filter((p) => istEkv(p.text))),
    summe: summe || sum(posten),
    posten,
  };
};

// ---------------------------------------------------------------------------
// Kontoauszug

export type Kassenrechnung = {
  kassenart: string | null;
  kostentraeger: string;
  rechnungsnummer: string;
  anzahl: number;
  zuzahlung: number;
  netto: number;
};

export type Absetzung = {
  lfd: number;
  kostentraeger: string;
  grund: string;
  rechnungsnummer: string | null;
  belegnummer: string | null;
  mwstSatz: number | null;
  betrag: number;
};

export type Kontoauszug = {
  kassenrechnungen: Kassenrechnung[];
  absetzungen: Absetzung[];
  absetzungenSumme: number;
  forderung: number | null;
  gesamtforderung: number | null;
  rezepteEingesendet: number | null;
  rezepteAbgerechnet: number | null;
  rezepteZurueck: number | null;
};

/** Silbentrennung am Zeilenende wieder zusammenfügen. */
const verbinde = (teile: string[]) =>
  teile
    .filter(Boolean)
    .reduce((text, teil) => {
      if (!text) return teil;
      // "Kran-" + "kenkasse" → "Krankenkasse", "DAK-" + "Gesundheit" bleibt
      if (/[a-zäöüß]-$/.test(text) && /^[a-zäöüß]/.test(teil)) {
        return text.slice(0, -1) + teil;
      }
      return `${text} ${teil}`;
    }, "")
    .replace(/\s+/g, " ")
    .trim();

const ganzzahl = (t: string | undefined) =>
  t && /^\d+$/.test(t) ? Number(t) : null;

/** "c/ o ku- bus- IT" → "c/o kubus-IT", "DAK- Gesundheit" → "DAK-Gesundheit" */
const kassenName = (t: string) =>
  t
    .replace(/c\/ o/g, "c/o")
    .replace(/([a-z])- ([a-z])/g, "$1$2")
    .replace(/([A-Za-zÄÖÜäöüß])- /g, "$1-");

const KASSENART = /^(AOK|BKK|EKK|IKK|LKK|BW|KBS|SON|PRIV|BG|SOZ|POL)$/;

const leseKassenrechnungen = (zeilen: string[]): Kassenrechnung[] => {
  const liste: Kassenrechnung[] = [];
  let drin = false;
  let art: string | null = null;
  for (const z of zeilen) {
    const s = spalten(z);
    if (/^Forderungsaufstellung/.test(s[0])) {
      drin = true;
      continue;
    }
    if (!drin) continue;
    if (s[0] === "Summe" || s[0] === "Absetzungen") break;
    if (s[0].startsWith("--- Seite")) continue;
    // "1  AOK  AOK PLUS - Thüringen  33777654  1  0,00  0,00  53,99"
    if (/^\d+$/.test(s[0]) && s.length >= 6) {
      const netto = betrag(s[s.length - 1]);
      const zuzahlung = betrag(s[s.length - 2]);
      const anzahl = ganzzahl(s[s.length - 4]);
      const rechnungsnummer = s[s.length - 5];
      if (netto === null || zuzahlung === null || anzahl === null) continue;
      const mitte = s.slice(1, s.length - 5);
      if (mitte.length > 1 && KASSENART.test(mitte[0])) {
        art = mitte.shift() ?? null;
      }
      liste.push({
        kassenart: art,
        kostentraeger: kassenName(mitte.join(" ")),
        rechnungsnummer,
        anzahl,
        zuzahlung,
        netto,
      });
    } else if (
      liste.length &&
      s.length === 1 &&
      !/^(lfd\.|Nr\.|Kostenträger \/ Rechnungsstelle)$/.test(s[0])
    ) {
      // Fortsetzung des Kostenträgernamens ("bus- IT")
      const letzte = liste[liste.length - 1];
      letzte.kostentraeger = kassenName(verbinde([letzte.kostentraeger, s[0]]));
    }
  }
  return liste;
};

const leseAbsetzungen = (
  zeilen: string[],
): { liste: Absetzung[]; summe: number } => {
  type Roh = {
    lfd: number;
    kasse: string[];
    grund: string[];
    rechnungsnummer: string | null;
    mwstSatz: number | null;
    betrag: number;
  };
  const roh: Roh[] = [];
  let drin = false;
  let summe = 0;
  for (const z of zeilen) {
    const s = spalten(z);
    if (s[0] === "Absetzungen" && s.length === 1) {
      drin = true;
      continue;
    }
    if (!drin) continue;
    if (/^Summe: Absetzungen/.test(s[0])) {
      summe = betrag(s[s.length - 1]) ?? 0;
      break;
    }
    if (
      /^(lfd\.|Nr\.|Kostenträger)$/.test(s[0]) ||
      s[0].startsWith("--- Seite")
    )
      continue;
    // "1  AOK Plus ...  Behandlung ...  33262751/4  19  -552,16"
    const b = betrag(s[s.length - 1]);
    if (/^\d+$/.test(s[0]) && s.length >= 5 && b !== null) {
      roh.push({
        lfd: Number(s[0]),
        kasse: [s[1]],
        grund: [s.slice(2, s.length - 3).join(" ")],
        rechnungsnummer: s[s.length - 3] || null,
        mwstSatz: ganzzahl(s[s.length - 2]),
        betrag: b,
      });
      continue;
    }
    const letzte = roh[roh.length - 1];
    if (!letzte) continue;
    if (s.length >= 2) {
      // linke Spalte setzt den Kostenträger fort, rechte den Grund
      letzte.kasse.push(s[0]);
      letzte.grund.push(s.slice(1).join(" "));
    } else {
      letzte.grund.push(s[0]);
    }
  }
  const liste = roh.map((r): Absetzung => {
    let grund = verbinde(r.grund);
    const m = grund.match(/Be-?\s?legnr:\s*(\d+)/);
    const belegnummer = m ? m[1] : null;
    if (m) grund = grund.replace(m[0], "").trim();
    return {
      lfd: r.lfd,
      kostentraeger: verbinde(r.kasse).replace(/ (\d)\. ?(\d)$/, " $1.$2"),
      grund,
      rechnungsnummer: r.rechnungsnummer,
      belegnummer,
      mwstSatz: r.mwstSatz,
      betrag: r.betrag,
    };
  });
  return { liste, summe };
};

/** Zahl in der Zeile, deren erste Spalte `label` ist ("Abgerechnete Rezepte  31"). */
const zahlZeile = (zeilen: string[], label: string) => {
  for (const z of zeilen) {
    const s = spalten(z);
    if (s[0] === label) return ganzzahl(s[s.length - 1]);
  }
  return null;
};

/** Betrag hinter "EUR" in der Zusammenfassung ("Gesamtforderung  EUR  1.979,22"). */
const eurZeile = (zeilen: string[], label: string) => {
  for (let i = 0; i < zeilen.length; i++) {
    const s = spalten(zeilen[i]);
    if (s[0] !== label) continue;
    const hier = betrag(s[s.length - 1]);
    if (hier !== null) return hier;
    // Wert steht in der Folgezeile ("EUR  1.979,22")
    const n = spalten(zeilen[i + 1] ?? "");
    if (n[0] === "EUR") return betrag(n[1]);
  }
  return null;
};

export const leseKontoauszug = (zeilen: string[]): Kontoauszug => {
  const { liste, summe } = leseAbsetzungen(zeilen);
  return {
    kassenrechnungen: leseKassenrechnungen(zeilen),
    absetzungen: liste,
    absetzungenSumme: summe,
    forderung: eurZeile(zeilen, "Forderung GKV u. div. Kostenträger"),
    gesamtforderung: eurZeile(zeilen, "Gesamtforderung"),
    rezepteEingesendet: zahlZeile(zeilen, "Eingesendete Rezepte"),
    rezepteAbgerechnet: zahlZeile(zeilen, "Abgerechnete Rezepte"),
    rezepteZurueck: zahlZeile(zeilen, "Rückgabe Rezept"),
  };
};

// ---------------------------------------------------------------------------
// eKV-Übersicht

export type Ekv = {
  kvNummer: string;
  kasse: string;
  kvDatum: string | null;
  genehmigt: string | null;
  genehmigungsnummer: string | null;
  teilgenehmigt: boolean;
  gebuehr: number;
  zuzahlung: number;
  beantragt: number;
  erstattung: number;
  versichertennummer: string | null;
  nachname: string | null;
  vorname: string | null;
  geburtsdatum: string | null;
};

/** "Nachname, Vorname" trennen. */
export const teileName = (name: string) => {
  const i = name.indexOf(",");
  if (i < 0) return { nachname: name.trim() || null, vorname: null };
  return {
    nachname: name.slice(0, i).trim() || null,
    vorname: name.slice(i + 1).trim() || null,
  };
};

export const leseEkv = (zeilen: string[]): Ekv[] => {
  const liste: Ekv[] = [];
  let drin = false;
  for (const z of zeilen) {
    const s = spalten(z);
    if (s[0] === "KV-Nr.") {
      drin = true;
      continue;
    }
    if (!drin) continue;
    if (s[0] === "Gesamt:") break;
    if (!/^\d{4,}$/.test(s[0]) || s.length < 6) {
      // Fortsetzung des Kassennamens, z. B. "(Sachsen)"
      const letzte = liste[liste.length - 1];
      if (letzte && s.length === 1 && s[0] && !/^(zahlung|Zu-)/.test(s[0])) {
        letzte.kasse = `${letzte.kasse} ${s[0]}`;
      }
      continue;
    }
    const rest = s.slice(2);
    const daten: string[] = [];
    while (rest.length && datum(rest[0])) daten.push(datum(rest.shift())!);
    let teilgenehmigt = false;
    if (rest[0] === "T" || rest[0] === "*T") {
      teilgenehmigt = true;
      rest.shift();
    }
    const genehmigungsnummer =
      rest.length && betrag(rest[0]) === null ? rest.shift()! : null;
    const zahlen: number[] = [];
    while (rest.length && zahlen.length < 4 && betrag(rest[0]) !== null) {
      zahlen.push(betrag(rest.shift())!);
    }
    let versichertennummer: string | null = null;
    let name: string | null = null;
    let geburtsdatum: string | null = null;
    for (const t of rest) {
      if (datum(t)) geburtsdatum = datum(t);
      else if (t === "T") teilgenehmigt = true;
      else if (betrag(t) !== null)
        continue; // KZ-Betrag
      else if (t.includes(",")) name = t;
      else if (!versichertennummer) versichertennummer = t;
    }
    const n = name ? teileName(name) : { nachname: null, vorname: null };
    liste.push({
      kvNummer: s[0],
      kasse: s[1],
      kvDatum: daten[0] ?? null,
      genehmigt: daten[1] ?? null,
      genehmigungsnummer,
      teilgenehmigt,
      gebuehr: zahlen[0] ?? 0,
      zuzahlung: zahlen[1] ?? 0,
      beantragt: zahlen[2] ?? 0,
      erstattung: zahlen[3] ?? 0,
      versichertennummer,
      ...n,
      geburtsdatum,
    });
  }
  return liste;
};

// ---------------------------------------------------------------------------
// Umsatzstatistik

export type UmsatzWert = {
  zeitraum: string;
  forderung: number;
  anzahl: number;
  jeRezept: number;
};

export type UmsatzBlock = {
  monat: UmsatzWert | null;
  vormonat: UmsatzWert | null;
  vorjahresmonat: UmsatzWert | null;
  jahr: UmsatzWert | null;
  vorjahr: UmsatzWert | null;
};

export type Umsatzstatistik = {
  betrieb: UmsatzBlock;
  thueringen: UmsatzBlock;
  bund: UmsatzBlock;
};

const leseUmsatzBlock = (zeilen: string[], titel: RegExp): UmsatzBlock => {
  const leer: UmsatzBlock = {
    monat: null,
    vormonat: null,
    vorjahresmonat: null,
    jahr: null,
    vorjahr: null,
  };
  const start = zeilen.findIndex((z) => titel.test(z));
  if (start < 0) return leer;
  const werte: UmsatzWert[] = [];
  for (const z of zeilen.slice(start + 1)) {
    const s = spalten(z);
    if (/Umsatz/.test(s[0]) && werte.length) break;
    // "08.2026  5.399,97  39  138,46" bzw. "01-08.2026 ..."
    if (!/^(\d{2}-)?\d{2}\.\d{4}$/.test(s[0])) continue;
    const forderung = betrag(s[1]);
    const anzahl = s[2] && /^-?\d+$/.test(s[2]) ? Number(s[2]) : null;
    const jeRezept = betrag(s[3]);
    if (forderung === null || anzahl === null) continue;
    werte.push({ zeitraum: s[0], forderung, anzahl, jeRezept: jeRezept ?? 0 });
    if (werte.length === 6) break;
  }
  return {
    monat: werte[0] ?? null,
    vormonat: werte[1] ?? null,
    vorjahresmonat: werte[3] ?? null,
    jahr: werte[4] ?? null,
    vorjahr: werte[5] ?? null,
  };
};

export const leseUmsatzstatistik = (zeilen: string[]): Umsatzstatistik => ({
  betrieb: leseUmsatzBlock(zeilen, /^Kunden-Umsatz/),
  thueringen: leseUmsatzBlock(zeilen, /^Durchschnitts-Umsatz Betriebe/),
  bund: leseUmsatzBlock(zeilen, /^Durchschnitts-Umsatz im Bundesgebiet/),
});

// ---------------------------------------------------------------------------
// Rezeptübersicht (Sammelrechnung)

export type OpticaRezept = {
  lfd: number;
  belegnummer: string;
  nachname: string | null;
  vorname: string | null;
  geburtsdatum: string | null;
  versichertennummer: string | null;
  rezeptdatum: string | null;
  krankenkasse: string | null;
  leistungen: Leistung[];
  netto: number;
  mwst: number;
  brutto: number;
  zuzahlung: number;
};

/** "2521010900 Einstärkengläser sphärisch  nzV  1  16,23 *N  19,31  0,00  19" */
const leseLeistung = (s: string[]): Leistung | null => {
  const m = s[0]?.match(/^(\d{7,10})\s+(.*)$/);
  if (!m || s.length < 5) return null;
  const mwst = ganzzahl(s[s.length - 1]);
  const zuzahlung = betrag(s[s.length - 2]);
  const brutto = betrag(s[s.length - 3]);
  if (mwst === null || zuzahlung === null || brutto === null) return null;
  const faktor =
    s
      .slice(1, s.length - 3)
      .map(ganzzahl)
      .find((f) => f !== null) ?? 1;
  return {
    pzn: m[1],
    text: m[2].trim(),
    faktor,
    netto: runde(brutto / (1 + mwst / 100)),
    brutto,
    zuzahlung,
    mwst,
  };
};

export const leseRezeptuebersicht = (zeilen: string[]): OpticaRezept[] => {
  const liste: OpticaRezept[] = [];
  let aktuell: Omit<
    OpticaRezept,
    | "belegnummer"
    | "versichertennummer"
    | "rezeptdatum"
    | "krankenkasse"
    | "netto"
    | "mwst"
    | "brutto"
    | "zuzahlung"
  > | null = null;
  for (const z of zeilen) {
    const s = spalten(z);
    // Kopf eines Rezepts: "7 Nachname, Vorname 08.07.1972  <erste Leistung>"
    const kopf = s[0]?.match(/^(\d+) (.+?) (\d{2}\.\d{2}\.\d{4})$/);
    if (kopf) {
      const n = teileName(kopf[2]);
      aktuell = {
        lfd: Number(kopf[1]),
        ...n,
        geburtsdatum: datum(kopf[3]),
        leistungen: [],
      };
      const l = leseLeistung(s.slice(1));
      if (l) aktuell.leistungen.push(l);
      continue;
    }
    if (!aktuell) continue;
    // Abschluss: "60970385725  X361286394  10.09.2026  AOK Plus ...  Gesamt  38,62  0,00"
    const g = s.indexOf("Gesamt");
    if (/^\d{9,}$/.test(s[0]) && g > 0) {
      const vorne = s.slice(1, g);
      let versichertennummer: string | null = null;
      let rezeptdatum: string | null = null;
      const kasse: string[] = [];
      for (const t of vorne) {
        if (!rezeptdatum && datum(t)) rezeptdatum = datum(t);
        else if (!rezeptdatum && !versichertennummer) versichertennummer = t;
        else kasse.push(t);
      }
      const brutto =
        betrag(s[g + 1]) ??
        runde(aktuell.leistungen.reduce((a, l) => a + l.brutto, 0));
      const zuzahlung = betrag(s[g + 2]) ?? 0;
      const netto = runde(aktuell.leistungen.reduce((a, l) => a + l.netto, 0));
      liste.push({
        ...aktuell,
        belegnummer: s[0],
        versichertennummer:
          versichertennummer && !/^0+$/.test(versichertennummer)
            ? versichertennummer
            : null,
        rezeptdatum,
        krankenkasse: kasse.join(" ") || null,
        netto,
        mwst: runde(brutto - netto),
        brutto,
        zuzahlung,
      });
      aktuell = null;
      continue;
    }
    const l = leseLeistung(s);
    if (l) aktuell.leistungen.push(l);
  }
  return liste;
};

// ---------------------------------------------------------------------------
// Ein ganzer Abrechnungslauf aus mehreren Dokumenten

export type OpticaDokument = {
  name: string;
  art: OpticaDokumentArt;
  kopf: OpticaKopf | null;
  zeilen: string[];
};

export type OpticaLauf = {
  monat: string;
  abrechnungsdatum: string | null;
  kundennummer: string | null;
  nachweis: Abrechnungsnachweis | null;
  gebuehren: Gebuehrenrechnung | null;
  konto: Kontoauszug | null;
  ekv: Ekv[];
  rezepte: OpticaRezept[];
  umsatz: Umsatzstatistik | null;
  dokumente: { name: string; art: OpticaDokumentArt }[];
  hinweise: string[];
};

export const dokumentAusZeilen = (
  name: string,
  zeilen: string[],
): OpticaDokument => ({
  name,
  art: erkenneDokument(zeilen),
  kopf: leseKopf(zeilen),
  zeilen,
});

/** Die Dokumente nach Abrechnungsmonat zu Läufen zusammenfassen. */
export const laeufeAusDokumenten = (
  dokumente: OpticaDokument[],
): OpticaLauf[] => {
  const nachMonat = new Map<string, OpticaDokument[]>();
  for (const d of dokumente) {
    if (!d.kopf) continue;
    const l = nachMonat.get(d.kopf.monat) ?? [];
    l.push(d);
    nachMonat.set(d.kopf.monat, l);
  }
  return [...nachMonat.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monat, docs]) => laufAusDokumenten(monat, docs));
};

const laufAusDokumenten = (
  monat: string,
  docs: OpticaDokument[],
): OpticaLauf => {
  const erstes = (art: OpticaDokumentArt) => docs.find((d) => d.art === art);
  const nachweisDoc = erstes("abrechnungsnachweis");
  const gebDoc = erstes("gebuehrenrechnung");
  const kontoDoc = erstes("kontoauszug");
  const ekvDoc = erstes("ekv");
  const rezDoc = erstes("rezeptuebersicht");
  const umsatzDoc = erstes("umsatzstatistik");
  const lauf: OpticaLauf = {
    monat,
    abrechnungsdatum: (nachweisDoc ?? docs[0]).kopf?.datum ?? null,
    kundennummer: (nachweisDoc ?? docs[0]).kopf?.kundennummer ?? null,
    nachweis: nachweisDoc ? leseAbrechnungsnachweis(nachweisDoc.zeilen) : null,
    gebuehren: gebDoc ? leseGebuehrenrechnung(gebDoc.zeilen) : null,
    konto: kontoDoc ? leseKontoauszug(kontoDoc.zeilen) : null,
    ekv: ekvDoc ? leseEkv(ekvDoc.zeilen) : [],
    rezepte: rezDoc ? leseRezeptuebersicht(rezDoc.zeilen) : [],
    umsatz: umsatzDoc ? leseUmsatzstatistik(umsatzDoc.zeilen) : null,
    // Doppelte Dateien (gleiche Art und gleicher Name) nur einmal ablegen
    dokumente: docs
      .filter((d, i) => docs.findIndex((e) => e.name === d.name) === i)
      .map((d) => ({ name: d.name, art: d.art })),
    hinweise: [],
  };
  lauf.hinweise = pruefeLauf(lauf);
  return lauf;
};

/** Widersprüche zwischen den Dokumenten eines Laufs. */
export const pruefeLauf = (l: OpticaLauf): string[] => {
  const h: string[] = [];
  const gleich = (a: number, b: number) => Math.abs(a - b) < 0.005;
  const eur = (n: number) => n.toFixed(2).replace(".", ",");
  if (!l.nachweis) h.push("Abrechnungsnachweis fehlt – Auszahlung unbekannt.");
  if (
    l.nachweis &&
    l.gebuehren &&
    !gleich(l.nachweis.gebuehren, l.gebuehren.summe)
  ) {
    h.push(
      `Gebühren im Nachweis (${eur(l.nachweis.gebuehren)} €) und in der Gebührenrechnung (${eur(l.gebuehren.summe)} €) weichen ab.`,
    );
  }
  if (
    l.nachweis &&
    l.konto &&
    !gleich(l.nachweis.absetzungen, l.konto.absetzungenSumme)
  ) {
    h.push(
      `Absetzungen im Nachweis (${eur(l.nachweis.absetzungen)} €) und im Kontoauszug (${eur(l.konto.absetzungenSumme)} €) weichen ab.`,
    );
  }
  if (l.konto) {
    const summe = runde(l.konto.absetzungen.reduce((a, x) => a + x.betrag, 0));
    if (!gleich(summe, l.konto.absetzungenSumme)) {
      h.push(
        `Nicht alle Absetzungen konnten gelesen werden (${eur(summe)} von ${eur(l.konto.absetzungenSumme)} €).`,
      );
    }
  }
  if (l.rezepte.length && l.nachweis) {
    const brutto = runde(l.rezepte.reduce((a, r) => a + r.brutto, 0));
    if (!gleich(brutto, l.nachweis.brutto)) {
      h.push(
        `Summe der Rezepte (${eur(brutto)} €) passt nicht zum Brutto im Nachweis (${eur(l.nachweis.brutto)} €).`,
      );
    }
  }
  if (
    l.konto?.rezepteAbgerechnet &&
    l.rezepte.length &&
    l.rezepte.length !== l.konto.rezepteAbgerechnet
  ) {
    h.push(
      `${l.rezepte.length} Rezepte gelesen, laut Kontoauszug ${l.konto.rezepteAbgerechnet} abgerechnet.`,
    );
  }
  return h;
};
