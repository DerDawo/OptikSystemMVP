import { DataTable, DateField, List, Show, SimpleShowLayout, TextField, NumberField, Edit, SimpleForm, TextInput, Create, NumberInput } from 'react-admin';

export const ZusatzleistungList = () => (
    <List>
        <DataTable>
            <DataTable.Col source="id" />
            <DataTable.Col source="created_at">
                <DateField source="created_at" />
            </DataTable.Col>
            <DataTable.Col source="Bezeichnung" />
            <DataTable.NumberCol source="Betrag" />
        </DataTable>
    </List>
);

export const ZusatzleistungShow = () => (
    <Show>
        <SimpleShowLayout>
            <TextField source="id" />
            <DateField source="created_at" />
            <TextField source="Bezeichnung" />
            <NumberField source="Betrag" />
        </SimpleShowLayout>
    </Show>
);

export const ZusatzleistungEdit = () => (
    <Edit>
        <SimpleForm>
            <TextInput source="id" disabled />
            <TextInput source="Bezeichnung" />
            <NumberInput source="Betrag" />
        </SimpleForm>
    </Edit>
);

export const ZusatzleistungCreate = () => (
    <Create>
        <SimpleForm>
            <TextInput source="Bezeichnung" />
            <NumberInput source="Betrag" />
        </SimpleForm>
    </Create>
);
