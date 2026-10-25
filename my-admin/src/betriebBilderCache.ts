// Zwischenspeicher für Betriebsstempel und Unterschrift (als data:-URLs).
// Bewusst ohne Supabase-Import, damit die Formularvorlagen und ihre Tests
// unabhängig vom Datenbank-Client bleiben. Befüllt wird er von
// betriebBilder.ts (privater Storage-Bucket "betrieb-bilder").
export type BetriebBildName = "stempel" | "unterschrift";
export type BetriebBilder = Partial<Record<BetriebBildName, string>>;

let cache: BetriebBilder = {};

export const betriebBilder = (): BetriebBilder => cache;

export const setzeBetriebBilder = (neu: BetriebBilder): void => {
  cache = neu;
};

// Nur Bild-data:-URLs werden in Formulare eingebettet
export const bildUrl = (url: string | undefined): string =>
  url && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(url)
    ? url
    : "";
