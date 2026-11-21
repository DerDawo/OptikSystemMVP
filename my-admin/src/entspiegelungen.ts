// Vorgabe für das Feld "Vergütung" des Glases in der Brillen-Karteikarte:
// klappt beim Anklicken auf, freie Eingabe bleibt möglich. Die Namen und
// Aufpreise stammen aus der Preisliste (Beschichtung). Die Liste zeigt das
// günstigste zuerst und nennt keine Preise. Das Wort "Entspiegelung" davor
// sorgt dafür, dass der Auftragszettel das Kästchen "HSET" ankreuzt.
const PREISLISTE: [name: string, aufpreisEuro: number][] = [
  ["Hartschicht (Hard Coat)", 0], // inklusive
  ["Entspiegelung MULTI Plus", 9],
  ["Entspiegelung ULTRA Glide BS", 10],
  ["Entspiegelung ULTRA Glide", 12],
  ["Entspiegelung NANO Glide", 16],
  ["Entspiegelung POLAR Glide", 16],
  ["Entspiegelung BLUE Glide", 16],
  ["Entspiegelung OCEAN Glide", 18],
  ["Entspiegelung PURE Glide", 20],
];

// stabile Sortierung: bei gleichem Preis bleibt die Reihenfolge der Preisliste
export const ENTSPIEGELUNGEN = [...PREISLISTE]
  .sort((a, b) => a[1] - b[1])
  .map(([name]) => name);
