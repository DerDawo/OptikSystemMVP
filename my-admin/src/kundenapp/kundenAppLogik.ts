import dayjs from "dayjs";
import { auftragsPhase } from "../auftragsverfolgung";

/*
 * Reine Regeln der Kunden-App (kunde.html) und der Einladung in UNICORN:
 * Link mit Schlüssel, Auftragsstatus in Kundensprache, Rechnungsliste,
 * Einladungstext. Die Daten kommen aus der Funktion portal_daten.
 */

export type Glas = {
  Sph?: number | null;
  Cyl?: number | null;
  A?: number | null;
  Add?: number | null;
  Pr?: number | null;
  B?: number | null;
  PD?: number | null;
} | null;

export type PortalBrille = {
  id: number;
  Datum?: string | null;
  BrillenArt?: string | null;
  Bestellt?: string | null;
  Fertig?: string | null;
  Abholung?: string | null;
  Rechnungsnummer?: string | null;
  Summe?: number | null;
  Anzahlung?: number | null;
  KKAnteil?: number | null;
  Restbetrag?: number | null;
  Zahlungsstatus?: string | null;
  glasRechts?: Glas;
  glasLinks?: Glas;
};

export type PortalLinse = {
  id: number;
  Datum?: string | null;
  Linsenart?: string | null;
  Abholung?: string | null;
  Nachkontrolltermin?: string | null;
  Rechnungsnummer?: string | null;
  Summe?: number | null;
  Anzahlung?: number | null;
  KKAnteil?: number | null;
  Zahlungsstatus?: string | null;
  Zahlungsdatum?: string | null;
  [feld: string]: unknown;
};

export type PortalTermin = {
  id: number;
  Start: string;
  Ende: string;
  Terminart?: string | null;
  absage_angefragt?: boolean;
};

export type PortalAnfrage = {
  id: number;
  Start: string;
  Ende: string;
  terminart: string;
  status: string;
};

export type PortalNachricht = {
  id: number;
  created_at: string;
  von_kunde: boolean;
  art: string;
  text: string;
  erledigt: boolean;
};

export type PortalKunde = {
  Anrede?: string | null;
  Vorname?: string | null;
  Nachname?: string | null;
  Email?: string | null;
  Handy?: string | null;
  Werbeeinwilligung?: boolean;
  WerbeeinwilligungFuer?: string | null;
  Kontaktweg?: string | null;
};

export type PortalDaten = {
  betrieb: Record<string, string | null> | null;
  kunde: PortalKunde | null;
  termine: PortalTermin[];
  anfragen: PortalAnfrage[];
  brillen: PortalBrille[];
  kontaktlinsen: PortalLinse[];
  nachrichten: PortalNachricht[];
};

// --- Link -------------------------------------------------------------------

// Der Schlüssel steht hinter dem #, damit er nie an einen Server (Protokolle)
// geschickt wird: https://…/kunde#e=<schluessel>
export const einladungsLink = (basis: string, schluessel: string) =>
  `${basis.replace(/\/+$/, "")}/kunde#e=${schluessel}`;

export const schluesselAusHash = (hash: string): string | null => {
  const treffer = /(?:^#|&)e=([0-9a-f]{40,128})(?:&|$)/i.exec(hash);
  return treffer ? treffer[1].toLowerCase() : null;
};

// Geburtsdatum aus der Eingabe "17.04.1998", "17.4.98" oder "1998-04-17"
export const geburtsdatumLesen = (eingabe: string): string | null => {
  const t = eingabe.trim();
  let tag: number, monat: number, jahr: number;
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t);
  const de = /^(\d{1,2})[./ -](\d{1,2})[./ -](\d{2}|\d{4})$/.exec(t);
  if (iso) {
    [jahr, monat, tag] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  } else if (de) {
    [tag, monat, jahr] = [Number(de[1]), Number(de[2]), Number(de[3])];
    if (de[3].length === 2) {
      const heute = new Date().getFullYear() % 100;
      jahr += jahr > heute ? 1900 : 2000;
    }
  } else {
    return null;
  }
  const d = new Date(Date.UTC(jahr, monat - 1, tag));
  if (
    d.getUTCFullYear() !== jahr ||
    d.getUTCMonth() !== monat - 1 ||
    d.getUTCDate() !== tag ||
    jahr < 1900
  ) {
    return null;
  }
  return `${jahr}-${String(monat).padStart(2, "0")}-${String(tag).padStart(2, "0")}`;
};

