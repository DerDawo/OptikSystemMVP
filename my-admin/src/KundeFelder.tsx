import { useEffect } from "react";
import { Box, Typography } from "@mui/material";
import {
  DateInput,
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
