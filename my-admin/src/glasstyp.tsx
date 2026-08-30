import { DataTable, DateField, List, Show, TextField, Edit, SimpleForm, TextInput, Create, ReferenceManyField, ReferenceField, ReferenceInput, AutocompleteInput, Datagrid, TopToolbar, useGetOne } from 'react-admin';
import { useEffect } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { Button } from '@mui/material';
import { Link } from 'react-router-dom';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { Field, FieldRow, FormSection, RelatedSection, ShowLayout, ShowSection } from './EntityLayout';

const GlastypListActions = () => (
    <TopToolbar>
        <Button component={Link} to="/glaskatalog-import" startIcon={<UploadFileIcon />}>
            SF6-Katalog importieren
        </Button>
    </TopToolbar>
);

// Übernimmt beim Auswählen eines Herstellerkatalog-Eintrags (glaskatalog_id, s.
// GlaskatalogInput unten) dessen Bezeichnung/Hersteller in die zugehörigen
// Freitextfelder, damit sie nicht doppelt eingetippt werden müssen. Die
// Freitextfelder bleiben dabei editierbar und bestehen für manuell angelegte
// bzw. vor dem SF6-Import erfasste Glastypen unverändert weiter.
const GlaskatalogAutoFill = () => {
    const glaskatalogId = useWatch({ name: 'glaskatalog_id' });
    const { setValue } = useFormContext();

    const { data: katalogEintrag } = useGetOne(
        'glaskatalog',
        { id: glaskatalogId },
        { enabled: Boolean(glaskatalogId) },
    );
    const { data: hersteller } = useGetOne(
        'glashersteller',
        { id: katalogEintrag?.glashersteller_id },
        { enabled: Boolean(katalogEintrag?.glashersteller_id) },
    );

    useEffect(() => {
        if (katalogEintrag?.bezeichnung) {
            setValue('Bezeichnung', katalogEintrag.bezeichnung, { shouldDirty: true });
        }
    }, [katalogEintrag, setValue]);

    useEffect(() => {
        if (hersteller?.name) {
            setValue('Hersteller', hersteller.name, { shouldDirty: true });
        }
    }, [hersteller, setValue]);

    return null;
};

// ReferenceInput/AutocompleteInput auf den per SF6-Import befüllten
// Glaskatalog (siehe src/glaskatalog/). Nur aktive Katalogeinträge
// (aktiv=true) werden angeboten, damit ausgelaufene Herstellerprodukte nicht
// mehr neu ausgewählt werden können.
const GlaskatalogInput = () => (
    <>
        <ReferenceInput source="glaskatalog_id" reference="glaskatalog" filter={{ aktiv: true }}>
            <AutocompleteInput
                label="Aus Glaskatalog übernehmen"
                optionText="bezeichnung"
                filterToQuery={(searchText: string) => ({ 'bezeichnung@ilike': `%${searchText}%` })}
            />
        </ReferenceInput>
        <GlaskatalogAutoFill />
    </>
);


export const GlastypList = () => (
    <List title="Glastypen" actions={<GlastypListActions />}>
        <DataTable>
            <DataTable.Col source="id" />
            <DataTable.Col source="Bezeichnung" />
            <DataTable.Col source="Hersteller" />
            <DataTable.Col source="Verguetung" />
            <DataTable.Col source="GlasGroesse" />
            <DataTable.Col source="Sonstiges" />
            <DataTable.Col source="Bestellstatus" />
            <DataTable.Col source="Farbe" />
        </DataTable>
    </List>
);

export const GlastypShow = () => (
    <Show>
        <ShowLayout>
            <ShowSection title="Datenbankfelder">
                <Field><TextField source="id" /></Field>
                <Field><DateField source="created_at" /></Field>
            </ShowSection>
            <ShowSection title="Details">
                <Field><TextField source="Bezeichnung" /></Field>
                <Field><TextField source="Hersteller" /></Field>
                <Field><TextField source="Verguetung" /></Field>
                <Field><TextField source="GlasGroesse" /></Field>
                <Field><TextField source="Farbe" /></Field>
                <Field label="Glaskatalog-Herkunft">
                    <ReferenceField reference="glaskatalog" source="glaskatalog_id" link="show" emptyText="manuell angelegt">
                        <TextField source="bezeichnung" />
                    </ReferenceField>
                </Field>
            </ShowSection>
            <ShowSection title="Status">
                <Field><TextField source="Bestellstatus" /></Field>
                <Field><TextField source="Sonstiges" /></Field>
            </ShowSection>
            <RelatedSection title="Brillen">
                <ReferenceManyField reference="brille" target="Glastyp" label={false}>
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

export const GlastypEdit = () => (
    <Edit>
        <SimpleForm>
            <FormSection title="Herstellerkatalog">
                <GlaskatalogInput />
            </FormSection>
            <FormSection title="Details">
                <FieldRow>
                    <TextInput source="Bezeichnung" />
                    <TextInput source="Hersteller" />
                </FieldRow>
                <FieldRow>
                    <TextInput source="Verguetung" />
                    <TextInput source="GlasGroesse" />
                    <TextInput source="Farbe" />
                </FieldRow>
            </FormSection>
            <FormSection title="Status">
                <FieldRow>
                    <TextInput source="Bestellstatus" />
                    <TextInput source="Sonstiges" />
                </FieldRow>
            </FormSection>
        </SimpleForm>
    </Edit>
);

export const GlastypCreate = () => (
    <Create>
        <SimpleForm>
            <FormSection title="Herstellerkatalog">
                <GlaskatalogInput />
            </FormSection>
            <FormSection title="Details">
                <FieldRow>
                    <TextInput source="Bezeichnung" />
                    <TextInput source="Hersteller" />
                </FieldRow>
                <FieldRow>
                    <TextInput source="Verguetung" />
                    <TextInput source="GlasGroesse" />
                    <TextInput source="Farbe" />
                </FieldRow>
            </FormSection>
            <FormSection title="Status">
                <FieldRow>
                    <TextInput source="Bestellstatus" />
                    <TextInput source="Sonstiges" />
                </FieldRow>
            </FormSection>
        </SimpleForm>
    </Create>
);
