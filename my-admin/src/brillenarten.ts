// Auswahl "Brillenart" in Karteikarte und Auftragsformular, in der
// Reihenfolge des Betriebs. Ältere Aufträge mit anderen Angaben (aus Prisma
// übernommen, z. B. "Min. Ein. Fern") behalten ihren Wert; er bleibt bei
// diesen Aufträgen zusätzlich wählbar.
export const BRILLENARTEN = [
  "Fernbrille",
  "Lesebrille",
  "Bildschirmarbeitsplatzbrille",
  "Autofahrbrille",
  "Bifokalbrille",
  "Gleitsichtbrille",
  "elektronische Sehhilfe",
  "Nachtfahrbrille",
  "Hobbybrille",
  "Sonnenbrille",
  "Kantenfilterbrille",
  "Ersatzbrille",
  "Umschliff",
  "Reparatur",
  "Beratung",
  "Optometrische Refraktion",
];

// Auswahlliste inkl. eines abweichenden vorhandenen Werts
export const brillenartOptionen = (vorhanden?: unknown) => {
  const wert = vorhanden == null ? "" : String(vorhanden).trim();
  const liste =
    wert && !BRILLENARTEN.includes(wert)
      ? [...BRILLENARTEN, wert]
      : BRILLENARTEN;
  return liste.map((art) => ({ id: art, name: art }));
};
