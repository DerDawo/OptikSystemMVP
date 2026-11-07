// Reihenfolge der Nachrichtenvorlagen (Spalte nachrichten."Reihenfolge"):
// aufsteigend, Vorlagen ohne Wert am Ende, sonst nach id.

type Vorlage = { id?: unknown; Reihenfolge?: unknown };

const nummer = (wert: unknown) =>
  typeof wert === "number" && Number.isFinite(wert) ? wert : null;

export const sortiereVorlagen = <T extends Vorlage>(liste: T[]): T[] =>
  [...liste].sort((a, b) => {
    const ra = nummer(a.Reihenfolge);
    const rb = nummer(b.Reihenfolge);
    if (ra !== rb) {
      if (ra === null) return 1;
      if (rb === null) return -1;
      return ra - rb;
    }
    return String(a.id ?? "").localeCompare(String(b.id ?? ""), "de", {
      numeric: true,
    });
  });

/**
 * Neue Reihenfolge, wenn die Vorlage an `index` um eine Stelle nach oben
 * (-1) oder unten (+1) rückt: durchnummeriert 1, 2, 3 ... für alle, damit
 * auch Vorlagen ohne Wert eine feste Position bekommen. Liefert nur die
 * geänderten Einträge.
 */
export const verschiebe = <T extends Vorlage>(
  sortiert: T[],
  index: number,
  richtung: -1 | 1,
): { id: T["id"]; Reihenfolge: number }[] => {
  const ziel = index + richtung;
  if (ziel < 0 || ziel >= sortiert.length) return [];
  const neu = [...sortiert];
  [neu[index], neu[ziel]] = [neu[ziel], neu[index]];
  return neu
    .map((v, i) => ({
      id: v.id,
      Reihenfolge: i + 1,
      alt: nummer(v.Reihenfolge),
    }))
    .filter((v) => v.alt !== v.Reihenfolge)
    .map(({ id, Reihenfolge }) => ({ id, Reihenfolge }));
};
