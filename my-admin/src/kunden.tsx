import { DataTable, List, ReferenceManyField, Datagrid, useDataProvider, useShowController, ListActions } from 'react-admin';
import { DateField, Show, SimpleShowLayout, TextField, FunctionField } from 'react-admin';
import { DateInput, Edit, SimpleForm, TextInput } from 'react-admin';
import { Create } from 'react-admin';
import { ReferenceField } from 'react-admin';
import { Box, Divider, Theme, Typography, useMediaQuery } from '@mui/material';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const kundenFilterDesktop = [
    <TextInput resettable source="Vorname@ilike" label="Vorname" alwaysOn />,
    <TextInput resettable source="Nachname@ilike" label="Nachname" alwaysOn />,
    <DateInput source="Geburtsdatum@ilike" label="Geburtsdatum" alwaysOn />,
    <TextInput resettable source="KundenNummer@ilike" label="Kundennummer" alwaysOn />,
];
const kundenFilterMobile = [
    <TextInput resettable source="Vorname@ilike" label="Vorname" />,
    <TextInput resettable source="Nachname@ilike" label="Nachname" />,
    <DateInput source="Geburtsdatum@ilike" label="Geburtsdatum" />,
    <TextInput resettable source="KundenNummer@ilike" label="Kundennummer" />,
];

export const KundenDataTable = (props:any) => (
    <DataTable rowClick="show" {...props}>
        <DataTable.Col source="id" />
        <DataTable.Col label="Kunde">
            <FunctionField render={record => {
                if (!record) return '';
                const anrede = record.Anrede ? record.Anrede : '';
                const nachname = record.Nachname ? record.Nachname : '';
                const vorname = record.Vorname ? record.Vorname : '';
                return `${anrede} ${vorname} ${nachname}`.trim();
            }} />
        </DataTable.Col>
        <DataTable.Col label="Anschrift">
            <FunctionField render={record => {
                if (!record) return '';
                const strasse = record.Straße ? record.Straße : '';
                const hausnummer = record.Hausnummer ? record.Hausnummer : '';
                const plz = record.Postleitzahl ? record.Postleitzahl : '';
                const stadt = record.Stadt ? record.Stadt : '';
                return `${strasse} ${hausnummer}, ${plz} ${stadt}`.trim();
            }} />
        </DataTable.Col>
        <DataTable.Col source="KundenNummer" label="Kundennummer" />
        <DataTable.Col source="Aufnahmedatum">
            <DateField source="Aufnahmedatum" />
        </DataTable.Col>
        <DataTable.Col source="Geburtsdatum">
            <DateField source="Geburtsdatum" />
        </DataTable.Col>
        <DataTable.Col source="Geschlecht" />
        <DataTable.Col source="Tätigkeit" />
        <DataTable.Col source="TelefonnummerPrivat" label="Privat Telefonnummer" />
        <DataTable.Col source="TelefonnummerGeschaeftlich" label="Geschäftliche Telefonnummer" />
        <DataTable.Col source="Email" />
        <DataTable.Col source="KrankenkassenNummer" label="Krankenkassennummer" />
        <DataTable.Col source="VersichertenNummer" label="Versichertenummer" />
        <DataTable.Col source="KrankenversicherungsTyp" label="Krankenversicherung" />
    </DataTable>
);


export const KundenList = () => {
    const isMobile: boolean = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'));

    return (
        <List
            className="list-page"
            title="Kunden"
            disableSyncWithLocation
            filters={isMobile ? kundenFilterMobile : kundenFilterDesktop}
            actions={<ListActions isMobile={isMobile} />}
        >
            <KundenDataTable />
        </List>
    );
}

