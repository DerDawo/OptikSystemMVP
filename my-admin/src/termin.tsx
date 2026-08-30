import { DataTable, DateField, DateInput, List, ReferenceField, ReferenceInput, SelectInput, Show, SimpleForm, TextField } from 'react-admin';
import { DateTimeInput, Edit, Create, TextInput, FunctionField } from 'react-admin';
import type { RaRecord } from 'react-admin';
import { useLocation } from 'react-router-dom';
import { Field, FieldRow, FormSection, ShowLayout, ShowSection } from './EntityLayout';

const kundeOptionText = (record: RaRecord) =>
    `${record.Anrede ?? ''} ${record.Vorname ?? ''} ${record.Nachname ?? ''}`.trim();

const KundeName = () => (
    <ReferenceField source="kunde_id" reference="kunde" link="show">
        <FunctionField render={record => {
            if (!record) return '';
            return kundeOptionText(record);
        }} />
    </ReferenceField>
);

export const TerminList = () => (
    <List title="Termine" sort={{ field: 'Start', order: 'DESC' }}>
        <DataTable>
            <DataTable.Col source="id" />
            <DataTable.Col label="Kunde">
                <KundeName />
            </DataTable.Col>
            <DataTable.Col source="Start">
                <DateField source="Start" showTime />
            </DataTable.Col>
            <DataTable.Col source="Ende">
                <DateField source="Ende" showTime />
            </DataTable.Col>
            <DataTable.Col source="Terminart" />
            <DataTable.Col source="Notiz" />
        </DataTable>
    </List>
);

export const TerminShow = () => (
    <Show title="Termin anzeigen">
        <ShowLayout>
            <ShowSection title="Datenbankfelder">
                <Field><TextField source="id" /></Field>
                <Field><DateField source="created_at" /></Field>
            </ShowSection>
            <ShowSection title="Termin">
                <Field label="Kunde"><KundeName /></Field>
                <Field><DateField source="Start" showTime /></Field>
                <Field><DateField source="Ende" showTime /></Field>
                <Field><TextField source="Terminart" /></Field>
                <Field><TextField source="Notiz" /></Field>
            </ShowSection>
        </ShowLayout>
    </Show>
);

export const TerminEdit = () => (
    <Edit title="Termin bearbeiten">
        <SimpleForm>
            <FormSection title="Datenbankfelder">
                <FieldRow>
                    <TextInput source="id" InputProps={{ disabled: true }} />
                    <DateInput source="created_at" InputProps={{ disabled: true }} />
                </FieldRow>
            </FormSection>
            <FormSection title="Termin">
                <ReferenceInput source="kunde_id" reference="kunde">
                    <SelectInput optionText={kundeOptionText} />
                </ReferenceInput>
                <FieldRow>
                    <DateTimeInput source="Start" />
                    <DateTimeInput source="Ende" />
                </FieldRow>
                <TextInput source="Terminart" />
                <TextInput source="Notiz" multiline />
            </FormSection>
        </SimpleForm>
    </Edit>
);

export const TerminCreate = () => {
    const location = useLocation();
    const locationState = (location.state as Record<string, unknown> | undefined) ?? {};

    const defaultValues = {
        Terminart: '',
        Notiz: '',
        ...locationState,
    };

    return (
        <Create title="Neuen Termin anlegen">
            <SimpleForm defaultValues={defaultValues}>
                <FormSection title="Termin">
                    <ReferenceInput source="kunde_id" reference="kunde">
                        <SelectInput optionText={kundeOptionText} />
                    </ReferenceInput>
                    <FieldRow>
                        <DateTimeInput source="Start" />
                        <DateTimeInput source="Ende" />
                    </FieldRow>
                    <TextInput source="Terminart" />
                    <TextInput source="Notiz" multiline />
                </FormSection>
            </SimpleForm>
        </Create>
    );
};
