// Anzeigenamen für Datensätze in ReferenceField/ReferenceInput und
// Seitentiteln (recordRepresentation in App.tsx). Ohne sie zeigt react-admin
// nur die ID, z. B. "#1" bei Glas und Fassung einer Brille.

type RecordLike = Record<string, unknown>;

const dioptrien = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: "exceptZero",
});

const asNumber = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const fallback = (record: RecordLike) => `Nr. ${record.id}`;

// Glas eines Auftrags, z. B. "Nr. 11 · Links · Sph -1,25 · Cyl -0,50"
export const glassRepresentation = (record: RecordLike) => {
  const sph = asNumber(record.Sph);
  const cyl = asNumber(record.Cyl);
  return [
    fallback(record),
    record.Seite,
    sph !== null ? `Sph ${dioptrien.format(sph)}` : null,
    cyl !== null ? `Cyl ${dioptrien.format(cyl)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
};

// Fassung, z. B. "Ray-Ban Classic Metal Frame"
export const fassungRepresentation = (record: RecordLike) =>
  [record.Hersteller, record.Bezeichnung].filter(Boolean).join(" ") ||
  fallback(record);

// Stammdaten mit Bezeichnungsfeld (Glastyp, Brillenart, Glaskatalog, ...)
export const byField = (field: string) => (record: RecordLike) =>
  typeof record[field] === "string" && record[field]
    ? (record[field] as string)
    : fallback(record);

// Kunde wie in der Kundenliste, z. B. "Herr David Hammbartsumjan"
export const kundeRepresentation = (record: RecordLike) =>
  [record.Anrede, record.Vorname, record.Nachname].filter(Boolean).join(" ") ||
  fallback(record);
