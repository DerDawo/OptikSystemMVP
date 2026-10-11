// Zahlungsstatus eines Auftrags (Spalte brille."Zahlungsstatus", erlaubte
// Werte per Check-Constraint, Migration 20261011233000), in der Reihenfolge
// des Betriebs.
export const ZAHLUNGSSTATUS = [
  { id: "bezahlt", name: "bezahlt" },
  { id: "teilweise offen", name: "teilweise offen" },
  { id: "offen", name: "offen" },
  { id: "Ratenzahlung", name: "Ratenzahlung" },
  { id: "Versicherung", name: "Versicherung" },
];

// Status, bei denen ein Auftrag in der Mahnliste erscheint (zusätzlich zu
// Rechnungsnummer und offenem Restbetrag)
export const MAHNBARE_ZAHLUNGSSTATUS = ["offen", "teilweise offen"];
