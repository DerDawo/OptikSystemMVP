// Vorschläge zum automatischen Ausfüllen der Formulare: Kreuze, die sich aus
// den gespeicherten Werten ableiten lassen (Diagnosen, Versorgungsart,
// Veränderung der Sehstärke gegenüber der vorherigen Brille). Es sind
// Vorschläge - in der Vorschau lassen sich alle Kästchen vor dem Druck an-
// und abwählen (siehe kaestchen()).
import dayjs from "dayjs";
import type {
  DocumentMergeEntities,
  MergeSource,
} from "./documentTemplateEngine";

const zahl = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const glaeser = (rechts: MergeSource, links: MergeSource) =>
  [rechts, links].filter((g): g is Record<string, unknown> => Boolean(g));

// Anklickbares Kästchen: in der Vorschau umschaltbar, gedruckt wird der
// angezeigte Zustand (FormulareDialog druckt aus der Vorschau)
export const kaestchen = (angekreuzt = false, klasse = "kaestchen") =>
  `<input type="checkbox" class="${klasse}"${angekreuzt ? " checked" : ""} />`;

// Kreuz als Hintergrundbild, damit es mit print-color-adjust gedruckt wird
const KREUZ =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="#000" stroke-width="1.4"/></svg>',
  );

export const KAESTCHEN_STYLES = `
  input.kaestchen, input.box { -webkit-appearance: none; appearance: none; background: #fff; cursor: pointer; padding: 0; }
  input.kaestchen:checked, input.box:checked { background: #fff url("${KREUZ}") center / 100% 100% no-repeat; }
`;

// Veränderung der Sehstärke um mindestens 0,5 dpt (Sphäre oder Zylinder,
// mindestens ein Auge) gegenüber der vorherigen Brille; null = kein Vergleich
// möglich, weil keine vorherige Brille mit Werten gespeichert ist
export const sehstaerkeVeraendert = (
  entities: DocumentMergeEntities,
): boolean | null => {
  const paare: [MergeSource, MergeSource][] = [
    [entities.glasRechts, entities.vorherigesGlasRechts],
    [entities.glasLinks, entities.vorherigesGlasLinks],
  ];
  let verglichen = false;
  for (const [neu, alt] of paare) {
    if (!neu || !alt) continue;
    for (const feld of ["Sph", "Cyl"]) {
      const a = zahl(neu[feld]);
      const b = zahl(alt[feld]);
      if (a === null || b === null) continue;
      verglichen = true;
      if (Math.abs(a - b) >= 0.5 - 1e-9) return true;
    }
  }
  return verglichen ? false : null;
};

// Alter der vorherigen Brille in ganzen Jahren
export const alterVorherigeBrille = (
  entities: DocumentMergeEntities,
): number | null => {
  const datum = entities.vorherigeBrille?.Datum;
  if (!datum) return null;
  const start = dayjs(String(datum));
  return start.isValid() ? dayjs().diff(start, "year") : null;
};

// Diagnosen der Rezeptanfrage aus den Refraktionswerten
export const diagnoseVorschlaege = (
  entities: DocumentMergeEntities,
): Set<string> => {
  const vorschlaege = new Set<string>();
  const alle = glaeser(entities.glasRechts, entities.glasLinks);
  const sphaerischesAequivalent = (g: Record<string, unknown>) =>
    (zahl(g.Sph) ?? 0) + (zahl(g.Cyl) ?? 0) / 2;
  for (const g of alle) {
    const sph = zahl(g.Sph);
    const cyl = zahl(g.Cyl);
    const add = zahl(g.Add);
    if (sph !== null && sph < 0) vorschlaege.add("Myopie (Kurzsichtigkeit)");
    if (sph !== null && sph > 0) vorschlaege.add("Hyperopie (Weitsichtigkeit)");
    if (cyl !== null && Math.abs(cyl) >= 0.25)
      vorschlaege.add("Astigmatismus (Hornhautverkrümmung)");
    if (add !== null && add > 0)
      vorschlaege.add("Presbyopie (Alterssichtigkeit)");
  }
  if (
    alle.length === 2 &&
    Math.abs(
      sphaerischesAequivalent(alle[0]) - sphaerischesAequivalent(alle[1]),
    ) >= 2
  ) {
    vorschlaege.add("Anisometropie (Ungleichsichtigkeit)");
  }
  return vorschlaege;
};

