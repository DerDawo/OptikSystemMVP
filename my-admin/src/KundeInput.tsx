import { AutocompleteInput, ReferenceInput } from "react-admin";
import { namensSuchmuster } from "./suchmuster";

type KundeRecord = Record<string, unknown>;

// "Ulm, Ursula · 08.02.1917" – mit Geburtsdatum, damit man gleichnamige
// Kunden unterscheiden kann.
export const kundeAuswahlText = (record?: KundeRecord) => {
  if (!record) return "";
  const name = [record.Nachname, record.Vorname].filter(Boolean).join(", ");
  const geburt = record.Geburtsdatum
    ? new Date(String(record.Geburtsdatum)).toLocaleDateString("de-DE")
    : "";
  return [name || `Nr. ${record.id}`, geburt].filter(Boolean).join(" · ");
};

// Sucht nach dem Nachnamen (erstes Wort), Umlaute wie in der Kundensuche.
const kundeSuchfilter = (eingabe: string) => {
  const nachname = eingabe.trim().split(/\s+/)[0] ?? "";
  return nachname ? { "Nachname@imatch": namensSuchmuster(nachname) } : {};
};

// Kundenauswahl mit Suche über alle Kunden (eine einfache Ausklappliste
// zeigt nur die ersten 25 Kunden).
export const KundeInput = ({ source = "kunde_id" }: { source?: string }) => (
  <ReferenceInput
    source={source}
    reference="kunde"
    sort={{ field: "Nachname", order: "ASC" }}
  >
    <AutocompleteInput
      label="Kunde"
      optionText={kundeAuswahlText}
      filterToQuery={kundeSuchfilter}
      helperText="Nachnamen eintippen"
    />
  </ReferenceInput>
);
