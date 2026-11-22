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

// Entspiegelungen mit festem Aufpreis auf das Grundglas (Zuschlagsliste des
// Betriebs). Ultra Glide ist im Glaspreis enthalten und Mindeststandard;
// Multi Plus wird nur noch angezeigt, ist aber nicht mehr wählbar. Ersetzt
// die Entspiegelungen und Preise aus den SF6-Katalogen.
export type EntspiegelungZuschlag = {
  id: string;
  bezeichnung: string;
  preis: number;
  waehlbar: boolean;
};

export const ENTSPIEGELUNG_ZUSCHLAEGE: EntspiegelungZuschlag[] = [
  { id: "multi-plus", bezeichnung: "Multi Plus", preis: 0, waehlbar: false },
  { id: "ultra-glide", bezeichnung: "Ultra Glide", preis: 0, waehlbar: true },
  { id: "nano-glide", bezeichnung: "Nano Glide", preis: 28, waehlbar: true },
  { id: "blue-glide", bezeichnung: "Blue Glide", preis: 25, waehlbar: true },
  { id: "polar-glide", bezeichnung: "Polar Glide", preis: 35, waehlbar: true },
  { id: "pure-glide", bezeichnung: "Pure Glide", preis: 42, waehlbar: true },
  { id: "color", bezeichnung: "Color", preis: 38, waehlbar: true },
  { id: "mirror", bezeichnung: "Mirror", preis: 25, waehlbar: true },
  {
    id: "kantenfilter",
    bezeichnung: "Kantenfilter",
    preis: 46,
    waehlbar: true,
  },
];

/** Mindestentspiegelung, im Preis enthalten und vorausgewählt. */
export const STANDARD_ENTSPIEGELUNG = "ultra-glide";

const entspiegelungSchluessel = (name: string) =>
  name
    .toLowerCase()
    .replace(/_ac$|\bbs$/g, "")
    .replace(/[^a-z]/g, "");

/**
 * Ordnet eine gespeicherte Vergütung (Freitext am Glastyp, z. B.
 * "UltraGlide", "Nano Glide_AC" oder "Blue Glide") einer Entspiegelung der
 * Zuschlagsliste zu. Nicht wählbare (Multi Plus) und unbekannte Namen
 * ergeben die Mindestentspiegelung.
 */
export const entspiegelungAusName = (
  name: string | null | undefined,
): EntspiegelungZuschlag => {
  const schluessel = entspiegelungSchluessel(name ?? "");
  const treffer = ENTSPIEGELUNG_ZUSCHLAEGE.find(
    (e) => e.waehlbar && entspiegelungSchluessel(e.bezeichnung) === schluessel,
  );
  return (
    treffer ??
    ENTSPIEGELUNG_ZUSCHLAEGE.find((e) => e.id === STANDARD_ENTSPIEGELUNG)!
  );
};

/** "+0 €", "+28 €", "+12,50 €" wie in der Zuschlagsliste */
export const zuschlagText = (preis: number) =>
  `+${new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: Number.isInteger(preis) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(preis)} €`;
