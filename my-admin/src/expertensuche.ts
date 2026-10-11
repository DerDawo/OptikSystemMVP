// Expertensuche wie in Prisma: Bedingungen der Form "brillen.Berater gleich
// Robert Ulm" über Kunden-, Brillen- und Kontaktlinsenfelder. Ergebnis sind
// immer Kunden; Bedingungen auf Aufträgen wirken über eine PostgREST-
// Einbettung mit !inner ("Kunden, die einen passenden Auftrag haben").
import { namensSuchmuster } from "./suchmuster";

export type Tabelle = "kunde" | "brille" | "kontaktlinse";
export type SpaltenTyp = "text" | "zahl" | "datum" | "zeitpunkt" | "bool";

export const TABELLEN: { id: Tabelle; praefix: string }[] = [
  { id: "kunde", praefix: "kunden" },
  { id: "brille", praefix: "brillen" },
  { id: "kontaktlinse", praefix: "kontaktlinsen" },
];

export type Vergleich =
  | "gleich"
  | "ungleich"
  | "groesser"
  | "groesserGleich"
  | "kleiner"
  | "kleinerGleich"
  | "enthaelt"
  | "enthaeltNicht"
  | "beginntMit"
  | "leer"
  | "nichtLeer";

export const VERGLEICHE: {
  id: Vergleich;
  name: string;
  typen: SpaltenTyp[];
}[] = [
  {
    id: "gleich",
    name: "gleich",
    typen: ["text", "zahl", "datum", "zeitpunkt", "bool"],
  },
  {
    id: "ungleich",
    name: "ungleich",
    typen: ["text", "zahl", "datum", "zeitpunkt", "bool"],
  },
  { id: "groesser", name: "größer als", typen: ["zahl", "datum", "zeitpunkt"] },
  {
    id: "groesserGleich",
    name: "größer gleich",
    typen: ["zahl", "datum", "zeitpunkt"],
  },
  { id: "kleiner", name: "kleiner als", typen: ["zahl", "datum", "zeitpunkt"] },
  {
    id: "kleinerGleich",
    name: "kleiner gleich",
    typen: ["zahl", "datum", "zeitpunkt"],
  },
  { id: "enthaelt", name: "enthält", typen: ["text"] },
  { id: "enthaeltNicht", name: "enthält nicht", typen: ["text"] },
  { id: "beginntMit", name: "beginnt mit", typen: ["text"] },
  {
    id: "leer",
    name: "ist leer",
    typen: ["text", "zahl", "datum", "zeitpunkt", "bool"],
  },
  {
    id: "nichtLeer",
    name: "ist nicht leer",
    typen: ["text", "zahl", "datum", "zeitpunkt", "bool"],
  },
];

export type Feld = { tabelle: Tabelle; spalte: string; typ: SpaltenTyp };

export type Bedingung = {
  feld: Feld | null;
  vergleich: Vergleich;
  wert: string;
};

const DATUM = /^\d{4}-\d{2}-\d{2}$/;
const ZEITPUNKT = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/;

// Spaltentyp aus Beispielwerten (erster Wert, der nicht leer ist)
export const spaltenTyp = (werte: unknown[]): SpaltenTyp => {
  const wert = werte.find((w) => w !== null && w !== undefined && w !== "");
  if (typeof wert === "number") return "zahl";
  if (typeof wert === "boolean") return "bool";
  if (typeof wert === "string") {
    if (DATUM.test(wert)) return "datum";
    if (ZEITPUNKT.test(wert)) return "zeitpunkt";
  }
  return "text";
};

// "01.04.2026" -> "2026-04-01"; sonst unverändert
const isoDatum = (eingabe: string) => {
  const m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(eingabe.trim());
  if (!m) return eingabe.trim();
  return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
};

const naechsterTag = (iso: string) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};

export const wertFuerTyp = (eingabe: string, typ: SpaltenTyp) => {
  const roh = eingabe.trim();
  if (typ === "zahl") return roh.replace(/\./g, "").replace(",", ".");
  if (typ === "datum" || typ === "zeitpunkt") return isoDatum(roh);
  if (typ === "bool") return /^(ja|j|true|1|x)$/i.test(roh) ? "true" : "false";
  return roh;
};

// Filtereinträge (ra-data-postgrest-Syntax) für eine Bedingung
export const bedingungFilter = (
  pfad: string,
  vergleich: Vergleich,
  eingabe: string,
  typ: SpaltenTyp,
): Record<string, string> => {
  if (vergleich === "leer") return { [`${pfad}@is`]: "null" };
  if (vergleich === "nichtLeer") return { [`${pfad}@not.is`]: "null" };
  const wert = wertFuerTyp(eingabe, typ);
  if (!wert) return {};
  // Zeitpunkte (z. B. angelegt am): "gleich" meint den ganzen Tag
  if (typ === "zeitpunkt" && DATUM.test(wert)) {
    if (vergleich === "gleich")
      return { [`${pfad}@gte`]: wert, [`${pfad}@lt`]: naechsterTag(wert) };
    if (vergleich === "groesser")
      return { [`${pfad}@gte`]: naechsterTag(wert) };
    if (vergleich === "kleinerGleich")
      return { [`${pfad}@lt`]: naechsterTag(wert) };
  }
  switch (vergleich) {
    case "gleich":
      return { [`${pfad}@eq`]: wert };
    case "ungleich":
      return { [`${pfad}@neq`]: wert };
    case "groesser":
      return { [`${pfad}@gt`]: wert };
    case "groesserGleich":
      return { [`${pfad}@gte`]: wert };
    case "kleiner":
      return { [`${pfad}@lt`]: wert };
    case "kleinerGleich":
      return { [`${pfad}@lte`]: wert };
    case "enthaelt":
      return { [`${pfad}@imatch`]: namensSuchmuster(wert) };
    case "enthaeltNicht":
      return { [`${pfad}@not.imatch`]: namensSuchmuster(wert) };
    case "beginntMit":
      return { [`${pfad}@imatch`]: `^${namensSuchmuster(wert)}` };
  }
  return {};
};

const braucheWert = (v: Vergleich) => v !== "leer" && v !== "nichtLeer";

export const istVollstaendig = (b: Bedingung) =>
  Boolean(b.feld) && (!braucheWert(b.vergleich) || b.wert.trim() !== "");

// Alle Bedingungen (und-verknüpft) als Kundenfilter plus die nötigen
// Einbettungen für die Abfrage (meta.columns)
export const expertenAbfrage = (bedingungen: Bedingung[]) => {
  const filter: Record<string, string> = {};
  const einbettungen = new Set<Tabelle>();
  for (const b of bedingungen) {
    if (!b.feld || !istVollstaendig(b)) continue;
    const pfad =
      b.feld.tabelle === "kunde"
        ? b.feld.spalte
        : `${b.feld.tabelle}.${b.feld.spalte}`;
    if (b.feld.tabelle !== "kunde") einbettungen.add(b.feld.tabelle);
    Object.assign(
      filter,
      bedingungFilter(pfad, b.vergleich, b.wert, b.feld.typ),
    );
  }
  const spalten = [
    "*",
    ...[...einbettungen].map((tabelle) => `${tabelle}!inner(id)`),
  ];
  return { filter, spalten };
};
