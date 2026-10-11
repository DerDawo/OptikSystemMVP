// Regeln des Glasassistenten (Aufbau wie in Prisma): Vorgaben filtern die
// Grundgläser, Optionen werden in Farbe / Entspiegelung / Hartschicht und
// Sonstiges eingeteilt, Preise hängen am gewählten Durchmesser.

export type Vorgabe =
  | "einstaerken"
  | "mehrstaerken"
  | "gleitsicht"
  | "office"
  | "rlDurchmesser"
  | "kunststoff"
  | "mineral"
  | "hoeherbrechend"
  | "asphaerisch"
  | "phototrop";

export const VORGABEN: { id: Vorgabe; name: string }[] = [
  { id: "einstaerken", name: "Einstärken" },
  { id: "mehrstaerken", name: "Zwei/Drei Stärken" },
  { id: "gleitsicht", name: "Gleitsicht" },
  { id: "office", name: "Office" },
  { id: "rlDurchmesser", name: "r/l untersch. Durchmesser" },
  { id: "kunststoff", name: "Kunststoff" },
  { id: "mineral", name: "Mineral" },
  { id: "hoeherbrechend", name: "Höherbrechend" },
  { id: "asphaerisch", name: "Asphärisch" },
  { id: "phototrop", name: "Phototrop" },
];

export type Grundglas = {
  bezeichnung: string;
  brechungsindex?: number | null;
  basispreis?: number | null;
  glasart?: number | null;
  material?: number | null;
  durchmesser?: Record<string, number> | null;
};

export type GlasOption = {
  bezeichnung: string;
  typ: "beschichtung" | "farbe";
  preis?: number | null;
};

const GLASART_JE_VORGABE: Partial<Record<Vorgabe, number[]>> = {
  einstaerken: [0],
  mehrstaerken: [1, 2],
  gleitsicht: [3],
  office: [4],
};

const MATERIAL_JE_VORGABE: Partial<Record<Vorgabe, number[]>> = {
  kunststoff: [2, 3, 4],
  mineral: [1],
};

const PHOTOTROP =
  /\b(trans\w*|tr|trn|tr(br|gr|gn|gs|bernstein|amethyst|sapphire|saphir|emerald|ruby|grey|gray|grau|braun|brown|grün)\w*|photo\w*|pgx|pbx|sensity|adapt\w*|umatic|drivewear|xtra\w*|sunsensor|colormatic|chromatic|ultrachrom\w*|tgns)\b/i;
const ASPHAERISCH = /\b(as|asp|asph\w*|aspher\w*)\b/i;

// Vorgaben einer Gruppe (Glasart, Material) gelten als "oder", Gruppen
// untereinander als "und". Unbekannte Glasart/Material (alte Importe ohne
// diese Angaben) schließen ein Glas nicht aus.
export const passtZuVorgaben = (glas: Grundglas, vorgaben: Set<Vorgabe>) => {
  const gruppe = (tabelle: Partial<Record<Vorgabe, number[]>>) =>
    [...vorgaben].flatMap((v) => tabelle[v] ?? []);
  const arten = gruppe(GLASART_JE_VORGABE);
  if (arten.length && glas.glasart != null && !arten.includes(glas.glasart))
    return false;
  const materialien = gruppe(MATERIAL_JE_VORGABE);
  if (
    materialien.length &&
    glas.material != null &&
    !materialien.includes(glas.material)
  )
    return false;
  if (vorgaben.has("hoeherbrechend") && !((glas.brechungsindex ?? 0) >= 1.6))
    return false;
  if (vorgaben.has("asphaerisch") && !ASPHAERISCH.test(glas.bezeichnung))
    return false;
  if (vorgaben.has("phototrop") && !PHOTOTROP.test(glas.bezeichnung))
    return false;
  return true;
};

const ENTSPIEGELUNG =
  /(entspieg|\bar\b|\bar[ -]|reflex|glide|mirror|multi|\bhmc\b|\bsuper\b|clean|lotus|crizal|duravision|\bdv\b|flash|blue|hdr|oasis|satin|\bmax\b|premium|perfect|platin|silver|gold|diamond|sapphire|saphir|rock|prevencia|meiryo|shine|backside)/i;

export type OptionKategorie = "farbe" | "entspiegelung" | "hartschicht";

// Die SF6-Kataloge unterscheiden Entspiegelung und Hartschicht/Sonstiges
// nicht; die Einteilung folgt der Bezeichnung wie in Prisma.
export const optionKategorie = (option: GlasOption): OptionKategorie => {
  if (option.typ === "farbe") return "farbe";
  return ENTSPIEGELUNG.test(option.bezeichnung)
    ? "entspiegelung"
    : "hartschicht";
};

const ersteZahl = (text: string) => Number.parseInt(text, 10) || 0;

// "60", "65", "65/70", ... aufsteigend
export const durchmesserListe = (glas?: Grundglas | null) =>
  Object.entries(glas?.durchmesser ?? {})
    .map(([durchmesser, preis]) => ({ durchmesser, preis }))
    .sort(
      (a, b) =>
        ersteZahl(a.durchmesser) - ersteZahl(b.durchmesser) ||
        a.durchmesser.localeCompare(b.durchmesser),
    );

// Grundglaspreis für einen Durchmesser, sonst der Basispreis
export const grundglasPreis = (
  glas: Grundglas | null | undefined,
  durchmesser: string | null | undefined,
) => {
  if (!glas) return 0;
  const jeDurchmesser = durchmesser
    ? glas.durchmesser?.[durchmesser]
    : undefined;
  return jeDurchmesser ?? glas.basispreis ?? 0;
};
