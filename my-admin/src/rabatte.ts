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
