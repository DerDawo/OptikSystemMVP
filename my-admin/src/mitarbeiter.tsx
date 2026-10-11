import {
  AutocompleteInput,
  FunctionField,
  SelectInput,
  useRecordContext,
} from "react-admin";
import {
  MITARBEITER,
  istAlteFassungsangabe,
  mitarbeiterAnzeige,
} from "./mitarbeiterNamen";

const VERORDNUNGEN = ["lt. ärztl. Verordnung", "lt. optometr. Verordnung"];

const auswahl = (namen: string[], aktuell: unknown) => {
  const liste = [...namen];
  const wert = mitarbeiterAnzeige(aktuell).trim();
  if (wert && !liste.includes(wert)) liste.push(wert);
  return liste.map((name) => ({ id: name, name }));
};

type FeldProps = { source: string; label: string };

// Ausklappliste mit den Mitarbeitern; ein abweichender Altwert (z. B. aus
// Prisma) bleibt sichtbar, damit er beim Speichern nicht verloren geht.
export const MitarbeiterInput = ({ source, label }: FeldProps) => {
  const record = useRecordContext();
  return (
    <SelectInput
      source={source}
      label={label}
      choices={auswahl(MITARBEITER, record?.[source])}
      emptyText="–"
      format={(wert) => (istAlteFassungsangabe(wert) ? "" : wert)}
    />
  );
};

// Wie MitarbeiterInput, zusätzlich Verordnungen und frei eintragbare
// Ärzte/Praxen.
export const RefraktionInput = ({ source, label }: FeldProps) => {
  const record = useRecordContext();
  return (
    <AutocompleteInput
      source={source}
      label={label}
      choices={auswahl([...MITARBEITER, ...VERORDNUNGEN], record?.[source])}
      format={(wert) => (istAlteFassungsangabe(wert) ? "" : wert)}
      onCreate={(text) => {
        const name = (text ?? "").trim();
        return name ? { id: name, name } : undefined;
      }}
      createItemLabel="Arzt/Praxis „%{item}“ übernehmen"
      helperText="Mitarbeiter wählen oder Arzt/Praxis eintippen"
    />
  );
};

export const MitarbeiterField = ({ source, label }: FeldProps) => (
  <FunctionField
    source={source}
    label={label}
    render={(record) => mitarbeiterAnzeige(record?.[source])}
  />
);
