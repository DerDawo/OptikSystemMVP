/**
 * Parser für das "SF6"-Austauschformat für Brillenglas-Herstellerkataloge.
 *
 * SF6 ("Standardformat 6") ist das in der deutschen Augenoptik-Branche
 * verbreitete Format, in dem Glashersteller (z. B. POL Optic GmbH) ihre
 * Preislisten als ZIP-Archiv mit mehreren fixed-width Textdateien (*.dat,
 * ISO-8859-1-kodiert, CRLF-Zeilenenden) ausliefern. Siehe u. a.
 * https://www.comcept.eu/schnittstellen und https://b2boptic.com/ (der
 * dortige Wiki-/PDF-Server war aus dieser Sandbox heraus nicht erreichbar,
 * die Feldpositionen unten wurden daher direkt aus der an Issue #23
 * angehängten Beispieldatei "POL-POL--DE-20250801-1.1.ZIP" (POL Optic GmbH,
 * Katalogversion 6.10.1, Stand 01.08.2025) reverse-engineered).
 *
 * WICHTIGE ANNAHMEN (bitte vor Produktiv-/Preisverwendung gegen die
 * offizielle b2boptic-Spezifikation verifizieren):
 *  - Alle Dateien sind fixed-width (keine Trenn-/Escapezeichen) und pro
 *    Datei über alle Zeilen gleich breit.
 *  - LensType.dat / Options.dat: Produkt-/Optionscode in Spalte 1-6,
 *    Bezeichnung in Spalte 7-62 (56 Zeichen, rechts leerzeichengepolstert).
 *  - Der Brechungsindex (z. B. "1.50", "1.60") ist nicht separat kodiert,
 *    sondern Teil der Freitext-Bezeichnung und wird per Regex extrahiert.
 *  - LensPrice.dat enthält den Basispreis eines Grundglases in Eurocent
 *    (Rohwert / 100); OptionsPrice.dat enthält Options-Aufpreise dagegen
 *    bereits in vollen Euro (ohne Division). Diese Annahme wurde nicht
 *    anhand der Originalspezifikation verifiziert, sondern anhand
 *    plausibler Größenordnungen (Grundglas ca. 2-80 €, Options-Aufpreis
 *    ca. 20-110 €) aus der Beispieldatei abgeleitet.
 *  - Einzelne, weit über dem sonstigen Preisniveau liegende LensPrice-Werte
 *    (> 1000 €) werden als "nicht verfügbar"-Platzhalter behandelt und bei
 *    der Basispreis-Ermittlung ignoriert.
 *  - Options.dat-Codes, die in OptionsColor.dat als Gruppen-Code auftreten
 *    (im Beispiel: "120", "C00", "G00"), werden als Typ "farbe" importiert,
 *    alle anderen Options.dat-Zeilen als "beschichtung". Das Beispiel
 *    kennt kein separates Feld für "Hartschicht"; entsprechende Optionen
 *    (z. B. Glide-Varianten) laufen hier unter "beschichtung" mit.
 *  - Combination.dat verknüpft Grundglas-Codes mit den dafür verfügbaren
 *    Options.dat-Codes (nicht mit einzelnen OptionsColor-Farbtönen). Genaue
 *    Kombinationsregeln (z. B. gegenseitiger Ausschluss einzelner Optionen)
 *    werden nicht ausgewertet - das ist Aufgabe des Glasassistenten (#51).
 *  - Nicht ausgewertet werden LensGeo.dat, LensRange.dat, BaseCurve.dat,
 *    OrderOptions*.dat, CodeSubstitution.dat und ProductGroup.dat
 *    (Geometrie-/Stärkenbereiche und Aufpreisstaffeln je nach Rezept),
 *    da sie für den Grunddatenimport aus #23 nicht benötigt werden.
 */

export interface Sf6Hersteller {
  code: string;
  name: string;
}

export interface Sf6Produkt {
  esdCode: string;
  bezeichnung: string;
  brechungsindex: number | null;
}

export type Sf6OptionTyp = "beschichtung" | "farbe";

export interface Sf6Option {
  code: string;
  bezeichnung: string;
  typ: Sf6OptionTyp;
  preis: number | null;
}

export interface Sf6Katalog {
  hersteller: Sf6Hersteller;
  produkte: Sf6Produkt[];
  /** Basispreis je Grundglas in Euro (niedrigster gültiger Preis über alle Stärkenbereiche). */
  basispreise: Map<string, number>;
  optionen: Sf6Option[];
  /** Je Grundglas-Code die Menge der dafür verfügbaren Options.dat-Codes. */
  verfuegbareOptionen: Map<string, Set<string>>;
}

/** Grenzwert, ab dem ein LensPrice-Eintrag als "nicht verfügbar"-Platzhalter statt als echter Preis behandelt wird. */
const LENS_PRICE_SENTINEL_EUR = 1000;

function splitLines(text: string): string[] {
  return text.split(/\r\n|\r|\n/).filter((line) => line.trim().length > 0);
}

/** Head.dat: eine "key<whitespace>value"-Zeile pro Metadatenfeld. */
export function parseHead(text: string): Sf6Hersteller {
  const values = new Map<string, string>();
  for (const line of splitLines(text)) {
    const match = /^(\S+)\s+(.*)$/.exec(line);
    if (!match) continue;
    values.set(match[1], match[2].trim());
  }

  const code = values.get("manufacturer-code") ?? "";
  const name = values.get("manufacturer-name") ?? code;
  if (!code) {
    throw new Error("Head.dat enthält keinen manufacturer-code");
  }
  return { code, name: name || code };
}

