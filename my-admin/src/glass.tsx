import { BooleanField, DataTable, DateField, List } from 'react-admin';
import { NumberField, Show, SimpleShowLayout, TextField } from 'react-admin';
import { BooleanInput, DateInput, Edit, Create, NumberInput, SimpleForm, TextInput } from 'react-admin';

export const GlassList = () => (
    <List>
        <DataTable>
            <DataTable.Col source="id" />
            <DataTable.Col source="created_at">
                <DateField source="created_at" />
            </DataTable.Col>
            <DataTable.NumberCol source="Sph" />
            <DataTable.NumberCol source="Cyl" />
            <DataTable.NumberCol source="A" />
            <DataTable.NumberCol source="PD" />
            <DataTable.NumberCol source="Add" />
            <DataTable.NumberCol source="y_h" />
            <DataTable.NumberCol source="Pr" />
            <DataTable.NumberCol source="B" />
            <DataTable.NumberCol source="HSA" />
            <DataTable.NumberCol source="Vis" />
            <DataTable.NumberCol source="iod" />
            <DataTable.Col source="Liefern">
                <BooleanField source="Liefern" />
            </DataTable.Col>
            <DataTable.NumberCol source="Betrag" />
            <DataTable.Col source="Seite" />
        </DataTable>
    </List>
);


export const GlassShow = () => (
    <Show>
        <SimpleShowLayout>
            <TextField source="id" />
            <DateField source="created_at" />
            <NumberField source="Sph" />
            <NumberField source="Cyl" />
            <NumberField source="A" />
            <NumberField source="PD" />
            <NumberField source="Add" />
            <NumberField source="y_h" />
            <NumberField source="Pr" />
            <NumberField source="B" />
            <NumberField source="HSA" />
            <NumberField source="Vis" />
            <NumberField source="iod" />
            <BooleanField source="Liefern" />
            <NumberField source="Betrag" />
            <TextField source="Seite" />
        </SimpleShowLayout>
    </Show>
);


export const GlassEdit = () => (
    <Edit>
        <SimpleForm>
            <TextInput source="id" />
            <DateInput source="created_at" />
            <NumberInput source="Sph" />
            <NumberInput source="Cyl" />
            <NumberInput source="A" />
            <NumberInput source="PD" />
            <NumberInput source="Add" />
            <NumberInput source="y_h" />
            <NumberInput source="Pr" />
            <NumberInput source="B" />
            <NumberInput source="HSA" />
            <NumberInput source="Vis" />
            <NumberInput source="iod" />
            <BooleanInput source="Liefern" />
            <NumberInput source="Betrag" />
            <TextInput source="Seite" />
        </SimpleForm>
    </Edit>
);

export const GlassCreate = () => (
    <Create>
        <SimpleForm>
            <TextInput source="id" />
            <DateInput source="created_at" />
            <NumberInput source="Sph" />
            <NumberInput source="Cyl" />
            <NumberInput source="A" />
            <NumberInput source="PD" />
            <NumberInput source="Add" />
            <NumberInput source="y_h" />
            <NumberInput source="Pr" />
            <NumberInput source="B" />
            <NumberInput source="HSA" />
            <NumberInput source="Vis" />
            <NumberInput source="iod" />
            <BooleanInput source="Liefern" />
            <NumberInput source="Betrag" />
            <TextInput source="Seite" />
        </SimpleForm>
    </Create>
);