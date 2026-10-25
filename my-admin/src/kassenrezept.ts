// Abgerechnete Kassenrezepte (Tabelle kassenrezept): Hilfsfunktionen ohne
// React, damit sie sich testen lassen. Grundlage sind die Rezeptübersichten
// (Sammelabrechnung) des Abrechnungsdienstleisters, eine Zeile je Rezept.

export type Leistung = {
  pzn: string;
  text: string;
  faktor: number;
  netto: number;
  brutto: number;
  zuzahlung: number;
  mwst: number;
};

type Betrag = number | string | null;

export type Kassenrezept = {
  id: number;
  created_at: string;
  kunde_id: number | null;
  Abrechnungsmonat: string; // JJJJ-MM
  Abrechnungsdatum: string | null;
  Belegnummer: string;
  Nachname: string | null;
  Vorname: string | null;
  Geburtsdatum: string | null;
  Versichertennummer: string | null;
  Krankenkasse: string | null;
  Rezeptdatum: string | null;
  Leistungen: Leistung[] | null;
  Netto: Betrag;
  MwSt: Betrag;
  Brutto: Betrag;
  Zuzahlung: Betrag;
  Bemerkung: string | null;
};

export const zahl = (w: Betrag | undefined) => {
  const n = typeof w === "number" ? w : Number(w ?? 0);
  return Number.isNaN(n) ? 0 : n;
};

const runde = (n: number) => Math.round(n * 100) / 100;

/** Kassenanteil = Brutto minus Zuzahlung des Versicherten. */
export const kassenanteil = (r: Kassenrezept) =>
  runde(zahl(r.Brutto) - zahl(r.Zuzahlung));

export type Summen = {
  anzahl: number;
  netto: number;
  mwst: number;
  brutto: number;
  zuzahlung: number;
  kassenanteil: number;
};

export const rezeptSummen = (liste: Kassenrezept[]): Summen => {
  let netto = 0;
  let mwst = 0;
  let brutto = 0;
  let zuzahlung = 0;
  for (const r of liste) {
    netto += zahl(r.Netto);
    mwst += zahl(r.MwSt);
    brutto += zahl(r.Brutto);
    zuzahlung += zahl(r.Zuzahlung);
  }
  return {
    anzahl: liste.length,
    netto: runde(netto),
    mwst: runde(mwst),
    brutto: runde(brutto),
    zuzahlung: runde(zuzahlung),
    kassenanteil: runde(brutto - zuzahlung),
  };
};

