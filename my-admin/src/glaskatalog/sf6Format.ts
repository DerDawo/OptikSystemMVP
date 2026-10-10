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
 *  - LensPrice.dat / OptionsPrice.dat (Layout aus 22 echten Herstellerkatalogen
 *    abgeleitet: POL, Zeiss, Hoya, Essilor, Nika, Wetzlich, AVM, BOW, Leica,
 *    Lux-Lens, FrameTec u. a., SF6 6.10.1-6.10.3). Alle Hersteller nutzen
 *    denselben Spaltenaufbau, nur unterschiedlich viele Preisfelder:
 *      LensPrice:    Code[0:6] Durchmesser/Bereich[6:10] Kennz.[10]
 *                    Stärkengruppe[11:18]
 *      OptionsPrice: Code[0:6] Untercode[6:12] Kennzeichen[12:18]
 *      danach Preisfeld n (1-basiert) in [18+7(n-1) : 25+7(n-1)], 7 Ziffern
 *      in Cent (bzw. rechtsbündig mit Leerzeichen gepolstert).
 *    Bekannte Zeilenbreiten: 32 (2 Preisfelder, Zeiss/Hoya/Essilor/...),
 *    53 (5 Preisfelder, FrameTec, OptionsPrice bei POL/Leica/Lux) und
 *    69 (5 Preisfelder + 16 Zeichen Reserve, LensPrice bei POL/Leica/Lux).
 *    Andere oder gemischte Breiten gelten als unbekanntes Layout - dann
 *    werden bewusst KEINE Preise geliefert statt geratener Werte.
 *  - Was in welchem Preisfeld steht, deklariert Head.dat über
 *    "pricefield-01".."pricefield-05": 10 = Einkaufspreis (netto, EK),
 *    20 = unverbindliche Preisempfehlung (UVP), 00 = unbelegt. Fast alle
 *    Kataloge nutzen 01=10/02=20, BOW aber 01=20/02=10. Abgeleitet daraus,
 *    dass der Typ-10-Wert in allen Katalogen praktisch immer kleiner ist
 *    als der Typ-20-Wert (Faktor ca. 2,5-5, übliche Kalkulation). Die
 *    offizielle b2boptic-Spezifikation war nicht abrufbar.
 *  - Als Basis- bzw. Options-Aufpreis wird die UVP (Typ 20) übernommen, da
 *    der Glasassistent daraus den Verkaufsbetrag des Auftrags bildet.
 *    Kataloge ohne UVP-Feld (z. B. FrameTec, nur EK) liefern keine Preise.
 *    Ein Preis von 0 gilt als "kein Preis".
 *  - "pricefield-decimals" muss leer oder 0 sein (Preise in ganzen Cent);
 *    andere Werte gelten ebenfalls als unbekanntes Layout.
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

/** Preisfeld-Typen aus Head.dat ("pricefield-01".."pricefield-05"). */
export const SF6_PREISTYP_EINKAUF = "10";
export const SF6_PREISTYP_UVP = "20";

/** Übliche Belegung (01 = EK, 02 = UVP), z. B. für Tests ohne Head.dat. */
export const SF6_STANDARD_PREISFELDER: readonly string[] = [
  SF6_PREISTYP_EINKAUF,
  SF6_PREISTYP_UVP,
  "00",
  "00",
  "00",
];

/**
 * Bekannte Zeilenbreiten von LensPrice.dat/OptionsPrice.dat und die Anzahl
 * der darin enthaltenen Preisfelder (siehe Dateikommentar).
 */
const PREISZEILEN_LAYOUTS = new Map<number, number>([
  [32, 2],
  [53, 5],
  [69, 5],
]);
const PREISFELD_START = 18;
const PREISFELD_BREITE = 7;

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

/**
 * Head.dat: Preisfeld-Typen in Feldreihenfolge (Index 0 = "pricefield-01").
 * Liefert ein leeres Array, wenn der Katalog keine Preisfelder deklariert
 * oder "pricefield-decimals" nicht leer/0 ist (unbekannte Preis-Einheit).
 */
