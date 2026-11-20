// Refraktionsprotokoll: Arten der Einträge mit ihren Feldern. Ohne React,
// damit es sich testen lässt.

export type RefraktionsArt =
  | "Objektiv"
  | "Subjektiv"
  | "Subjektiv MKH"
  | "Tonometrie"
  | "Medizinisches";

export type AugenWert = { feld: string; titel: string; stellen: number };

const W = (feld: string, titel: string, stellen = 2): AugenWert => ({
  feld,
  titel,
  stellen,
});

const STAERKE = [W("Sph", "Sph"), W("Cyl", "Cyl"), W("A", "A", 0)];
const SUBJEKTIV = [
  ...STAERKE,
  W("Add", "Add"),
  W("Prisma", "Prisma"),
  W("Basis", "Basis", 0),
  W("VisSC", "Vis sc"),
  W("VisCC", "Vis cc"),
  W("PD", "PD", 1),
  W("HSA", "HSA", 1),
];

export const MKH_TESTS: {
  feld: string;
  titel: string;
  vorschlaege: string[];
}[] = [
  {
    feld: "Kreuztest",
    titel: "Kreuztest",
    vorschlaege: [
      "zentriert",
      "versetzt horizontal",
      "versetzt vertikal",
      "versetzt schräg",
    ],
  },
  {
    feld: "Zeigertest",
    titel: "Zeigertest",
    vorschlaege: ["zentriert", "versetzt horizontal", "versetzt vertikal"],
  },
  {
    feld: "Doppelzeigertest",
    titel: "Doppelzeigertest",
    vorschlaege: ["zentriert", "versetzt horizontal", "versetzt vertikal"],
  },
  {
    feld: "Hakentest",
    titel: "Hakentest",
    vorschlaege: ["gleich groß", "rechts größer", "links größer"],
  },
  {
    feld: "Stereotest",
    titel: "Stereotest",
    vorschlaege: ["vorhanden", "verzögert", "nicht vorhanden"],
  },
  {
    feld: "Valenztest",
    titel: "Valenztest",
    vorschlaege: [
      "ausgeglichen",
      "rechts dominant",
      "links dominant",
      "Suppression",
    ],
  },
];

export type ArtBeschreibung = {
  art: RefraktionsArt;
  titel: string;
  augen: AugenWert[];
  geraet?: boolean;
  visBino?: boolean;
  mkh?: boolean;
  anamnese?: boolean;
};

export const ARTEN: ArtBeschreibung[] = [
  {
    art: "Objektiv",
    titel: "Objektive Refraktion",
    augen: [...STAERKE, W("PD", "PD", 1)],
    geraet: true,
  },
  {
    art: "Subjektiv",
    titel: "Subjektive Refraktion",
    augen: SUBJEKTIV,
    visBino: true,
  },
  {
    art: "Subjektiv MKH",
    titel: "Subjektive Refraktion MKH",
    augen: SUBJEKTIV,
    visBino: true,
    mkh: true,
  },
  {
    art: "Tonometrie",
    titel: "nc-Tonometrie",
    augen: [W("IOD", "IOD (mmHg)", 0), W("Pachymetrie", "Pachymetrie (µm)", 0)],
    geraet: true,
  },
  {
    art: "Medizinisches",
    titel: "Medizinische Sachverhalte",
    augen: [],
    anamnese: true,
  },
];

export const artBeschreibung = (art: unknown) =>
  ARTEN.find((a) => a.art === art) ?? ARTEN[1];

/** "17.11.2026 14:30" (ohne Uhrzeit, wenn keine erfasst ist). */
export const zeitpunktText = (wert: unknown) => {
  if (!wert) return "";
  const d = new Date(String(wert));
  if (Number.isNaN(d.getTime())) return "";
  const tag = d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const uhr = d.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return uhr === "00:00" ? tag : `${tag} ${uhr}`;
};

const zahl = (w: unknown) => {
  if (w === null || w === undefined || w === "") return null;
  const n = Number(w);
  return Number.isFinite(n) ? n : null;
};

/** Kurzform der Stärke, z. B. "-1,25 / -0,50 × 180 Add 2,00". */
export const staerkeKurz = (werte: Record<string, unknown>, endung = "") => {
  const f = (n: number) =>
    new Intl.NumberFormat("de-DE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      signDisplay: "exceptZero",
    }).format(n);
  const sph = zahl(werte[`Sph${endung}`]);
  if (sph === null) return "";
  const cyl = zahl(werte[`Cyl${endung}`]);
  const a = zahl(werte[`A${endung}`] ?? werte[`Achse${endung}`]);
  const add = zahl(werte[`Add${endung}`]);
  return [
    f(sph),
    cyl ? `/ ${f(cyl)}${a !== null ? ` × ${Math.round(a)}°` : ""}` : "",
    add ? `Add ${f(add)}` : "",
  ]
    .filter(Boolean)
    .join(" ");
};
