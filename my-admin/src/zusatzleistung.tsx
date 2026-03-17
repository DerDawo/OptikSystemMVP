import { DataTable, DateField, List, Show, SimpleShowLayout, TextField, NumberField, Edit, SimpleForm, TextInput, Create, NumberInput } from 'react-admin';
import { CurrencyField } from './CurrencyField';

export const ZusatzleistungList = () => (
    <List title="Zusatzleistungen" >
        <DataTable>
            <DataTable.Col source="id" />
            <DataTable.Col source="created_at">
                <DateField source="created_at" />
            </DataTable.Col>
            <DataTable.Col source="Bezeichnung" />
            <DataTable.Col source="Betrag" sx={{ textAlign: 'end' }}>
                <CurrencyField source="Betrag" />
            </DataTable.Col>
        </DataTable>
    </List>
);


export const ZusatzleistungShow = () => (
    <Show>
        <SimpleShowLayout>
            <TextField source="id" />
            <DateField source="created_at" />
            <TextField source="Bezeichnung" />
            <CurrencyField source="Betrag" />
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
