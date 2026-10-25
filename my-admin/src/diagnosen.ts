// Diagnosen zum Anhaken in der Brillenkartei. Gespeichert wird weiter als
// Text in brille."Diagnose" (z. B. "Siccasyndrom, Glaukom, Freitext"), damit
// Formulare und ältere Aufträge unverändert funktionieren.
export const DIAGNOSEN = [
  "Siccasyndrom",
  "Katarakt",
  "Glaukom",
  "Bindehaut",
  "AMD",
  "KSF",
  "Periorbital",
  "Apoplex",
  "BHD",
  "Psyche",
  "Lider (XA/DC)",
  "Strabismus",
  "Asthenopische Beschwerden",
  "Office-Probleme",
];

const normal = (t: string) => t.trim().toLowerCase();

// Text -> angehakte Diagnosen + übriger Freitext
export const zerlegeDiagnose = (
  wert: unknown,
): { gewaehlt: string[]; rest: string } => {
  const teile = String(wert ?? "")
    .split(/[,;\n]/)
    .map((t) => t.trim())
    .filter(Boolean);
  const gewaehlt: string[] = [];
  const rest: string[] = [];
  for (const teil of teile) {
    const treffer = DIAGNOSEN.find((d) => normal(d) === normal(teil));
    if (treffer) {
      if (!gewaehlt.includes(treffer)) gewaehlt.push(treffer);
    } else rest.push(teil);
  }
  return {
    gewaehlt: DIAGNOSEN.filter((d) => gewaehlt.includes(d)),
    rest: rest.join(", "),
  };
};

// angehakte Diagnosen (in fester Reihenfolge) + Freitext -> Text (leer: null)
export const baueDiagnose = (gewaehlt: string[], rest: string) => {
  const teile = [
    ...DIAGNOSEN.filter((d) => gewaehlt.includes(d)),
    ...(rest.trim() ? [rest.trim()] : []),
  ];
  return teile.length ? teile.join(", ") : null;
};
