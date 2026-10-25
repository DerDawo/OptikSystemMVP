// Brillenversicherungen in der Kundenkartei (Tabelle kunde_brillenversicherung):
// Hilfsfunktionen ohne React, damit sie sich testen lassen. Die Felder
// entsprechen der Vergütungsübersicht des Versicherungspartners.

export const VERSICHERUNG_STATUS = [
  "Ausstehend",
  "Ausgezahlt",
  "Storniert",
] as const;

export type VersicherungStatus = (typeof VERSICHERUNG_STATUS)[number];

// Tarife des Partners; in der Eingabe sind auch andere Tarife möglich.
export const VERSICHERUNG_TARIFE = [
  "BP100",
  "BP200",
  "BP250",
  "BP300",
  "BP400",
  "BP600",
  "BP700",
  "BP800",
];

export type Brillenversicherung = {
  id: number;
  created_at: string;
  kunde_id: number;
  VersichertePerson: string | null;
  Tarif: string;
  Vertragsnummer: string | null;
  Vertragsbeginn: string | null;
  Vertragsende: string | null;
  Verguetung: number | string | null;
  Status: VersicherungStatus;
  Gemeldet: string;
  Abgetreten: boolean;
  Bemerkung: string | null;
};

/** Eingabefelder im Dialog (alles Text, damit Tippen frei bleibt). */
export type VersicherungEntwurf = {
  VersichertePerson: string;
  Tarif: string;
  Vertragsnummer: string;
  Vertragsbeginn: string;
  Vertragsende: string;
  Verguetung: string;
  Status: VersicherungStatus;
  Gemeldet: string;
  Abgetreten: boolean;
  Bemerkung: string;
};

export const leererEntwurf = (heute: string): VersicherungEntwurf => ({
  VersichertePerson: "",
  Tarif: "",
  Vertragsnummer: "",
  Vertragsbeginn: "",
  Vertragsende: "",
  Verguetung: "",
  Status: "Ausstehend",
  Gemeldet: heute,
  Abgetreten: false,
  Bemerkung: "",
});

const betragText = (wert: number | string | null | undefined) => {
  if (wert === null || wert === undefined || wert === "") return "";
  const n = typeof wert === "number" ? wert : Number(wert);
  return Number.isNaN(n) ? "" : n.toFixed(2).replace(".", ",");
};

export const entwurfAus = (v: Brillenversicherung): VersicherungEntwurf => ({
  VersichertePerson: v.VersichertePerson ?? "",
  Tarif: v.Tarif,
  Vertragsnummer: v.Vertragsnummer ?? "",
  Vertragsbeginn: v.Vertragsbeginn ?? "",
  Vertragsende: v.Vertragsende ?? "",
  Verguetung: betragText(v.Verguetung),
  Status: v.Status,
  Gemeldet: v.Gemeldet,
  Abgetreten: v.Abgetreten,
  Bemerkung: v.Bemerkung ?? "",
});

/**
 * Betrag aus der Eingabe: "26,17", "26.17", "1.234,56". Leer ergibt null,
 * Ungültiges und Negatives ergibt NaN.
 */
export const parseBetrag = (eingabe: string): number | null => {
  const t = eingabe.replace(/[€\s]/g, "");
  if (t === "") return null;
  let zahl = t;
  if (t.includes(",")) {
    zahl = t.replace(/\./g, "").replace(",", ".");
  } else if ((t.match(/\./g) ?? []).length > 1) {
    zahl = t.replace(/\./g, "");
  }
  if (!/^\d+(\.\d{1,2})?$/.test(zahl)) return Number.NaN;
  return Math.round(Number(zahl) * 100) / 100;
};

export type VersicherungFehler = Partial<
  Record<"Tarif" | "Verguetung" | "Vertragsende", string>
>;

export const pruefeEntwurf = (e: VersicherungEntwurf): VersicherungFehler => {
  const fehler: VersicherungFehler = {};
  if (e.Tarif.trim() === "") fehler.Tarif = "Tarif eintragen, z. B. BP250.";
  if (Number.isNaN(parseBetrag(e.Verguetung))) {
    fehler.Verguetung = "Betrag in Euro, z. B. 26,17.";
  }
  if (e.Vertragsbeginn && e.Vertragsende && e.Vertragsende < e.Vertragsbeginn) {
    fehler.Vertragsende = "Ende liegt vor dem Beginn.";
  }
  return fehler;
};

/** Zeile für die Datenbank (leere Felder werden zu null). */
export const zeileAusEntwurf = (e: VersicherungEntwurf) => {
  const leerNull = (t: string) => (t.trim() === "" ? null : t.trim());
  return {
    VersichertePerson: leerNull(e.VersichertePerson),
    Tarif: e.Tarif.trim().toUpperCase(),
    Vertragsnummer: leerNull(e.Vertragsnummer),
    Vertragsbeginn: e.Vertragsbeginn || null,
    Vertragsende: e.Vertragsende || null,
    Verguetung: parseBetrag(e.Verguetung),
    Status: e.Status,
    Gemeldet: e.Gemeldet,
    Abgetreten: e.Abgetreten,
    Bemerkung: leerNull(e.Bemerkung),
  };
};

const zahl = (w: number | string | null) => {
  const n = typeof w === "number" ? w : Number(w ?? 0);
  return Number.isNaN(n) ? 0 : n;
};

/** Anzahl und Summen; stornierte Verträge zählen nicht zur Vergütung. */
export const versicherungSummen = (liste: Brillenversicherung[]) => {
  const summe = { ausstehend: 0, ausgezahlt: 0, storniert: 0 };
  let aktiv = 0;
  for (const v of liste) {
    const betrag = zahl(v.Verguetung);
    if (v.Status === "Ausstehend") summe.ausstehend += betrag;
    else if (v.Status === "Ausgezahlt") summe.ausgezahlt += betrag;
    else summe.storniert += betrag;
    if (v.Status !== "Storniert") aktiv += 1;
  }
  const runde = (n: number) => Math.round(n * 100) / 100;
  return {
    anzahl: liste.length,
    aktiv,
    ausstehend: runde(summe.ausstehend),
    ausgezahlt: runde(summe.ausgezahlt),
    storniert: runde(summe.storniert),
  };
};

/** Neueste Verträge zuerst: nach Vertragsbeginn, ohne Beginn ganz oben. */
export const sortiereVersicherungen = (liste: Brillenversicherung[]) =>
  [...liste].sort((a, b) => {
    const ka = a.Vertragsbeginn ?? "9999-12-31";
    const kb = b.Vertragsbeginn ?? "9999-12-31";
    if (ka !== kb) return ka < kb ? 1 : -1;
    return b.created_at < a.created_at
      ? -1
      : b.created_at > a.created_at
        ? 1
        : 0;
  });

/** "Versicherte Person" leer = der Kunde selbst. */
export const versichertePersonText = (v: Brillenversicherung) =>
  v.VersichertePerson?.trim() || "Kunde selbst";
