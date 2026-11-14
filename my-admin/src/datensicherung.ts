// Datensicherung zum Herunterladen (Einstellungen → Datensicherung): alle
// Geschäftsdaten als eine JSON-Datei, zusätzlich zur nächtlichen
// verschlüsselten Sicherung. Den Glaskatalog (Herstellerdaten, jederzeit neu
// importierbar) und hochgeladene Dateien (Dokumente, Fundusbilder) enthält
// sie nicht.

// Tabellen in der Reihenfolge der Abhängigkeiten (für eine Wiederherstellung)
export const SICHERUNG_TABELLEN = [
  "betrieb",
  "brillenart",
  "krankenkasse",
  "zusatzleistung",
  "dokumentvorlage",
  "glashersteller",
  "kunde",
  "kunde_brillenversicherung",
  "kunde_dokument",
  "glastyp",
  "glass",
  "fassung",
  "brille",
  "brille_hat_zusatzleistungen",
  "kontaktlinse",
  "kassenrezept",
  "fundusbericht",
  "firmenrechnung",
  "schuldnerliste",
  "erinnerung",
  "nachrichten",
  "termin",
  "buchung_einstellung",
  "buchung_oeffnungszeit",
  "buchung_terminart",
  "buchung_anfrage",
  "rechnungsnummer_stand",
  "rechnungsnummer_zaehler",
  "verordnungsnummer_zaehler",
] as const;

export const SEITE = 1000;

export type Sicherung = {
  programm: "UNICORN";
  version: 1;
  erstellt: string;
  tabellen: Record<string, unknown[]>;
  // Tabellen, die nicht gelesen werden konnten, mit Grund
  fehler: Record<string, string>;
};

type Seitenleser = (
  tabelle: string,
  von: number,
  bis: number,
) => Promise<{ data: unknown[] | null; error: { message: string } | null }>;

/** Liest eine Tabelle seitenweise vollständig. */
export const ladeTabelle = async (tabelle: string, lies: Seitenleser) => {
  const zeilen: unknown[] = [];
  for (let von = 0; ; von += SEITE) {
    const { data, error } = await lies(tabelle, von, von + SEITE - 1);
    if (error) throw new Error(error.message);
    zeilen.push(...(data ?? []));
    if (!data || data.length < SEITE) return zeilen;
  }
};

export const erstelleSicherung = async (
  lies: Seitenleser,
  fortschritt?: (tabelle: string, nr: number, gesamt: number) => void,
  jetzt = new Date(),
): Promise<Sicherung> => {
  const sicherung: Sicherung = {
    programm: "UNICORN",
    version: 1,
    erstellt: jetzt.toISOString(),
    tabellen: {},
    fehler: {},
  };
  for (const [i, tabelle] of SICHERUNG_TABELLEN.entries()) {
    fortschritt?.(tabelle, i + 1, SICHERUNG_TABELLEN.length);
    try {
      sicherung.tabellen[tabelle] = await ladeTabelle(tabelle, lies);
    } catch (fehler) {
      sicherung.fehler[tabelle] = (fehler as Error).message;
    }
  }
  return sicherung;
};

/** Dateiname, z. B. "UNICORN-Datensicherung-2026-11-14_0930.json". */
export const sicherungDateiname = (jetzt = new Date()) => {
  const z = (n: number) => String(n).padStart(2, "0");
  return `UNICORN-Datensicherung-${jetzt.getFullYear()}-${z(jetzt.getMonth() + 1)}-${z(jetzt.getDate())}_${z(jetzt.getHours())}${z(jetzt.getMinutes())}.json`;
};

/** Anzahl der gesicherten Datensätze je Tabelle und insgesamt. */
export const sicherungUmfang = (s: Sicherung) => {
  const anzahl = Object.values(s.tabellen).reduce((n, t) => n + t.length, 0);
  return { tabellen: Object.keys(s.tabellen).length, datensaetze: anzahl };
};
