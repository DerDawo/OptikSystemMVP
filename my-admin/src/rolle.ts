// Benutzerrollen (siehe Migration 20261116090000_rollen_und_protokoll.sql).
// Die Rechte setzt die Datenbank durch; die App blendet nur aus, was die
// Rolle ohnehin nicht darf, und übersetzt abgelehnte Zugriffe in eine
// verständliche Meldung.
import { useEffect, useState } from "react";
import { supabase } from "./utils";

export type Rolle = "inhaber" | "optiker" | "aushilfe" | "gesperrt";

export const ROLLEN: {
  id: Exclude<Rolle, "gesperrt">;
  name: string;
  text: string;
}[] = [
  {
    id: "inhaber",
    name: "Inhaber",
    text: "Alles, auch Betriebsdaten, Benutzer, Änderungsprotokoll und Datensicherung.",
  },
  {
    id: "optiker",
    name: "Optiker",
    text: "Kunden, Aufträge, Werte, Formulare und Stammdaten; keine Betriebsdaten, Benutzer und kein Protokoll.",
  },
  {
    id: "aushilfe",
    name: "Aushilfe",
    text: "Sieht alles, bearbeitet aber nur Kunden-Stammdaten, Termine, Online-Anfragen, Nachrichten und Erinnerungen. Keine Werte, Aufträge oder Rechnungen.",
  },
];

export const rollenName = (rolle: string | null | undefined) =>
  rolle === "gesperrt"
    ? "Gesperrt"
    : (ROLLEN.find((r) => r.id === rolle)?.name ?? "–");

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

let geladen: Promise<Rolle> | null = null;

const ladeRolle = () => {
  geladen ??= Promise.resolve(supabase.rpc("aktuelle_rolle")).then(
    ({ data, error }) => {
      // ohne die Funktion (z. B. ältere Datenbank) wie bisher: alles erlaubt
      if (error || typeof data !== "string") return "optiker" as Rolle;
      return data as Rolle;
    },
  );
  return geladen;
};

supabase.auth.onAuthStateChange((ereignis) => {
  if (ereignis === "SIGNED_IN" || ereignis === "SIGNED_OUT") geladen = null;
});

/** Rolle des angemeldeten Benutzers (null, solange sie geladen wird). */
export const useRolle = (): Rolle | null => {
  const [rolle, setRolle] = useState<Rolle | null>(null);
  useEffect(() => {
    let aktiv = true;
    void ladeRolle().then((r) => aktiv && setRolle(r));
    return () => {
      aktiv = false;
    };
  }, []);
  return rolle;
};
