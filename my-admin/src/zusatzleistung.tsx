import { DataTable, DateField, List, Show, TextField, Edit, SimpleForm, TextInput, Create, NumberInput } from 'react-admin';
import { CurrencyField } from './CurrencyField';
import { Field, FieldRow, FormSection, ShowLayout, ShowSection } from './EntityLayout';

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
        <ShowLayout>
            <ShowSection title="Datenbankfelder">
                <Field><TextField source="id" /></Field>
                <Field><DateField source="created_at" /></Field>
            </ShowSection>
            <ShowSection title="Details">
                <Field><TextField source="Bezeichnung" /></Field>
                <Field><CurrencyField source="Betrag" /></Field>
            </ShowSection>
        </ShowLayout>
    </Show>
);

export const ZusatzleistungEdit = () => (
    <Edit>
        <SimpleForm>
            <FormSection title="Details">
                <TextInput source="id" disabled />
                <FieldRow>
                    <TextInput source="Bezeichnung" />
                    <NumberInput source="Betrag" />
                </FieldRow>
            </FormSection>
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
