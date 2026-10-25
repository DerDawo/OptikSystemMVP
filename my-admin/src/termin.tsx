import {
  DataTable,
  DateField,
  DateInput,
  List,
  ReferenceField,
  Show,
  SimpleForm,
  TextField,
} from "react-admin";
import { Edit, Create, TextInput, FunctionField } from "react-admin";
import type { RaRecord } from "react-admin";
import { CreateButton, TopToolbar } from "react-admin";
import { useLocation } from "react-router-dom";
import { GoogleAbgleichButton } from "./GoogleAbgleich";
import { KundeInput } from "./KundeInput";
import { EndeFolgtStart, ViertelstundeInput } from "./ViertelstundeInput";
import {
  Field,
  FieldRow,
  FormSection,
  ShowLayout,
  ShowSection,
} from "./EntityLayout";
import { zurueckNachSpeichern } from "./seitenVerlauf";

const kundeOptionText = (record: RaRecord) =>
  `${record.Anrede ?? ""} ${record.Vorname ?? ""} ${record.Nachname ?? ""}`.trim();

const KundeName = () => (
  <ReferenceField
    source="kunde_id"
    reference="kunde"
    link="show"
    emptyText="Kunde offen"
  >
    <FunctionField
      render={(record) => {
        if (!record) return "";
        return kundeOptionText(record);
      }}
    />
  </ReferenceField>
);

const TerminListActions = () => (
  <TopToolbar sx={{ alignItems: "center" }}>
    <GoogleAbgleichButton />
    <CreateButton />
  </TopToolbar>
);

export const TerminList = () => (
  <List
    title="Termine"
    sort={{ field: "Start", order: "DESC" }}
    actions={<TerminListActions />}
  >
    <DataTable>
      <DataTable.Col source="Titel" />
      <DataTable.Col label="Kunde">
        <KundeName />
      </DataTable.Col>
      <DataTable.Col source="Start">
        <DateField source="Start" showTime />
      </DataTable.Col>
      <DataTable.Col source="Ende">
        <DateField source="Ende" showTime />
      </DataTable.Col>
      <DataTable.Col source="Terminart" />
      <DataTable.Col source="Notiz" />
    </DataTable>
  </List>
);

export const TerminShow = () => (
  <Show title="Termin anzeigen">
    <ShowLayout>
      <ShowSection title="Datenbankfelder">
        <Field>
          <TextField source="id" />
        </Field>
        <Field>
          <DateField source="created_at" />
        </Field>
      </ShowSection>
      <ShowSection title="Termin">
        <Field>
          <TextField source="Titel" />
        </Field>
        <Field label="Kunde">
          <KundeName />
        </Field>
        <Field>
          <DateField source="Start" showTime />
        </Field>
        <Field>
          <DateField source="Ende" showTime />
        </Field>
        <Field>
          <TextField source="Terminart" />
        </Field>
        <Field>
          <TextField source="Notiz" />
        </Field>
      </ShowSection>
    </ShowLayout>
  </Show>
);

export const TerminEdit = () => (
  <Edit title="Termin bearbeiten" redirect={zurueckNachSpeichern}>
    <SimpleForm>
      <FormSection title="Datenbankfelder">
        <FieldRow>
          <TextInput source="id" InputProps={{ disabled: true }} />
          <DateInput source="created_at" InputProps={{ disabled: true }} />
        </FieldRow>
      </FormSection>
      <FormSection title="Termin">
        <TextInput source="Titel" fullWidth />
        <KundeInput />
        <FieldRow>
          <ViertelstundeInput source="Start" label="Beginn" />
          <ViertelstundeInput source="Ende" label="Ende" />
          <EndeFolgtStart />
        </FieldRow>
        <TextInput source="Terminart" />
        <TextInput source="Notiz" multiline />
      </FormSection>
    </SimpleForm>
  </Edit>
);

export const TerminCreate = () => {
  const location = useLocation();
  const locationState =
    (location.state as Record<string, unknown> | undefined) ?? {};

  const defaultValues = {
    Terminart: "",
    Notiz: "",
    ...locationState,
  };

  return (
    <Create title="Neuen Termin anlegen">
      <SimpleForm defaultValues={defaultValues}>
        <FormSection title="Termin">
          <TextInput source="Titel" fullWidth />
          <KundeInput />
          <FieldRow>
            <ViertelstundeInput source="Start" label="Beginn" />
            <ViertelstundeInput source="Ende" label="Ende" />
            <EndeFolgtStart />
          </FieldRow>
          <TextInput source="Terminart" />
          <TextInput source="Notiz" multiline />
        </FormSection>
      </SimpleForm>
    </Create>
  );
};
