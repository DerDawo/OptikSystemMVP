import { DataTable, DateField, List, ReferenceField, useGetList, useGetOne } from 'react-admin';
import { NumberField, Show, SimpleShowLayout, TextField, ReferenceManyField, Datagrid } from 'react-admin';
import { DateInput, Edit, Create, NumberInput, SimpleForm, TextInput, ReferenceInput, SelectInput } from 'react-admin';
import { Link } from 'react-router-dom';

export const BrilleList = () => (
    <List title="Brillen" perPage={10}>
        <DataTable>
            <DataTable.Col source="id" />
            <DataTable.Col source="BrillenArt" />
            <ReferenceManyField reference="kunde_hat_brille" target="KundenID" label="Kunde">
                    <ReferenceField source="KundenID" reference="kunde" link="show">
                        <TextField source="id" />
                    </ReferenceField>
            </ReferenceManyField>
            {/* <DataTable.Col source="created_at">
                <DateField source="created_at" />
            </DataTable.Col> */}
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
            <DataTable.NumberCol source="GlasLinks">
                <ReferenceField source="GlasLinks" reference="glass" link="show">
                    <TextField source="id" />
                </ReferenceField>
            </DataTable.NumberCol>
            <DataTable.NumberCol source="GlasRechts">
                <ReferenceField source="GlasRechts" reference="glass" link="show">
                    <TextField source="id" />
                </ReferenceField>
            </DataTable.NumberCol>
            <DataTable.Col source="Fassung">
                <ReferenceField source="Fassung" reference="fassung" link="show">
                    <TextField source="id" />
                </ReferenceField>
            </DataTable.Col>
            <DataTable.Col source="Glastyp">
                <ReferenceField source="Glastyp" reference="glastyp" link="show">
                    <TextField source="id" />
                </ReferenceField>
            </DataTable.Col>
            <DataTable.Col source="RabattBezeichnung" />
            <DataTable.NumberCol source="Summe" />
        </DataTable>
    </List>
);

export const BrilleShow = () => (
    <Show >
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
                <SelectInput optionText="id" />
            </ReferenceInput>
            <ReferenceInput source="Glastyp" reference="glastyp">
                <SelectInput optionText="id" />
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
                <SelectInput optionText="id" />
            </ReferenceInput>
            <ReferenceInput source="Glastyp" reference="glastyp">
                <SelectInput optionText="id" />
            </ReferenceInput>
            <TextInput source="RabattBezeichnung" />
            <NumberInput source="Summe" />
            <TextInput source="BrillenArt" />
        </SimpleForm>
    </Create>
);

// const OwnerField = (record ) => {
//     console.log(this)
//     console.log('OwnerField record:', record);
//     if (!record) return null;
//     const { data: mappings, isLoading: mapLoading } = useGetList('kunde_hat_brille', {
//         pagination: { page: 1, perPage: 1 },
//         sort: { field: 'id', order: 'ASC' },
//         filter: { BrillenID: record.id },
//     });
//     if (mapLoading) return null;
//     if (!mappings || mappings.length === 0) return null;
//     const kundeId = mappings[0].KundenID;
//     const { data: kunde, isLoading: kundeLoading } = useGetOne('kunde', { id: kundeId });
//     if (kundeLoading) return <Link to={`/kunde/${kundeId}/show`}>#{kundeId}</Link>;
//     if (!kunde) return <Link to={`/kunde/${kundeId}/show`}>#{kundeId}</Link>;
//     const name = `${kunde.Anrede ? kunde.Anrede + ' ' : ''}${kunde.Vorname ? kunde.Vorname + ' ' : ''}${kunde.Nachname || ''}`.trim();
//     return <Link to={`/kunde/${kundeId}/show`}>{name || `#${kundeId}`}</Link>;
// };