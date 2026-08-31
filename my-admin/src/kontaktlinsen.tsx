import {
  DataTable,
  DateField,
  List,
  ReferenceField,
  Pagination,
} from "react-admin";
import { NumberField, Show, TextField } from "react-admin";
import {
  DateInput,
  Edit,
  Create,
  NumberInput,
  SimpleForm,
  TextInput,
  ReferenceInput,
  SelectInput,
  FunctionField,
} from "react-admin";
import { useLocation } from "react-router-dom";
import { CurrencyField } from "./CurrencyField";
import {
  Field,
  FieldRow,
  FormSection,
  ShowLayout,
  ShowSection,
} from "./EntityLayout";

const KundeOptionText = (record?: Record<string, unknown>) => {
  if (!record) return "";
  const anrede = record.Anrede ? record.Anrede : "";
  const nachname = record.Nachname ? record.Nachname : "";
  const vorname = record.Vorname ? record.Vorname : "";
  return `${anrede} ${vorname} ${nachname}`.trim();
};

export const KontaktlinseList = () => (
  <List
    title="Kontaktlinsen"
    perPage={5}
    pagination={<Pagination rowsPerPageOptions={[5]} />}
  >
    <DataTable>
      <DataTable.Col source="id" />
      <DataTable.Col label="Kunde">
        <ReferenceField source="kunde_id" reference="kunde" link="show">
          <FunctionField render={KundeOptionText} />
        </ReferenceField>
      </DataTable.Col>
      <DataTable.Col source="Berater" />
      <DataTable.Col source="Datum">
        <DateField source="Datum" />
      </DataTable.Col>
      <DataTable.Col source="Abholung">
        <DateField source="Abholung" />
      </DataTable.Col>
      <DataTable.Col source="Nachkontrolltermin">
        <DateField source="Nachkontrolltermin" />
      </DataTable.Col>
      <DataTable.Col source="LinsentypLinks" label="Linsentyp Links" />
      <DataTable.Col source="LinsentypRechts" label="Linsentyp Rechts" />
      <DataTable.Col source="Notizen" />
      <DataTable.Col sx={{ textAlign: "end" }} source="Summe" label="Betrag">
        <CurrencyField source="Summe" />
      </DataTable.Col>
    </DataTable>
  </List>
);

export const KontaktlinseShow = () => (
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
      <ShowSection title="Auftragsdaten">
        <Field>
          <ReferenceField source="kunde_id" reference="kunde" link="show" />
        </Field>
        <Field>
          <TextField source="Berater" />
        </Field>
        <Field>
          <DateField source="Datum" />
        </Field>
        <Field>
          <DateField source="Abholung" />
        </Field>
        <Field>
          <DateField source="Nachkontrolltermin" />
        </Field>
        <Field>
          <TextField source="Notizen" />
        </Field>
      </ShowSection>
      <ShowSection title="Kontaktlinse Links">
        <Field>
          <TextField source="LinsentypLinks" />
        </Field>
        <Field>
          <NumberField source="RadiusLinks" />
        </Field>
        <Field>
          <NumberField source="DurchmesserLinks" />
        </Field>
        <Field>
          <NumberField source="SphLinks" />
        </Field>
        <Field>
          <NumberField source="CylLinks" />
        </Field>
        <Field>
          <NumberField source="AchseLinks" />
        </Field>
        <Field>
          <TextField source="MaterialLinks" />
        </Field>
        <Field>
          <TextField source="HerstellerLinks" />
        </Field>
        <Field>
          <TextField source="TragemodusLinks" />
        </Field>
        <Field>
          <NumberField source="PreisLinks" />
        </Field>
      </ShowSection>
      <ShowSection title="Kontaktlinse Rechts">
        <Field>
          <TextField source="LinsentypRechts" />
        </Field>
        <Field>
          <NumberField source="RadiusRechts" />
        </Field>
        <Field>
          <NumberField source="DurchmesserRechts" />
        </Field>
        <Field>
          <NumberField source="SphRechts" />
        </Field>
        <Field>
          <NumberField source="CylRechts" />
        </Field>
        <Field>
          <NumberField source="AchseRechts" />
        </Field>
        <Field>
          <TextField source="MaterialRechts" />
        </Field>
        <Field>
          <TextField source="HerstellerRechts" />
        </Field>
        <Field>
          <TextField source="TragemodusRechts" />
        </Field>
        <Field>
          <NumberField source="PreisRechts" />
        </Field>
      </ShowSection>
      <ShowSection title="Preis">
        <Field>
          <NumberField source="Summe" />
        </Field>
      </ShowSection>
    </ShowLayout>
  </Show>
);

