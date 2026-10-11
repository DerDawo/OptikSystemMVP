// Mitarbeiter, die in Aufträgen als "Bedient von" / "Refraktion durch"
// ausgewählt werden können.
export const MITARBEITER = ["Andrea Heydrich", "Robert Ulm"];

// Aus Prisma übernommene "AOULZY…"-Einträge sind alte Fassungsangaben ohne
// Bedeutung und werden nicht als Mitarbeiter angezeigt.
export const istAlteFassungsangabe = (wert: unknown) =>
  /^aoulzy/i.test(String(wert ?? "").trim());

export const mitarbeiterAnzeige = (wert: unknown) =>
  wert == null || istAlteFassungsangabe(wert) ? "" : String(wert);