const MONATE = [
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

/** "2026-03" wird zu "03/2026". */
export const monatKurz = (monat: string) => {
  const [j, m] = monat.split("-");
  return j && m ? `${m}/${j}` : monat;
};

/** "2026-03" wird zu "März 2026". */
export const monatName = (monat: string) => {
  const [j, m] = monat.split("-");
  const name = MONATE[Number(m) - 1];
  return name && j ? `${name} ${j}` : monat;
};

export type MonatsZeile = Summen & { monat: string };

/** Summen je Abrechnungsmonat, aufsteigend nach Monat. */
export const nachMonat = (liste: Kassenrezept[]): MonatsZeile[] => {
  const gruppen = new Map<string, Kassenrezept[]>();
  for (const r of liste) {
    const g = gruppen.get(r.Abrechnungsmonat) ?? [];
    g.push(r);
    gruppen.set(r.Abrechnungsmonat, g);
  }
  return [...gruppen.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([monat, rs]) => ({ monat, ...rezeptSummen(rs) }));
};

/** Monate zwischen dem ersten und letzten vorhandenen, zu denen keine Abrechnung vorliegt. */
export const fehlendeMonate = (vorhanden: string[]): string[] => {
  const sortiert = [...new Set(vorhanden)].sort();
  if (sortiert.length < 2) return [];
  const [j0, m0] = sortiert[0].split("-").map(Number);
  const [j1, m1] = sortiert[sortiert.length - 1].split("-").map(Number);
  const menge = new Set(sortiert);
  const fehlt: string[] = [];
  let j = j0;
  let m = m0;
  while (j < j1 || (j === j1 && m <= m1)) {
    const key = `${j}-${String(m).padStart(2, "0")}`;
    if (!menge.has(key)) fehlt.push(key);
    m += 1;
    if (m > 12) {
      m = 1;
      j += 1;
    }
  }
  return fehlt;
};

export type KassenZeile = Summen & { kasse: string };

/** Summen je Krankenkasse, größter Betrag zuerst. */
export const nachKasse = (liste: Kassenrezept[]): KassenZeile[] => {
  const gruppen = new Map<string, Kassenrezept[]>();
  for (const r of liste) {
    const k = r.Krankenkasse?.trim() || "(ohne Angabe)";
    const g = gruppen.get(k) ?? [];
    g.push(r);
    gruppen.set(k, g);
  }
  return [...gruppen.entries()]
    .map(([kasse, rs]) => ({ kasse, ...rezeptSummen(rs) }))
    .sort(
      (a, b) => b.brutto - a.brutto || a.kasse.localeCompare(b.kasse, "de"),
    );
};

/** Anzeigename "Nachname, Vorname". */
export const personText = (r: Pick<Kassenrezept, "Nachname" | "Vorname">) =>
  [r.Nachname, r.Vorname].filter(Boolean).join(", ") || "(ohne Name)";

const personKey = (r: Kassenrezept) =>
  r.Versichertennummer?.trim() ||
  `${r.Nachname ?? ""}|${r.Vorname ?? ""}|${r.Geburtsdatum ?? ""}`.toLowerCase();

/**
 * Rezepte, die für dieselbe Person mit demselben Rezeptdatum mehrfach
 * abgerechnet wurden (Neuabrechnung nach Absetzung oder Doppelabrechnung).
 * Liefert die IDs aller beteiligten Rezepte.
 */
export const doppelteIds = (liste: Kassenrezept[]): Set<number> => {
  const gruppen = new Map<string, Kassenrezept[]>();
  for (const r of liste) {
    if (!r.Rezeptdatum) continue;
    const key = `${personKey(r)}#${r.Rezeptdatum}`;
    const g = gruppen.get(key) ?? [];
    g.push(r);
    gruppen.set(key, g);
  }
  const ids = new Set<number>();
  for (const g of gruppen.values()) {
    if (g.length > 1) g.forEach((r) => ids.add(r.id));
  }
  return ids;
};

/** "2× Einstärkengläser sphärisch; Elektronische Lupe" */
export const leistungenText = (r: Kassenrezept): string => {
  const zaehler = new Map<string, number>();
  for (const l of r.Leistungen ?? []) {
    zaehler.set(l.text, (zaehler.get(l.text) ?? 0) + 1);
  }
  return [...zaehler.entries()]
    .map(([text, n]) => (n > 1 ? `${n}× ${text}` : text))
    .join("; ");
};

export type RezeptFilter = {
  monat: string; // "" = alle
  kasse: string; // "" = alle
  suche: string;
  nurAuffaellig: boolean;
};

export const leererFilter: RezeptFilter = {
  monat: "",
  kasse: "",
  suche: "",
  nurAuffaellig: false,
};

const norm = (t: string) =>
  t
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss");

export const filtereRezepte = (
  liste: Kassenrezept[],
  f: RezeptFilter,
  doppelt: Set<number>,
): Kassenrezept[] => {
  const woerter = norm(f.suche.trim()).split(/\s+/).filter(Boolean);
  return liste.filter((r) => {
    if (f.monat && r.Abrechnungsmonat !== f.monat) return false;
    if (f.kasse && (r.Krankenkasse?.trim() || "(ohne Angabe)") !== f.kasse) {
      return false;
    }
    if (f.nurAuffaellig && !doppelt.has(r.id)) return false;
    if (woerter.length > 0) {
      const heu = norm(
        [
          r.Nachname,
          r.Vorname,
          r.Belegnummer,
          r.Versichertennummer,
          r.Krankenkasse,
        ]
          .filter(Boolean)
          .join(" "),
      );
      if (!woerter.every((w) => heu.includes(w))) return false;
    }
    return true;
  });
};

/** Neueste Rezepte zuerst: nach Abrechnungsmonat, dann Rezeptdatum. */
export const sortiereRezepte = (liste: Kassenrezept[]) =>
  [...liste].sort((a, b) => {
    if (a.Abrechnungsmonat !== b.Abrechnungsmonat) {
      return a.Abrechnungsmonat < b.Abrechnungsmonat ? 1 : -1;
    }
    const da = a.Rezeptdatum ?? "";
    const db = b.Rezeptdatum ?? "";
    if (da !== db) return da < db ? 1 : -1;
    return a.Belegnummer < b.Belegnummer ? 1 : -1;
  });

const datumDe = (w: string | null) => {
  if (!w) return "";
  const [j, m, t] = w.slice(0, 10).split("-");
  return j && m && t ? `${t}.${m}.${j}` : w;
};

const betragDe = (n: number) => n.toFixed(2).replace(".", ",");

/** CSV für Excel (Semikolon, Dezimalkomma, UTF-8 mit Markierung). */
export const csvAus = (liste: Kassenrezept[]): string => {
  const kopf = [
    "Abrechnung",
    "Belegnummer",
    "Nachname",
    "Vorname",
    "Geburtsdatum",
    "Versichertennummer",
    "Krankenkasse",
    "Rezeptdatum",
    "Leistungen",
    "Netto",
    "MwSt",
    "Brutto",
    "Zuzahlung",
    "Kassenanteil",
  ];
  const zelle = (t: string) =>
    /[";\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  const zeilen = liste.map((r) =>
    [
      monatKurz(r.Abrechnungsmonat),
      r.Belegnummer,
      r.Nachname ?? "",
      r.Vorname ?? "",
      datumDe(r.Geburtsdatum),
      r.Versichertennummer ?? "",
      r.Krankenkasse ?? "",
      datumDe(r.Rezeptdatum),
      leistungenText(r),
      betragDe(zahl(r.Netto)),
      betragDe(zahl(r.MwSt)),
      betragDe(zahl(r.Brutto)),
      betragDe(zahl(r.Zuzahlung)),
      betragDe(kassenanteil(r)),
    ]
      .map(zelle)
      .join(";"),
  );
  return "﻿" + [kopf.join(";"), ...zeilen].join("\r\n");
};
