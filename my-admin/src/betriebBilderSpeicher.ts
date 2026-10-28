// Laden und Speichern von Betriebsstempel und Unterschrift im privaten
// Storage-Bucket "betrieb-bilder" (nur für angemeldete Benutzer).
import { supabase } from "./utils";
import {
  type BetriebBildName,
  type BetriebBilder,
  betriebBilder,
  setzeBetriebBilder,
} from "./betriebBilderCache";

export const BILDER_BUCKET = "betrieb-bilder";
export const BILD_MAX_BYTES = 2 * 1024 * 1024;
const NAMEN: BetriebBildName[] = ["stempel", "unterschrift"];

const alsDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const leser = new FileReader();
    leser.onload = () => resolve(String(leser.result));
    leser.onerror = () => reject(leser.error);
    leser.readAsDataURL(blob);
  });

export const ladeBetriebBilder = async (): Promise<BetriebBilder> => {
  const neu: BetriebBilder = {};
  for (const name of NAMEN) {
    const { data, error } = await supabase.storage
      .from(BILDER_BUCKET)
      .download(name);
    if (!error && data) neu[name] = await alsDataUrl(data);
  }
  setzeBetriebBilder(neu);
  return betriebBilder();
};

export const speichereBetriebBild = async (
  name: BetriebBildName,
  datei: File,
): Promise<void> => {
  if (!["image/png", "image/jpeg", "image/webp"].includes(datei.type)) {
    throw new Error("Bitte ein PNG-, JPEG- oder WebP-Bild wählen.");
  }
  if (datei.size > BILD_MAX_BYTES) {
    throw new Error("Das Bild ist größer als 2 MB.");
  }
  const { error } = await supabase.storage
    .from(BILDER_BUCKET)
    .upload(name, datei, { contentType: datei.type, upsert: true });
  if (error) throw error;
  await ladeBetriebBilder();
};

export const loescheBetriebBild = async (
  name: BetriebBildName,
): Promise<void> => {
  const { error } = await supabase.storage.from(BILDER_BUCKET).remove([name]);
  if (error) throw error;
  await ladeBetriebBilder();
};
