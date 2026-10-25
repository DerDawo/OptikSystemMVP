// Schuldnerliste (offene Posten): Hilfsfunktionen für die Dashboard-Karte.
import dayjs from "dayjs";

export type Schuldner = {
  id: number;
  kunde_id: number | null;
  Datum: string | null;
  Kunde: string;
  Ort: string | null;
  Beleg: string | null;
  AuftragsNr: string | null;
  KundenNr: string | null;
  Zahlart: string | null;
  Offen: number | string;
  Bemerkung: string | null;
  BezahltAm: string | null;
};

const betrag = (wert: number | string) => Number(wert) || 0;

export const summeOffen = (zeilen: Schuldner[]) =>
  Math.round(zeilen.reduce((s, z) => s + betrag(z.Offen), 0) * 100) / 100;

export const tageOffen = (datum: string | null, heute = dayjs()) =>
  datum ? Math.max(0, heute.startOf("day").diff(dayjs(datum), "day")) : 0;

/** Suche über Kunde, Beleg, Nummern und Bemerkung. */
export const filtereSchuldner = (zeilen: Schuldner[], suche: string) => {
  const begriff = suche.trim().toLowerCase();
  if (!begriff) return zeilen;
  return zeilen.filter((z) =>
    [z.Kunde, z.Beleg, z.AuftragsNr, z.KundenNr, z.Zahlart, z.Bemerkung, z.Ort]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(begriff),
  );
};
