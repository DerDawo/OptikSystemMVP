import { DataTable, DateField, List, ReferenceField } from 'react-admin';
import { NumberField, Show, SimpleShowLayout, TextField, ReferenceManyField, Datagrid } from 'react-admin';
import { DateInput, Edit, Create, NumberInput, SimpleForm, TextInput, ReferenceInput, SelectInput } from 'react-admin';

export const BrilleList = () => (
    <List>
        <DataTable>
            <DataTable.Col source="id" />
            <DataTable.Col source="created_at">
                <DateField source="created_at" />
            </DataTable.Col>
            <DataTable.Col source="Berater" />
            <DataTable.Col source="Refraktion" />
            <DataTable.Col source="Datum">
                <DateField source="Datum" />
            </DataTable.Col>
            <DataTable.Col source="Werkstatt" />
            <DataTable.Col source="Abholung">
                <DateField source="Abholung" />
            </DataTable.Col>
            <DataTable.Col source="Notizen" />
            <DataTable.NumberCol source="GlasLinks" >
                <ReferenceField source="GlassLinks" reference="glass" />
            </DataTable.NumberCol>
            <DataTable.NumberCol source="GlasRechts" >
                <ReferenceField source="GlasRechts" reference="glass" />
            </DataTable.NumberCol>
            <DataTable.NumberCol source="Fassung" >
                <ReferenceField source="Fassung" reference="fassung" />
            </DataTable.NumberCol>
            <DataTable.NumberCol source="Glastyp" >
                <ReferenceField source="Glastyp" reference="glastyp" />
            </DataTable.NumberCol>
            <DataTable.Col source="RabattBezeichnung" />
            <DataTable.NumberCol source="Summe" />
            <DataTable.Col source="BrillenArt" />
        </DataTable>
    </List>
);

export const BrilleShow = () => (
    <Show>
        <SimpleShowLayout>
            <TextField source="id" />
            <DateField source="created_at" />
            <TextField source="Berater" />
            <TextField source="Refraktion" />
            <DateField source="Datum" />
            <TextField source="Werkstatt" />
            <DateField source="Abholung" />
            <TextField source="Notizen" />
            <ReferenceField source="GlasLinks" reference="glass" link="show" />
            <ReferenceField source="GlasRechts" reference="glass" link="show" />
            <ReferenceField source="Fassung" reference="fassung" link="show" />
            <ReferenceField source="Glastyp" reference="glastyp" link="show" />
            <TextField source="RabattBezeichnung" />
            <NumberField source="Summe" />
            <TextField source="BrillenArt" />
        </SimpleShowLayout>
    </Show>
);

export const BrilleEdit = () => (
    <Edit>
        <SimpleForm>
            <TextInput source="id" />
            <DateInput source="created_at" />
            <TextInput source="Berater" />
            <TextInput source="Refraktion" />
            <DateInput source="Datum" />
            <TextInput source="Werkstatt" />
            <DateInput source="Abholung" />
            <TextInput source="Notizen" />
            <ReferenceInput source="GlasLinks" reference="glass">
                <SelectInput optionText="id" />
            </ReferenceInput>
            <ReferenceInput source="GlasRechts" reference="glass">
                <SelectInput optionText="id" />
            </ReferenceInput>
            <ReferenceInput source="Fassung" reference="fassung">
                <SelectInput optionText="Bezeichnung" />
            </ReferenceInput>
            <ReferenceInput source="Glastyp" reference="glastyp">
                <SelectInput optionText="Bezeichnung" />
            </ReferenceInput>
            <TextInput source="RabattBezeichnung" />
            <NumberInput source="Summe" />
            <TextInput source="BrillenArt" />
        </SimpleForm>
    </Edit>
);

export const BrilleCreate = () => (
    <Create>
        <SimpleForm>
            <TextInput source="id" />
            <DateInput source="created_at" />
            <TextInput source="Berater" />
            <TextInput source="Refraktion" />
            <DateInput source="Datum" />
            <TextInput source="Werkstatt" />
            <DateInput source="Abholung" />
            <TextInput source="Notizen" />
            <ReferenceInput source="GlasLinks" reference="glass">
                <SelectInput optionText="id" />
            </ReferenceInput>
            <ReferenceInput source="GlasRechts" reference="glass">
                <SelectInput optionText="id" />
            </ReferenceInput>
            <ReferenceInput source="Fassung" reference="fassung">
                <SelectInput optionText="Bezeichnung" />
            </ReferenceInput>
            <ReferenceInput source="Glastyp" reference="glastyp">
                <SelectInput optionText="Bezeichnung" />
            </ReferenceInput>
            <TextInput source="RabattBezeichnung" />
            <NumberInput source="Summe" />
            <TextInput source="BrillenArt" />
        </SimpleForm>
    </Create>
);