export const KundeShow = () => {

    const showObject = useShowController();
    const dataProvider = useDataProvider();

    useEffect(() => {
        if (showObject?.record?.id) {
            try {
                dataProvider.update('kunde', {
                    'id': showObject.record.id,
                    'data': {
                        'last_viewed_at': new Date().toISOString()
                    },
                    'previousData': showObject.record,
                },
                );
            } catch (error) {
                console.error('Fehler beim Setzen last_viewed_at', error);
            }
        };

    }, [showObject, dataProvider]);

    return (
        <Show title="Kunden anzeigen">
            <SimpleShowLayout>
                <TextField source="id" />
                <DateField source="created_at" />
                <TextField source="KundenNummer" />
                <DateField source="Aufnahmedatum" />
                <TextField source="Anrede" />
                <TextField source="Nachname" />
                <TextField source="Vorname" />
                <DateField source="Geburtsdatum" />
                <TextField source="Geschlecht" />
                <TextField source="Straße" />
                <TextField source="Tätigkeit" />
                <TextField source="TelefonnummerPrivat" />
                <TextField source="Email" />
                <TextField source="KrankenkassenNummer" />
                <TextField source="VersichertenNummer" />
                <TextField source="Postleitzahl" />
                <TextField source="Hausnummer" />
                <TextField source="Stadt" />
                <TextField source="TelefonnummerGeschaeftlich" />
                <TextField source="KrankenversicherungsTyp" />
                <ReferenceManyField reference="brille" target="kunde_id" label="Brillen des Kunden">
                    <Datagrid>
                        <TextField source="id" />
                        <TextField source="BrillenArt" />
                        <TextField source="Berater" />
                        <TextField source="Refraktion" />
                        <DateField source="Datum" />
                        <TextField source="Werkstatt" />
                        <DateField source="Abholung" />
                        <TextField source="Notizen" />
                        <ReferenceField source="GlasLinks" reference="glass" link="show">
                            <TextField source="id" />
                        </ReferenceField>
                        <ReferenceField source="GlasRechts" reference="glass" link="show">
                            <TextField source="id" />
                        </ReferenceField>
                        <ReferenceField source="Fassung" reference="fassung" link="show">
                            <TextField source="id" />
                        </ReferenceField>
                        <ReferenceField source="Glastyp" reference="glastyp" link="show">
                            <TextField source="id" />
                        </ReferenceField>
                        <TextField source="RabattBezeichnung" />
                        <TextField source="Summe" />
                    </Datagrid>
                </ReferenceManyField>
            </SimpleShowLayout>
        </Show>
    );
};

export const KundeEdit = () => (
    <Edit title="Kunden bearbeiten">
        <SimpleForm>
            <TextInput source="id" InputProps={{ disabled: true }} />
            <DateInput source="created_at" InputProps={{ disabled: true }} />
            <TextInput source="KundenNummer" />
            <DateInput source="Aufnahmedatum" />
            <TextInput source="Anrede" />
            <TextInput source="Nachname" />
            <TextInput source="Vorname" />
            <DateInput source="Geburtsdatum" />
            <TextInput source="Geschlecht" />
            <TextInput source="Straße" />
            <TextInput source="Tätigkeit" />
            <TextInput source="TelefonnummerPrivat" />
            <TextInput source="Email" />
            <TextInput source="KrankenkassenNummer" />
            <TextInput source="VersichertenNummer" />
            <TextInput source="Postleitzahl" />
            <TextInput source="Hausnummer" />
            <TextInput source="Stadt" />
            <TextInput source="TelefonnummerGeschaeftlich" />
            <TextInput source="KrankenversicherungsTyp" />
        </SimpleForm>
    </Edit>
);

