import dayjs from "dayjs";

/*
 * Terminzeiten im Viertelstundentakt (Termin anlegen/bearbeiten): Auswahl
 * 07:00 bis 20:00, Datum und Uhrzeit getrennt, gespeichert als Zeitpunkt.
 */

export const ERSTE_STUNDE = 7;
export const LETZTE_STUNDE = 20;

const zwei = (n: number) => String(n).padStart(2, "0");

export const VIERTELSTUNDEN: string[] = Array.from(
  { length: (LETZTE_STUNDE - ERSTE_STUNDE) * 4 + 1 },
  (_, i) => {
    const minuten = ERSTE_STUNDE * 60 + i * 15;
    return `${zwei(Math.floor(minuten / 60))}:${zwei(minuten % 60)}`;
  },
);

// gespeicherter Zeitpunkt -> Datum und Uhrzeit (lokal)
export const zerlege = (wert: unknown) => {
  if (!wert) return { datum: "", zeit: "" };
  const d = dayjs(String(wert));
  if (!d.isValid()) return { datum: "", zeit: "" };
  return { datum: d.format("YYYY-MM-DD"), zeit: d.format("HH:mm") };
};

// Datum + Uhrzeit (lokal) -> Zeitpunkt für die Datenbank
export const setzeZusammen = (datum: string, zeit: string) => {
  if (!datum) return null;
  const d = dayjs(`${datum}T${zeit || `${zwei(ERSTE_STUNDE)}:00`}`);
  return d.isValid() ? d.toISOString() : null;
};

// Uhrzeiten zur Auswahl; eine abweichende vorhandene (z. B. aus Google
// übernommen, 10:10) bleibt sichtbar
export const zeitOptionen = (vorhanden: string) =>
  vorhanden && !VIERTELSTUNDEN.includes(vorhanden)
    ? [...VIERTELSTUNDEN, vorhanden].sort()
    : VIERTELSTUNDEN;

// Ende: ohne Ende oder Ende nicht nach Start -> Start + 30 Minuten
export const endeNachStart = (start: unknown, ende: unknown) => {
  if (!start) return null;
  const s = dayjs(String(start));
  if (!s.isValid()) return null;
  const e = ende ? dayjs(String(ende)) : null;
  if (e && e.isValid() && e.isAfter(s)) return null;
  return s.add(30, "minute").toISOString();
};
