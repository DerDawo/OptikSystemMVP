import type { SupabaseClient } from "@supabase/supabase-js";
import type { Sf6Katalog } from "./sf6Format";

export interface Sf6ImportSummary {
  herstellerName: string;
  produkteGesamt: number;
  produkteDeaktiviert: number;
  optionenGesamt: number;
  verknuepfungenGesamt: number;
}

export type Sf6ImportProgress = (message: string) => void;

const UPSERT_CHUNK_SIZE = 500;
/** Klein gehalten, damit "id=in.(...)"-Filter nicht an URL-Längenlimits scheitern. */
const ID_FILTER_CHUNK_SIZE = 100;
const SELECT_PAGE_SIZE = 1000;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function upsertInChunks<T extends object>(
  supabase: SupabaseClient,
  table: string,
  rows: T[],
  onConflict: string,
  onProgress?: Sf6ImportProgress,
): Promise<void> {
  const batches = chunk(rows, UPSERT_CHUNK_SIZE);
  for (const [index, batch] of batches.entries()) {
    onProgress?.(
      `${table}: schreibe Batch ${index + 1}/${batches.length} (${batch.length} Zeilen) ...`,
    );
    const { error } = await supabase.from(table).upsert(batch, { onConflict });
    if (error)
      throw new Error(`Fehler beim Schreiben in ${table}: ${error.message}`);
  }
}

/** Lädt alle Zeilen einer gefilterten Abfrage seitenweise (Supabase begrenzt eine einzelne Abfrage standardmäßig auf 1000 Zeilen). */
async function selectAllForHersteller<T>(
  supabase: SupabaseClient,
  table: string,
  columns: string,
  herstellerId: string,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += SELECT_PAGE_SIZE) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .eq("glashersteller_id", herstellerId)
      .range(from, from + SELECT_PAGE_SIZE - 1);
    if (error)
      throw new Error(`Fehler beim Lesen von ${table}: ${error.message}`);
    if (!data || data.length === 0) break;
    rows.push(...(data as T[]));
    if (data.length < SELECT_PAGE_SIZE) break;
  }
  return rows;
}

async function deleteByIdIn(
  supabase: SupabaseClient,
  table: string,
  column: string,
  ids: string[],
): Promise<void> {
  for (const batch of chunk(ids, ID_FILTER_CHUNK_SIZE)) {
    const { error } = await supabase.from(table).delete().in(column, batch);
    if (error)
      throw new Error(`Fehler beim Löschen aus ${table}: ${error.message}`);
  }
}

async function updateByIdIn(
  supabase: SupabaseClient,
  table: string,
  ids: string[],
  values: Record<string, unknown>,
): Promise<void> {
  for (const batch of chunk(ids, ID_FILTER_CHUNK_SIZE)) {
    const { error } = await supabase.from(table).update(values).in("id", batch);
    if (error)
      throw new Error(
        `Fehler beim Aktualisieren von ${table}: ${error.message}`,
      );
  }
}

/**
 * Importiert einen geparsten SF6-Katalog in die glashersteller-/glaskatalog-
 * Tabellen. Ein erneuter Import (z. B. bei einer neuen Preisliste) aktualisiert
 * bestehende Zeilen anhand von (glashersteller_id, esd_code) bzw.
 * (glashersteller_id, code), statt sie neu anzulegen - bestehende glasstyp-,
 * brille- und glass-Datensätze, die per glasstyp.glaskatalog_id auf einen
 * Katalogeintrag verweisen, werden dabei nie verändert oder gelöscht.
 * Nicht mehr gelieferte Grundgläser werden auf aktiv=false gesetzt statt
 * gelöscht, damit bestehende Referenzen gültig bleiben.
 */