export const KundeCreate = () => {
    const location = useLocation();
    const locationState = (location.state as Record<string, unknown> | undefined) ?? {};

    const defaultValues = {
        created_at: new Date().toISOString(),
        Nachname: '',
        Vorname: '',
        Geburtsdatum: '',
        KundenNummer: '',
        ...locationState,
    };

    return (
        <Create
            title="Neuen Kunden anlegen"
            transform={data => ({ ...data, created_at: new Date().toISOString() })}
        >
            <SimpleForm defaultValues={defaultValues}>
                <Typography>
                    Datenbankfelder
                </Typography>
                <Box sx={{ display: { xs: 'block', sm: 'flex', width: '100%' } }}>
                    <Box sx={{ flex: 1, mr: { xs: 0, sm: '0.5em' } }}>
                        <TextInput source="id" InputProps={{ disabled: true }} />
                    </Box>
                    <Box sx={{ flex: 1, ml: { xs: 0, sm: '0.5em' } }}>
                        <DateInput source="created_at" InputProps={{ disabled: true }} label="Erstellt am" />
                    </Box>
                </Box>
                <Box sx={{ display: { xs: 'block', sm: 'flex', width: '100%' } }}>
                    <Box sx={{ flex: 1, mr: { xs: 0, sm: '0.5em' } }}>
                        <TextInput source="KundenNummer" />
                    </Box>
                    <Box sx={{ flex: 1, ml: { xs: 0, sm: '0.5em' } }}>
                        <DateInput source="Aufnahmedatum" />
                    </Box>
                </Box>
                <Typography>
                    Stammdaten
                </Typography>
                <TextInput source="Anrede" />
                <TextInput source="Nachname" />
                <TextInput source="Vorname" />
                <TextInput source="Geschlecht" />
                <Box sx={{ display: { xs: 'block', sm: 'flex', width: '100%' } }}>
                    <Box sx={{ flex: 1, mr: { xs: 0, sm: '0.5em' } }}>
                        <DateInput source="Geburtsdatum" />
                    </Box>
                    <Box sx={{ flex: 1, ml: { xs: 0, sm: '0.5em' } }}>
                        <TextInput source="Tätigkeit" />
                    </Box>
                </Box>
                <Divider />
                <Typography>
                    Adresse
                </Typography>
                <Box sx={{ display: { xs: 'block', sm: 'flex', width: '100%' } }}>
                    <Box sx={{ flex: 1, mr: { xs: 0, sm: '0.5em' } }}>
                        <TextInput source="Straße" />
                    </Box>
                    <Box sx={{ flex: 1, ml: { xs: 0, sm: '0.5em' } }}>
                        <TextInput source="Hausnummer" />
                    </Box>
                </Box>
                <Box sx={{ display: { xs: 'block', sm: 'flex', width: '100%' } }}>
                    <Box sx={{ flex: 1, mr: { xs: 0, sm: '0.5em' } }}>
                        <TextInput source="Postleitzahl" />
                    </Box>
                    <Box sx={{ flex: 1, ml: { xs: 0, sm: '0.5em' } }}>
                        <TextInput source="Stadt" />
                    </Box>
                </Box>
                <Divider />
                <Typography>
                    Kontakt
                </Typography>
                <Box sx={{ display: { xs: 'block', sm: 'flex', width: '100%' } }}>
                    <Box sx={{ flex: 1, mr: { xs: 0, sm: '0.5em' } }}>
                        <TextInput source="TelefonnummerPrivat" label="Telefonnummer Privat" />
                    </Box>
                    <Box sx={{ flex: 1, ml: { xs: 0, sm: '0.5em' } }}>
                        <TextInput source="TelefonnummerGeschaeftlich" label="Telefonnummer Geschäftlich" />
                    </Box>
                    <Box sx={{ flex: 1, ml: { xs: 0, sm: '0.5em' } }}>
                        <TextInput source="Email" />
                    </Box>
                </Box>
                <TextInput source="KrankenkassenNummer" label="Krankenkassennummer" />
                <TextInput source="VersichertenNummer" label="Versichertennummer" />
                <TextInput source="KrankenversicherungsTyp" label="Krankenversicherungs Typ" />
            </SimpleForm>
        </Create>
    );
}

import { useParams } from 'react-router-dom';

export const KundeMessage = () => {
    const { id } = useParams();

    return <div>Send message to Kunde {id}</div>;
};