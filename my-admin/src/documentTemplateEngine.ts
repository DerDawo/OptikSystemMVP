// Generische Merge-Field-Engine fuer die Dokumentenvorlagen-Bibliothek (#58).
//
// Platzhalter im Vorlagentext folgen dem Muster {{entitaet.feld}}, z. B.
// {{kunde.vorname}} oder {{brille.summe}} (analog zum Merge-Field-Muster aus
// messaging.ts/kunden.tsx, dort aber ohne Namespace). Jede referenzierte
// Datenbanktabelle (kunde, brille, glass links/rechts, fassung, glastyp) wird
// per Reflection auf ihre Spalten in einen flachen "entitaet.spalte"-Wert
// abgebildet - neue Spalten oder neue Vorlagen (z. B. fuer Rechnung/Mahnung
// aus #56/#57) stehen damit automatisch als Platzhalter zur Verfuegung, ohne
// dass diese Render-Logik angepasst werden muss.
import dayjs from "dayjs";

export type MergeSource = Record<string, unknown> | null | undefined;

const isIsoDateString = (value: string) => /^\d{4}-\d{2}-\d{2}/.test(value);

const formatMergeValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "boolean") {
    return value ? "Ja" : "Nein";
  }
  if (typeof value === "number") {
    return Number.isInteger(value)
      ? String(value)
      : value.toLocaleString("de-DE", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
  }
  if (typeof value === "string") {
    if (isIsoDateString(value)) {
      const parsed = dayjs(value);
      if (parsed.isValid()) {
        return value.length > 10
          ? parsed.format("DD.MM.YYYY HH:mm")
          : parsed.format("DD.MM.YYYY");
      }
    }
    return value;
  }
  return "";
};

// Fuegt alle Spalten von `source` als "prefix.spalte" (klein geschrieben) in
// `target` ein. Verschachtelte Objekte/Arrays (z. B. bereits aufgeloeste
// react-admin Referenzen) werden bewusst uebersprungen, da die Tabellen
// dieser App flach sind.
const flattenEntity = (
  prefix: string,
  source: MergeSource,
  target: Record<string, string>,
) => {
  if (!source) {
    return;
  }
  Object.entries(source).forEach(([key, value]) => {
    if (value !== null && typeof value === "object") {
      return;
    }
    target[`${prefix}.${key}`.toLowerCase()] = formatMergeValue(value);
  });
};

export type DocumentMergeEntities = {
  kunde?: MergeSource;
  brille?: MergeSource;
  glasLinks?: MergeSource;
  glasRechts?: MergeSource;
  fassung?: MergeSource;
  glastyp?: MergeSource;
  // Über `brille.ZusatzleistungIDs` aufgelöste Zusatzleistungs-Datensätze,
  // fürs Rechnungspositionen-Layout (#56).
  zusatzleistungen?: MergeSource[];
};

const formatBetrag = (value: unknown): string =>
  `${(Number(value) || 0).toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`;

type Positionszeile = { label: string; betrag: number };

// Tab-getrennt statt spaltenbündig, da der Druck-Body (buildPrintHtml in
// FormulareDialog.tsx) in einer proportionalen Schrift (Arial) gerendert
// wird - mit Leerzeichen ausgerichtete Tabellen liefen dort schief.
const formatPositionenTabelle = (zeilen: Positionszeile[]): string => {
  if (zeilen.length === 0) {
    return "";
  }
  return [
    "Position\tBetrag",
    "-".repeat(48),
    ...zeilen.map(({ label, betrag }) => `${label}\t${formatBetrag(betrag)}`),
  ].join("\n");
};

