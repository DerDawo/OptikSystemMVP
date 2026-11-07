// Vorschläge für die Firmenrechnung (FirmenrechnungSeite.tsx): Art des
// Firmentags und einzelne Untersuchungen/Leistungen. Freie Eingabe bleibt
// möglich.

export const FIRMENTAG_AKTIVITAETEN = [
  "Gesundheitstag Augen",
  "Firmengesundheitstag – Augen und Sehen",
  "Sehtest-Aktion für Mitarbeitende",
  "Bildschirmarbeitsplatz-Aktion (Sehtest und Beratung)",
  "Vortrag „Gesundes Sehen am Bildschirmarbeitsplatz“",
  "Vortrag „Augen und Sehen im Alter“",
  "Seminar Augengesundheit und Ergonomie",
  "Arbeitsschutz-Aktion Korrektionsschutzbrillen",
  "Aktionsstand Augengesundheit",
];

export const FIRMENTAG_LEISTUNGEN = [
  "Sehtest (Sehschärfe ferne und nahe)",
  "Refraktion / Brillenglasbestimmung",
  "Sehtest Bildschirmarbeitsplatz",
  "Führerschein-Sehtest",
  "Netzhautscreening (Fundusaufnahme)",
  "Augeninnendruckmessung (berührungslos)",
  "Gesichtsfeld-Screening",
  "Tränenfilmanalyse / Check trockenes Auge",
  "Farbsehtest",
  "Stereo- und Kontrastsehtest",
  "Dämmerungssehen und Blendempfindlichkeit",
  "Beratung Bildschirmarbeitsplatzbrille",
  "Beratung Korrektionsschutzbrille",
  "Kontaktlinsenberatung",
  "Brillen-Service (Reinigung und Anpassung)",
  "Vortrag",
  "Fahrkosten",
];

// Feste Leistungsbeschreibung für Gesundheitstage; wird eingetragen, sobald
// die Aktivität ein Gesundheitstag ist und die Beschreibung noch leer ist
export const GESUNDHEITSTAG_BESCHREIBUNG =
  "Refraktion, Sehtest Bildschirmarbeitsplatz, Netzhautscreening (Fundusaufnahme), IOD-Messung, Farbsehtest, Brillen-Service (Reparatur und Anpassung), Beratung zu Augenkrankheiten, Bildschirmarbeitsplatzbrille, Kontaktlinsenberatung, Dokumentation";

export const beschreibungVorschlag = (
  aktivitaet: string,
  beschreibung: string,
): string =>
  !beschreibung.trim() && /gesundheitstag/i.test(aktivitaet)
    ? GESUNDHEITSTAG_BESCHREIBUNG
    : beschreibung;
