import dayjs from "dayjs";
import "dayjs/locale/de";
import { anredeGruss } from "./aufgabenRegeln";

/*
 * Terminvorschlag per WhatsApp/SMS (Vorlage im Nachrichten-Handy): bis zu
 * drei Zeiten auswählen, daraus entsteht der Text. Hier nur die Texte und
 * Zeitrechnungen, damit sie testbar sind.
 */

export const MAX_VORSCHLAEGE = 3;

type Kunde = { Anrede?: string | null; Nachname?: string | null };

/** "Dienstag, 25.11. um 10:00 Uhr" (lokale Zeit) */
export const terminZeile = (wert: string) =>
  dayjs(wert).locale("de").format("dddd, DD.MM. [um] HH:mm [Uhr]");

/**
 * Vorgabe für die erste Zeit: nächster Werktag (Mo–Fr) um 10:00, die
 * weiteren jeweils einen Werktag später.
 */
export const vorgabeZeit = (index: number, jetzt = dayjs()) => {
  let tag = jetzt.startOf("day");
  let gezaehlt = -1;
  while (gezaehlt < index) {
    tag = tag.add(1, "day");
    const wt = tag.day();
    if (wt !== 0 && wt !== 6) gezaehlt++;
  }
  return tag.hour(10).minute(0).format("YYYY-MM-DDTHH:mm");
};

/** Überschneiden sich zwei Zeiträume (Ende jeweils exklusiv)? */
export const ueberschneidet = (
  aStart: Date,
  aEnde: Date,
  bStart: Date,
  bEnde: Date,
) => aStart < bEnde && bStart < aEnde;

export const terminvorschlagText = ({
  kunde,
  art,
  zeiten,
  firma,
}: {
  kunde?: Kunde | null;
  art: string;
  zeiten: string[];
  firma: string;
}) => {
  const gueltig = zeiten
    .filter((z) => z && dayjs(z).isValid())
    .sort((a, b) => dayjs(a).valueOf() - dayjs(b).valueOf());
  const fuer = art.trim() ? ` für Ihren Termin „${art.trim()}“` : "";
  const einleitung =
    gueltig.length === 1
      ? `gerne schlagen wir Ihnen${fuer} folgende Zeit vor:`
      : `gerne schlagen wir Ihnen${fuer} folgende Zeiten vor:`;
  const bitte =
    gueltig.length === 1
      ? "Bitte geben Sie uns kurz Bescheid, ob Ihnen der Termin passt."
      : "Bitte antworten Sie kurz, welcher Termin Ihnen am besten passt.";
  return [
    `${anredeGruss(kunde)},`,
    "",
    einleitung,
    "",
    ...gueltig.map((z) => `• ${terminZeile(z)}`),
    "",
    bitte,
    "",
    "Viele Grüße",
    firma,
  ].join("\n");
};