// Baut die Rechnungspositionen (Issue #56) aus Glas links/rechts, Fassung,
// den ausgewählten Zusatzleistungen (aufgelöst gegen `zusatzleistung`) und
// dem ggf. angewandten Rabatt (siehe #22/#52: wirkt nur auf Glas + Fassung).
const buildPositionenText = (entities: DocumentMergeEntities): string => {
  const brille = entities.brille;
  const zeilen: Positionszeile[] = [];

  const glasRechtsBetrag = Number(entities.glasRechts?.Betrag) || 0;
  if (entities.glasRechts) {
    zeilen.push({ label: "Glas rechts", betrag: glasRechtsBetrag });
  }

  const glasLinksBetrag = Number(entities.glasLinks?.Betrag) || 0;
  if (entities.glasLinks) {
    zeilen.push({ label: "Glas links", betrag: glasLinksBetrag });
  }

  const fassungBetrag = Number(entities.fassung?.Betrag) || 0;
  if (entities.fassung) {
    const bezeichnung = formatMergeValue(entities.fassung.Bezeichnung);
    zeilen.push({
      label: bezeichnung ? `Fassung: ${bezeichnung}` : "Fassung",
      betrag: fassungBetrag,
    });
  }

  (entities.zusatzleistungen ?? []).forEach((zusatzleistung) => {
    if (!zusatzleistung) {
      return;
    }
    const bezeichnung =
      formatMergeValue(zusatzleistung.Bezeichnung) || "Zusatzleistung";
    zeilen.push({
      label: `Zusatzleistung: ${bezeichnung}`,
      betrag: Number(zusatzleistung.Betrag) || 0,
    });
  });

  const rabattProzent = Number(brille?.RabattProzent) || 0;
  if (rabattProzent > 0) {
    const rabattBasis = glasRechtsBetrag + glasLinksBetrag + fassungBetrag;
    const rabattBetrag =
      Math.round(rabattBasis * (rabattProzent / 100) * 100) / 100;
    const rabattBezeichnung = formatMergeValue(brille?.RabattBezeichnung);
    zeilen.push({
      label: `Rabatt${rabattBezeichnung ? `: ${rabattBezeichnung}` : ""} (-${rabattProzent} %)`,
      betrag: -rabattBetrag,
    });
  }

  return formatPositionenTabelle(zeilen);
};

// Baut die flache Platzhalter-Map fuer alle bekannten Entitaeten plus ein paar
// gaengige, abgeleitete Bequemlichkeits-Platzhalter (voller Name, Adresse,
// Restbetrag, heutiges Datum), die insbesondere fuer Rechnung/Mahnung (#56,
// #57) nuetzlich sind.
export const buildDocumentMergeValues = (
  entities: DocumentMergeEntities,
): Record<string, string> => {
  const values: Record<string, string> = {};

  flattenEntity("kunde", entities.kunde, values);
  flattenEntity("brille", entities.brille, values);
  flattenEntity("glaslinks", entities.glasLinks, values);
  flattenEntity("glasrechts", entities.glasRechts, values);
  flattenEntity("fassung", entities.fassung, values);
  flattenEntity("glastyp", entities.glastyp, values);

  const kunde = entities.kunde;
  if (kunde) {
    const vorname = formatMergeValue(kunde.Vorname);
    const nachname = formatMergeValue(kunde.Nachname);
    values["kunde.vollername"] = [vorname, nachname]
      .filter(Boolean)
      .join(" ")
      .trim();

    const strasse = formatMergeValue(kunde.Straße);
    const hausnummer = formatMergeValue(kunde.Hausnummer);
    const plz = formatMergeValue(kunde.Postleitzahl);
    const stadt = formatMergeValue(kunde.Stadt);
    const strassenzeile = [strasse, hausnummer].filter(Boolean).join(" ");
    const ortszeile = [plz, stadt].filter(Boolean).join(" ");
    values["kunde.adresse"] = [strassenzeile, ortszeile]
      .filter(Boolean)
      .join(", ");
  }

  const brille = entities.brille;
  if (brille) {
    const summe = Number(brille.Summe) || 0;
    const anzahlung = Number(brille.Anzahlung) || 0;
    const kkAnteil = Number(brille.KKAnteil) || 0;
    values["brille.restbetrag"] = formatMergeValue(
      Math.round((summe - anzahlung - kkAnteil) * 100) / 100,
    );
    values["brille.positionen"] = buildPositionenText(entities);
  }

  values["heute.datum"] = dayjs().format("DD.MM.YYYY");
  // Zahlungsfrist fuer Mahnungen (#57): pauschal 14 Tage, im Vorlagentext
  // jederzeit anpassbar, da nur ein Platzhalterwert.
  values["heute.zahlungsfrist"] = dayjs().add(14, "day").format("DD.MM.YYYY");

  return values;
};

// Ersetzt {{entitaet.feld}}-Platzhalter (Groß-/Kleinschreibung und
// umgebende Leerzeichen werden ignoriert) durch die passenden Werte aus
// `mergeValues`. Unbekannte Platzhalter werden zu einem leeren String, damit
// eine unvollstaendige Vorlage nicht mit sichtbaren "{{...}}"-Resten gedruckt
// wird.
export const renderDocumentTemplate = (
  template: string,
  mergeValues: Record<string, string>,
): string =>
  (template ?? "").replace(
    /\{\{\s*([a-zA-Z0-9_.]+?)\s*\}\}/g,
    (_match, token: string) => mergeValues[token.trim().toLowerCase()] ?? "",
  );
