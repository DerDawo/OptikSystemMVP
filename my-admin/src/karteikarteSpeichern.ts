import type { DataProvider } from "react-admin";

// Speichern einer direkt in der Karteikarte geänderten Angabe. Glas,
// Glastyp und Fassung sind eigene Datensätze, auf die der Auftrag verweist:
// - fehlt der Datensatz noch, wird er angelegt und mit dem Auftrag verknüpft,
// - verwendet ein anderer Auftrag (oder das andere Auge) denselben
//   Datensatz, bekommt dieser Auftrag eine geänderte Kopie - die anderen
//   Aufträge bleiben unverändert,
// - sonst wird der Datensatz direkt geändert.
// Die Summe des Auftrags rechnen die Datenbank-Trigger neu.

type Datensatz = Record<string, unknown> & { id: number };

export type Komponente = "glass" | "glastyp" | "fassung";

// Verweisfelder im Auftrag (brille) je Komponente
const VERWEISE: Record<Komponente, string[]> = {
  glass: ["GlasRechts", "GlasLinks"],
  glastyp: ["Glastyp"],
  fassung: ["Fassung"],
};

export const speichereAuftrag = async (
  dataProvider: DataProvider,
  brille: Datensatz,
  data: Record<string, unknown>,
) => {
  await dataProvider.update("brille", {
    id: brille.id,
    data,
    previousData: brille,
  });
};

// Wird der Datensatz außer über `verweis` dieses Auftrags noch woanders
// verwendet?
export const wirdMitbenutzt = async (
  dataProvider: DataProvider,
  komponente: Komponente,
  id: number,
  brille: Datensatz,
  verweis: string,
) => {
  const felder = VERWEISE[komponente];
  if (felder.some((f) => f !== verweis && brille[f] === id)) return true;
  for (const feld of felder) {
    const { total } = await dataProvider.getList("brille", {
      filter: { [feld]: id, "id@neq": brille.id },
      pagination: { page: 1, perPage: 1 },
      sort: { field: "id", order: "ASC" },
    });
    if ((total ?? 0) > 0) return true;
  }
  return false;
};

export const speichereKomponente = async (
  dataProvider: DataProvider,
  {
    brille,
    komponente,
    verweis,
    datensatz,
    data,
    neu = {},
  }: {
    brille: Datensatz;
    komponente: Komponente;
    // Feld im Auftrag, z. B. "GlasRechts"
    verweis: string;
    // aktueller Datensatz (fehlt, wenn noch keiner verknüpft ist)
    datensatz?: Datensatz;
    data: Record<string, unknown>;
    // Vorgaben für einen neu angelegten oder kopierten Datensatz,
    // z. B. { Seite: "Rechts" }
    neu?: Record<string, unknown>;
  },
): Promise<number> => {
  const verknuepfe = async (vorlage: Record<string, unknown>) => {
    const { data: angelegt } = await dataProvider.create(komponente, {
      data: { ...vorlage, ...data },
    });
    await speichereAuftrag(dataProvider, brille, { [verweis]: angelegt.id });
    return angelegt.id as number;
  };

  if (!datensatz) return verknuepfe(neu);

  if (
    await wirdMitbenutzt(
      dataProvider,
      komponente,
      datensatz.id,
      brille,
      verweis,
    )
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, created_at, ...kopie } = datensatz;
    return verknuepfe({ ...kopie, ...neu });
  }

  await dataProvider.update(komponente, {
    id: datensatz.id,
    data,
    previousData: datensatz,
  });
  return datensatz.id;
};
