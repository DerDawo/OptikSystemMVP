import dayjs from "dayjs";

/*
 * Auftragsverfolgung (wie in Prisma): Brillenaufträge nach Bearbeitungsstand,
 * überfällige Fertigstellung und Abholung, nächste Kontaktlinsen-Kontakte.
 * Der Stand kommt aus den Datumsfeldern der Kartei ("Bestellt", "Fertig",
 * "Abholung"). Hier stehen nur die Regeln, damit sie sich testen lassen.
 */

export type Phase = "offen" | "bestellt" | "fertig" | "abgeholt";

export const PHASEN: Record<
  Phase,
  { name: string; farbe: "warning" | "info" | "primary" | "success" }
> = {
  offen: { name: "Nicht bestellt", farbe: "warning" },
  bestellt: { name: "Bestellt", farbe: "primary" },
  fertig: { name: "Fertig", farbe: "info" },
  abgeholt: { name: "Abgeholt", farbe: "success" },
};

// Brillenauftrag mit den Feldern Bestellt, Fertig, Abholung
type Auftrag = Record<string, unknown>;

const tag = (wert: unknown) => {
  if (!wert) return null;
  const d = dayjs(String(wert));
  return d.isValid() ? d.format("YYYY-MM-DD") : null;
};

/**
 * Bearbeitungsstand: Abholung bis heute = abgeholt; Fertig (oder ein
 * Abholtermin in der Zukunft, früher so genutzt) = fertig; Bestellt =
 * bestellt; sonst noch nicht bestellt.
 */
export const auftragsPhase = (a: Auftrag, heute = dayjs()): Phase => {
  const h = heute.format("YYYY-MM-DD");
  const abholung = tag(a.Abholung);
  if (abholung && abholung <= h) return "abgeholt";
  if (abholung || tag(a.Fertig)) return "fertig";
  if (tag(a.Bestellt)) return "bestellt";
  return "offen";
};

/** Ganze Tage seit einem Datum (0 = heute, null ohne Datum). */
export const tageSeit = (wert: unknown, heute = dayjs()) => {
  const t = tag(wert);
  if (!t) return null;
  return heute.startOf("day").diff(dayjs(t), "day");
};

export type Ansicht =
  | "offen"
  | "nichtBestellt"
  | "bestellt"
  | "fertig"
  | "ueberfaelligFertigung"
  | "ueberfaelligAbholung"
  | "abgeholt"
  | "clKontakte";

export type Fristen = {
  // so viele Tage nach dem Auftragsdatum ohne "Fertig" -> überfällig
  fertigungTage: number;
  // so viele Tage nach "Fertig" ohne Abholung -> überfällig
  abholungTage: number;
  // Kontaktlinsen: Nachkontrollen bis so viele Tage voraus
  clVorausTage: number;
};

export const FRISTEN_VORGABE: Fristen = {
  fertigungTage: 10,
  abholungTage: 14,
  clVorausTage: 30,
};

export const ANSICHTEN: {
  id: Ansicht;
  name: string;
  hinweis: (f: Fristen) => string;
}[] = [
  {
    id: "offen",
    name: "Alle offenen Aufträge",
    hinweis: () => "noch nicht abgeholt",
  },
  {
    id: "nichtBestellt",
    name: "Noch nicht bestellt",
    hinweis: () => "weder bestellt noch fertig",
  },
  {
    id: "bestellt",
    name: "Bestellt, nicht fertig",
    hinweis: () => "Ware unterwegs oder in der Werkstatt",
  },
  {
    id: "fertig",
    name: "Fertig, nicht abgeholt",
    hinweis: () => "liegt zur Abholung bereit",
  },
  {
    id: "ueberfaelligFertigung",
    name: "Überfällige Fertigstellung",
    hinweis: (f) => `seit über ${f.fertigungTage} Tagen nicht fertig`,
  },
  {
    id: "ueberfaelligAbholung",
    name: "Überfällige Abholung",
    hinweis: (f) => `fertig seit über ${f.abholungTage} Tagen`,
  },
  {
    id: "abgeholt",
    name: "Abgeholt",
    hinweis: () => "erledigte Aufträge im Zeitraum",
  },
  {
    id: "clKontakte",
    name: "Kontaktlinsen: nächste Kontakte",
    hinweis: (f) =>
      `Nachkontrollen überfällig oder in den nächsten ${f.clVorausTage} Tagen`,
  },
];

const iso = (d: dayjs.Dayjs) => d.format("YYYY-MM-DD");

/**
 * Filter für die Datenbankabfrage (Schreibweise des Data Providers) einer
 * Ansicht. `von`/`bis` begrenzen das Auftragsdatum (bei Kontaktlinsen den
 * Nachkontrolltermin nicht).
 */
