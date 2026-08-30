import { DataTable, DateField, List, Show, TextField, Edit, SimpleForm, TextInput, Create } from 'react-admin';
import { Field, FieldRow, FormSection, ShowLayout, ShowSection } from './EntityLayout';

export const BrillenartList = () => (
    <List title="Brillenarten">
        <DataTable>
            <DataTable.Col source="id" />
            <DataTable.Col source="Bezeichnung" />
        </DataTable>
    </List>
);

export const BrillenartShow = () => (
    <Show>
        <ShowLayout>
            <ShowSection title="Datenbankfelder">
                <Field><TextField source="id" /></Field>
                <Field><DateField source="created_at" /></Field>
            </ShowSection>
            <ShowSection title="Details">
                <Field><TextField source="Bezeichnung" /></Field>
            </ShowSection>
        </ShowLayout>
    </Show>
);

export const BrillenartEdit = () => (
    <Edit>
        <SimpleForm>
            <FormSection title="Details">
                <FieldRow>
                    <TextInput source="Bezeichnung" />
                </FieldRow>
            </FormSection>
        </SimpleForm>
    </Edit>
);

export const BrillenartCreate = () => (
    <Create>
        <SimpleForm>
            <FormSection title="Details">
                <FieldRow>
                    <TextInput source="Bezeichnung" />
                </FieldRow>
            </FormSection>
        </SimpleForm>
    </Create>
);
