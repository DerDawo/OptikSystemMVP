/*
 * Glasbestellstatistik (Statistiken): je Monat Gläser, Aufträge und
 * Glasumsatz eines Jahres im Vergleich zum Vorjahr. Daten aus der Funktion
 * glas_statistik_monat; hier nur das Aufbereiten, damit es testbar ist.
 */

export type GlasMonatZeile = {
  jahr: number;
  monat: number;
  auftraege: number;
  glaeser: number;
  umsatz: number | string;
};

export type Kennzahl = "glaeser" | "auftraege" | "umsatz";

export const KENNZAHLEN: { id: Kennzahl; name: string }[] = [
  { id: "glaeser", name: "Gläser" },
  { id: "auftraege", name: "Aufträge" },
  { id: "umsatz", name: "Glasumsatz" },
];

export const MONATE_KURZ = [
  "Jan",
  "Feb",
  "Mär",
  "Apr",
  "Mai",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Okt",
  "Nov",
  "Dez",
];

export type Monatswert = { monat: number; jahr: number; vorjahr: number };

const wert = (z: GlasMonatZeile, k: Kennzahl) => Number(z[k]) || 0;

/** Zwölf Monate mit Wert des Jahres und des Vorjahres (fehlende = 0). */
export const monatsreihe = (
  zeilen: GlasMonatZeile[],
  jahr: number,
  kennzahl: Kennzahl,
): Monatswert[] =>
  Array.from({ length: 12 }, (_, i) => {
    const monat = i + 1;
    const finde = (j: number) =>
      zeilen.find((z) => z.jahr === j && z.monat === monat);
    const a = finde(jahr);
    const v = finde(jahr - 1);
    return {
      monat,
      jahr: a ? wert(a, kennzahl) : 0,
      vorjahr: v ? wert(v, kennzahl) : 0,
    };
  });

/**
 * Summen bis einschließlich `bisMonat` (laufendes Jahr: nur die
 * vergangenen Monate vergleichen) und Veränderung in Prozent (null ohne
 * Vorjahreswert).
 */
export const vergleich = (reihe: Monatswert[], bisMonat = 12) => {
  const teil = reihe.filter((m) => m.monat <= bisMonat);
  const jahr = teil.reduce((s, m) => s + m.jahr, 0);
  const vorjahr = teil.reduce((s, m) => s + m.vorjahr, 0);
  const prozent =
    vorjahr > 0 ? Math.round(((jahr - vorjahr) / vorjahr) * 1000) / 10 : null;
  return { jahr, vorjahr, prozent };
};

/** Obergrenze der Achse: aufgerundet auf eine runde Zahl. */
export const achsenMax = (reihe: Monatswert[]) => {
  const max = Math.max(1, ...reihe.flatMap((m) => [m.jahr, m.vorjahr]));
  const stelle = 10 ** Math.floor(Math.log10(max));
  const schritte = [1, 2, 2.5, 5, 10];
  const faktor = schritte.find((s) => s * stelle >= max) ?? 10;
  return faktor * stelle;
};