// --- Auftragsstatus ---------------------------------------------------------

export type KundenStatus = {
  schritt: 0 | 1 | 2 | 3;
  text: string;
  farbe: "warning" | "primary" | "info" | "success";
};

export const STATUS_SCHRITTE = [
  "Angenommen",
  "Bestellt",
  "Abholbereit",
  "Abgeholt",
];

export const brillenStatus = (
  b: PortalBrille,
  heute = dayjs(),
): KundenStatus => {
  switch (auftragsPhase(b, heute)) {
    case "abgeholt":
      return { schritt: 3, text: "Abgeholt", farbe: "success" };
    case "fertig":
      return { schritt: 2, text: "Abholbereit", farbe: "info" };
    case "bestellt":
      return { schritt: 1, text: "In Arbeit", farbe: "primary" };
    default:
      return { schritt: 0, text: "Auftrag angenommen", farbe: "warning" };
  }
};

// Kontaktlinsen laufen nur über "Abholung" (wie in orderStatus.tsx)
export const linsenStatus = (l: PortalLinse, heute = dayjs()): KundenStatus => {
  const abholung = l.Abholung ? dayjs(l.Abholung) : null;
  if (abholung?.isValid() && !abholung.isAfter(heute, "day")) {
    return { schritt: 3, text: "Abgeholt", farbe: "success" };
  }
  if (abholung?.isValid()) {
    return { schritt: 2, text: "Abholbereit", farbe: "info" };
  }
  return { schritt: 1, text: "In Arbeit", farbe: "primary" };
};

// laufende Aufträge (noch nicht abgeholt), neueste zuerst
export const laufendeAuftraege = (d: PortalDaten, heute = dayjs()) => [
  ...d.brillen
    .filter((b) => brillenStatus(b, heute).schritt < 3)
    .map((b) => ({
      art: "Brille" as const,
      id: b.id,
      titel: b.BrillenArt || "Brille",
      datum: b.Datum ?? null,
      status: brillenStatus(b, heute),
    })),
  ...d.kontaktlinsen
    .filter((l) => linsenStatus(l, heute).schritt < 3)
    .map((l) => ({
      art: "Kontaktlinsen" as const,
      id: l.id,
      titel: l.Linsenart || "Kontaktlinsen",
      datum: l.Datum ?? null,
      status: linsenStatus(l, heute),
    })),
];

// --- Rechnungen -------------------------------------------------------------

export type KundenRechnung = {
  schluessel: string;
  art: "Brille" | "Kontaktlinsen";
  nummer: string;
  datum: string | null;
  betrag: number;
  offen: number;
  status: "bezahlt" | "offen" | "teilweise" | "kasse";
  statusText: string;
};

const zahl = (w: unknown) => {
  const n = typeof w === "string" ? Number(w) : w;
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
};

const rund = (n: number) => Math.round(n * 100) / 100;

const rechnungsStatus = (
  zahlungsstatus: string | null | undefined,
  offen: number,
): Pick<KundenRechnung, "status" | "statusText"> => {
  const s = (zahlungsstatus ?? "").trim().toLowerCase();
  if (s === "bezahlt" || (!s && offen <= 0)) {
    return { status: "bezahlt", statusText: "Bezahlt" };
  }
  if (s === "versicherung") {
    return { status: "kasse", statusText: "Über Versicherung" };
  }
  if (s === "ratenzahlung") {
    return { status: "teilweise", statusText: "Ratenzahlung" };
  }
  if (s === "teilweise offen") {
    return { status: "teilweise", statusText: "Teilweise bezahlt" };
  }
  return { status: "offen", statusText: "Offen" };
};

