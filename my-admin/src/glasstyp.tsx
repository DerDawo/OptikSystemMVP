import { DataTable, DateField, List, Show, TextField, Edit, SimpleForm, TextInput, Create, ReferenceManyField, Datagrid } from 'react-admin';
import { Field, FieldRow, FormSection, RelatedSection, ShowLayout, ShowSection } from './EntityLayout';


export const GlastypList = () => (
    <List title="Glastypen" >
        <DataTable>
            <DataTable.Col source="id" />
            <DataTable.Col source="Bezeichnung" />
            <DataTable.Col source="Hersteller" />
            <DataTable.Col source="Verguetung" />
            <DataTable.Col source="GlasGroesse" />
            <DataTable.Col source="Sonstiges" />
            <DataTable.Col source="Bestellstatus" />
            <DataTable.Col source="Farbe" />
        </DataTable>
    </List>
);

export const GlastypShow = () => (
    <Show>
        <ShowLayout>
            <ShowSection title="Datenbankfelder">
                <Field><TextField source="id" /></Field>
                <Field><DateField source="created_at" /></Field>
            </ShowSection>
            <ShowSection title="Details">
                <Field><TextField source="Bezeichnung" /></Field>
                <Field><TextField source="Hersteller" /></Field>
                <Field><TextField source="Verguetung" /></Field>
                <Field><TextField source="GlasGroesse" /></Field>
                <Field><TextField source="Farbe" /></Field>
            </ShowSection>
            <ShowSection title="Status">
                <Field><TextField source="Bestellstatus" /></Field>
                <Field><TextField source="Sonstiges" /></Field>
            </ShowSection>
            <RelatedSection title="Brillen">
                <ReferenceManyField reference="brille" target="Glastyp" label={false}>
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

export const GlastypEdit = () => (
    <Edit>
        <SimpleForm>
            <FormSection title="Details">
                <FieldRow>
                    <TextInput source="Bezeichnung" />
                    <TextInput source="Hersteller" />
                </FieldRow>
                <FieldRow>
                    <TextInput source="Verguetung" />
                    <TextInput source="GlasGroesse" />
                    <TextInput source="Farbe" />
                </FieldRow>
            </FormSection>
            <FormSection title="Status">
                <FieldRow>
                    <TextInput source="Bestellstatus" />
                    <TextInput source="Sonstiges" />
                </FieldRow>
            </FormSection>
        </SimpleForm>
    </Edit>
);

export const GlastypCreate = () => (
    <Create>
        <SimpleForm>
            <FormSection title="Details">
                <FieldRow>
                    <TextInput source="Bezeichnung" />
                    <TextInput source="Hersteller" />
                </FieldRow>
                <FieldRow>
                    <TextInput source="Verguetung" />
                    <TextInput source="GlasGroesse" />
                    <TextInput source="Farbe" />
                </FieldRow>
            </FormSection>
            <FormSection title="Status">
                <FieldRow>
                    <TextInput source="Bestellstatus" />
                    <TextInput source="Sonstiges" />
                </FieldRow>
            </FormSection>
        </SimpleForm>
    </Create>
);
