import dayjs from "dayjs";

/*
 * Marketingmodul (wie in Prisma): Kundenauswahl aus beliebig vielen
 * Bedingungen, verknüpft mit UND (alle müssen zutreffen) oder ODER
 * (mindestens eine). Die Bedingungen werden zu einem PostgREST-Filter über
 * die Ansicht `kunde_marketing` übersetzt, damit auch große Kundenstämme
 * auf dem Server gefiltert werden. Kanal (Post/E-Mail/Handy) und
 * Werbeeinwilligung gelten immer zusätzlich (UND).
 *
 * Hier nur die Regeln (ohne Supabase), damit sie sich testen lassen.
 */

export const MARKETING_ANSICHT = "kunde_marketing";

// Übergabe einer Auswahl an den Serienbrief (localStorage)
export const SERIENBRIEF_AUSWAHL = "serienbrief-marketing-auswahl";

export type Verknuepfung = "und" | "oder";
export type Kanal = "post" | "email" | "handy" | "alle";

export type Kriterium = {
  id: string;
  merkmal: MerkmalId;
  a?: string;
  b?: string;
};

export type Selektion = {
  verknuepfung: Verknuepfung;
  kriterien: Kriterium[];
  kanal: Kanal;
  nurEinwilligung: boolean;
};

type Eingabe =
  | { art: "bereich"; einheit: string } // von–bis (Zahlen)
  | { art: "zahl"; einheit: string } // eine Zahl
  | { art: "text"; platzhalter: string }
  | { art: "auswahl"; werte: { wert: string; name: string }[] }
  | { art: "ohne" };

export type MerkmalId =
  | "alter"
  | "geburtsmonat"
  | "anrede"
  | "plz"
  | "ort"
  | "krankenkasse"
  | "versicherung"
  | "kundenquelle"
  | "merkmal"
  | "neukunde"
  | "letzteBrilleAelter"
  | "letzteBrilleJuenger"
  | "keineBrille"
  | "letzterKaufAelter"
  | "gleitsicht"
  | "kontaktlinsen"
  | "letzteLinseAelter"
  | "umsatz"
  | "anzahlBrillen";

export const MONATE = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];

const JA_NEIN = [
  { wert: "ja", name: "ja" },
  { wert: "nein", name: "nein" },
];

export const MERKMALE: {
  id: MerkmalId;
  name: string;
  gruppe: string;
  eingabe: Eingabe;
}[] = [
  {
    id: "alter",
    name: "Alter",
    gruppe: "Person",
    eingabe: { art: "bereich", einheit: "Jahre" },
  },
  {
    id: "geburtsmonat",
    name: "Geburtstag im Monat",
    gruppe: "Person",
    eingabe: {
      art: "auswahl",
      werte: MONATE.map((m, i) => ({ wert: String(i + 1), name: m })),
    },
  },
  {
    id: "anrede",
    name: "Anrede",
    gruppe: "Person",
    eingabe: {
      art: "auswahl",
      werte: ["Frau", "Herr", "Dr.", "Prof.", "Prof. Dr."].map((w) => ({
        wert: w,
        name: w,
      })),
    },
  },
  {
    id: "plz",
    name: "Postleitzahl beginnt mit",
    gruppe: "Person",
    eingabe: { art: "text", platzhalter: "z. B. 075" },
  },
  {
    id: "ort",
    name: "Wohnort enthält",
    gruppe: "Person",
    eingabe: { art: "text", platzhalter: "z. B. Gera" },
  },
  {
    id: "krankenkasse",
    name: "Krankenkasse enthält",
    gruppe: "Person",
    eingabe: { art: "text", platzhalter: "z. B. AOK" },
  },
  {
    id: "versicherung",
    name: "Versicherung",
    gruppe: "Person",
    eingabe: {
      art: "auswahl",
      werte: [
        { wert: "Gesetzlich Krankenversichert", name: "gesetzlich" },
        { wert: "Privat Krankenversichert", name: "privat" },
      ],
    },
  },
  {
    id: "kundenquelle",
    name: "Kundenquelle enthält",
    gruppe: "Person",
    eingabe: { art: "text", platzhalter: "z. B. Empfehlung" },
  },
  {
    id: "merkmal",
    name: "Merkmal 1–4 enthält",
    gruppe: "Person",
    eingabe: { art: "text", platzhalter: "Stichwort" },
  },
  {
    id: "neukunde",
    name: "Kunde seit weniger als",
    gruppe: "Kauf",
    eingabe: { art: "zahl", einheit: "Monaten" },
  },
  {
    id: "letzteBrilleAelter",
    name: "Letzte Brille vor mehr als",
    gruppe: "Kauf",
    eingabe: { art: "zahl", einheit: "Monaten" },
  },
  {
    id: "letzteBrilleJuenger",
    name: "Letzte Brille innerhalb der letzten",
    gruppe: "Kauf",
    eingabe: { art: "zahl", einheit: "Monate" },
  },
  {
    id: "keineBrille",
    name: "Noch nie eine Brille gekauft",
    gruppe: "Kauf",
    eingabe: { art: "ohne" },
  },
  {
    id: "letzterKaufAelter",
    name: "Letzter Kauf (Brille oder CL) vor mehr als",
    gruppe: "Kauf",
    eingabe: { art: "zahl", einheit: "Monaten" },
  },
  {
    id: "gleitsicht",
    name: "Gleitsichtträger",
    gruppe: "Kauf",
    eingabe: { art: "auswahl", werte: JA_NEIN },
  },
  {
    id: "kontaktlinsen",
    name: "Kontaktlinsenkunde",
    gruppe: "Kauf",
    eingabe: { art: "auswahl", werte: JA_NEIN },
  },
  {
    id: "letzteLinseAelter",
    name: "Letzte Kontaktlinsen vor mehr als",
    gruppe: "Kauf",
    eingabe: { art: "zahl", einheit: "Monaten" },
  },
  {
    id: "umsatz",
    name: "Umsatz gesamt",
    gruppe: "Kauf",
    eingabe: { art: "bereich", einheit: "€" },
  },
  {
    id: "anzahlBrillen",
    name: "Anzahl Aufträge (Brille)",
    gruppe: "Kauf",
    eingabe: { art: "bereich", einheit: "Stück" },
  },
];

