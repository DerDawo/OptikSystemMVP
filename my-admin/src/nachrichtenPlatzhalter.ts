// Platzhalter in Nachrichtenvorlagen (SMS, WhatsApp, E-Mail) aus "Nachricht
// senden" beim Kunden. Erlaubt sind {Platzhalter}, {{Platzhalter}} und
// [Platzhalter]; Groß-/Kleinschreibung spielt keine Rolle.
import dayjs from "dayjs";
import { RECHNUNG_ABSENDER } from "./rechnungTemplate";

export type NachrichtKunde = {
  id: string;
  anrede: string;
  vorname: string;
  nachname: string;
  fullName: string;
  email: string;
  phoneNumber: string;
};

// Nächster anstehender Termin des Kunden (für Terminerinnerungen)
export type NachrichtTermin = { Start?: string | null } | null | undefined;

export const createMessageMergeValues = (
  customer: NachrichtKunde,
  termin?: NachrichtTermin,
): Record<string, string> => {
  const start = termin?.Start ? dayjs(termin.Start) : null;
  // Ohne Termin bleibt sichtbar, was noch einzutragen ist
  const termindatum = start?.isValid() ? start.format("DD.MM.YYYY") : "(Datum)";
  const terminuhrzeit = start?.isValid() ? start.format("HH:mm") : "(Uhrzeit)";
  const optiker = RECHNUNG_ABSENDER.firma;
  const optikerTelefon = RECHNUNG_ABSENDER.telefon;
  return {
    anrede: customer.anrede,
    vorname: customer.vorname,
    firstname: customer.vorname,
    nachname: customer.nachname,
    lastname: customer.nachname,
    name: customer.fullName,
    fullname: customer.fullName,
    email: customer.email,
    telefon: customer.phoneNumber,
    telefonnummer: customer.phoneNumber,
    phone: customer.phoneNumber,
    phonenumber: customer.phoneNumber,
    sms: customer.phoneNumber,
    whatsapp: customer.phoneNumber,
    kundeid: customer.id,
    kundenid: customer.id,
    optiker,
    optikername: optiker,
    "optiker-name": optiker,
    betrieb: optiker,
    optikertelefon: optikerTelefon,
    "optiker-telefon": optikerTelefon,
    termindatum,
    terminuhrzeit,
    termin: start?.isValid()
      ? `${termindatum} um ${terminuhrzeit} Uhr`
      : "(Termin)",
  };
};

export const renderMessageTemplate = (
  template: string,
  customer: NachrichtKunde,
  termin?: NachrichtTermin,
) => {
  const mergeValues = createMessageMergeValues(customer, termin);
  const replaceToken = (_match: string, token: string) =>
    mergeValues[token.trim().toLowerCase()] ?? "";

  return (
    template
      .replace(/\{\{\s*([^{}[\]]+?)\s*\}\}/g, replaceToken)
      .replace(/\[\[\s*([^{}[\]]+?)\s*\]\]/g, replaceToken)
      .replace(/\{\s*([^{}[\]]+?)\s*\}/g, replaceToken)
      .replace(/\[\s*([^{}[\]]+?)\s*\]/g, replaceToken)
      .replace(/\{\s*([^{}[\]]+?)\s*\]/g, replaceToken)
      .replace(/\[\s*([^{}[\]]+?)\s*\}/g, replaceToken)
      // leere Platzhalter (z. B. ohne Anrede) hinterlassen keine Doppel-Leerzeichen
      .replace(/ {2,}/g, " ")
      .replace(/ ([,.!?])/g, "$1")
  );
};
