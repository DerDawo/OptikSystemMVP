import { DataTable, DateField, List, ReferenceField, Pagination } from 'react-admin';
import { NumberField, Show, SimpleShowLayout, TextField } from 'react-admin';
import { DateInput, Edit, Create, NumberInput, SimpleForm, TextInput, ReferenceInput, SelectInput, FunctionField } from 'react-admin';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUpRightFromSquare } from '@fortawesome/free-solid-svg-icons';

export const BrilleList = () => (
    <List title="Brillen" perPage={5} pagination={<Pagination rowsPerPageOptions={[5]} />}>
        <DataTable>
            <DataTable.Col source="id" />
            <DataTable.Col source="BrillenArt" />
            <DataTable.Col label="Kunde">
                <ReferenceField source="kunde_id" reference="kunde" link="show">
                    <FunctionField render={record => {
                        if (!record) return '';
                        const anrede = record.Anrede ? record.Anrede : '';
                        const nachname = record.Nachname ? record.Nachname : '';
                        const vorname = record.Vorname ? record.Vorname : '';
                        return `${anrede} ${vorname} ${nachname}`.trim();
                    }} />
                </ReferenceField>
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
            <DataTable.NumberCol source="GlasLinks">
                <ReferenceField source="GlasLinks" reference="glass" link="show">
                    Nr.
                    <TextField source="id" />
                    &nbsp;
                    <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
                </ReferenceField>
            </DataTable.NumberCol>
            <DataTable.NumberCol source="GlasRechts">
                <ReferenceField source="GlasRechts" reference="glass" link="show">
                    Nr.
                    <TextField source="id" />
                    &nbsp;
                    <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
                </ReferenceField>
            </DataTable.NumberCol>
            <DataTable.Col source="Fassung">
                <ReferenceField source="Fassung" reference="fassung" link="show">
                    <TextField source="Bezeichnung" />
                </ReferenceField>
            </DataTable.Col>
            <DataTable.Col source="Glastyp">
                <ReferenceField source="Glastyp" reference="glastyp" link="show">
                    <TextField source="Bezeichnung" />
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
