import { DataTable, DateField, List, Show, SimpleShowLayout, TextField, Edit, SimpleForm, TextInput, Create, ReferenceManyField, Datagrid } from 'react-admin';

export const GlastypList = () => (
    <List title="Glastypen" perPage={10}>
        <DataTable>
            <DataTable.Col source="id" />
            <DataTable.Col source="created_at">
                <DateField source="created_at" />
            </DataTable.Col>
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
        <SimpleShowLayout>
            <TextField source="id" />
            <DateField source="created_at" />
            <TextField source="Bezeichnung" />
            <TextField source="Hersteller" />
            <TextField source="Verguetung" />
            <TextField source="GlasGroesse" />
            <TextField source="Sonstiges" />
            <TextField source="Bestellstatus" />
            <TextField source="Farbe" />
            <ReferenceManyField reference="brille" target="Glastyp" label="Brillen">
                <Datagrid>
                    <TextField source="id" />
                    <TextField source="Berater" />
                    <DateField source="Datum" />
                </Datagrid>
            </ReferenceManyField>
        </SimpleShowLayout>
    </Show>
);

export const GlastypEdit = () => (
    <Edit>
        <SimpleForm>
            <TextInput source="Bezeichnung" />
            <TextInput source="Hersteller" />
            <TextInput source="Verguetung" />
            <TextInput source="GlasGroesse" />
            <TextInput source="Sonstiges" />
            <TextInput source="Bestellstatus" />
            <TextInput source="Farbe" />
        </SimpleForm>
    </Edit>
);

export const GlastypCreate = () => (
    <Create>
        <SimpleForm>
            <TextInput source="Bezeichnung" />
            <TextInput source="Hersteller" />
            <TextInput source="Verguetung" />
            <TextInput source="GlasGroesse" />
            <TextInput source="Sonstiges" />
            <TextInput source="Bestellstatus" />
            <TextInput source="Farbe" />
        </SimpleForm>
    </Create>
);