import dayjs from "dayjs";

/*
 * Regeln für "Heute zu tun" im Dashboard (Fristen, Auswahl, Nachrichtentexte).
 * Getrennt von der Oberfläche, damit sie sich testen lassen.
 */

export const FRISTEN = {
  // fertig, aber so lange nicht abgeholt -> Erinnerung
  nichtAbgeholtTage: 14,
  // so lange ohne "Fertig" -> überfällig (ältere Aufträge zählen nicht mehr)
  ueberfaelligTage: 10,
  ueberfaelligBisMonate: 6,
  // Kostenvoranschlag/Antrag ohne Haken "genehmigt"
  kvTage: 14,
  // Gleitsicht: Anruf zur Eingewöhnung so viele Tage nach der Abholung
  gleitsichtVonTage: 10,
  gleitsichtBisTage: 21,
  // Kontaktlinsen-Nachkontrolle: Termin in diesem Fenster um heute
  nachkontrolleVorTage: 7,
  nachkontrolleNachTage: 7,
  // Sehtest-Erinnerung: letzte Brille vor 24-25 Monaten, seither keine
  sehtestMonate: 24,
} as const;

export const isoTag = (d: dayjs.Dayjs) => d.format("YYYY-MM-DD");

// Aufträge ohne Brille (Sehtest, Reparatur, Gutschein ...) brauchen keinen
// Status "Fertig" und gelten nie als überfällig
const KEIN_FERTIGUNGSAUFTRAG =
  /seh(ü|ue)berpr(ü|ue)fung|sehtest|gutschein|gutachten|gesundheitstag|kontaktlinse|^cl\b/i;

export const istFertigungsauftrag = (brillenArt: unknown) =>
  !KEIN_FERTIGUNGSAUFTRAG.test(String(brillenArt ?? "").trim());

export const istGleitsicht = (brillenArt: unknown) =>
  /gleitsicht/i.test(String(brillenArt ?? ""));

type Auftrag = { kunde_id?: number | string | null; Datum?: string | null };

/*
 * Sehtest-Erinnerung: Kunden, deren letzte Brille im Fenster liegt
 * (`imFenster`) und die seither keine neuere bekommen haben (`neuere`).
 * Liefert je Kunde das Datum der letzten Brille, älteste zuerst.
 */
export const sehtestFaellig = (imFenster: Auftrag[], neuere: Auftrag[]) => {
  const hatNeuere = new Set(
    neuere.map((a) => String(a.kunde_id ?? "")).filter(Boolean),
  );
  const letzte = new Map<string, string>();
  imFenster.forEach((a) => {
    const id = String(a.kunde_id ?? "");
    if (!id || hatNeuere.has(id) || !a.Datum) return;
    const bisher = letzte.get(id);
    if (!bisher || a.Datum > bisher) letzte.set(id, a.Datum);
  });
  return [...letzte.entries()]
    .map(([kundeId, datum]) => ({ kundeId, datum }))
    .sort((x, y) => x.datum.localeCompare(y.datum));
};

type Kunde = {
  Anrede?: string | null;
  Nachname?: string | null;
};

export const anredeGruss = (kunde?: Kunde | null) => {
  const nachname = String(kunde?.Nachname ?? "").trim();
  const anrede = String(kunde?.Anrede ?? "").trim();
  if (anrede === "Frau" && nachname) return `Sehr geehrte Frau ${nachname}`;
  if (anrede === "Herr" && nachname) return `Sehr geehrter Herr ${nachname}`;
  return "Guten Tag";
};

export const NACHRICHTEN = {
  abholen: (kunde: Kunde | null | undefined, firma: string) =>
    `${anredeGruss(kunde)},\n\nIhre Brille liegt bei uns zur Abholung bereit. Wir freuen uns auf Ihren Besuch!\n\nMit freundlichen Grüßen\n${firma}`,
  gleitsicht: (kunde: Kunde | null | undefined, firma: string) =>
    `${anredeGruss(kunde)},\n\nwie kommen Sie mit Ihrer neuen Gleitsichtbrille zurecht? Wenn etwas noch nicht passt, kommen Sie gern vorbei – wir stellen sie nach.\n\nMit freundlichen Grüßen\n${firma}`,
  sehtest: (kunde: Kunde | null | undefined, firma: string) =>
    `${anredeGruss(kunde)},\n\nIhre letzte Brille ist jetzt zwei Jahre alt. Wir empfehlen, Ihre Sehwerte überprüfen zu lassen – gern vereinbaren wir einen Termin mit Ihnen.\n\nMit freundlichen Grüßen\n${firma}`,
};
