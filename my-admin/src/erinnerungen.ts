import dayjs from "dayjs";

/*
 * Regeln für die Karte "Erinnerungen" im Dashboard: Reihenfolge und
 * Fälligkeitstext. Getrennt von der Oberfläche, damit sie sich testen lassen.
 */

export type Erinnerung = {
  id: number | string;
  created_at?: string | null;
  Text: string;
  Faellig?: string | null;
  Erledigt?: string | null;
  kunde_id?: number | string | null;
};

// Vorschläge für die Eingabe; freier Text bleibt möglich.
export const ERINNERUNG_VORSCHLAEGE = [
  "Bruchrezept anfertigen",
  "Kostenvoranschlag nachfassen",
  "Glas nachbestellen",
  "Kunden zurückrufen",
  "Rezept beim Augenarzt anfordern",
  "Garantiefall an Hersteller schicken",
] as const;

// Überfällige zuerst (älteste oben), dann ohne Datum, dann künftige nach
// Datum; bei Gleichstand die zuerst angelegte oben.
export const sortiereErinnerungen = (
  liste: Erinnerung[],
  heute = dayjs(),
): Erinnerung[] => {
  const tag = heute.format("YYYY-MM-DD");
  const rang = (e: Erinnerung) => (!e.Faellig ? 1 : e.Faellig <= tag ? 0 : 2);
  return [...liste].sort(
    (a, b) =>
      rang(a) - rang(b) ||
      String(a.Faellig ?? "").localeCompare(String(b.Faellig ?? "")) ||
      String(a.created_at ?? "").localeCompare(String(b.created_at ?? "")),
  );
};

export type Faelligkeit = {
  text: string;
  ueberfaellig: boolean;
};

export const faelligkeit = (
  faellig: string | null | undefined,
  heute = dayjs(),
): Faelligkeit | null => {
  if (!faellig) return null;
  const tage = dayjs(faellig).startOf("day").diff(heute.startOf("day"), "day");
  if (tage < 0)
    return {
      text: `seit ${dayjs(faellig).format("DD.MM.YYYY")} fällig`,
      ueberfaellig: true,
    };
  if (tage === 0) return { text: "heute fällig", ueberfaellig: false };
  if (tage === 1) return { text: "morgen fällig", ueberfaellig: false };
  return {
    text: `fällig am ${dayjs(faellig).format("DD.MM.YYYY")}`,
    ueberfaellig: false,
  };
};

// Zählt für die Zahl oben rechts: alles, was heute oder früher fällig ist
// oder kein Datum hat.
export const anzahlFaellig = (liste: Erinnerung[], heute = dayjs()) => {
  const tag = heute.format("YYYY-MM-DD");
  return liste.filter((e) => !e.Faellig || e.Faellig <= tag).length;
};
