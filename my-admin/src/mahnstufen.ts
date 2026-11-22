// Mahnstufen eines Auftrags (Spalte brille."Mahnstufe", 0 bis 3) und was der
// nächste Klick in der Mahnliste erzeugt. Erste Stufe ist die freundliche
// Zahlungserinnerung, danach 1. Mahnung und 2. Mahnung (Inkasso-Ankündigung).
// Die Namen entsprechen den Vorlagen der Kategorie "Mahnung"
// (20261019100000_mahnung_briefkopf_texte.sql).

export const MAX_MAHNSTUFE = 3;

export const MAHNUNG_VORLAGE_NACH_STUFE: Record<number, string> = {
  1: "Zahlungserinnerung",
  2: "1. Mahnung",
  3: "2. Mahnung (Inkasso-Ankündigung)",
};

// Kurzname je Stufe für die Spalte "Mahnstufe" und die Knöpfe
const KURZNAME_NACH_STUFE: Record<number, string> = {
  1: "Zahlungserinnerung",
  2: "1. Mahnung",
  3: "2. Mahnung",
};

export const normalisiereMahnstufe = (wert: unknown): number => {
  const zahl = Math.trunc(Number(wert));
  if (!Number.isFinite(zahl) || zahl < 0) return 0;
  return Math.min(zahl, MAX_MAHNSTUFE);
};

// Text für die Spalte "Mahnstufe": was zuletzt verschickt wurde
export const mahnstufeText = (mahnstufe: unknown): string => {
  const stufe = normalisiereMahnstufe(mahnstufe);
  return stufe === 0 ? "noch nichts" : KURZNAME_NACH_STUFE[stufe];
};

// Stufe, die der nächste Klick vergibt (bei 3 bleibt es bei 3, die
// 2. Mahnung wird dann erneut geöffnet; so zählt auch increment_mahnstufe)
export const naechsteMahnstufe = (mahnstufe: unknown): number =>
  Math.min(normalisiereMahnstufe(mahnstufe) + 1, MAX_MAHNSTUFE);

// Beschriftung des Knopfs, abhängig von der aktuellen Stufe
export const mahnKnopfText = (mahnstufe: unknown): string => {
  const aktuell = normalisiereMahnstufe(mahnstufe);
  if (aktuell >= MAX_MAHNSTUFE) return "2. Mahnung erneut";
  return KURZNAME_NACH_STUFE[naechsteMahnstufe(aktuell)];
};

// Zahlungserinnerung (erste Stufe) wird freundlicher dargestellt als Mahnungen
export const istZahlungserinnerung = (mahnstufe: unknown): boolean =>
  normalisiereMahnstufe(mahnstufe) === 0;

export const vorlageFuerStufe = (stufe: unknown): string =>
  MAHNUNG_VORLAGE_NACH_STUFE[normalisiereMahnstufe(stufe) || 1];
