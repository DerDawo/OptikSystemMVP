// Kontrollen und Topometrie zur CL-Kartei: Felder, Vorschläge und
// Hornhautwerte. Ohne React, damit es sich testen lässt.

export type KlArt = "Kontrolle" | "Topometrie";

export type AugenFeld = {
  feld: string;
  titel: string;
  // Zahl mit Nachkommastellen, sonst Text (mit Vorschlägen)
  stellen?: number;
  vorschlaege?: string[];
  einheit?: string;
};

export const KONTROLLE_AUGE: AugenFeld[] = [
  { feld: "VisCL", titel: "Visus mit CL", stellen: 2 },
  { feld: "UeberSph", titel: "Überrefraktion Sph", stellen: 2 },
  { feld: "UeberCyl", titel: "Überrefraktion Cyl", stellen: 2 },
  { feld: "UeberA", titel: "Überrefraktion A", stellen: 0 },
  {
    feld: "Sitz",
    titel: "Sitz",
    vorschlaege: [
      "zentriert",
      "leicht dezentriert",
      "dezentriert oben",
      "dezentriert unten",
      "dezentriert temporal",
      "dezentriert nasal",
    ],
  },
  {
    feld: "Beweglichkeit",
    titel: "Beweglichkeit",
    vorschlaege: ["gut", "eingeschränkt", "zu stark", "fest"],
  },
  {
    feld: "Fluobild",
    titel: "Fluobild",
    vorschlaege: ["parallel", "flach", "steil", "apikale Berührung", "–"],
  },
  {
    feld: "Bindehaut",
    titel: "Bindehaut",
    vorschlaege: ["o. B.", "leichte Rötung", "Rötung", "Papillen"],
  },
  {
    feld: "Hornhaut",
    titel: "Hornhaut",
    vorschlaege: [
      "o. B.",
      "Stippen",
      "Ödem",
      "Neovaskularisation",
      "Infiltrat",
    ],
  },
  {
    feld: "Linsenzustand",
    titel: "Linsenzustand",
    vorschlaege: ["sauber", "Ablagerungen", "beschädigt"],
  },
];

export const TOPOMETRIE_AUGE: AugenFeld[] = [
  { feld: "RadiusFlach", titel: "Radius flach", stellen: 2, einheit: "mm" },
  { feld: "AchseFlach", titel: "Achse flach", stellen: 0, einheit: "°" },
  { feld: "RadiusSteil", titel: "Radius steil", stellen: 2, einheit: "mm" },
  { feld: "AchseSteil", titel: "Achse steil", stellen: 0, einheit: "°" },
  { feld: "Exzentrizitaet", titel: "Exzentrizität", stellen: 2 },
  { feld: "HHDurchmesser", titel: "HH-Durchmesser", stellen: 1, einheit: "mm" },
  { feld: "Pupille", titel: "Pupille", stellen: 1, einheit: "mm" },
  { feld: "Lidspalte", titel: "Lidspalte", stellen: 1, einheit: "mm" },
];

export const TRAGEZEITEN = [
  "6 h/Tag",
  "8 h/Tag",
  "10 h/Tag",
  "12 h/Tag",
  "14 h/Tag",
];
export const BESCHWERDEN = [
  "keine",
  "Trockenheit",
  "Rötung",
  "Brennen",
  "Fremdkörpergefühl",
  "verschwommenes Sehen",
];
export const ERGEBNISSE = [
  "passt, weiter so",
  "Linse ändern",
  "Pflegemittel ändern",
  "Tragezeit verkürzen",
  "an Augenarzt verwiesen",
];

const zahl = (wert: unknown) => {
  if (wert === null || wert === undefined || wert === "") return null;
  const n = Number(wert);
  return Number.isFinite(n) && n !== 0 ? n : null;
};

/** Brechwert der Hornhaut aus dem Radius (n = 1,3375): 337,5 / r. */
export const hornhautDpt = (radius: unknown): number | null => {
  const r = zahl(radius);
  return r === null ? null : Math.round((337.5 / r) * 100) / 100;
};

/** Hornhautastigmatismus = Brechwert steil − Brechwert flach. */
export const hornhautAstigmatismus = (
  flach: unknown,
  steil: unknown,
): number | null => {
  const kf = hornhautDpt(flach);
  const ks = hornhautDpt(steil);
  return kf === null || ks === null ? null : Math.round((ks - kf) * 100) / 100;
};

/** Text im Baum, z. B. "Kontrolle 29.06.2026". */
export const untersuchungTitel = (u: Record<string, unknown>) => {
  const datum = u.Datum
    ? new Date(String(u.Datum)).toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "";
  return `${String(u.Art ?? "Kontrolle")} ${datum}`.trim();
};
