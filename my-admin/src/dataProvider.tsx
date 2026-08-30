// in src/dataProvider.ts
//import jsonServerProvider from 'ra-data-json-server';
import { supabase } from "./utils";
import { supabaseDataProvider } from "ra-supabase";
import type {
  CreateParams,
  DataProvider,
  GetListParams,
  GetManyParams,
  GetManyReferenceParams,
  GetOneParams,
  RaRecord,
  UpdateParams,
} from "react-admin";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

console.log("Supabase URL:", supabaseUrl);

const rawDataProvider = supabaseDataProvider({
  instanceUrl: supabaseUrl,
  apiKey: supabaseKey,
  supabaseClient: supabase,
});

// Brille <-> Zusatzleistung is a many-to-many relation stored in the join
// table `brille_hat_zusatzleistungen`. The Edit/Create forms use a plain
// array field ("ZusatzleistungIDs") with ReferenceArrayInput, so reads/writes
// on the "brille" resource are wrapped here to translate between that array
// and the join table rows.
const ZUSATZLEISTUNG_JOIN_TABLE = "brille_hat_zusatzleistungen";

type BrilleRecord = RaRecord & { ZusatzleistungIDs?: number[] };

const attachZusatzleistungIds = async (
  records: RaRecord[],
): Promise<BrilleRecord[]> => {
  if (records.length === 0) {
    return records;
  }

  const ids = records.map((record) => record.id);
  const { data, error } = await supabase
    .from(ZUSATZLEISTUNG_JOIN_TABLE)
    .select("BrillenID, ZusatzleistungID")
    .in("BrillenID", ids);

  if (error) {
    throw error;
  }

  const idsByBrille = new Map<number, number[]>();
  (data ?? []).forEach((row) => {
    const list = idsByBrille.get(row.BrillenID) ?? [];
    list.push(row.ZusatzleistungID);
    idsByBrille.set(row.BrillenID, list);
  });

  return records.map((record) => ({
    ...record,
    ZusatzleistungIDs: idsByBrille.get(record.id) ?? [],
  }));
};

// Inserts/deletes join table rows so they match the given ZusatzleistungIDs.
// Leaves existing rows untouched if ZusatzleistungIDs was not part of the update.
const syncZusatzleistungen = async (
  brilleId: number,
  zusatzleistungIds: number[] | undefined,
) => {
  if (zusatzleistungIds === undefined) {
    return;
  }

  const { data: existing, error: fetchError } = await supabase
    .from(ZUSATZLEISTUNG_JOIN_TABLE)
    .select("id, ZusatzleistungID")
    .eq("BrillenID", brilleId);

  if (fetchError) {
    throw fetchError;
  }

  const existingIds = new Set(
    (existing ?? []).map((row) => row.ZusatzleistungID),
  );
  const desiredIds = new Set(zusatzleistungIds);

  const toInsert = zusatzleistungIds.filter((id) => !existingIds.has(id));
  const toDelete = (existing ?? []).filter(
    (row) => !desiredIds.has(row.ZusatzleistungID),
  );

  if (toInsert.length > 0) {
    const { error } = await supabase.from(ZUSATZLEISTUNG_JOIN_TABLE).insert(
      toInsert.map((zusatzleistungId) => ({
        BrillenID: brilleId,
        ZusatzleistungID: zusatzleistungId,
      })),
    );

    if (error) {
      throw error;
    }
  }

  if (toDelete.length > 0) {
    const { error } = await supabase
      .from(ZUSATZLEISTUNG_JOIN_TABLE)
      .delete()
      .in(
        "id",
        toDelete.map((row) => row.id),
      );

    if (error) {
      throw error;
    }
  }
};

const brilleZusatzleistungenProvider = {
  getList: async (resource: string, params: GetListParams) => {
    const result = await rawDataProvider.getList(resource, params);
    if (resource !== "brille") {
      return result;
    }
    return { ...result, data: await attachZusatzleistungIds(result.data) };
  },
  getOne: async (resource: string, params: GetOneParams) => {
    const result = await rawDataProvider.getOne(resource, params);
    if (resource !== "brille") {
      return result;
    }
    const [data] = await attachZusatzleistungIds([result.data]);
    return { ...result, data };
  },
  getMany: async (resource: string, params: GetManyParams) => {
    const result = await rawDataProvider.getMany(resource, params);
    if (resource !== "brille") {
      return result;
    }
    return { ...result, data: await attachZusatzleistungIds(result.data) };
  },
  getManyReference: async (
    resource: string,
    params: GetManyReferenceParams,
  ) => {
    const result = await rawDataProvider.getManyReference(resource, params);
    if (resource !== "brille") {
      return result;
    }
    return { ...result, data: await attachZusatzleistungIds(result.data) };
  },
  create: async (resource: string, params: CreateParams) => {
    if (resource !== "brille") {
      return rawDataProvider.create(resource, params);
    }
    const { ZusatzleistungIDs, ...data } = params.data as BrilleRecord;
    const result = await rawDataProvider.create(resource, { ...params, data });
    await syncZusatzleistungen(result.data.id, ZusatzleistungIDs);
    return {
      ...result,
      data: { ...result.data, ZusatzleistungIDs: ZusatzleistungIDs ?? [] },
    };
  },
  update: async (resource: string, params: UpdateParams) => {
    if (resource !== "brille") {
      return rawDataProvider.update(resource, params);
    }
    const { ZusatzleistungIDs, ...data } = params.data as BrilleRecord;
    const result = await rawDataProvider.update(resource, { ...params, data });
    await syncZusatzleistungen(params.id as number, ZusatzleistungIDs);
    return {
      ...result,
      data: { ...result.data, ZusatzleistungIDs: ZusatzleistungIDs ?? [] },
    };
  },
};

const composedDataProvider = new Proxy(rawDataProvider, {
  get(target, prop, receiver) {
    if (prop in brilleZusatzleistungenProvider) {
      return brilleZusatzleistungenProvider[
        prop as keyof typeof brilleZusatzleistungenProvider
      ];
    }
    return Reflect.get(target, prop, receiver);
  },
}) as DataProvider;

// React Admin requires data provider methods to return a Promise, not throw.
// Wrap methods to convert synchronous throws into rejected promises.
export const dataProvider = new Proxy(composedDataProvider, {
  get(target, prop, receiver) {
    const value = Reflect.get(target, prop, receiver);
    if (typeof value !== "function") {
      return value;
    }

    return (...args: unknown[]) => {
      try {
        const result = value.apply(target, args);

        if (result instanceof Promise) {
          return result.catch((err) => Promise.reject(err));
        }

        return Promise.resolve(result);
      } catch (error) {
        return Promise.reject(error);
      }
    };
  },
});
//export const dataProvider = jsonServerProvider(
//    import.meta.env.VITE_JSON_SERVER_URL
//);
