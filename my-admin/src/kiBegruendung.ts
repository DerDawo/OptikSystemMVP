// KI-Vorschlag für Begründungstexte (Edge Function "begruendung-vorschlagen").
// Übertragen werden nur pseudonymisierte Angaben: Alter in Jahren, Brillenart,
// Messwerte, Diagnose und Beruf - keine Namen, Adressen, Geburtsdaten,
// Versicherten- oder Kundennummern.
import dayjs from "dayjs";
import type {
  DocumentMergeEntities,
  MergeSource,
} from "./documentTemplateEngine";
import {
  alterVorherigeBrille,
  sehstaerkeVeraendert,
} from "./formularVorschlaege";
import { supabase } from "./utils";

export type KiFormular =
  | "antrag-zuschuss"
  | "antrag-sozialamt"
  | "erprobungsprotokoll";

// Kategorien in `dokumentvorlage`, deren Formular eine Begründung enthält
export const KI_FORMULARE: Record<string, KiFormular> = {
  "Antrag Zuschuss": "antrag-zuschuss",
  "Antrag Sozialamt": "antrag-sozialamt",
  Erprobungsprotokoll: "erprobungsprotokoll",
};

const zahl = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
};

const text = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

const werte = (glas: MergeSource) =>
  glas
    ? {
        sph: zahl(glas.Sph),
        cyl: zahl(glas.Cyl),
        achse: zahl(glas.A),
        add: zahl(glas.Add),
        visus: zahl(glas.Vis),
      }
    : undefined;

export const kiEingabe = (
  formular: KiFormular,
  entities: DocumentMergeEntities,
) => {
  const geburtsdatum = entities.kunde?.Geburtsdatum;
  const geboren = geburtsdatum ? dayjs(String(geburtsdatum)) : null;
  return {
    formular,
    alterJahre: geboren?.isValid() ? dayjs().diff(geboren, "year") : undefined,
    brillenart: text(entities.brille?.BrillenArt),
    diagnose: text(entities.brille?.Diagnose),
    beruf: text(entities.kunde?.Tätigkeit),
    rechts: werte(entities.glasRechts),
    links: werte(entities.glasLinks),
    sehstaerkeVeraendert: sehstaerkeVeraendert(entities),
    alterVorherigeBrilleJahre: alterVorherigeBrille(entities),
  };
};

export const begruendungVorschlagen = async (
  formular: KiFormular,
  entities: DocumentMergeEntities,
): Promise<string> => {
  const { data, error } = await supabase.functions.invoke(
    "begruendung-vorschlagen",
    { body: kiEingabe(formular, entities) },
  );
  if (error) {
    // Die Function liefert eine verständliche Meldung im Feld "error"
    let meldung = "Der Vorschlag konnte nicht erstellt werden.";
    try {
      const antwort = await error.context?.json?.();
      if (antwort?.error) meldung = antwort.error;
    } catch {
      // Meldung bleibt allgemein
    }
    throw new Error(meldung);
  }
  return String(data?.begruendung ?? "");
};
