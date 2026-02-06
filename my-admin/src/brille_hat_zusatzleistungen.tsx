import { DataTable, DateField, List, Show, SimpleShowLayout, TextField, Edit, SimpleForm, TextInput, Create, ReferenceField, ReferenceInput, SelectInput } from 'react-admin';

export const Brille_hat_zusatzleistungenList = () => (
    <List>
        <DataTable>
            <DataTable.Col source="id" />
            <DataTable.Col source="created_at">
                <DateField source="created_at" />
            </DataTable.Col>
            <DataTable.Col source="BrillenID" >
                <ReferenceField source="BrillenID" reference="brille" link="show" />
            </DataTable.Col>
            <DataTable.Col source="ZusatzleistungID" >
                <ReferenceField source="ZusatzleistungID" reference="zusatzleistung" link="show" />
            </DataTable.Col>
        </DataTable>
    </List>
);

export const Brille_hat_zusatzleistungenShow = () => (
    <Show>
        <SimpleShowLayout>
            <TextField source="id" />
            <DateField source="created_at" />
            <ReferenceField source="BrillenID" reference="brille" link="show" />
            <ReferenceField source="ZusatzleistungID" reference="zusatzleistung" link="show" />
        </SimpleShowLayout>
    </Show>
);

export const Brille_hat_zusatzleistungenEdit = () => (
    <Edit>
        <SimpleForm>
            <TextInput source="id" disabled />
            <ReferenceInput source="BrillenID" reference="brille">
                <SelectInput optionText="id" />
            </ReferenceInput>
            <ReferenceInput source="ZusatzleistungID" reference="zusatzleistung">
                <SelectInput optionText="Bezeichnung" />
            </ReferenceInput>
        </SimpleForm>
    </Edit>
);

export const Brille_hat_zusatzleistungenCreate = () => (
    <Create>
        <SimpleForm>
            <ReferenceInput source="BrillenID" reference="brille">
                <SelectInput optionText="id" />
            </ReferenceInput>
            <ReferenceInput source="ZusatzleistungID" reference="zusatzleistung">
                <SelectInput optionText="Bezeichnung" />
            </ReferenceInput>
        </SimpleForm>
    </Create>
);
