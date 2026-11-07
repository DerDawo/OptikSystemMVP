// Löschen eines Kunden (Knopf "Kunde löschen" auf der Kundenseite): nur für
// versehentlich oder doppelt angelegte Kunden. Sobald es Aufträge oder
// abgerechnete Rezepte gibt, müssen sie als Belege erhalten bleiben.

export type KundeBezuege = {
  brillen: number;
  kontaktlinsen: number;
  kassenrezepte: number;
  fundusberichte: number;
};

/** Grund, warum der Kunde nicht gelöscht werden darf, sonst null. */
export const kundeLoeschSperre = (b: KundeBezuege): string | null => {
  const teile = [
    b.brillen && `${b.brillen} Brillenauftr${b.brillen === 1 ? "ag" : "äge"}`,
    b.kontaktlinsen &&
      `${b.kontaktlinsen} Kontaktlinsenauftr${b.kontaktlinsen === 1 ? "ag" : "äge"}`,
    b.kassenrezepte &&
      `${b.kassenrezepte} abgerechnete${b.kassenrezepte === 1 ? "s Rezept" : " Rezepte"}`,
    b.fundusberichte &&
      `${b.fundusberichte} Fundusbericht${b.fundusberichte === 1 ? "" : "e"}`,
  ].filter(Boolean);
  return teile.length > 0
    ? `Der Kunde hat noch ${teile.join(", ")}. Diese müssen als Belege erhalten bleiben.`
    : null;
};
