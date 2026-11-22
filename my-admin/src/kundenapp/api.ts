import { createClient } from "@supabase/supabase-js";

/*
 * Verbindung der Kunden-App: eigener Supabase-Client nur mit dem
 * öffentlichen Schlüssel und OHNE gespeicherten Login. Sonst würde ein im
 * selben Browser angemeldeter Mitarbeiter-Login mitgeschickt. Die App ruft
 * ausschließlich die Funktionen portal_* (und die Buchungsfunktionen) auf.
 */

const url = import.meta.env.VITE_SUPABASE_URL;
const schluessel = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

const client = createClient(url, schluessel, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    storageKey: "unicorn-kunden-app-auth",
  },
});

const SITZUNG = "unicorn-kunden-app-sitzung";

export const sitzungLesen = (): string | null => {
  try {
    return window.localStorage.getItem(SITZUNG);
  } catch {
    return null;
  }
};

export const sitzungSpeichern = (wert: string | null) => {
  try {
    if (wert) window.localStorage.setItem(SITZUNG, wert);
    else window.localStorage.removeItem(SITZUNG);
  } catch {
    // privates Fenster: dann gilt die Anmeldung nur bis zum Schließen
  }
};

// Sitzung abgelaufen oder Zugang gesperrt (errcode 28000 in portal_kunde)
export class AbgemeldetFehler extends Error {}

export const aufrufen = async <T>(
  name: string,
  argumente: Record<string, unknown> = {},
): Promise<T> => {
  const { data, error } = await client.rpc(name, argumente);
  if (error) {
    if (error.code === "28000") throw new AbgemeldetFehler(error.message);
    throw new Error(
      error.message ||
        "Das hat leider nicht geklappt. Bitte versuchen Sie es später noch einmal.",
    );
  }
  return data as T;
};

export const fehlerText = (fehler: unknown) =>
  (fehler as { message?: string })?.message ||
  "Das hat leider nicht geklappt. Bitte versuchen Sie es später noch einmal.";
