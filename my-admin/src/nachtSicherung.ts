/*
 * Anzeige-Logik für die Karte „Nächtliche Sicherung“ (Einstellungen →
 * Datensicherung). Die Daten kommen von der Edge Function
 * `datensicherung-starten` (GET).
 */

export type SicherungsLauf = {
  zeit: string;
  fertig: string | null;
  status: string;
  ergebnis: string | null;
  vonHand: boolean;
};

export type SicherungsStand = {
  letzte: SicherungsLauf | null;
  letzteErfolgreiche: SicherungsLauf | null;
};

export type SicherungsAnzeige = {
  ampel: "success" | "warning" | "error" | "info";
  text: string;
  laeuft: boolean;
};

const STUNDE = 60 * 60 * 1000;

export const zeitpunkt = (iso: string, jetzt: Date): string => {
  const d = new Date(iso);
  const uhr = d.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  });
  const tag = (x: Date) =>
    x.toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" });
  if (tag(d) === tag(jetzt)) return `heute ${uhr} Uhr`;
  const gestern = new Date(jetzt.getTime() - 24 * STUNDE);
  if (tag(d) === tag(gestern)) return `gestern ${uhr} Uhr`;
  return `${d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Berlin",
  })} ${uhr} Uhr`;
};

export const sicherungsAnzeige = (
  stand: SicherungsStand,
  jetzt: Date,
): SicherungsAnzeige => {
  const { letzte, letzteErfolgreiche } = stand;
  if (!letzte) {
    return {
      ampel: "warning",
      text: "Es wurde noch keine Sicherung erstellt.",
      laeuft: false,
    };
  }
  if (letzte.status !== "completed") {
    return {
      ampel: "info",
      text: `Sicherung läuft seit ${zeitpunkt(letzte.zeit, jetzt)} (dauert etwa 2–5 Minuten).`,
      laeuft: true,
    };
  }
  const erfolgText = letzteErfolgreiche
    ? `Letzte erfolgreiche Sicherung: ${zeitpunkt(letzteErfolgreiche.fertig ?? letzteErfolgreiche.zeit, jetzt)}.`
    : "Es gibt noch keine erfolgreiche Sicherung.";
  if (letzte.ergebnis !== "success") {
    return {
      ampel: "error",
      text: `Die letzte Sicherung (${zeitpunkt(letzte.zeit, jetzt)}) ist fehlgeschlagen. ${erfolgText}`,
      laeuft: false,
    };
  }
  const alter =
    jetzt.getTime() - new Date(letzte.fertig ?? letzte.zeit).getTime();
  if (alter > 36 * STUNDE) {
    return {
      ampel: "warning",
      text: `${erfolgText} Das ist länger als einen Tag her.`,
      laeuft: false,
    };
  }
  return { ampel: "success", text: erfolgText, laeuft: false };
};
