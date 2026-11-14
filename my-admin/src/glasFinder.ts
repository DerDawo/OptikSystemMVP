// Glas-Finder: passende Lagergläser zu den Werten eines Auftrags und eine
// Empfehlung für die Bestellung aus dem Glaskatalog (Glasassistent).

export type Werte = {
  Sph?: unknown;
  Cyl?: unknown;
  A?: unknown;
  Add?: unknown;
  // ganze Glas-Datensätze sind erlaubt
  [feld: string]: unknown;
};

export type Lagerglas = {
  id: number;
  Hersteller?: string | null;
  Bezeichnung: string;
  Brechungsindex?: number | null;
  Verguetung?: string | null;
  Durchmesser?: number | null;
  Sph: number;
  Cyl: number;
  Bestand: number;
  Mindestbestand?: number | null;
  Verkaufspreis?: number | null;
  Lagerort?: string | null;
  Aktiv?: boolean | null;
};

const zahl = (wert: unknown): number | null => {
  if (wert === null || wert === undefined || wert === "") return null;
  const n = Number(String(wert).replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

// auf Viertel-Dioptrien runden (Lagergläser gibt es nur in 0,25er Stufen)
const viertel = (n: number) => Math.round(n * 4) / 4;

/**
 * Werte in Minuszylinder-Schreibweise (wie Lagergläser):
 * +1,00 / +0,50 × 90 wird +1,50 / −0,50 × 180.
 */
export const minusZylinder = (w: Werte) => {
  const sph = zahl(w.Sph);
  if (sph === null) return null;
  const cyl = zahl(w.Cyl) ?? 0;
  const achse = zahl(w.A);
  if (cyl <= 0) return { sph: viertel(sph), cyl: viertel(cyl), achse };
  return {
    sph: viertel(sph + cyl),
    cyl: viertel(-cyl),
    achse: achse === null ? null : ((achse + 90 - 1) % 180) + 1,
  };
};

/** Gleitsicht/Mehrstärken: eine Addition ist eingetragen. */
export const hatAddition = (w: Werte) => (zahl(w.Add) ?? 0) > 0;

/** Lagergläser mit genau diesen Werten, die vorrätig sind (günstigste zuerst). */
export const passendeLagerglaeser = (w: Werte, lager: Lagerglas[]) => {
  const werte = minusZylinder(w);
  if (!werte || hatAddition(w)) return [];
  return lager
    .filter(
      (g) =>
        g.Aktiv !== false &&
        g.Bestand > 0 &&
        Math.abs(Number(g.Sph) - werte.sph) < 0.001 &&
        Math.abs(Number(g.Cyl) - werte.cyl) < 0.001,
    )
    .sort(
      (a, b) =>
        (a.Verkaufspreis ?? Infinity) - (b.Verkaufspreis ?? Infinity) ||
        b.Bestand - a.Bestand,
    );
};

/** Stärkster Hauptschnitt (für die Indexempfehlung). */
export const staerksterHauptschnitt = (w: Werte) => {
  const werte = minusZylinder(w);
  if (!werte) return null;
  return Math.max(Math.abs(werte.sph), Math.abs(werte.sph + werte.cyl));
};

/** Empfohlener Brechungsindex nach der Stärke (dünn und leicht). */
export const indexEmpfehlung = (augen: Werte[]) => {
  const staerken = augen
    .map(staerksterHauptschnitt)
    .filter((n): n is number => n !== null);
  if (staerken.length === 0) return null;
  const max = Math.max(...staerken);
  if (max <= 2) return { index: 1.5, text: "1,5 (Standard)" };
  if (max <= 4) return { index: 1.6, text: "1,6 (dünner)" };
  if (max <= 6) return { index: 1.67, text: "1,67 (dünn)" };
  return { index: 1.74, text: "1,74 (sehr dünn)" };
};

/** Lagergläser, die nachbestellt werden sollten. */
export const nachbestellen = (g: Lagerglas) =>
  g.Aktiv !== false && g.Bestand <= (g.Mindestbestand ?? 0);

const dpt = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: "exceptZero",
});

/** "−1,25 / −0,50" für Anzeige und Suche. */
export const werteText = (sph: number, cyl: number) =>
  cyl ? `${dpt.format(sph)} / ${dpt.format(cyl)}` : `${dpt.format(sph)} sph`;
