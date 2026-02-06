import { DataTable, DateField, List, Show, SimpleShowLayout, TextField, NumberField, Edit, SimpleForm, TextInput, Create, NumberInput, ReferenceField, ReferenceInput, SelectInput } from 'react-admin';

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
            <DataTable.NumberCol source="Betrag" />
            <DataTable.NumberCol source="Restbetrag" />
        </DataTable>
    </List>
);

export const Kunde_leistet_zauzahlung_fuer_brilleShow = () => (
    <Show>
        <SimpleShowLayout>
            <TextField source="id" />
            <DateField source="created_at" />
            <ReferenceField source="KundenID" reference="kunde" link="show" />
            <ReferenceField source="BrillenID" reference="brille" link="show" />
            <DateField source="Datum" />
            <NumberField source="Betrag" />
            <NumberField source="Restbetrag" />
        </SimpleShowLayout>
    </Show>
);

export const Kunde_leistet_zauzahlung_fuer_brilleEdit = () => (
    <Edit>
        <SimpleForm>
            <TextInput source="id" disabled />
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
