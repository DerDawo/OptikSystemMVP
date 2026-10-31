// Löschen von Aufträgen in der Kundenkartei (KundenAuftraege.tsx): nur
// versehentlich oder doppelt angelegte Aufträge. Sobald ein Auftrag
// abgerechnet oder bezahlt ist, muss er als Beleg erhalten bleiben.

type Auftrag = Record<string, unknown>;

const betrag = (wert: unknown) => {
  const n = Number(wert ?? 0);
  return Number.isFinite(n) ? n : 0;
};

/** Grund, warum der Auftrag nicht gelöscht werden darf, sonst null. */
export const loeschSperre = (auftrag: Auftrag): string | null => {
  const rechnung = String(auftrag.Rechnungsnummer ?? "").trim();
  if (rechnung) return `Es gibt bereits die Rechnung ${rechnung}.`;
  if (betrag(auftrag.Anzahlung) > 0) {
    return "Es ist eine Anzahlung eingetragen.";
  }
  if (auftrag.Zahlungsstatus === "bezahlt" && betrag(auftrag.Summe) > 0) {
    return "Der Auftrag ist als bezahlt markiert.";
  }
  return null;
};