export const merkmalVon = (id: MerkmalId) => MERKMALE.find((m) => m.id === id)!;

export const KANAELE: { id: Kanal; name: string }[] = [
  { id: "post", name: "Brief (mit Anschrift)" },
  { id: "email", name: "E-Mail" },
  { id: "handy", name: "Handy (SMS/WhatsApp)" },
  { id: "alle", name: "egal" },
];

// Werte in PostgREST-Logikausdrücken in Anführungszeichen setzen, damit
// Komma, Punkt und Klammern im Text nicht als Syntax gelesen werden
const zitat = (wert: string) =>
  /[,.:()"\\\s]/.test(wert)
    ? `"${wert.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`
    : wert;

// Text für ilike: Sternchen sind Platzhalter, eigene Sternchen entfernen
const textMuster = (wert: string) => wert.replace(/[*%]/g, "").trim();

const zahlWert = (wert?: string) => {
  if (wert == null || wert.trim() === "") return null;
  const n = Number(wert.replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

const vorMonaten = (monate: number, heute: dayjs.Dayjs) =>
  heute.subtract(monate, "month").format("YYYY-MM-DD");

/**
 * Eine Bedingung als PostgREST-Ausdruck (für `or=(…)`/`and(…)`); null, wenn
 * sie unvollständig ist und daher nicht zählt.
 */
export const kriteriumAusdruck = (
  k: Kriterium,
  heute = dayjs(),
): string | null => {
  const a = k.a ?? "";
  const zahl = zahlWert(a);
  const bereich = (spalte: string) => {
    const von = zahlWert(k.a);
    const bis = zahlWert(k.b);
    const teile = [
      von != null ? `${spalte}.gte.${von}` : null,
      bis != null ? `${spalte}.lte.${bis}` : null,
    ].filter(Boolean);
    if (teile.length === 0) return null;
    return teile.length === 1 ? teile[0]! : `and(${teile.join(",")})`;
  };
  const enthaelt = (spalte: string) => {
    const t = textMuster(a);
    return t ? `${spalte}.ilike.${zitat(`*${t}*`)}` : null;
  };
  const monateAelter = (spalte: string) =>
    zahl != null && zahl >= 0
      ? `${spalte}.lt.${vorMonaten(zahl, heute)}`
      : null;
  const janein = (spalte: string) =>
    a === "ja"
      ? `${spalte}.is.true`
      : a === "nein"
        ? `${spalte}.is.false`
        : null;

  switch (k.merkmal) {
    case "alter":
      return bereich("Alter");
    case "geburtsmonat":
      return zahl != null && zahl >= 1 && zahl <= 12
        ? `Geburtsmonat.eq.${zahl}`
        : null;
    case "anrede":
      return a ? `Anrede.eq.${zitat(a)}` : null;
    case "plz": {
      const plz = a.replace(/\D/g, "");
      return plz ? `Postleitzahl.like.${plz}*` : null;
    }
    case "ort":
      return enthaelt("Stadt");
    case "krankenkasse":
      return enthaelt("Krankenkasse");
    case "versicherung":
      return a ? `Versicherung.eq.${zitat(a)}` : null;
    case "kundenquelle":
      return enthaelt("Kundenquelle");
    case "merkmal": {
      const teile = ["Merkmal1", "Merkmal2", "Merkmal3", "Merkmal4"]
        .map(enthaelt)
        .filter(Boolean);
      return teile.length ? `or(${teile.join(",")})` : null;
    }
    case "neukunde":
      return zahl != null && zahl > 0
        ? `KundeSeit.gte.${vorMonaten(zahl, heute)}`
        : null;
    case "letzteBrilleAelter":
      return monateAelter("LetzteBrille");
    case "letzteBrilleJuenger":
      return zahl != null && zahl > 0
        ? `LetzteBrille.gte.${vorMonaten(zahl, heute)}`
        : null;
    case "keineBrille":
      return "LetzteBrille.is.null";
    case "letzterKaufAelter":
      return monateAelter("LetzterKauf");
    case "gleitsicht":
      return janein("Gleitsicht");
    case "kontaktlinsen":
      return janein("Kontaktlinsen");
    case "letzteLinseAelter":
      return monateAelter("LetzteKontaktlinse");
    case "umsatz":
      return bereich("Umsatz");
    case "anzahlBrillen":
      return bereich("AnzahlBrillen");
  }
};

/**
 * Alle Bedingungen zu einem Ausdruck für `.or(…)` des Supabase-Clients:
 * UND als `and(…)`, ODER als Liste. null, wenn keine Bedingung zählt (dann
 * gelten alle Kunden).
 */
export const selektionsAusdruck = (
  s: Pick<Selektion, "verknuepfung" | "kriterien">,
  heute = dayjs(),
): string | null => {
  const teile = s.kriterien
    .map((k) => kriteriumAusdruck(k, heute))
    .filter((t): t is string => Boolean(t));
  if (teile.length === 0) return null;
  return s.verknuepfung === "und" ? `and(${teile.join(",")})` : teile.join(",");
};

/**
 * Pflichtbedingungen, die immer zusätzlich gelten: erreichbar über den
 * Kanal und (sofern gewählt) Werbeeinwilligung. Als Liste aus
 * [Spalte, Operator, Wert] für die Filtermethoden des Supabase-Clients.
 */
export const pflichtFilter = (
  s: Pick<Selektion, "kanal" | "nurEinwilligung">,
): [string, string, string | boolean | null][] => {
  const f: [string, string, string | boolean | null][] = [];
  if (s.nurEinwilligung) f.push(["Werbeeinwilligung", "is", true]);
  if (s.kanal === "post") {
    f.push(["Straße", "not.is", null]);
    f.push(["Straße", "neq", ""]);
    f.push(["Postleitzahl", "not.is", null]);
    f.push(["Postleitzahl", "neq", ""]);
  } else if (s.kanal === "email") {
    f.push(["Email", "like", "*@*"]);
  } else if (s.kanal === "handy") {
    f.push(["Handy", "not.is", null]);
    f.push(["Handy", "neq", ""]);
  }
  return f;
};

/** Kurzbeschreibung einer Bedingung für Listen und Ausdrucke. */
export const kriteriumText = (k: Kriterium) => {
  const m = merkmalVon(k.merkmal);
  const e = m.eingabe;
  switch (e.art) {
    case "ohne":
      return m.name;
    case "bereich": {
      const von = zahlWert(k.a);
      const bis = zahlWert(k.b);
      if (von != null && bis != null)
        return `${m.name} ${von}–${bis} ${e.einheit}`;
      if (von != null) return `${m.name} ab ${von} ${e.einheit}`;
      if (bis != null) return `${m.name} bis ${bis} ${e.einheit}`;
      return `${m.name} (unvollständig)`;
    }
    case "zahl":
      return `${m.name} ${k.a ?? "…"} ${e.einheit}`;
    case "auswahl": {
      const w = e.werte.find((x) => x.wert === k.a);
      return `${m.name}: ${w?.name ?? "…"}`;
    }
    case "text":
      return `${m.name} „${k.a ?? ""}“`;
  }
};

export const selektionText = (s: Selektion) => {
  const teile = s.kriterien.map(kriteriumText);
  const kern = teile.length
    ? teile.join(s.verknuepfung === "und" ? " UND " : " ODER ")
    : "alle Kunden";
  const kanal = KANAELE.find((k) => k.id === s.kanal)?.name ?? "";
  return `${kern} · Kanal: ${kanal}${s.nurEinwilligung ? " · nur mit Werbeeinwilligung" : ""}`;
};

/** Erfolgsquote in Prozent (eine Nachkommastelle), 0 ohne Empfänger. */
export const quote = (kaeufer: number, angeschrieben: number) =>
  angeschrieben > 0 ? Math.round((kaeufer / angeschrieben) * 1000) / 10 : 0;

const csvFeld = (wert: unknown) => {
  const s = String(wert ?? "");
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/**
 * Adressliste (z. B. für Etiketten im Seriendruck von Word): Semikolon,
 * UTF-8 mit BOM, damit Excel die Umlaute erkennt.
 */
export const adresslisteCsv = (kunden: Record<string, unknown>[]) => {
  const spalten = [
    "KundenNummer",
    "Anrede",
    "Vorname",
    "Nachname",
    "Straße",
    "Hausnummer",
    "Postleitzahl",
    "Stadt",
    "Email",
    "Handy",
  ];
  const zeilen = [
    spalten,
    ...kunden.map((k) => spalten.map((s) => String(k[s] ?? ""))),
  ];
  return "﻿" + zeilen.map((z) => z.map(csvFeld).join(";")).join("\r\n");
};