export const KontaktlinseEdit = () => (
  <Edit>
    <SimpleForm>
      <FormSection title="Datenbankfelder">
        <FieldRow>
          <TextInput source="id" InputProps={{ disabled: true }} />
          <DateInput source="created_at" InputProps={{ disabled: true }} />
        </FieldRow>
      </FormSection>
      <FormSection title="Auftragsdaten">
        <FieldRow>
          <ReferenceInput source="kunde_id" reference="kunde">
            <SelectInput optionText={KundeOptionText} />
          </ReferenceInput>
          <TextInput source="Berater" />
        </FieldRow>
        <FieldRow>
          <DateInput source="Datum" />
          <DateInput source="Abholung" />
          <DateInput source="Nachkontrolltermin" />
        </FieldRow>
        <TextInput source="Notizen" multiline fullWidth />
      </FormSection>
      <FormSection title="Kontaktlinse Links">
        <FieldRow>
          <TextInput source="LinsentypLinks" label="Linsentyp Links" />
          <NumberInput source="RadiusLinks" label="Radius Links" />
          <NumberInput source="DurchmesserLinks" label="Durchmesser Links" />
        </FieldRow>
        <FieldRow>
          <NumberInput source="SphLinks" label="Sph Links" />
          <NumberInput source="CylLinks" label="Cyl Links" />
          <NumberInput source="AchseLinks" label="Achse Links" />
        </FieldRow>
        <FieldRow>
          <TextInput source="MaterialLinks" label="Material Links" />
          <TextInput source="HerstellerLinks" label="Hersteller Links" />
          <TextInput source="TragemodusLinks" label="Tragemodus Links" />
        </FieldRow>
        <NumberInput source="PreisLinks" label="Preis Links" />
      </FormSection>
      <FormSection title="Kontaktlinse Rechts">
        <FieldRow>
          <TextInput source="LinsentypRechts" label="Linsentyp Rechts" />
          <NumberInput source="RadiusRechts" label="Radius Rechts" />
          <NumberInput source="DurchmesserRechts" label="Durchmesser Rechts" />
        </FieldRow>
        <FieldRow>
          <NumberInput source="SphRechts" label="Sph Rechts" />
          <NumberInput source="CylRechts" label="Cyl Rechts" />
          <NumberInput source="AchseRechts" label="Achse Rechts" />
        </FieldRow>
        <FieldRow>
          <TextInput source="MaterialRechts" label="Material Rechts" />
          <TextInput source="HerstellerRechts" label="Hersteller Rechts" />
          <TextInput source="TragemodusRechts" label="Tragemodus Rechts" />
        </FieldRow>
        <NumberInput source="PreisRechts" label="Preis Rechts" />
      </FormSection>
      <FormSection title="Preis">
        <NumberInput source="Summe" />
      </FormSection>
    </SimpleForm>
  </Edit>
);

export const KontaktlinseCreate = () => {
  const location = useLocation();
  const locationState =
    (location.state as Record<string, unknown> | undefined) ?? {};

  const defaultValues = {
    created_at: new Date().toISOString(),
    ...locationState,
  };

  return (
    <Create
      transform={(data) => ({ ...data, created_at: new Date().toISOString() })}
    >
      <SimpleForm defaultValues={defaultValues}>
        <FormSection title="Datenbankfelder">
          <FieldRow>
            <TextInput source="id" InputProps={{ disabled: true }} />
            <DateInput source="created_at" InputProps={{ disabled: true }} />
          </FieldRow>
        </FormSection>
        <FormSection title="Auftragsdaten">
          <FieldRow>
            <ReferenceInput source="kunde_id" reference="kunde">
              <SelectInput optionText={KundeOptionText} />
            </ReferenceInput>
            <TextInput source="Berater" />
          </FieldRow>
          <FieldRow>
            <DateInput source="Datum" />
            <DateInput source="Abholung" />
            <DateInput source="Nachkontrolltermin" />
          </FieldRow>
          <TextInput source="Notizen" multiline fullWidth />
        </FormSection>
        <FormSection title="Kontaktlinse Links">
          <FieldRow>
            <TextInput source="LinsentypLinks" label="Linsentyp Links" />
            <NumberInput source="RadiusLinks" label="Radius Links" />
            <NumberInput source="DurchmesserLinks" label="Durchmesser Links" />
          </FieldRow>
          <FieldRow>
            <NumberInput source="SphLinks" label="Sph Links" />
            <NumberInput source="CylLinks" label="Cyl Links" />
            <NumberInput source="AchseLinks" label="Achse Links" />
          </FieldRow>
          <FieldRow>
            <TextInput source="MaterialLinks" label="Material Links" />
            <TextInput source="HerstellerLinks" label="Hersteller Links" />
            <TextInput source="TragemodusLinks" label="Tragemodus Links" />
          </FieldRow>
          <NumberInput source="PreisLinks" label="Preis Links" />
        </FormSection>
        <FormSection title="Kontaktlinse Rechts">
          <FieldRow>
            <TextInput source="LinsentypRechts" label="Linsentyp Rechts" />
            <NumberInput source="RadiusRechts" label="Radius Rechts" />
            <NumberInput
              source="DurchmesserRechts"
              label="Durchmesser Rechts"
            />
          </FieldRow>
          <FieldRow>
            <NumberInput source="SphRechts" label="Sph Rechts" />
            <NumberInput source="CylRechts" label="Cyl Rechts" />
            <NumberInput source="AchseRechts" label="Achse Rechts" />
          </FieldRow>
          <FieldRow>
            <TextInput source="MaterialRechts" label="Material Rechts" />
            <TextInput source="HerstellerRechts" label="Hersteller Rechts" />
            <TextInput source="TragemodusRechts" label="Tragemodus Rechts" />
          </FieldRow>
          <NumberInput source="PreisRechts" label="Preis Rechts" />
        </FormSection>
        <FormSection title="Preis">
          <NumberInput source="Summe" />
        </FormSection>
      </SimpleForm>
    </Create>
  );
};
