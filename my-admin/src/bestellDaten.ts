/*
 * Bestelldaten für das Online-Portal des Glasherstellers (Bestelloptionen):
 * Werte wie im Portal üblich (Sph/Cyl/Add mit Vorzeichen, Achse ganzzahlig),
 * Kommission mit Kundenname und Auftragsnummer, alles auch als Textblock
 * zum Kopieren.
 */

type Datensatz = Record<string, unknown>;

export const BESTELL_WERTE: {
  feld: string;
  titel: string;
  stellen: number;
  vorzeichen?: boolean;
}[] = [
  { feld: "Sph", titel: "Sph", stellen: 2, vorzeichen: true },
  { feld: "Cyl", titel: "Cyl", stellen: 2, vorzeichen: true },
  { feld: "A", titel: "Achse", stellen: 0 },
  { feld: "Add", titel: "Add", stellen: 2, vorzeichen: true },
  { feld: "Pr", titel: "Prisma", stellen: 2 },
  { feld: "B", titel: "Basis", stellen: 0 },
  { feld: "PD", titel: "PD", stellen: 1 },
  { feld: "y_h", titel: "Höhe", stellen: 1 },
  { feld: "HSA", titel: "HSA", stellen: 1 },
];

const zahl = (wert: unknown) => {
  if (wert === null || wert === undefined || wert === "") return null;
  const n = Number(String(wert).replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

export const bestellWert = (
  wert: unknown,
  w: { stellen: number; vorzeichen?: boolean },
) => {
  const n = zahl(wert);
  if (n === null) return "";
  const text = n.toFixed(w.stellen);
  return w.vorzeichen && n > 0 ? `+${text}` : text;
};

const text = (wert: unknown) =>
  wert === null || wert === undefined ? "" : String(wert).trim();

export const kommission = (
  kunde: Datensatz | undefined,
  auftragId: unknown,
) => {
  const name = [text(kunde?.Nachname), text(kunde?.Vorname)]
    .filter(Boolean)
    .join(", ");
  return [name, `Auftrag ${text(auftragId)}`].filter(Boolean).join(" · ");
};

// Seiten für die Bestellung: die mit "Liefern"; ist keine angehakt, beide
export const bestellSeiten = <T extends { glas?: Datensatz }>(augen: T[]) => {
  const mitGlas = augen.filter((a) => a.glas);
  const geliefert = mitGlas.filter((a) => a.glas?.Liefern === true);
  return geliefert.length > 0 ? geliefert : mitGlas;
};

export const glasAngaben = (
  glastyp: Datensatz | undefined,
  fassung: Datensatz | undefined,
) =>
  [
    ["Glas", text(glastyp?.Bezeichnung)],
    ["Vergütung", text(glastyp?.Verguetung)],
    ["Farbe", text(glastyp?.Farbe)],
    ["Durchmesser", text(glastyp?.GlasGroesse)],
    ["Sonstiges", text(glastyp?.Sonstiges)],
    [
      "Fassung",
      [text(fassung?.Bezeichnung), text(fassung?.Groesse)]
        .filter(Boolean)
        .join(" "),
    ],
  ].filter(([, wert]) => wert) as [string, string][];

export const bestellText = ({
  kunde,
  auftragId,
  glastyp,
  fassung,
  augen,
}: {
  kunde?: Datensatz;
  auftragId: unknown;
  glastyp?: Datensatz;
  fassung?: Datensatz;
  augen: { seite: string; glas?: Datensatz }[];
}) =>
  [
    `Kommission: ${kommission(kunde, auftragId)}`,
    ...glasAngaben(glastyp, fassung).map(
      ([titel, wert]) => `${titel}: ${wert}`,
    ),
    ...bestellSeiten(augen).map(
      ({ seite, glas }) =>
        `${seite === "R" ? "Rechts" : "Links"}: ${BESTELL_WERTE.map((w) => [
          w.titel,
          bestellWert(glas?.[w.feld], w),
        ])
          .filter(([, wert]) => wert)
          .map(([titel, wert]) => `${titel} ${wert}`)
          .join(", ")}`,
    ),
  ].join("\n");

// "portal.example.de" -> "https://portal.example.de"
export const portalUrl = (eingabe: unknown) => {
  const t = text(eingabe);
  if (!t) return "";
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
};

type Hersteller = { id: string; code?: string | null; name?: string | null };

// Hersteller des Glastyps: über den Glaskatalog, sonst über den Namen
export const passenderHersteller = (
  hersteller: Hersteller[],
  katalogHerstellerId: unknown,
  glastypHersteller: unknown,
) => {
  const perKatalog = hersteller.find((h) => h.id === katalogHerstellerId);
  if (perKatalog) return perKatalog;
  const name = text(glastypHersteller).toLowerCase();
  if (!name) return undefined;
  return hersteller.find((h) => {
    const n = text(h.name).toLowerCase();
    const c = text(h.code).toLowerCase();
    return (n && (name.includes(n) || n.includes(name))) || (c && name === c);
  });
};
