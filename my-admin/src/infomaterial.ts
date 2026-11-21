// Infomaterial für die Glasberatung, zuerst der Poloptic-Katalog. Er liegt
// im privaten Storage-Bucket "infomaterial" (siehe Migration
// 20261121160000_create_infomaterial_bucket.sql) und nicht im Code. Geöffnet
// wird er über einen zeitlich begrenzten Link in einem neuen Tab.
import { supabase } from "./utils";

export const INFO_BUCKET = "infomaterial";
export const KATALOG_DATEI = "poloptic-katalog.pdf";
export const KATALOG_MAX_BYTES = 50 * 1024 * 1024;
/** Gültigkeit des Links in Sekunden (eine Stunde reicht für ein Gespräch). */
const LINK_GUELTIG_S = 60 * 60;

export const KEIN_KATALOG =
  "Noch kein Katalog hochgeladen. Bitte unter Betriebsdaten hochladen.";

/** Prüft die gewählte Datei; gibt eine Fehlermeldung oder null zurück. */
export const pruefeKatalogDatei = (datei: {
  type: string;
  name: string;
  size: number;
}): string | null => {
  const istPdf = datei.type === "application/pdf" || /\.pdf$/i.test(datei.name);
  if (!istPdf) return "Bitte eine PDF-Datei wählen.";
  if (datei.size > KATALOG_MAX_BYTES) return "Die Datei ist größer als 50 MB.";
  return null;
};

/** Ist schon ein Katalog hochgeladen? */
export const katalogVorhanden = async (): Promise<boolean> => {
  const { data, error } = await supabase.storage
    .from(INFO_BUCKET)
    .list("", { search: KATALOG_DATEI });
  if (error) return false;
  return (data ?? []).some((d) => d.name === KATALOG_DATEI);
};

export const speichereKatalog = async (datei: File): Promise<void> => {
  const fehler = pruefeKatalogDatei(datei);
  if (fehler) throw new Error(fehler);
  const { error } = await supabase.storage
    .from(INFO_BUCKET)
    .upload(KATALOG_DATEI, datei, {
      contentType: "application/pdf",
      upsert: true,
    });
  if (error) throw error;
};

export const loescheKatalog = async (): Promise<void> => {
  const { error } = await supabase.storage
    .from(INFO_BUCKET)
    .remove([KATALOG_DATEI]);
  if (error) throw error;
};

/**
 * Öffnet den Katalog in einem neuen Tab. Das Fenster wird sofort beim Klick
 * geöffnet und erst danach auf den Link gesetzt, sonst blockiert Safari auf
 * dem iPad das Popup, weil der Link erst nach dem Warten auf Supabase da ist.
 */
export const oeffneKatalog = async (): Promise<void> => {
  const fenster = window.open("", "_blank");
  const { data, error } = await supabase.storage
    .from(INFO_BUCKET)
    .createSignedUrl(KATALOG_DATEI, LINK_GUELTIG_S);
  if (error || !data?.signedUrl) {
    fenster?.close();
    throw new Error(KEIN_KATALOG);
  }
  if (fenster) fenster.location.href = data.signedUrl;
  else window.location.assign(data.signedUrl);
};