const BRECHUNGSINDEX_PATTERN = /(\d\.\d{2})/;

export function extractBrechungsindex(bezeichnung: string): number | null {
  const match = BRECHUNGSINDEX_PATTERN.exec(bezeichnung);
  return match ? Number.parseFloat(match[1]) : null;
}

/** LensType.dat: Grundglas-Stammdaten, ein Produkt pro Zeile. */
export function parseLensType(text: string): Sf6Produkt[] {
  const produkte: Sf6Produkt[] = [];
  for (const line of splitLines(text)) {
    if (line.length < 62) continue;
    const esdCode = line.slice(0, 6).trim();
    const bezeichnung = line.slice(6, 62).trim();
    if (!esdCode || !bezeichnung) continue;
    produkte.push({
      esdCode,
      bezeichnung,
      brechungsindex: extractBrechungsindex(bezeichnung),
    });
  }
  return produkte;
}

/** LensPrice.dat: mehrere Preiszeilen (je Stärkenbereich/Variante) pro Grundglas-Code. */
export function parseLensPrice(text: string): Map<string, number> {
  const basispreise = new Map<string, number>();
  for (const line of splitLines(text)) {
    if (line.length < 31) continue;
    const esdCode = line.slice(0, 6).trim();
    const priceField = line.slice(23, 31);
    if (!esdCode || !/^\d+$/.test(priceField)) continue;
    const preis = Number.parseInt(priceField, 10) / 100;
    if (preis <= 0 || preis > LENS_PRICE_SENTINEL_EUR) continue;

    const bisher = basispreise.get(esdCode);
    if (bisher === undefined || preis < bisher) {
      basispreise.set(esdCode, preis);
    }
  }
  return basispreise;
}

/** Options.dat: Beschichtungs-/Farbgruppen-Katalog, ein Eintrag pro Zeile. */
function parseOptionsBase(
  text: string,
): Array<{ code: string; bezeichnung: string }> {
  const optionen: Array<{ code: string; bezeichnung: string }> = [];
  for (const line of splitLines(text)) {
    if (line.length < 62) continue;
    const code = line.slice(0, 6).trim();
    const bezeichnung = line.slice(6, 62).trim();
    if (!code || !bezeichnung) continue;
    optionen.push({ code, bezeichnung });
  }
  return optionen;
}

/** OptionsPrice.dat: Aufpreis je Options.dat-Code. */
export function parseOptionsPrice(text: string): Map<string, number> {
  const preise = new Map<string, number>();
  for (const line of splitLines(text)) {
    if (line.length < 30) continue;
    const code = line.slice(0, 12).trim();
    const priceField = line.slice(25, 30);
    if (!code || !/^\d+$/.test(priceField)) continue;
    preise.set(code, Number.parseInt(priceField, 10));
  }
  return preise;
}

/** OptionsColor.dat: konkrete Farbtöne, gruppiert per Referenz auf einen Options.dat-Code. */
export function parseOptionsColorGroups(text: string): Set<string> {
  const gruppen = new Set<string>();
  for (const line of splitLines(text)) {
    if (line.length < 6) continue;
    const gruppenCode = line.slice(3, 6).trim();
    if (gruppenCode) gruppen.add(gruppenCode);
  }
  return gruppen;
}

/**
 * Kombiniert Options.dat, OptionsPrice.dat und OptionsColor.dat zu einem
 * Options-Katalog mit Preis und grober Typ-Einordnung (Farbe vs. Beschichtung).
 */
export function parseOptions(
  optionsText: string,
  optionsPriceText: string,
  optionsColorText: string,
): Sf6Option[] {
  const preise = parseOptionsPrice(optionsPriceText);
  const farbGruppen = parseOptionsColorGroups(optionsColorText);

  return parseOptionsBase(optionsText).map(({ code, bezeichnung }) => ({
    code,
    bezeichnung,
    typ: farbGruppen.has(code) ? "farbe" : "beschichtung",
    preis: preise.get(code) ?? null,
  }));
}

/**
 * Combination.dat: eine Zeile pro (Grundglas-Code, Kombinationsslot). Codes
 * bestehend nur aus "*" sind Füllwerte ohne Optionsbezug und werden ignoriert.
 */
export function parseCombination(text: string): Map<string, Set<string>> {
  const verfuegbar = new Map<string, Set<string>>();
  for (const line of splitLines(text)) {
    if (line.length < 13) continue;
    const esdCode = line.slice(0, 6).trim();
    const optionCode = line.slice(7, 13).trim();
    if (!esdCode || !optionCode || /^\*+$/.test(optionCode)) continue;

    let set = verfuegbar.get(esdCode);
    if (!set) {
      set = new Set<string>();
      verfuegbar.set(esdCode, set);
    }
    set.add(optionCode);
  }
  return verfuegbar;
}

export interface Sf6SourceFiles {
  head: string;
  lensType: string;
  lensPrice: string;
  options: string;
  optionsPrice: string;
  optionsColor: string;
  combination: string;
}

export function parseSf6Katalog(files: Sf6SourceFiles): Sf6Katalog {
  return {
    hersteller: parseHead(files.head),
    produkte: parseLensType(files.lensType),
    basispreise: parseLensPrice(files.lensPrice),
    optionen: parseOptions(
      files.options,
      files.optionsPrice,
      files.optionsColor,
    ),
    verfuegbareOptionen: parseCombination(files.combination),
  };
}
