// Abgelehnte Zugriffe der Datenbank (Rollen) erkennen und verständlich melden.
// Ohne Supabase-Import, damit es sich ohne Zugangsdaten testen lässt.

export const BERECHTIGUNG_FEHLT =
  "Dafür fehlt Ihnen die Berechtigung. Bitte den Inhaber fragen.";

type Fehler = {
  message?: unknown;
  code?: unknown;
  body?: { message?: unknown; code?: unknown };
};

/**
 * Erkennt, ob die Datenbank einen Zugriff wegen der Rolle abgelehnt hat.
 * Beim Ändern oder Löschen meldet PostgREST statt eines Fehlers "keine
 * Zeile gefunden" (PGRST116), weil die Zeile für die Rolle nicht änderbar ist.
 */
export const istBerechtigungsFehler = (methode: string, fehler: unknown) => {
  const f = (fehler ?? {}) as Fehler;
  const text = [f.message, f.code, f.body?.message, f.body?.code]
    .filter(Boolean)
    .join(" ");
  if (/row-level security|permission denied|42501/i.test(text)) return true;
  return (
    /^(update|delete)/.test(methode) &&
    /PGRST116|JSON object requested|0 rows/i.test(text)
  );
};

/** Ersetzt Berechtigungsfehler durch eine verständliche Meldung. */
export const uebersetzeFehler = (methode: string, fehler: unknown) =>
  istBerechtigungsFehler(methode, fehler)
    ? Object.assign(new Error(BERECHTIGUNG_FEHLT), { ursache: fehler })
    : fehler;
