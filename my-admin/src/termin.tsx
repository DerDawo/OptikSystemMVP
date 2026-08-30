import {
  DataTable,
  DateField,
  DateInput,
  List,
  ReferenceField,
  ReferenceInput,
  SelectInput,
} from "react-admin";
import { Show, SimpleShowLayout, TextField } from "react-admin";
import {
  DateTimeInput,
  Edit,
  Create,
  SimpleForm,
  TextInput,
  FunctionField,
} from "react-admin";
import type { RaRecord } from "react-admin";
import { useLocation } from "react-router-dom";

const kundeOptionText = (record: RaRecord) =>
  `${record.Anrede ?? ""} ${record.Vorname ?? ""} ${record.Nachname ?? ""}`.trim();

const KundeName = () => (
  <ReferenceField source="kunde_id" reference="kunde" link="show">
    <FunctionField
      render={(record) => {
        if (!record) return "";
        return kundeOptionText(record);
      }}
    />
  </ReferenceField>
);

export const TerminList = () => (
  <List title="Termine" sort={{ field: "Start", order: "DESC" }}>
    <DataTable>
      <DataTable.Col source="id" />
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
    <SimpleShowLayout>
      <TextField source="id" />
      <DateField source="created_at" />
      <KundeName />
      <DateField source="Start" showTime />
      <DateField source="Ende" showTime />
      <TextField source="Terminart" />
      <TextField source="Notiz" />
    </SimpleShowLayout>
  </Show>
);

export const TerminEdit = () => (
  <Edit title="Termin bearbeiten">
    <SimpleForm>
      <TextInput source="id" InputProps={{ disabled: true }} />
      <DateInput source="created_at" InputProps={{ disabled: true }} />
      <ReferenceInput source="kunde_id" reference="kunde">
        <SelectInput optionText={kundeOptionText} />
      </ReferenceInput>
      <DateTimeInput source="Start" />
      <DateTimeInput source="Ende" />
      <TextInput source="Terminart" />
      <TextInput source="Notiz" multiline />
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
        <ReferenceInput source="kunde_id" reference="kunde">
          <SelectInput optionText={kundeOptionText} />
        </ReferenceInput>
        <DateTimeInput source="Start" />
        <DateTimeInput source="Ende" />
        <TextInput source="Terminart" />
        <TextInput source="Notiz" multiline />
      </SimpleForm>
    </Create>
  );
};