export const ansichtFilter = (
  ansicht: Ansicht,
  fristen: Fristen,
  zeitraum: { von?: string | null; bis?: string | null },
  heute = dayjs(),
): { resource: "brille" | "kontaktlinse"; filter: Record<string, string> } => {
  const h = heute.startOf("day");
  if (ansicht === "clKontakte") {
    return {
      resource: "kontaktlinse",
      filter: {
        "Nachkontrolltermin@not.is": "null",
        "Nachkontrolltermin@lte": iso(h.add(fristen.clVorausTage, "day")),
        ...(zeitraum.von ? { "Nachkontrolltermin@gte": zeitraum.von } : {}),
      },
    };
  }
  const filter: Record<string, string> = {};
  if (zeitraum.von) filter["Datum@gte"] = zeitraum.von;
  if (zeitraum.bis) filter["Datum@lt"] = iso(dayjs(zeitraum.bis).add(1, "day"));
  switch (ansicht) {
    case "offen":
      filter["Abholung@is"] = "null";
      break;
    case "nichtBestellt":
      filter["Bestellt@is"] = "null";
      filter["Fertig@is"] = "null";
      filter["Abholung@is"] = "null";
      break;
    case "bestellt":
      filter["Bestellt@not.is"] = "null";
      filter["Fertig@is"] = "null";
      filter["Abholung@is"] = "null";
      break;
    case "fertig":
      filter["Fertig@not.is"] = "null";
      filter["Abholung@is"] = "null";
      break;
    case "ueberfaelligFertigung": {
      const grenze = iso(h.subtract(fristen.fertigungTage, "day"));
      // "Datum" ist ein Zeitstempel: alles vor dem Folgetag der Grenze
      const bis = iso(dayjs(grenze).add(1, "day"));
      filter["Datum@lt"] =
        filter["Datum@lt"] && filter["Datum@lt"] < bis
          ? filter["Datum@lt"]
          : bis;
      filter["Fertig@is"] = "null";
      filter["Abholung@is"] = "null";
      break;
    }
    case "ueberfaelligAbholung":
      filter["Fertig@lte"] = iso(h.subtract(fristen.abholungTage, "day"));
      filter["Abholung@is"] = "null";
      break;
    case "abgeholt":
      filter["Abholung@not.is"] = "null";
      filter["Abholung@lte"] = iso(h);
      break;
  }
  return { resource: "brille", filter };
};

/** Sortierung je Ansicht: das Dringendste zuerst. */
export const ansichtSortierung = (ansicht: Ansicht) => {
  switch (ansicht) {
    case "clKontakte":
      return { field: "Nachkontrolltermin", order: "ASC" as const };
    case "ueberfaelligAbholung":
    case "fertig":
      return { field: "Fertig", order: "ASC" as const };
    case "abgeholt":
      return { field: "Abholung", order: "DESC" as const };
    default:
      return { field: "Datum", order: "ASC" as const };
  }
};

/**
 * Gescannte oder eingetippte Auftrags-Nr.: nur Ziffern zählen (Scanner
 * schicken teils Sternchen oder ein Präfix mit). null, wenn keine Nummer.
 */
export const auftragsNummer = (eingabe: string): number | null => {
  const ziffern = eingabe.replace(/\D/g, "");
  if (!ziffern || ziffern.length > 12) return null;
  const n = Number(ziffern);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
};

export type ScanAktion = "oeffnen" | "Bestellt" | "Fertig" | "Abholung";

export const SCAN_AKTIONEN: { id: ScanAktion; name: string; glas?: string }[] =
  [
    { id: "oeffnen", name: "Auftrag öffnen" },
    { id: "Bestellt", name: "als bestellt markieren", glas: "bestellt" },
    { id: "Fertig", name: "als fertig markieren", glas: "eingetroffen" },
    { id: "Abholung", name: "als abgeholt markieren", glas: "abgeholt" },
  ];

// Code 39: je Zeichen 5 Striche und 4 Lücken, "w" = breit, "n" = schmal
const CODE39: Record<string, string> = {
  "0": "nnnwwnwnn",
  "1": "wnnwnnnnw",
  "2": "nnwwnnnnw",
  "3": "wnwwnnnnn",
  "4": "nnnwwnnnw",
  "5": "wnnwwnnnn",
  "6": "nnwwwnnnn",
  "7": "nnnwnnwnw",
  "8": "wnnwnnwnn",
  "9": "nnwwnnwnn",
  "*": "nwnnwnwnn",
};

/**
 * Strichcode (Code 39, nur Ziffern) als SVG für Auftragszettel; jeder
 * Handscanner liest ihn ohne Einstellung. Leer bei ungültiger Nummer.
 */
export const code39Svg = (nummer: string, klasse = "strichcode") => {
  if (!/^\d{1,12}$/.test(nummer)) return "";
  const breit = 3;
  const ruhe = 10;
  let x = ruhe;
  const striche: string[] = [];
  const zeichen = `*${nummer}*`;
  for (let z = 0; z < zeichen.length; z++) {
    const muster = CODE39[zeichen[z]];
    for (let i = 0; i < 9; i++) {
      const w = muster[i] === "w" ? breit : 1;
      if (i % 2 === 0) striche.push(`M${x} 0h${w}v1h-${w}z`);
      x += w;
    }
    if (z < zeichen.length - 1) x += 1; // Lücke zwischen den Zeichen
  }
  const gesamt = x + ruhe;
  return `<svg class="${klasse}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${gesamt} 1" preserveAspectRatio="none" shape-rendering="crispEdges" role="img" aria-label="Strichcode Auftrag ${nummer}"><rect width="${gesamt}" height="1" fill="#fff"/><path d="${striche.join("")}" fill="#000"/></svg>`;
};
