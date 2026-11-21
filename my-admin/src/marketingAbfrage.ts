// Abfrage der Kundenauswahl (Marketingmodul) über die Ansicht
// `kunde_marketing`; auch vom Serienbrief genutzt ("Gespeicherte Auswahl").
import { supabase } from "./utils";
import {
  MARKETING_ANSICHT,
  Selektion,
  pflichtFilter,
  selektionsAusdruck,
} from "./marketing";

const SEITE = 1000;

const abfrage = (
  s: Selektion,
  spalten: string,
  optionen?: { count: "exact"; head?: boolean },
) => {
  let q = supabase.from(MARKETING_ANSICHT).select(spalten, optionen);
  for (const [spalte, op, wert] of pflichtFilter(s)) {
    q = q.filter(spalte, op, wert);
  }
  const ausdruck = selektionsAusdruck(s);
  if (ausdruck) q = q.or(ausdruck);
  return q;
};

/** Anzahl der Kunden, auf die die Auswahl zutrifft. */
export const zaehleAuswahl = async (s: Selektion) => {
  const { count, error } = await abfrage(s, "id", {
    count: "exact",
    head: true,
  });
  if (error) throw new Error(error.message);
  return count ?? 0;
};

/** Alle Kunden der Auswahl (seitenweise geladen), nach Nachname sortiert. */
export const ladeAuswahl = async <T = Record<string, unknown>>(
  s: Selektion,
  max = 50_000,
): Promise<T[]> => {
  const alle: T[] = [];
  for (let von = 0; von < max; von += SEITE) {
    const { data, error } = await abfrage(s, "*")
      .order("Nachname", { ascending: true })
      .order("id", { ascending: true })
      .range(von, Math.min(von + SEITE, max) - 1);
    if (error) throw new Error(error.message);
    alle.push(...((data ?? []) as T[]));
    if (!data || data.length < Math.min(SEITE, max - von)) break;
  }
  return alle;
};
