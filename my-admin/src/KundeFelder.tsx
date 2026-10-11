import { useEffect } from "react";
import { Box, Chip, Typography } from "@mui/material";
import {
  DateInput,
  SelectArrayInput,
  SelectInput,
  TextInput,
  useRecordContext,
} from "react-admin";
import { useFormContext, useWatch } from "react-hook-form";
import { DatenbankInfo, FieldRow } from "./EntityLayout";

// Anrede: Werte des Datenbanktyps public.anrede, Herr/Frau zuerst
const ANREDEN = ["Frau", "Herr", "Dr.", "Prof.", "Prof. Dr."].map((a) => ({
  id: a,
  name: a,
}));

// Geschlecht wird klein geschrieben gespeichert (wie aus Prisma übernommen)
const GESCHLECHTER = [
  { id: "weiblich", name: "Weiblich" },
  { id: "männlich", name: "Männlich" },
];

export const AnredeInput = () => (
  <SelectInput source="Anrede" choices={ANREDEN} emptyText="–" />
);

export const GeschlechtInput = () => {
  const record = useRecordContext();
  const wert = record?.Geschlecht;
  // abweichender Altwert (z. B. "divers") bleibt auswählbar
  const choices =
    wert && !GESCHLECHTER.some((g) => g.id === wert)
      ? [...GESCHLECHTER, { id: String(wert), name: String(wert) }]
      : GESCHLECHTER;
  return <SelectInput source="Geschlecht" choices={choices} emptyText="–" />;
};

// Setzt das Geschlecht passend zur Anrede (Frau/Herr), solange es leer ist
export const GeschlechtAusAnrede = () => {
  const anrede = useWatch({ name: "Anrede" });
  const { getValues, setValue } = useFormContext();
  useEffect(() => {
    if (getValues("Geschlecht")) return;
    if (anrede === "Frau")
      setValue("Geschlecht", "weiblich", { shouldDirty: true });
    if (anrede === "Herr")
      setValue("Geschlecht", "männlich", { shouldDirty: true });
  }, [anrede, getValues, setValue]);
  return null;
};

// Kundennummer, Aufnahmedatum und technische Angaben klein am Ende des
// Formulars
export const KundeVerwaltung = () => (
  <Box sx={{ mt: 3, width: "100%", maxWidth: 520 }}>
    <Typography variant="caption" color="text.secondary">
      Verwaltung
    </Typography>
    <FieldRow>
      <TextInput source="KundenNummer" size="small" helperText={false} />
      <DateInput source="Aufnahmedatum" size="small" helperText={false} />
    </FieldRow>
    <DatenbankInfo />
  </Box>
);

// Kurz-Hinweise bei den Notizen (Spalte kunde."Hinweise", Mehrfachauswahl)
export const HINWEISE = ["CAT-op", "Sicca", "GKB", "GK", "NH", "BH", "PSY"];

export const HinweiseInput = () => {
  const record = useRecordContext();
  // in der Datenbank vorhandene, hier nicht gelistete Hinweise bleiben wählbar
  const vorhandene: string[] = Array.isArray(record?.Hinweise)
    ? record.Hinweise
    : [];
  const alle = [
    ...HINWEISE,
    ...vorhandene.filter((h) => !HINWEISE.includes(h)),
  ];
  return (
    <SelectArrayInput
      source="Hinweise"
      label="Hinweise"
      choices={alle.map((h) => ({ id: h, name: h }))}
      helperText="Mehrfachauswahl"
      format={(wert) => (Array.isArray(wert) ? wert : [])}
    />
  );
};

export const HinweiseChips = () => {
  const record = useRecordContext();
  const hinweise: string[] = Array.isArray(record?.Hinweise)
    ? record.Hinweise
    : [];
  if (hinweise.length === 0) return null;
  return (
    <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
      {hinweise.map((h) => (
        <Chip
          key={h}
          label={h}
          size="small"
          color="warning"
          variant="outlined"
        />
      ))}
    </Box>
  );
};
