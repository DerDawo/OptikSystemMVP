// Reine Hilfsfunktionen für die Ärzte-Adressliste (Tabelle "arzt").

export type Arzt = {
  id?: number;
  Name?: string | null;
  Praxis?: string | null;
  Fachrichtung?: string | null;
  LANR?: string | null;
  BSNR?: string | null;
  Straße?: string | null;
  PLZ?: string | null;
  Ort?: string | null;
  Telefon?: string | null;
  Fax?: string | null;
  Email?: string | null;
  Bemerkung?: string | null;
};

// Felder, in denen die Schnellsuche sucht
export const ARZT_SUCHFELDER = [
  "Name",
  "Praxis",
  "Fachrichtung",
  "Ort",
  "Straße",
  "LANR",
  "BSNR",
] as const;

const t = (wert: unknown) => (typeof wert === "string" ? wert.trim() : "");

/*
 * Wandelt die Schnellsuche "q" in einen ODER-Filter über mehrere Spalten um
 * (PostgREST "or=(...)"). Komma, Klammern, Punkt und Stern haben in der
 * PostgREST-Syntax eine Bedeutung und werden deshalb durch Leerzeichen
 * ersetzt. Mehrere Wörter müssen in dieser Reihenfolge im selben Feld
 * stehen ("Dr Voigt" findet "Dr. med. Ulrich Voigt"). Ohne Suchtext bleibt
 * der Filter unverändert (ohne "q").
 */
export const arztFilter = (
  filter: Record<string, unknown> = {},
): Record<string, unknown> => {
  const { q, ...rest } = filter;
  const suche = t(q)
    .replace(/[,().*:"\\]/g, " ")
    .trim()
    .replace(/\s+/g, "*");
  if (!suche) return rest;
  const oder: Record<string, string> = {};
  for (const feld of ARZT_SUCHFELDER) oder[`${feld}@ilike`] = suche;
  return { ...rest, "@or": oder };
};

// "07548 Gera"
export const plzOrt = (arzt: Arzt) =>
  [t(arzt.PLZ), t(arzt.Ort)].filter(Boolean).join(" ");

// Kurzname für Auswahllisten: "Praxis – Name" bzw. was vorhanden ist
export const arztKurzname = (arzt: Arzt | null | undefined) => {
  if (!arzt) return "";
  const teile = [t(arzt.Praxis), t(arzt.Name)].filter(Boolean);
  const name = teile.join(" – ");
  const ort = t(arzt.Ort);
  return ort ? `${name} (${ort})` : name;
};

// Mehrzeiliger Adressblock wie auf dem Arztstempel, z. B. für Briefe
export const arztAdressblock = (arzt: Arzt) => {
  const telefon = t(arzt.Telefon) ? `Tel. ${t(arzt.Telefon)}` : "";
  const fax = t(arzt.Fax) ? `Fax ${t(arzt.Fax)}` : "";
  return [
    t(arzt.Praxis),
    t(arzt.Name),
    t(arzt.Fachrichtung),
    t(arzt.Straße),
    plzOrt(arzt),
    [telefon, fax].filter(Boolean).join(", "),
  ]
    .filter(Boolean)
    .join("\n");
};