// Versorgungsart aus der Brillenart (Rezeptanfrage)
export const versorgungVorschlaege = (
  entities: DocumentMergeEntities,
): Set<string> => {
  const art = String(entities.brille?.BrillenArt ?? "").toLowerCase();
  const vorschlaege = new Set<string>();
  if (/gleitsicht/.test(art)) vorschlaege.add("Gleitsichtglas");
  else if (/bifokal|trifokal/.test(art)) vorschlaege.add("Bifokalglas");
  else if (/nah|lese/.test(art)) vorschlaege.add("Einstärkenglas Nähe");
  else if (/einstärken|fern/.test(art)) vorschlaege.add("Einstärkenglas Ferne");
  if (/sonne/.test(art)) vorschlaege.add("Sonnenbrille / Tönung");
  if (/sport|schutz/.test(art)) vorschlaege.add("Sportbrille / Schutzbrille");
  if (/lupe|vergrößer/.test(art))
    vorschlaege.add("Low Vision (vergr. Sehhilfe)");
  const prisma = glaeser(entities.glasRechts, entities.glasLinks).some(
    (g) => (zahl(g.Pr) ?? 0) > 0,
  );
  if (prisma) vorschlaege.add("Prismenbrille");
  return vorschlaege;
};

// "Werte ermittelt via" aus dem Refraktionsfeld des Auftrags
export const ermitteltViaVorschlaege = (
  entities: DocumentMergeEntities,
): Set<string> => {
  const refraktion = String(entities.brille?.Refraktion ?? "").toLowerCase();
  const vorschlaege = new Set<string>();
  if (/verordnung|rezept|vorrezept/.test(refraktion))
    vorschlaege.add("Übernahme Vorrezept");
  else if (/sehtest|refraktion|subjektiv|optometrisch/.test(refraktion))
    vorschlaege.add("Subjektive Refraktion");
  return vorschlaege;
};

// Anzahl der Gläser des Auftrags als Text für "____ Glas/Gläser"
export const anzahlGlaeser = (entities: DocumentMergeEntities): string => {
  const n = glaeser(entities.glasRechts, entities.glasLinks).length;
  return n ? String(n) : "";
};

// Brillenart als Kategorie für Ankreuzlisten (BAP-Antrag)
export const brillenartKategorie = (
  brillenArt: unknown,
):
  | "Fernbrille"
  | "Nahbrille"
  | "Bifokalbrille"
  | "Gleitsichtbrille"
  | "Officebrille"
  | null => {
  const art = String(brillenArt ?? "").toLowerCase();
  if (!art) return null;
  if (/office|raum|arbeitsplatz|bildschirm/.test(art)) return "Officebrille";
  if (/gleitsicht/.test(art)) return "Gleitsichtbrille";
  if (/bifokal|trifokal/.test(art)) return "Bifokalbrille";
  if (/nah|lese/.test(art)) return "Nahbrille";
  if (/fern|einstärken/.test(art)) return "Fernbrille";
  return null;
};

// Kassenart für die Ankreuzzeile der GKV-Verordnung aus dem Kassennamen
// (Ersatzkassen wie TK, Barmer, DAK, KKH, hkk laufen über den vdek)
export const kassenart = (krankenkasse: unknown): string | null => {
  const name = String(krankenkasse ?? "").toLowerCase();
  if (!name) return null;
  if (/\baok\b/.test(name)) return "AOK";
  if (/\blkk\b|svlfg|landwirtschaft/.test(name)) return "LKK";
  if (/\bbkk\b|betriebskrankenkasse/.test(name)) return "BKK";
  if (/\bikk\b|innungskrankenkasse/.test(name)) return "IKK";
  if (/knappschaft/.test(name)) return "Knappschaft";
  if (
    /\btk\b|techniker|barmer|\bdak\b|\bkkh\b|\bhkk\b|\bhek\b|ersatzkasse|vdek/.test(
      name,
    )
  )
    return "vDAK";
  return null;
};
