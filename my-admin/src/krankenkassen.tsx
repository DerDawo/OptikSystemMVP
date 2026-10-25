import {
  BooleanInput,
  Create,
  DataTable,
  Edit,
  List,
  SimpleForm,
  TextInput,
  useGetList,
  useInput,
} from "react-admin";
import { useFormContext } from "react-hook-form";
import { Autocomplete, TextField } from "@mui/material";
import { FieldRow, FormSection } from "./EntityLayout";

/*
 * Liste der gesetzlichen Krankenkassen (Tabelle "krankenkasse") als Auswahl
 * beim Kunden. Freie Eingabe bleibt möglich (private Kassen, ältere Namen aus
 * Prisma). Ist zur gewählten Kasse ein IK hinterlegt, wird es als Kassen-Nr.
 * übernommen.
 */

export type Krankenkasse = {
  id: number;
  Name: string;
  Kassenart?: string | null;
  Geoeffnet?: string | null;
  IK?: string | null;
  Aktiv?: boolean;
};

export const useKrankenkassen = (): Krankenkasse[] => {
  const { data } = useGetList<Krankenkasse>(
    "krankenkasse",
    {
      pagination: { page: 1, perPage: 500 },
      sort: { field: "Name", order: "ASC" },
      filter: { Aktiv: true },
    },
    { staleTime: 10 * 60 * 1000 },
  );
  return data ?? [];
};

// IK der Kasse mit genau diesem Namen (oder undefined)
export const ikVon = (kassen: Krankenkasse[], name: unknown) => {
  const ik = kassen.find((k) => k.Name === name)?.IK;
  return ik && ik.trim() ? ik.trim() : undefined;
};

// Eingabefeld "Krankenkasse" für Kunde bearbeiten / neu anlegen
export const KrankenkasseInput = () => {
  const kassen = useKrankenkassen();
  const { setValue } = useFormContext();
  const { field } = useInput({ source: "Krankenkasse" });
  const uebernehmen = (neu: string | null) => {
    field.onChange(neu ?? "");
    const ik = ikVon(kassen, neu);
    if (ik) setValue("KrankenkassenNummer", ik, { shouldDirty: true });
  };
  return (
    <Autocomplete
      freeSolo
      autoSelect
      options={kassen.map((k) => k.Name)}
      value={field.value ?? ""}
      onChange={(_, neu) => uebernehmen(neu)}
      onBlur={field.onBlur}
      sx={{ flex: 1, minWidth: 220 }}
      renderInput={(params) => (
        <TextField {...params} label="Krankenkasse" size="small" />
      )}
    />
  );
};

export const KrankenkasseList = () => (
  <List
    title="Krankenkassen"
    sort={{ field: "Name", order: "ASC" }}
    perPage={100}
  >
    <DataTable>
      <DataTable.Col source="Name" />
      <DataTable.Col source="Kassenart" />
      <DataTable.Col source="IK" label="IK / Kassen-Nr." />
      <DataTable.Col source="Geoeffnet" label="Geöffnet für" />
    </DataTable>
  </List>
);

const KrankenkasseFormular = () => (
  <SimpleForm>
    <FormSection title="Krankenkasse">
      <FieldRow>
        <TextInput source="Name" />
        <TextInput source="Kassenart" />
        <TextInput source="IK" label="IK / Kassen-Nr." />
      </FieldRow>
      <TextInput source="Geoeffnet" label="Geöffnet für" fullWidth />
      <BooleanInput source="Aktiv" label="In der Auswahl anbieten" />
    </FormSection>
  </SimpleForm>
);

export const KrankenkasseEdit = () => (
  <Edit>
    <KrankenkasseFormular />
  </Edit>
);

export const KrankenkasseCreate = () => (
  <Create record={{ Aktiv: true }}>
    <KrankenkasseFormular />
  </Create>
);