export async function importSf6Katalog(
  supabase: SupabaseClient,
  katalog: Sf6Katalog,
  onProgress?: Sf6ImportProgress,
): Promise<Sf6ImportSummary> {
  const now = new Date().toISOString();

  onProgress?.(
    `Lege Hersteller "${katalog.hersteller.name}" an/aktualisiere ihn ...`,
  );
  const { data: herstellerRow, error: herstellerError } = await supabase
    .from("glashersteller")
    .upsert(
      {
        code: katalog.hersteller.code,
        name: katalog.hersteller.name,
        updated_at: now,
      },
      { onConflict: "code" },
    )
    .select("id")
    .single();
  if (herstellerError || !herstellerRow) {
    throw new Error(
      `Fehler beim Anlegen des Herstellers: ${herstellerError?.message}`,
    );
  }
  const herstellerId = (herstellerRow as { id: string }).id;

  const produktRows = katalog.produkte.map((produkt) => ({
    glashersteller_id: herstellerId,
    esd_code: produkt.esdCode,
    bezeichnung: produkt.bezeichnung,
    brechungsindex: produkt.brechungsindex,
    basispreis: katalog.basispreise.get(produkt.esdCode) ?? null,
    aktiv: true,
    updated_at: now,
  }));
  await upsertInChunks(
    supabase,
    "glaskatalog",
    produktRows,
    "glashersteller_id,esd_code",
    onProgress,
  );

  onProgress?.("Prüfe, ob früher importierte Grundgläser entfallen sind ...");
  const bestehendeProdukte = await selectAllForHersteller<{
    id: string;
    esd_code: string;
  }>(supabase, "glaskatalog", "id, esd_code", herstellerId);
  const importierteCodes = new Set(katalog.produkte.map((p) => p.esdCode));
  const zuDeaktivierenIds = bestehendeProdukte
    .filter((row) => !importierteCodes.has(row.esd_code))
    .map((row) => row.id);
  if (zuDeaktivierenIds.length > 0) {
    onProgress?.(
      `Deaktiviere ${zuDeaktivierenIds.length} nicht mehr gelieferte Grundgläser ...`,
    );
    await updateByIdIn(supabase, "glaskatalog", zuDeaktivierenIds, {
      aktiv: false,
      updated_at: now,
    });
  }

  const optionRows = katalog.optionen.map((option) => ({
    glashersteller_id: herstellerId,
    code: option.code,
    bezeichnung: option.bezeichnung,
    typ: option.typ,
    preis: option.preis,
    updated_at: now,
  }));
  await upsertInChunks(
    supabase,
    "glaskatalog_option",
    optionRows,
    "glashersteller_id,code",
    onProgress,
  );

  onProgress?.(
    "Baue Verfügbarkeits-Verknüpfungen zwischen Grundgläsern und Optionen auf ...",
  );
  const produkteMitId = await selectAllForHersteller<{
    id: string;
    esd_code: string;
  }>(supabase, "glaskatalog", "id, esd_code", herstellerId);
  const optionenMitId = await selectAllForHersteller<{
    id: string;
    code: string;
  }>(supabase, "glaskatalog_option", "id, code", herstellerId);
  const produktIdByCode = new Map(
    produkteMitId.map((row) => [row.esd_code, row.id]),
  );
  const optionIdByCode = new Map(
    optionenMitId.map((row) => [row.code, row.id]),
  );

  const verknuepfungRows: Array<{
    glaskatalog_id: string;
    glaskatalog_option_id: string;
  }> = [];
  for (const [esdCode, optionCodes] of katalog.verfuegbareOptionen) {
    const produktId = produktIdByCode.get(esdCode);
    if (!produktId) continue;
    for (const optionCode of optionCodes) {
      const optionId = optionIdByCode.get(optionCode);
      if (!optionId) continue;
      verknuepfungRows.push({
        glaskatalog_id: produktId,
        glaskatalog_option_id: optionId,
      });
    }
  }

  // Verknüpfungen der importierten Grundgläser komplett neu aufbauen, da sich
  // das verfügbare Sortiment je Grundglas mit jeder Preisliste ändern kann.
  const betroffeneProduktIds = [...produktIdByCode.values()];
  if (betroffeneProduktIds.length > 0) {
    onProgress?.("Entferne veraltete Verknüpfungen ...");
    await deleteByIdIn(
      supabase,
      "glaskatalog_hat_option",
      "glaskatalog_id",
      betroffeneProduktIds,
    );
  }
  await upsertInChunks(
    supabase,
    "glaskatalog_hat_option",
    verknuepfungRows,
    "glaskatalog_id,glaskatalog_option_id",
    onProgress,
  );

  return {
    herstellerName: katalog.hersteller.name,
    produkteGesamt: produktRows.length,
    produkteDeaktiviert: zuDeaktivierenIds.length,
    optionenGesamt: optionRows.length,
    verknuepfungenGesamt: verknuepfungRows.length,
  };
}
