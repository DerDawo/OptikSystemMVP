// Liest Termine aus einem iCalendar-Feed (private iCal-Adresse eines
// Google-Kalenders). Reines TypeScript ohne Deno-APIs, damit es auch in den
// Tests der App (vitest) läuft.
//
// Übernommen werden Einzeltermine und geänderte Einzeltermine einer Serie
// (RECURRENCE-ID). Serien selbst (RRULE, z. B. "Mittagspause" jede Woche)
// werden bewusst nicht aufgefächert, abgesagte Termine (STATUS:CANCELLED)
// gelten als gelöscht.

export type IcsTermin = {
  uid: string;
  titel: string;
  beschreibung: string;
  start: Date;
  ende: Date;
  ganztags: boolean;
  abgesagt: boolean;
};

const STANDARD_ZEITZONE = "Europe/Berlin";

// Zeilen entfalten (RFC 5545: Fortsetzungszeilen beginnen mit Leerzeichen/Tab)
const zeilen = (ics: string) =>
  ics
    .replace(/\r\n/g, "\n")
    .replace(/\n[ \t]/g, "")
    .split("\n")
    .filter((z) => z.trim() !== "");

const textWert = (wert: string) =>
  wert
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
    .trim();

// Abstand einer Zeitzone zu UTC (in ms) zu einem Zeitpunkt
const zonenAbstand = (utcMs: number, zeitzone: string) => {
  const teile = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: zeitzone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(new Date(utcMs))
      .map((t) => [t.type, t.value]),
  );
  const alsUtc = Date.UTC(
    Number(teile.year),
    Number(teile.month) - 1,
    Number(teile.day),
    Number(teile.hour),
    Number(teile.minute),
    Number(teile.second),
  );
  return alsUtc - utcMs;
};

// Ortszeit in einer Zeitzone -> Zeitpunkt (berücksichtigt Sommerzeit)
export const ortszeitNachDatum = (
  [jahr, monat, tag, stunde, minute, sekunde]: number[],
  zeitzone: string,
) => {
  const geraten = Date.UTC(jahr, monat - 1, tag, stunde, minute, sekunde);
  let zeit = geraten - zonenAbstand(geraten, zeitzone);
  zeit = geraten - zonenAbstand(zeit, zeitzone);
  return new Date(zeit);
};

// DTSTART/DTEND mit Parametern, z. B. "DTSTART;TZID=Europe/Berlin" und
// "20260412T100000"
export const leseZeitpunkt = (
  parameter: string,
  wert: string,
): { datum: Date; ganztags: boolean } | null => {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/.exec(
    wert.trim(),
  );
  if (!m) return null;
  const zahlen = m.slice(1, 7).map((x) => Number(x ?? 0));
  const tzid = /TZID=([^;:]+)/i.exec(parameter)?.[1];
  if (!m[4]) {
    return {
      datum: ortszeitNachDatum(zahlen, tzid ?? STANDARD_ZEITZONE),
      ganztags: true,
    };
  }
  if (m[7]) {
    const [j, mo, t, h, mi, s] = zahlen;
    return {
      datum: new Date(Date.UTC(j, mo - 1, t, h, mi, s)),
      ganztags: false,
    };
  }
  let zone = tzid ?? STANDARD_ZEITZONE;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
  } catch {
    zone = STANDARD_ZEITZONE;
  }
  return { datum: ortszeitNachDatum(zahlen, zone), ganztags: false };
};

export const leseIcs = (ics: string): IcsTermin[] => {
  const termine: IcsTermin[] = [];
  let aktuell: Record<string, { parameter: string; wert: string }> | null =
    null;
  for (const zeile of zeilen(ics)) {
    if (zeile === "BEGIN:VEVENT") {
      aktuell = {};
      continue;
    }
    if (zeile === "END:VEVENT") {
      const e = aktuell;
      aktuell = null;
      if (!e || !e.UID || !e.DTSTART || e.RRULE) continue;
      const start = leseZeitpunkt(e.DTSTART.parameter, e.DTSTART.wert);
      if (!start) continue;
      const ende = e.DTEND
        ? leseZeitpunkt(e.DTEND.parameter, e.DTEND.wert)
        : null;
      const wiederholung = e["RECURRENCE-ID"]?.wert.trim();
      termine.push({
        uid: wiederholung ? `${e.UID.wert}#${wiederholung}` : e.UID.wert,
        titel: textWert(e.SUMMARY?.wert ?? ""),
        beschreibung: textWert(e.DESCRIPTION?.wert ?? ""),
        start: start.datum,
        ende:
          ende?.datum ??
          new Date(
            start.datum.getTime() + (start.ganztags ? 86_400_000 : 3_600_000),
          ),
        ganztags: start.ganztags,
        abgesagt: (e.STATUS?.wert ?? "").toUpperCase() === "CANCELLED",
      });
      continue;
    }
    if (!aktuell) continue;
    const doppelpunkt = zeile.indexOf(":");
    if (doppelpunkt < 0) continue;
    const kopf = zeile.slice(0, doppelpunkt);
    const name = kopf.split(";")[0].toUpperCase();
    aktuell[name] = { parameter: kopf, wert: zeile.slice(doppelpunkt + 1) };
  }
  return termine;
};

// Wörter aus dem Termintitel, die Vor- oder Nachname sein können
export const namensWoerter = (titel: string) =>
  [
    ...new Set(
      titel
        .split(/[^A-Za-zÄÖÜäöüß-]+/)
        .map((w) => w.replace(/^-+|-+$/g, ""))
        .filter((w) => w.length >= 3),
    ),
  ].slice(0, 8);

type KundeKandidat = {
  id: number;
  Vorname?: string | null;
  Nachname?: string | null;
};

// Eindeutiger Kunde zu einem Titel: Nachname und Vorname kommen beide vor,
// oder es gibt genau einen Kunden mit einem der Nachnamen
export const passenderKunde = (
  titel: string,
  kandidaten: KundeKandidat[],
): number | null => {
  const woerter = namensWoerter(titel).map((w) => w.toLowerCase());
  const enthalten = (name?: string | null) =>
    Boolean(name) && woerter.includes(String(name).trim().toLowerCase());
  const mitNachname = kandidaten.filter((k) => enthalten(k.Nachname));
  const mitBeidem = mitNachname.filter((k) =>
    String(k.Vorname ?? "")
      .split(/\s+/)
      .some((v) => enthalten(v)),
  );
  if (mitBeidem.length === 1) return mitBeidem[0].id;
  if (mitBeidem.length === 0 && mitNachname.length === 1)
    return mitNachname[0].id;
  return null;
};
