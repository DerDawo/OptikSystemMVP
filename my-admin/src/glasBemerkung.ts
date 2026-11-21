/*
 * "Bemerkung zum Glas" (glastyp.Sonstiges): Freitext wie "1.500, 100077".
 * Häufige Zusätze lassen sich per Auswahl an- und abhaken; sie werden mit
 * Komma an den vorhandenen Text gehängt bzw. wieder herausgenommen, der
 * übrige Text bleibt unverändert.
 */

export const GLAS_ZUSAETZE = [
  "Sondercurve",
  "Extra Durchmesser",
  "Mustertönung",
] as const;

const teile = (text: string) =>
  text
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

const gleich = (a: string, b: string) =>
  a.localeCompare(b, "de", { sensitivity: "base" }) === 0;

/** Steht der Zusatz schon in der Bemerkung (Groß-/Kleinschreibung egal)? */
export const hatZusatz = (text: unknown, zusatz: string) =>
  teile(String(text ?? "")).some((t) => gleich(t, zusatz));

/** Zusatz anhängen oder, wenn schon vorhanden, herausnehmen. */
export const zusatzUmschalten = (text: unknown, zusatz: string): string => {
  const liste = teile(String(text ?? ""));
  const ohne = liste.filter((t) => !gleich(t, zusatz));
  return (ohne.length < liste.length ? ohne : [...liste, zusatz]).join(", ");
};

/*
 * Feld "Farbe" (Tönung): Auswahl aus den bisher bestellten Tönungen, die
 * häufigsten zuerst (Ansicht glas_farbe_haeufigkeit). Darunter gängige
 * Tönungen, die noch nie eingetragen wurden. Freie Eingabe bleibt möglich.
 */
export const STANDARD_TOENUNGEN = [
  "Grau 85%",
  "Braun 85%",
  "Grün 85%",
  "Grau 75%",
  "Braun 75%",
  "Grau 50%",
  "Braun 50%",
  "Grau 25%",
  "Braun 25%",
  "Grau 15%",
  "Braun 15%",
  "Grau verlaufend 85-15%",
  "Braun verlaufend 85-15%",
  "Grau verlaufend 25-0%",
  "Braun verlaufend 25-0%",
  "Grau phototrop",
  "Braun phototrop",
  "Grün phototrop",
  "Grau polarisierend",
  "Braun polarisierend",
  "Kantenfilter 450nm",
  "Kantenfilter 480nm",
  "Kantenfilter 511nm",
  "Gelb (Kontrast)",
  "Rosé 15%",
  "Blau 15%",
] as const;

export type FarbeHaeufigkeit = { Farbe: string; Anzahl: number };

const schluessel = (farbe: string) =>
  farbe.trim().replace(/\s+/g, " ").toLowerCase();

/** Häufig bestellte zuerst, danach noch nicht verwendete Standard-Tönungen. */
export const farbVorschlaege = (
  haeufig: FarbeHaeufigkeit[],
  max = 200,
): string[] => {
  const gesehen = new Set<string>();
  const liste: string[] = [];
  const nimm = (farbe: string) => {
    const k = schluessel(farbe);
    if (!k || gesehen.has(k)) return;
    gesehen.add(k);
    liste.push(farbe.trim().replace(/\s+/g, " "));
  };
  [...haeufig]
    .sort((a, b) => b.Anzahl - a.Anzahl || a.Farbe.localeCompare(b.Farbe, "de"))
    .slice(0, max)
    .forEach((h) => nimm(h.Farbe));
  STANDARD_TOENUNGEN.forEach(nimm);
  return liste;
};