export const kundenRechnungen = (d: PortalDaten): KundenRechnung[] => {
  const liste: KundenRechnung[] = [];
  for (const b of d.brillen) {
    if (!b.Rechnungsnummer) continue;
    const betrag = rund(zahl(b.Summe));
    const offen =
      b.Restbetrag !== null && b.Restbetrag !== undefined
        ? rund(zahl(b.Restbetrag))
        : rund(betrag - zahl(b.Anzahlung) - zahl(b.KKAnteil));
    liste.push({
      schluessel: `b${b.id}`,
      art: "Brille",
      nummer: b.Rechnungsnummer,
      datum: b.Datum ?? null,
      betrag,
      offen:
        (b.Zahlungsstatus ?? "").toLowerCase() === "bezahlt"
          ? 0
          : Math.max(offen, 0),
      ...rechnungsStatus(b.Zahlungsstatus, offen),
    });
  }
  for (const l of d.kontaktlinsen) {
    if (!l.Rechnungsnummer) continue;
    const betrag = rund(zahl(l.Summe));
    const bezahlt =
      (l.Zahlungsstatus ?? "").toLowerCase() === "bezahlt" || !!l.Zahlungsdatum;
    const offen = bezahlt
      ? 0
      : rund(betrag - zahl(l.Anzahlung) - zahl(l.KKAnteil));
    liste.push({
      schluessel: `l${l.id}`,
      art: "Kontaktlinsen",
      nummer: l.Rechnungsnummer,
      datum: l.Datum ?? null,
      betrag,
      offen: Math.max(offen, 0),
      ...rechnungsStatus(bezahlt ? "bezahlt" : l.Zahlungsstatus, offen),
    });
  }
  return liste.sort((a, b) =>
    String(b.datum ?? "").localeCompare(String(a.datum ?? "")),
  );
};

export const euro = (n: number) =>
  n.toLocaleString("de-DE", { style: "currency", currency: "EUR" });

// --- Termine ----------------------------------------------------------------

export const kommendeTermine = (d: PortalDaten, jetzt = new Date()) =>
  d.termine
    .filter((t) => new Date(t.Ende || t.Start) >= jetzt)
    .sort((a, b) => a.Start.localeCompare(b.Start));

export const vergangeneTermine = (d: PortalDaten, jetzt = new Date()) =>
  d.termine
    .filter((t) => new Date(t.Ende || t.Start) < jetzt)
    .sort((a, b) => b.Start.localeCompare(a.Start));

// --- Einwilligung -----------------------------------------------------------

export const WERBE_KANAELE = ["E-Mail", "SMS", "WhatsApp", "Post"] as const;

export const KONTAKTWEGE = [
  { wert: "WhatsApp", name: "WhatsApp" },
  { wert: "SMS", name: "SMS" },
  { wert: "eMail", name: "E-Mail" },
  { wert: "Telefon", name: "Anruf" },
] as const;

// gespeicherte Kanäle aus "Angebote per E-Mail, SMS (Kunden-App)" oder dem
// Freitext aus UNICORN ("Newsletter" = E-Mail)
export const kanaeleAusText = (text: string | null | undefined): string[] => {
  const t = (text ?? "").toLowerCase();
  const kanaele: string[] = [];
  if (/e-?mail|newsletter/.test(t)) kanaele.push("E-Mail");
  if (/\bsms\b/.test(t)) kanaele.push("SMS");
  if (/whats\s?app/.test(t)) kanaele.push("WhatsApp");
  if (/\bpost\b|brief/.test(t)) kanaele.push("Post");
  return kanaele;
};

// --- Einladung --------------------------------------------------------------

const anrede = (k: { Anrede?: unknown; Nachname?: unknown }) => {
  const a = String(k.Anrede ?? "").trim();
  const n = String(k.Nachname ?? "").trim();
  if (a === "Frau" && n) return `Liebe Frau ${n}`;
  if (a === "Herr" && n) return `Lieber Herr ${n}`;
  return "Guten Tag";
};

export const einladungsText = (
  kunde: { Anrede?: unknown; Nachname?: unknown },
  link: string,
  firma: string,
) =>
  [
    `${anrede(kunde)},`,
    "",
    `ab sofort finden Sie Ihre Brillenwerte, Termine, Aufträge und Rechnungen in unserer Kunden-App. Sie können uns dort auch direkt schreiben.`,
    "",
    `Ihr persönlicher Zugang: ${link}`,
    "",
    "Beim ersten Öffnen bestätigen Sie bitte Ihr Geburtsdatum. Bitte geben Sie den Link nicht weiter.",
    "",
    `Ihr Team von ${firma}`,
  ].join("\n");
