import { DataTable, DateField, List, ReferenceField, Pagination } from 'react-admin';
import { NumberField, Show, TextField } from 'react-admin';
import { DateInput, Edit, Create, NumberInput, SimpleForm, TextInput, ReferenceInput, SelectInput, FunctionField } from 'react-admin';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUpRightFromSquare } from '@fortawesome/free-solid-svg-icons';
import { CurrencyField } from './CurrencyField';
import { Field, FieldRow, FormSection, ShowLayout, ShowSection } from './EntityLayout';


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
            <DataTable.Col sx={{textAlign: 'end'}} source="Summe" label="Betrag">
                <CurrencyField source="Summe" />
            </DataTable.Col>
        </DataTable>
    </List>
);


export const BrilleShow = () => (
    <Show>
        <ShowLayout>
            <ShowSection title="Datenbankfelder">
                <Field><TextField source="id" /></Field>
                <Field><DateField source="created_at" /></Field>
            </ShowSection>
            <ShowSection title="Auftragsdaten">
                <Field><TextField source="BrillenArt" /></Field>
                <Field><TextField source="Berater" /></Field>
                <Field><TextField source="Refraktion" /></Field>
                <Field><DateField source="Datum" /></Field>
                <Field><TextField source="Werkstatt" /></Field>
                <Field><DateField source="Abholung" /></Field>
                <Field><TextField source="Notizen" /></Field>
            </ShowSection>
            <ShowSection title="Komponenten">
                <Field><ReferenceField source="GlasLinks" reference="glass" link="show" /></Field>
                <Field><ReferenceField source="GlasRechts" reference="glass" link="show" /></Field>
                <Field><ReferenceField source="Fassung" reference="fassung" link="show" /></Field>
                <Field><ReferenceField source="Glastyp" reference="glastyp" link="show" /></Field>
            </ShowSection>
            <ShowSection title="Preis">
                <Field><TextField source="RabattBezeichnung" /></Field>
                <Field><NumberField source="Summe" /></Field>
            </ShowSection>
        </ShowLayout>
    </Show>
);

export const BrilleEdit = () => (
    <Edit>
        <SimpleForm>
            <FormSection title="Datenbankfelder">
                <FieldRow>
                    <TextInput source="id" />
                    <DateInput source="created_at" />
                </FieldRow>
            </FormSection>
            <FormSection title="Auftragsdaten">
                <FieldRow>
                    <TextInput source="BrillenArt" />
                    <TextInput source="Berater" />
                    <TextInput source="Refraktion" />
                </FieldRow>
                <FieldRow>
                    <DateInput source="Datum" />
                    <TextInput source="Werkstatt" />
                    <DateInput source="Abholung" />
                </FieldRow>
                <TextInput source="Notizen" multiline fullWidth />
            </FormSection>
            <FormSection title="Komponenten">
                <FieldRow>
                    <ReferenceInput source="GlasLinks" reference="glass">
                        <SelectInput optionText="id" />
                    </ReferenceInput>
                    <ReferenceInput source="GlasRechts" reference="glass">
                        <SelectInput optionText="id" />
                    </ReferenceInput>
                </FieldRow>
                <FieldRow>
                    <ReferenceInput source="Fassung" reference="fassung">
                        <SelectInput optionText="id" />
                    </ReferenceInput>
                    <ReferenceInput source="Glastyp" reference="glastyp">
                        <SelectInput optionText="id" />
                    </ReferenceInput>
                </FieldRow>
            </FormSection>
            <FormSection title="Preis">
                <FieldRow>
                    <TextInput source="RabattBezeichnung" />
                    <NumberInput source="Summe" />
                </FieldRow>
            </FormSection>
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
