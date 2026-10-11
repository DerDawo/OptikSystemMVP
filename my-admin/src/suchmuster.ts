// Suchmuster für Namen, das Umlaut-Schreibweisen gleich behandelt: "müller"
// findet auch "Mueller" und umgekehrt, ebenso ö/oe, ä/ae und ß/ss. Wird als
// PostgreSQL-Regex mit dem PostgREST-Operator imatch (Groß-/Kleinschreibung
// egal, Teiltreffer) an die Datenbank geschickt.
const VARIANTEN: [RegExp, string][] = [
  [/ä|ae/g, "(ä|ae)"],
  [/ö|oe/g, "(ö|oe)"],
  [/ü|ue/g, "(ü|ue)"],
  [/ß|ss/g, "(ß|ss)"],
];

const escapeRegex = (text: string) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const namensSuchmuster = (eingabe: string): string => {
  let muster = escapeRegex(eingabe.trim().toLowerCase());
  for (const [suche, ersatz] of VARIANTEN) {
    muster = muster.replace(suche, ersatz);
  }
  // mehrere Wörter in dieser Reihenfolge, beliebiger Abstand
  return muster.replace(/\s+/g, ".*");
};
