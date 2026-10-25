// Eigene Reihenfolge der Formulare (Spalte "Reihenfolge" in dokumentvorlage):
// Hilfsfunktionen ohne React, damit sie sich testen lassen.

export type MitReihenfolge = {
  id: string | number;
  Name: string;
  Reihenfolge?: number | null;
};

/** Eigene Reihenfolge zuerst, Vorlagen ohne Nummer alphabetisch dahinter. */
export const sortiereVorlagen = <T extends MitReihenfolge>(liste: T[]): T[] =>
  [...liste].sort((a, b) => {
    const ra = a.Reihenfolge ?? Number.POSITIVE_INFINITY;
    const rb = b.Reihenfolge ?? Number.POSITIVE_INFINITY;
    if (ra !== rb) return ra < rb ? -1 : 1;
    return a.Name.localeCompare(b.Name, "de");
  });

/** Verschiebt `vonId` an die Stelle von `zuId` (Liste muss schon sortiert sein). */
export const verschiebeVorlage = <T extends MitReihenfolge>(
  liste: T[],
  vonId: T["id"],
  zuId: T["id"],
): T[] => {
  const von = liste.findIndex((v) => v.id === vonId);
  const zu = liste.findIndex((v) => v.id === zuId);
  if (von < 0 || zu < 0 || von === zu) return liste;
  const kopie = [...liste];
  const [eintrag] = kopie.splice(von, 1);
  kopie.splice(zu, 0, eintrag);
  return kopie;
};

/** Einen Platz nach oben (-1) oder unten (+1). */
export const verschiebeUmEins = <T extends MitReihenfolge>(
  liste: T[],
  id: T["id"],
  richtung: -1 | 1,
): T[] => {
  const i = liste.findIndex((v) => v.id === id);
  const ziel = liste[i + richtung];
  if (i < 0 || !ziel) return liste;
  return verschiebeVorlage(liste, id, ziel.id);
};

/** Nummeriert 1..n und liefert nur die Einträge, deren Nummer sich ändert. */
export const neueNummern = <T extends MitReihenfolge>(
  liste: T[],
): { id: T["id"]; Reihenfolge: number }[] =>
  liste
    .map((v, i) => ({ id: v.id, Reihenfolge: i + 1, alt: v.Reihenfolge }))
    .filter((x) => x.alt !== x.Reihenfolge)
    .map(({ id, Reihenfolge }) => ({ id, Reihenfolge }));
