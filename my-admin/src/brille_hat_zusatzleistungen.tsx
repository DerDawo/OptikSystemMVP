import { DataTable, DateField, List, Show, TextField, Edit, SimpleForm, TextInput, Create, ReferenceField, ReferenceInput, SelectInput } from 'react-admin';
import { Field, FieldRow, FormSection, ShowLayout, ShowSection } from './EntityLayout';

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
        <ShowLayout>
            <ShowSection title="Datenbankfelder">
                <Field><TextField source="id" /></Field>
                <Field><DateField source="created_at" /></Field>
            </ShowSection>
            <ShowSection title="Zuordnung">
                <Field><ReferenceField source="BrillenID" reference="brille" link="show" /></Field>
                <Field><ReferenceField source="ZusatzleistungID" reference="zusatzleistung" link="show" /></Field>
            </ShowSection>
        </ShowLayout>
    </Show>
);

export const Brille_hat_zusatzleistungenEdit = () => (
    <Edit>
        <SimpleForm>
            <FormSection title="Zuordnung">
                <TextInput source="id" disabled />
                <FieldRow>
                    <ReferenceInput source="BrillenID" reference="brille">
                        <SelectInput optionText="id" />
                    </ReferenceInput>
                    <ReferenceInput source="ZusatzleistungID" reference="zusatzleistung">
                        <SelectInput optionText="Bezeichnung" />
                    </ReferenceInput>
                </FieldRow>
            </FormSection>
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
