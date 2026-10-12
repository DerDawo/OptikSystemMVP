// Datumsfelder, die in Formularen leer bleiben dürfen. Die Datumseingaben
// liefern dann "" - Postgres lehnt das für date/timestamp-Spalten ab
// ("invalid input syntax for type timestamp"). Vor dem Speichern wird ""
// deshalb zu null (= kein Datum).
const DATUMSFELDER = new Set([
  "Abholung",
  "Aufnahmedatum",
  "Bestellt",
  "Datum",
  "Ende",
  "ErstverordnungMuster8Datum",
  "Fertig",
  "Geburtsdatum",
  "KVVersendet",
  "Nachkontrolltermin",
  "Start",
  "Verordnungsdatum",
  "VersichertenkarteGueltigBis",
]);

export const leereDatumsfelderZuNull = <T>(data: T): T => {
  if (!data || typeof data !== "object" || Array.isArray(data)) return data;
  const eintraege = Object.entries(data as Record<string, unknown>);
  if (!eintraege.some(([k, v]) => DATUMSFELDER.has(k) && v === "")) return data;
  return Object.fromEntries(
    eintraege.map(([k, v]) => [k, DATUMSFELDER.has(k) && v === "" ? null : v]),
  ) as T;
};