export function parsePreisfeldTypen(text: string): string[] {
  const values = new Map<string, string>();
  for (const line of splitLines(text)) {
    const match = /^(\S+)\s*(.*)$/.exec(line);
    if (match) values.set(match[1].toLowerCase(), match[2].trim());
  }
  const decimals = values.get("pricefield-decimals") ?? "";
  if (decimals !== "" && decimals !== "0") return [];

  const typen: string[] = [];
  for (let i = 1; i <= 5; i++) {
    typen.push(values.get(`pricefield-0${i}`) ?? "");
  }
  return typen.some((typ) => typ !== "") ? typen : [];
}

/**
 * Zerlegt eine Preisdatei in (Schlüssel, Preis in Euro) je Zeile. Das Layout
 * wird an der Zeilenbreite erkannt; bei unbekannter oder uneinheitlicher
 * Breite bzw. fehlendem UVP-Preisfeld wird nichts geliefert.
 */
function parsePreiszeilen(
  text: string,
  schluesselBreite: number,
  preisfeldTypen: readonly string[],
): Array<[string, number]> {
  const lines = splitLines(text);
  const breiten = new Set(lines.map((line) => line.length));
  if (breiten.size !== 1) return [];
  const anzahlFelder = PREISZEILEN_LAYOUTS.get(lines[0].length);
  const feldIndex = preisfeldTypen.indexOf(SF6_PREISTYP_UVP);
  if (
    anzahlFelder === undefined ||
    feldIndex < 0 ||
    feldIndex >= anzahlFelder
  ) {
    return [];
  }

  const start = PREISFELD_START + feldIndex * PREISFELD_BREITE;
  const zeilen: Array<[string, number]> = [];
  for (const line of lines) {
    const schluessel = line.slice(0, schluesselBreite).trim();
    const priceField = line.slice(start, start + PREISFELD_BREITE).trim();
    if (!schluessel || !/^\d+$/.test(priceField)) continue;
    const preis = Number.parseInt(priceField, 10) / 100;
    if (preis > 0) zeilen.push([schluessel, preis]);
  }
  return zeilen;
}

/**
 * LensPrice.dat: mehrere Preiszeilen (je Stärkenbereich/Variante) pro
 * Grundglas-Code; Basispreis ist die niedrigste UVP über alle Zeilen.
 */
export function parseLensPrice(
  text: string,
  preisfeldTypen: readonly string[] = SF6_STANDARD_PREISFELDER,
): Map<string, number> {
  const basispreise = new Map<string, number>();
  for (const [esdCode, preis] of parsePreiszeilen(text, 6, preisfeldTypen)) {
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

/**
 * OptionsPrice.dat: Aufpreis (UVP) je Options.dat-Code. Zeilen mit Untercode
 * (Spalte 7-12, gilt nur für bestimmte Grundgläser) landen unter
 * "Code Untercode" und werden von parseOptions nicht zugeordnet.
 */
export function parseOptionsPrice(
  text: string,
  preisfeldTypen: readonly string[] = SF6_STANDARD_PREISFELDER,
): Map<string, number> {
  return new Map(parsePreiszeilen(text, 12, preisfeldTypen));
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
  preisfeldTypen: readonly string[] = SF6_STANDARD_PREISFELDER,
): Sf6Option[] {
  const preise = parseOptionsPrice(optionsPriceText, preisfeldTypen);
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
  const preisfeldTypen = parsePreisfeldTypen(files.head);
  return {
    hersteller: parseHead(files.head),
    produkte: parseLensType(files.lensType),
    basispreise: parseLensPrice(files.lensPrice, preisfeldTypen),
    optionen: parseOptions(
      files.options,
      files.optionsPrice,
      files.optionsColor,
      preisfeldTypen,
    ),
    verfuegbareOptionen: parseCombination(files.combination),
  };
}
