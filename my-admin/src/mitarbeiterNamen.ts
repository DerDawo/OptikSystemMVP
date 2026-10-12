// Mitarbeiter, die in Aufträgen als "Bedient von" / "Refraktion durch"
// ausgewählt werden können.
export const MITARBEITER = ["Andrea Heydrich", "Robert Ulm"];

// Auswahl "Refraktion" in Karteikarte und Auftragsformular, in der
// Reihenfolge des Betriebs (eigene Mitarbeiter, dann Augenärzte/Praxen).
// Ältere abweichende Angaben bleiben beim jeweiligen Auftrag erhalten.
export const REFRAKTION = [
  "Robert Ulm lt. optometrischer Messung",
  "Andrea Heydrich lt. optometrischer Messung",
  "Praxis Dr. Schroth",
  "Dr. Elbasyounis",
  "Dr. Jana Weiser",
  "Dr. Voigt - Uni Jena",
  "Praxis Dr. Büttner",
  "Dr. Schmidt-Daberkow",
  "Dr. Müller",
];

// Aus Prisma übernommene "AOULZY…"-Einträge sind alte Fassungsangaben ohne
// Bedeutung und werden nicht als Mitarbeiter angezeigt.
export const istAlteFassungsangabe = (wert: unknown) =>
  /^aoulzy/i.test(String(wert ?? "").trim());

export const mitarbeiterAnzeige = (wert: unknown) =>
  wert == null || istAlteFassungsangabe(wert) ? "" : String(wert);
