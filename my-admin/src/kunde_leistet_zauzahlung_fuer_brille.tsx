import { DataTable, DateField, List, Show, TextField, NumberField, Edit, SimpleForm, TextInput, Create, NumberInput, ReferenceField, ReferenceInput, SelectInput } from 'react-admin';
import { CurrencyField } from './CurrencyField';
import { Field, FieldRow, FormSection, ShowLayout, ShowSection } from './EntityLayout';

export const Kunde_leistet_zauzahlung_fuer_brilleList = () => (
    <List>
        <DataTable>
            <DataTable.Col source="id" />
            <DataTable.Col source="created_at">
                <DateField source="created_at" />
            </DataTable.Col>
            <DataTable.Col source="KundenID" >
                <ReferenceField source="KundenID" reference="kunde" link="show" />
            </DataTable.Col>
            <DataTable.Col source="BrillenID" >
                <ReferenceField source="BrillenID" reference="brille" link="show" />
            </DataTable.Col>
            <DataTable.Col source="Datum">
                <DateField source="Datum" />
            </DataTable.Col>
            <DataTable.Col source="Betrag" sx={{ textAlign: 'end' }}>
                <CurrencyField source="Betrag" />
            </DataTable.Col>
            <DataTable.NumberCol source="Restbetrag" />
        </DataTable>
    </List>
);

export const Kunde_leistet_zauzahlung_fuer_brilleShow = () => (
    <Show>
        <ShowLayout>
            <ShowSection title="Datenbankfelder">
                <Field><TextField source="id" /></Field>
                <Field><DateField source="created_at" /></Field>
            </ShowSection>
            <ShowSection title="Zuordnung">
                <Field><ReferenceField source="KundenID" reference="kunde" link="show" /></Field>
                <Field><ReferenceField source="BrillenID" reference="brille" link="show" /></Field>
            </ShowSection>
            <ShowSection title="Zahlung">
                <Field><DateField source="Datum" /></Field>
                <Field><CurrencyField source="Betrag" /></Field>
                <Field><NumberField source="Restbetrag" /></Field>
            </ShowSection>
        </ShowLayout>
    </Show>
);

export const Kunde_leistet_zauzahlung_fuer_brilleEdit = () => (
    <Edit>
        <SimpleForm>
            <FormSection title="Zuordnung">
                <TextInput source="id" disabled />
                <FieldRow>
                    <ReferenceInput source="KundenID" reference="kunde">
                        <SelectInput optionText="KundenNummer" />
                    </ReferenceInput>
                    <ReferenceInput source="BrillenID" reference="brille">
                        <SelectInput optionText="id" />
                    </ReferenceInput>
                </FieldRow>
            </FormSection>
            <FormSection title="Zahlung">
                <FieldRow>
                    <TextInput source="Datum" type="date" />
                    <NumberInput source="Betrag" />
                    <NumberInput source="Restbetrag" />
                </FieldRow>
            </FormSection>
        </SimpleForm>
    </Edit>
);

export const Kunde_leistet_zauzahlung_fuer_brilleCreate = () => (
    <Create>
        <SimpleForm>
            <ReferenceInput source="KundenID" reference="kunde">
                <SelectInput optionText="KundenNummer" />
            </ReferenceInput>
            <ReferenceInput source="BrillenID" reference="brille">
                <SelectInput optionText="id" />
            </ReferenceInput>
            <TextInput source="Datum" type="date" />
            <NumberInput source="Betrag" />
            <NumberInput source="Restbetrag" />
        </SimpleForm>
    </Create>
);
