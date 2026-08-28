import {
    BooleanField,
    DataTable,
    DateField,
    List,
    ReferenceManyField,
    Datagrid,
    NumberField,
    Show,
    TextField,
    BooleanInput,
    DateInput,
    Edit,
    Create,
    NumberInput,
    SimpleForm,
    TextInput
 } from 'react-admin';
import { CurrencyField } from './CurrencyField';
import { Field, FieldRow, FormSection, RelatedSection, ShowLayout, ShowSection } from './EntityLayout';

export const GlassList = () => (
    <List title="Gläser" >
        <DataTable>
            <DataTable.Col source="id" />
            <DataTable.Col source="Seite" />
            <DataTable.NumberCol source="Sph" label="Sph" />
            <DataTable.NumberCol source="Cyl" label="Cyl"/>
            <DataTable.NumberCol source="A" label="A"/>
            <DataTable.NumberCol source="PD" label="PD" />
            <DataTable.NumberCol source="Add" label="Add" />
            <DataTable.NumberCol source="y_h" label="y/h" />
            <DataTable.NumberCol source="Pr" label="Pr" />
            <DataTable.NumberCol source="B" label="B" />
            <DataTable.NumberCol source="HSA" label="HSA" />
            <DataTable.NumberCol source="Vis" label="Vis" />
            <DataTable.NumberCol source="iod" label="iod" />
            <DataTable.Col source="Liefern">
                <BooleanField source="Liefern" />
            </DataTable.Col>
            <DataTable.Col sx={{textAlign: 'end'}} source="Betrag">
                <CurrencyField source="Betrag" />
            </DataTable.Col>
        </DataTable>
    </List>
);



export const GlassShow = () => (
    <Show>
        <ShowLayout>
            <ShowSection title="Datenbankfelder">
                <Field><TextField source="id" /></Field>
                <Field><DateField source="created_at" /></Field>
                <Field><TextField source="Seite" /></Field>
            </ShowSection>
            <ShowSection title="Optische Werte">
                <Field><NumberField source="Sph" /></Field>
                <Field><NumberField source="Cyl" /></Field>
                <Field><NumberField source="A" /></Field>
                <Field><NumberField source="PD" /></Field>
                <Field><NumberField source="Add" /></Field>
                <Field><NumberField source="y_h" /></Field>
                <Field><NumberField source="Pr" /></Field>
                <Field><NumberField source="B" /></Field>
                <Field><NumberField source="HSA" /></Field>
                <Field><NumberField source="Vis" /></Field>
                <Field><NumberField source="iod" /></Field>
            </ShowSection>
            <ShowSection title="Bestellung">
                <Field><BooleanField source="Liefern" /></Field>
                <Field><CurrencyField source="Betrag" /></Field>
            </ShowSection>
            <RelatedSection title="Brillen (Links)">
                <ReferenceManyField reference="brille" target="GlasLinks" label={false}>
                    <Datagrid>
                        <TextField source="id" />
                        <TextField source="Berater" />
                        <DateField source="Datum" />
                    </Datagrid>
                </ReferenceManyField>
            </RelatedSection>
            <RelatedSection title="Brillen (Rechts)">
                <ReferenceManyField reference="brille" target="GlasRechts" label={false}>
                    <Datagrid>
                        <TextField source="id" />
                        <TextField source="Berater" />
                        <DateField source="Datum" />
                    </Datagrid>
                </ReferenceManyField>
            </RelatedSection>
        </ShowLayout>
    </Show>
);


export const GlassEdit = () => (
    <Edit>
        <SimpleForm>
            <FormSection title="Datenbankfelder">
                <FieldRow>
                    <TextInput source="id" />
                    <DateInput source="created_at" />
                    <TextInput source="Seite" />
                </FieldRow>
            </FormSection>
            <FormSection title="Optische Werte">
                <FieldRow>
                    <NumberInput source="Sph" />
                    <NumberInput source="Cyl" />
                    <NumberInput source="A" />
                </FieldRow>
                <FieldRow>
                    <NumberInput source="PD" />
                    <NumberInput source="Add" />
                    <NumberInput source="y_h" />
                </FieldRow>
                <FieldRow>
                    <NumberInput source="Pr" />
                    <NumberInput source="B" />
                    <NumberInput source="HSA" />
                </FieldRow>
                <FieldRow>
                    <NumberInput source="Vis" />
                    <NumberInput source="iod" />
                </FieldRow>
            </FormSection>
            <FormSection title="Bestellung">
                <FieldRow>
                    <BooleanInput source="Liefern" />
                    <NumberInput source="Betrag" />
                </FieldRow>
            </FormSection>
        </SimpleForm>
    </Edit>
);

export const GlassCreate = () => (
    <Create>
        <SimpleForm>
            <FormSection title="Datenbankfelder">
                <FieldRow>
                    <TextInput source="id" />
                    <DateInput source="created_at" />
                    <TextInput source="Seite" />
                </FieldRow>
            </FormSection>
            <FormSection title="Optische Werte">
                <FieldRow>
                    <NumberInput source="Sph" />
                    <NumberInput source="Cyl" />
                    <NumberInput source="A" />
                </FieldRow>
                <FieldRow>
                    <NumberInput source="PD" />
                    <NumberInput source="Add" />
                    <NumberInput source="y_h" />
                </FieldRow>
                <FieldRow>
                    <NumberInput source="Pr" />
                    <NumberInput source="B" />
                    <NumberInput source="HSA" />
                </FieldRow>
                <FieldRow>
                    <NumberInput source="Vis" />
                    <NumberInput source="iod" />
                </FieldRow>
            </FormSection>
            <FormSection title="Bestellung">
                <FieldRow>
                    <BooleanInput source="Liefern" />
                    <NumberInput source="Betrag" />
                </FieldRow>
            </FormSection>
        </SimpleForm>
    </Create>
);
