// Eingaben in der Karteikarte (direkt in die Felder tippen wie in Prisma):
// deutsche Schreibweise in Datenbankwerte umwandeln und zurück.

export type EingabeTyp = "text" | "zahl" | "datum";

export class EingabeFehler extends Error {}

// "+2,25" -> 2.25, "1.234,50" -> 1234.5, "" -> null
export const leseZahl = (eingabe: string): number | null => {
  const roh = eingabe.trim().replace(/\s/g, "").replace(/^\+/, "");
  if (!roh) return null;
  const normal = roh.includes(",")
    ? roh.replace(/\./g, "").replace(",", ".")
    : roh;
  const zahl = Number(normal);
  if (!Number.isFinite(zahl))
    throw new EingabeFehler(`„${eingabe}“ ist keine Zahl.`);
  return zahl;
};

// "16.9.2026" / "16.09.26" / "2026-09-16" -> "2026-09-16", "" -> null
export const leseDatum = (eingabe: string): string | null => {
  const roh = eingabe.trim();
  if (!roh) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(roh)) return roh;
  const m = /^(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})$/.exec(roh);
  if (!m) throw new EingabeFehler(`„${eingabe}“ ist kein Datum (TT.MM.JJJJ).`);
  const jahr = m[3].length === 2 ? `20${m[3]}` : m[3];
  const iso = `${jahr}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  const probe = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(probe.getTime()) || probe.toISOString().slice(0, 10) !== iso)
    throw new EingabeFehler(`„${eingabe}“ ist kein gültiges Datum.`);
  return iso;
};

export const leseEingabe = (
  eingabe: string,
  typ: EingabeTyp,
): string | number | null => {
  if (typ === "zahl") return leseZahl(eingabe);
  if (typ === "datum") return leseDatum(eingabe);
  const text = eingabe.trim();
  return text === "" ? null : text;
};

// Datenbankwert -> Text im Eingabefeld
export const eingabeText = (wert: unknown, typ: EingabeTyp): string => {
  if (wert === null || wert === undefined || wert === "") return "";
  if (typ === "zahl") {
    const zahl = Number(wert);
    return Number.isFinite(zahl) ? String(zahl).replace(".", ",") : "";
  }
  if (typ === "datum") {
    const iso = String(wert).slice(0, 10);
    const [j, m, t] = iso.split("-");
    return j && m && t ? `${t}.${m}.${j}` : "";
  }
  return String(wert);
};

// Vergleich vor dem Speichern: nur echte Änderungen schreiben
export const gleicherWert = (
  alt: unknown,
  neu: string | number | null,
  typ: EingabeTyp,
) => {
  if (typ === "zahl") {
    const a =
      alt === null || alt === undefined || alt === "" ? null : Number(alt);
    return a === neu;
  }
  if (typ === "datum") {
    const a = alt ? String(alt).slice(0, 10) : null;
    return a === neu;
  }
  const a =
    alt === null || alt === undefined || alt === "" ? null : String(alt);
  return a === neu;
};
