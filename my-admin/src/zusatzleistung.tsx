import {
  DataTable,
  DateField,
  List,
  Show,
  TextField,
  Edit,
  SimpleForm,
  TextInput,
  Create,
  NumberInput,
  SelectInput,
  BooleanField,
  BooleanInput,
} from "react-admin";
import { CurrencyField } from "./CurrencyField";
import {
  Field,
  FieldRow,
  FormSection,
  ShowLayout,
  ShowSection,
} from "./EntityLayout";

export const ZUSATZLEISTUNG_KATEGORIEN = [
  { id: "Diagnostik & Vorsorge", name: "Diagnostik & Vorsorge" },
  { id: "Kontaktlinsen", name: "Kontaktlinsen" },
  { id: "Service & Hausbesuch", name: "Service & Hausbesuch" },
  { id: "Reparaturen", name: "Reparaturen" },
  { id: "Veredelungen & Extras", name: "Veredelungen & Extras" },
];

export const ZusatzleistungList = () => (
  <List title="Zusatzleistungen" sort={{ field: "Reihenfolge", order: "ASC" }}>
    <DataTable>
      <DataTable.NumberCol source="Reihenfolge" label="Nr." />
      <DataTable.Col source="Aktiv" label="In Auswahl">
        <BooleanField source="Aktiv" />
      </DataTable.Col>
      <DataTable.Col source="Kategorie" />
      <DataTable.Col source="Bezeichnung" />
      <DataTable.Col source="Betrag" sx={{ textAlign: "end" }}>
        <CurrencyField source="Betrag" />
      </DataTable.Col>
    </DataTable>
  </List>
);

export const ZusatzleistungShow = () => (
  <Show>
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
          <TextField source="Bezeichnung" />
        </Field>
        <Field>
          <CurrencyField source="Betrag" />
        </Field>
        <Field label="In Auswahl">
          <BooleanField source="Aktiv" />
        </Field>
        <Field label="Reihenfolge">
          <TextField source="Reihenfolge" />
        </Field>
      </ShowSection>
    </ShowLayout>
  </Show>
);

export const ZusatzleistungEdit = () => (
  <Edit>
    <SimpleForm>
      <FormSection title="Details">
        <TextInput source="id" disabled />
        <FieldRow>
          <SelectInput source="Kategorie" choices={ZUSATZLEISTUNG_KATEGORIEN} />
          <TextInput source="Bezeichnung" />
          <NumberInput source="Betrag" />
        </FieldRow>
        <FieldRow>
          <BooleanInput
            source="Aktiv"
            label="In der Auswahl anbieten"
            defaultValue={true}
          />
          <NumberInput source="Reihenfolge" label="Reihenfolge (Nr.)" />
        </FieldRow>
      </FormSection>
    </SimpleForm>
  </Edit>
);

export const ZusatzleistungCreate = () => (
  <Create>
    <SimpleForm>
      <FormSection title="Details">
        <FieldRow>
          <SelectInput source="Kategorie" choices={ZUSATZLEISTUNG_KATEGORIEN} />
          <TextInput source="Bezeichnung" />
          <NumberInput source="Betrag" />
        </FieldRow>
        <FieldRow>
          <BooleanInput
            source="Aktiv"
            label="In der Auswahl anbieten"
            defaultValue={true}
          />
          <NumberInput source="Reihenfolge" label="Reihenfolge (Nr.)" />
        </FieldRow>
      </FormSection>
    </SimpleForm>
  </Create>
);
