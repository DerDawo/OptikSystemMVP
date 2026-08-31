// CRUD-Oberfläche für die Dokumentenvorlagen-Bibliothek (#58). Der
// Vorlagentext ist ein einfaches Mehrzeilen-Textfeld ("Text ändern"), damit
// inhaltliche Anpassungen (auch für spätere Rechnung/Mahnung-Vorlagen aus
// #56/#57) ohne Code-Deploy möglich sind.
import {
  BooleanField,
  BooleanInput,
  Create,
  DataTable,
  DateField,
  Edit,
  List,
  SelectInput,
  Show,
  SimpleForm,
  TextField,
  TextInput,
} from "react-admin";
import { Alert } from "@mui/material";
import {
  Field,
  FieldRow,
  FormSection,
  ShowLayout,
  ShowSection,
} from "./EntityLayout";

// Muss mit dem Check-Constraint aus der Migration
// 20260831010000_create_dokumentvorlage.sql übereinstimmen. Rechnung/Mahnung
// sind bereits als Kategorien vorgesehen, damit #56/#57 nur noch neue
// Vorlagen-Datensätze anlegen müssen.
export const DOKUMENTVORLAGE_KATEGORIEN = [
  { id: "Sehtest", name: "Sehtest" },
  { id: "Werkstattkarte", name: "Werkstattkarte" },
  { id: "Berechtigungsschein", name: "Berechtigungsschein" },
  { id: "Privatrezept", name: "Privatrezept" },
  { id: "Rezeptdruck Arzt", name: "Rezeptdruck Arzt" },
  { id: "Reparaturschein", name: "Reparaturschein" },
  { id: "Rechnung", name: "Rechnung" },
  { id: "Mahnung", name: "Mahnung" },
];

const PLATZHALTER_HINWEIS =
  "Platzhalter im Format {{entität.feld}}, z. B. {{kunde.vorname}}, {{brille.summe}} oder {{heute.datum}}, werden beim Öffnen des Formulare-Dialogs in der Brillenkartei automatisch durch die Daten des Auftrags/Kunden ersetzt.";

export const DokumentvorlageList = () => (
  <List title="Dokumentvorlagen" sort={{ field: "Kategorie", order: "ASC" }}>
    <DataTable>
      <DataTable.Col source="id" />
      <DataTable.Col source="Kategorie" />
      <DataTable.Col source="Name" />
      <DataTable.Col source="Aktiv">
        <BooleanField source="Aktiv" />
      </DataTable.Col>
      <DataTable.Col source="created_at">
        <DateField source="created_at" />
      </DataTable.Col>
    </DataTable>
  </List>
);

export const DokumentvorlageShow = () => (
  <Show title="Dokumentvorlage anzeigen">
    <ShowLayout>
      <ShowSection title="Datenbankfelder">
        <Field>
          <TextField source="id" />
        </Field>
        <Field>
          <DateField source="created_at" />
        </Field>
      </ShowSection>
      <ShowSection title="Details">
        <Field>
          <TextField source="Kategorie" />
        </Field>
        <Field>
          <TextField source="Name" />
        </Field>
        <Field label="Aktiv">
          <BooleanField source="Aktiv" />
        </Field>
      </ShowSection>
      <ShowSection title="Vorlagentext">
        <Field label={false}>
          <TextField
            source="Vorlagentext"
            sx={{ whiteSpace: "pre-wrap", overflowWrap: "break-word" }}
          />
        </Field>
      </ShowSection>
    </ShowLayout>
  </Show>
);

export const DokumentvorlageEdit = () => (
  <Edit title="Dokumentvorlage bearbeiten">
    <SimpleForm>
      <FormSection title="Details">
        <FieldRow>
          <SelectInput
            source="Kategorie"
            choices={DOKUMENTVORLAGE_KATEGORIEN}
          />
          <TextInput source="Name" />
          <BooleanInput source="Aktiv" />
        </FieldRow>
      </FormSection>
      <FormSection title="Text ändern">
        <Alert severity="info" sx={{ mb: 1 }}>
          {PLATZHALTER_HINWEIS}
        </Alert>
        <TextInput
          source="Vorlagentext"
          multiline
          minRows={12}
          fullWidth
          label="Vorlagentext"
        />
      </FormSection>
    </SimpleForm>
  </Edit>
);

export const DokumentvorlageCreate = () => (
  <Create title="Dokumentvorlage anlegen">
    <SimpleForm defaultValues={{ Aktiv: true }}>
      <FormSection title="Details">
        <FieldRow>
          <SelectInput
            source="Kategorie"
            choices={DOKUMENTVORLAGE_KATEGORIEN}
          />
          <TextInput source="Name" />
          <BooleanInput source="Aktiv" />
        </FieldRow>
      </FormSection>
      <FormSection title="Text ändern">
        <Alert severity="info" sx={{ mb: 1 }}>
          {PLATZHALTER_HINWEIS}
        </Alert>
        <TextInput
          source="Vorlagentext"
          multiline
          minRows={12}
          fullWidth
          label="Vorlagentext"
        />
      </FormSection>
    </SimpleForm>
  </Create>
);
