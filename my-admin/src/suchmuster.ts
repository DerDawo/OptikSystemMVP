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

// Felder für "Suche in anderen Angaben" (Adresse, Telefon, Merkmale, ...)
const ANDERE_ANGABEN = [
  "Straße",
  "Stadt",
  "Postleitzahl",
  "TelefonnummerPrivat",
  "TelefonnummerGeschaeftlich",
  "Handy",
  "Email",
  "Krankenkasse",
  "VersichertenNummer",
  "Merkmal1",
  "Merkmal2",
  "Merkmal3",
  "Merkmal4",
  "Notizen",
];

// Ein Begriff in irgendeinem dieser Felder (PostgREST "or", imatch mit
// Umlaut-Varianten wie bei Namen). Zeichen, die die or-Syntax oder den Regex
// stören, werden entfernt; der Wert steht in Anführungszeichen.
export const andereAngabenFilter = (eingabe: string) => {
  const begriff = eingabe
    .replace(/[,()"\\*.+?^${}[\]|:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!begriff) return {};
  const muster = `"${namensSuchmuster(begriff)}"`;
  return {
    "@or": Object.fromEntries(
      ANDERE_ANGABEN.map((feld) => [`${feld}@imatch`, muster]),
    ),
  };
};
