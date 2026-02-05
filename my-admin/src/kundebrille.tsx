import { DataTable, List, Show, SimpleShowLayout, TextField, Edit, SimpleForm, TextInput, Create, NumberInput } from 'react-admin';

export const KundebrilleList = () => (
    <List>
        <DataTable>
            <DataTable.Col source="id" />
            <DataTable.Col source="KundenID" />
            <DataTable.Col source="BrillenID" />
        </DataTable>
    </List>
);

export const KundebrilleShow = () => (
    <Show>
        <SimpleShowLayout>
            <TextField source="id" />
            <TextField source="KundenID" />
            <TextField source="BrillenID" />
        </SimpleShowLayout>
    </Show>
);

export const KundebrilleEdit = () => (
    <Edit>
        <SimpleForm>
            <TextInput source="id" disabled />
            <NumberInput source="KundenID" />
            <NumberInput source="BrillenID" />
        </SimpleForm>
    </Edit>
);

export const KundebrilleCreate = () => (
    <Create>
        <SimpleForm>
            <NumberInput source="KundenID" />
            <NumberInput source="BrillenID" />
        </SimpleForm>
    </Create>
);
