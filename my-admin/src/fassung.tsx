import { DataTable, DateField, List, Show, SimpleShowLayout, TextField, NumberField, Edit, SimpleForm, TextInput, NumberInput, Create, ReferenceManyField, Datagrid } from 'react-admin';

export const FassungList = () => (
    <List>
        <DataTable>
            <DataTable.Col source="id" />
            <DataTable.Col source="created_at">
                <DateField source="created_at" />
            </DataTable.Col>
            <DataTable.Col source="Lagernummer" />
            <DataTable.Col source="Bezeichnung" />
            <DataTable.Col source="Linie" />
            <DataTable.Col source="Farbe" />
            <DataTable.Col source="Groesse" />
            <DataTable.NumberCol source="Betrag" />
            <DataTable.Col source="Hersteller" />
        </DataTable>
    </List>
);

export const FassungShow = () => (
    <Show>
        <SimpleShowLayout>
            <TextField source="id" />
            <DateField source="created_at" />
            <TextField source="Lagernummer" />
            <TextField source="Bezeichnung" />
            <TextField source="Linie" />
            <TextField source="Farbe" />
            <TextField source="Groesse" />
            <NumberField source="Betrag" />
            <TextField source="Hersteller" />
            <ReferenceManyField reference="brille" target="Fassung" label="Brillen">
                <Datagrid>
                    <TextField source="id" />
                    <TextField source="Berater" />
                    <DateField source="Datum" />
                </Datagrid>
            </ReferenceManyField>
        </SimpleShowLayout>
    </Show>
);

export const FassungEdit = () => (
    <Edit>
        <SimpleForm>
            <TextInput source="Lagernummer" />
            <TextInput source="Bezeichnung" />
            <TextInput source="Linie" />
            <TextInput source="Farbe" />
            <TextInput source="Groesse" />
            <NumberInput source="Betrag" />
            <TextInput source="Hersteller" />
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