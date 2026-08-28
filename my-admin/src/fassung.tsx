import { DataTable, DateField, List, Show, TextField, NumberInput, Edit, SimpleForm, TextInput, Create, ReferenceManyField, Datagrid } from 'react-admin';
import { CurrencyField } from './CurrencyField';
import { Field, FieldRow, FormSection, RelatedSection, ShowLayout, ShowSection } from './EntityLayout';

export const FassungList = () => (
    <List title="Fassungen">
        <DataTable>
            <DataTable.Col source="id" />
            <DataTable.Col source="Bezeichnung" />
            <DataTable.Col source="Lagernummer" />
            <DataTable.Col source="Linie" />
            <DataTable.Col source="Farbe" />
            <DataTable.Col source="Groesse" />
            <DataTable.Col source="Betrag" sx={{ textAlign: 'end' }}>
                <CurrencyField source="Betrag" />
            </DataTable.Col>
            <DataTable.Col source="Hersteller" />
        </DataTable>
    </List>
);


export const FassungShow = () => (
    <Show>
        <ShowLayout>
            <ShowSection title="Datenbankfelder">
                <Field><TextField source="id" /></Field>
                <Field><DateField source="created_at" /></Field>
            </ShowSection>
            <ShowSection title="Details">
                <Field><TextField source="Bezeichnung" /></Field>
                <Field><TextField source="Lagernummer" /></Field>
                <Field><TextField source="Linie" /></Field>
                <Field><TextField source="Farbe" /></Field>
                <Field><TextField source="Groesse" /></Field>
                <Field><TextField source="Hersteller" /></Field>
            </ShowSection>
            <ShowSection title="Preis">
                <Field><CurrencyField source="Betrag" /></Field>
            </ShowSection>
            <RelatedSection title="Brillen">
                <ReferenceManyField reference="brille" target="Fassung" label={false}>
                    <Datagrid>
                        <TextField source="id" />
                        <TextField source="Berater" />
                        <DateField source="Datum" />
                    </Datagrid>
                </ReferenceManyField>
            </RelatedSection>
        </ShowLayout>
    </Show>
);

export const FassungEdit = () => (
    <Edit>
        <SimpleForm>
            <FormSection title="Details">
                <FieldRow>
                    <TextInput source="Lagernummer" />
                    <TextInput source="Bezeichnung" />
                </FieldRow>
                <FieldRow>
                    <TextInput source="Linie" />
                    <TextInput source="Farbe" />
                    <TextInput source="Groesse" />
                </FieldRow>
                <TextInput source="Hersteller" />
            </FormSection>
            <FormSection title="Preis">
                <NumberInput source="Betrag" />
            </FormSection>
        </SimpleForm>
    </Edit>
);

export const FassungCreate = () => (
    <Create>
        <SimpleForm>
            <TextInput source="Lagernummer" />
            <TextInput source="Bezeichnung" />
            <TextInput source="Linie" />
            <TextInput source="Farbe" />
            <TextInput source="Groesse" />
            <NumberInput source="Betrag" />
            <TextInput source="Hersteller" />
        </SimpleForm>
    </Create>
);
