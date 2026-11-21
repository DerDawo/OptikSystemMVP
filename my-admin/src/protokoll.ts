// Lesbare Darstellung der Einträge im Änderungsprotokoll.

export const BEREICHE: Record<string, string> = {
  kunde: "Kunde",
  brille: "Brillenauftrag",
  glass: "Glaswerte",
  glastyp: "Glastyp",
  fassung: "Fassung",
  kontaktlinse: "Kontaktlinse",
  brille_hat_zusatzleistungen: "Zusatzleistung im Auftrag",
  kunde_brillenversicherung: "Brillenversicherung",
  kunde_leistet_zauzahlung_fuer_brille: "Zuzahlung",
  kassenrezept: "Kassenrezept",
  optica_abrechnung: "OPTICA-Abrechnung",
  optica_absetzung: "OPTICA-Absetzung",
  optica_ekv: "Kostenvoranschlag (eKV)",
  kunde_dokument: "Kundendokument",
  fundusbericht: "Fundusbericht",
  firmenrechnung: "Firmenrechnung",
  schuldnerliste: "Schuldnerliste",
  betrieb: "Betriebsdaten",
  glaslager: "Glas-Lager",
  benutzer_rolle: "Benutzerrolle",
};

export const bereichName = (tabelle: string) => BEREICHE[tabelle] ?? tabelle;

const wertText = (wert: unknown): string => {
  if (wert === null || wert === undefined || wert === "") return "leer";
  if (typeof wert === "boolean") return wert ? "ja" : "nein";
  if (typeof wert === "number") return String(wert).replace(".", ",");
  if (typeof wert === "string") {
    const kurz = wert.length > 80 ? `${wert.slice(0, 77)}…` : wert;
    return `„${kurz}“`;
  }
  const json = JSON.stringify(wert);
  return json.length > 80 ? `${json.slice(0, 77)}…` : json;
};

type Eintrag = {
  aktion: string;
  alt?: Record<string, unknown> | null;
  neu?: Record<string, unknown> | null;
};

/** Zeilen wie "Sph: „-1,25“ → „-1,50“" für geänderte Felder. */
export const aenderungsZeilen = (e: Eintrag): string[] => {
  if (e.aktion === "geändert") {
    return Object.keys(e.neu ?? {}).map(
      (feld) =>
        `${feld}: ${wertText(e.alt?.[feld])} → ${wertText(e.neu?.[feld])}`,
    );
  }
  const zeile = (e.aktion === "gelöscht" ? e.alt : e.neu) ?? {};
  return Object.entries(zeile)
    .filter(
      ([feld, wert]) =>
        wert !== null &&
        wert !== "" &&
        !["created_at", "updated_at"].includes(feld),
    )
    .map(([feld, wert]) => `${feld}: ${wertText(wert)}`);
};
