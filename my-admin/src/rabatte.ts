import { EingabeFehler, leseZahl } from "./karteikarteEingabe";

// Rabatt-Auswahl in Karteikarte und Auftragsformular. Der Rabatt wirkt auf
// Glas rechts + Glas links + Fassung, nicht auf Zusatzleistungen (siehe
// Datenbank-Trigger brille_calc_summe). Beim Sonderrabatt wird der Prozentsatz
// von Hand eingetragen, die anderen setzen ihn automatisch.
export const RABATTE: { id: string; name: string; prozent: number | null }[] = [
  { id: "Sonderrabatt", name: "Sonderrabatt (individuell)", prozent: null },
  { id: "Neukundenrabatt", name: "Neukundenrabatt −10 %", prozent: 10 },
  { id: "Zweitbrille", name: "Zweitbrille −15 %", prozent: 15 },
];

// Auswahlliste inkl. eines abweichenden vorhandenen Werts
export const rabattOptionen = (vorhanden?: unknown) => {
  const wert = vorhanden == null ? "" : String(vorhanden).trim();
  const liste = RABATTE.map(({ id, name }) => ({ id, name }));
  return wert && !RABATTE.some((r) => r.id === wert)
    ? [...liste, { id: wert, name: wert }]
    : liste;
};

// Zu speichernde Felder bei Auswahl eines Rabatts: fester Prozentsatz,
// beim Sonderrabatt bleibt der eingetragene, ohne Rabatt wird er geleert.
export const rabattDaten = (
  bezeichnung: string | null,
): Record<string, unknown> => {
  if (!bezeichnung) return { RabattBezeichnung: null, RabattProzent: null };
  const rabatt = RABATTE.find((r) => r.id === bezeichnung);
  return rabatt?.prozent != null
    ? { RabattBezeichnung: bezeichnung, RabattProzent: rabatt.prozent }
    : { RabattBezeichnung: bezeichnung };
};

// Eingabe im Rabattfeld: Prozent ("5", "5 %", "7,5") oder Euro ("50 €",
// "50 EUR") - Euro wird in den genauen Prozentsatz der Rabattbasis
// umgerechnet, damit der Rabatt exakt diesen Betrag ergibt. Leer = kein
// Prozentsatz.
export const leseRabattEingabe = (
  eingabe: string,
  basis: number,
): number | null => {
  const roh = eingabe.trim();
  if (!roh) return null;
  const inEuro = /€|eur/i.test(roh);
  const zahlText = roh.replace(/€|eur|%/gi, "").trim();
  const zahl = leseZahl(zahlText);
  if (zahl === null) return null;
  const wert = Math.abs(zahl);
  if (!inEuro) {
    if (wert > 100)
      throw new EingabeFehler("Rabatt in % darf höchstens 100 sein.");
    return wert;
  }
  if (!(basis > 0))
    throw new EingabeFehler(
      "Für einen Rabatt in € zuerst die Preise eintragen.",
    );
  if (wert > basis)
    throw new EingabeFehler("Der Rabatt ist höher als der Betrag.");
  return Math.round((wert / basis) * 100 * 1e6) / 1e6;
};
