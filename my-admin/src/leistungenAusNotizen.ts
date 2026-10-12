// Prisma-Altaufträge (#131) haben ihre Freitext-Leistungen als Text im
// Format des Imports (supabase/scripts/prisma_import), seit der Bereinigung
// der Notizen in brille."PrismaAngaben":
//
//   Leistungen:
//   - Glaseinschliff: 29,50 €
//   - Nachlass: -10,00 €
//
// Der Betrag steht als Summe in brille.WeitereLeistungen. Für Rechnung,
// Kostenvoranschlag und Karteikarte werden die Zeilen wieder einzeln mit
// Bezeichnung aufgeführt.

export type NotizLeistung = { bezeichnung: string; betrag: number };

const ZEILE = /^-\s*(.+?):\s*(-?\d+(?:\.\d{3})*,\d{2})\s*€\s*$/;

export const leistungenAusNotizen = (notizen: unknown): NotizLeistung[] => {
  const zeilen = String(notizen ?? "").split(/\r?\n/);
  const start = zeilen.findIndex((z) => z.trim() === "Leistungen:");
  if (start < 0) return [];
  const ergebnis: NotizLeistung[] = [];
  for (const zeile of zeilen.slice(start + 1)) {
    const text = zeile.trim();
    if (!text.startsWith("-")) break;
    const treffer = ZEILE.exec(text);
    if (!treffer) continue;
    const betrag = Number(treffer[2].replace(/\./g, "").replace(",", "."));
    if (Number.isFinite(betrag) && betrag !== 0)
      ergebnis.push({ bezeichnung: treffer[1].trim(), betrag });
  }
  return ergebnis;
};

// Text mit den Prisma-Leistungen eines Auftrags: seit der Bereinigung der
// Notizen in brille."PrismaAngaben", bei älteren Ständen noch in den Notizen
export const leistungsText = (brille: unknown) =>
  [
    (brille as Record<string, unknown> | undefined)?.PrismaAngaben,
    (brille as Record<string, unknown> | undefined)?.Notizen,
  ]
    .filter((t) => t != null && String(t).trim() !== "")
    .join("\n");

const rund = (wert: number) => Math.round(wert * 100) / 100;

// Positionen für brille.WeitereLeistungen: die Einzelleistungen aus den
// Notizen, ein nicht aufgeschlüsselter Rest als "Weitere Leistungen" bzw.
// "Nachlass". Die Summe der Positionen ist immer genau WeitereLeistungen.
export const weitereLeistungenPositionen = (
  weitereLeistungen: number,
  notizen: unknown,
  zusatz = "(siehe Auftrag)",
): NotizLeistung[] => {
  if (!weitereLeistungen) return [];
  const einzeln = leistungenAusNotizen(notizen);
  const rest = rund(
    weitereLeistungen - einzeln.reduce((summe, l) => summe + l.betrag, 0),
  );
  if (rest === 0) return einzeln;
  return [
    ...einzeln,
    {
      bezeichnung:
        rest > 0 ? `Weitere Leistungen ${zusatz}` : `Nachlass ${zusatz}`,
      betrag: rest,
    },
  ];
};
