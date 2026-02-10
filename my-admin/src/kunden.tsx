import { DataTable, List, ReferenceManyField, Datagrid } from 'react-admin';
import { DateField, Show, SimpleShowLayout, TextField, FunctionField } from 'react-admin';
import { DateInput, Edit, SimpleForm, TextInput } from 'react-admin';
import { Create } from 'react-admin';
import { ReferenceField } from 'react-admin';

import SmartphoneIcon from '@mui/icons-material/Smartphone';
import LocalPhoneIcon from '@mui/icons-material/LocalPhone';
import EmailIcon from '@mui/icons-material/Email';

export const KundenList = () => (
    <List title="Kunden" perPage={10}>
        <DataTable>
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
            <DataTable.Col source="KundenNummer" />
            <DataTable.Col source="created_at">
                <DateField source="created_at" />
            </DataTable.Col>
            <DataTable.Col source="Aufnahmedatum">
                <DateField source="Aufnahmedatum" />
            </DataTable.Col>
            <DataTable.Col source="Geburtsdatum">
                <DateField source="Geburtsdatum" />
            </DataTable.Col>
            <DataTable.Col source="Geschlecht" />
            <DataTable.Col source="Tätigkeit" />
            <DataTable.Col label="Kontakt">
                <FunctionField render={record => {
                    if (!record) return '';
                    const TelefonnummerPrivat = record.TelefonnummerPrivat ? record.TelefonnummerPrivat : '';
                    const TelefonnummerGeschaeftlich = record.TelefonnummerGeschaeftlich ? record.TelefonnummerGeschaeftlich : '';
                    const Email = record.Email ? record.Email : '';
                    return <>
                        <p>
                            <LocalPhoneIcon sx={{ fontSize: 12 }} /> 
                            &nbsp;
                            {TelefonnummerPrivat} 
                        </p>
                        <p>
                            <SmartphoneIcon sx={{ fontSize: 12 }} /> 
                            &nbsp;
                            {TelefonnummerGeschaeftlich}
                        </p>
                        <p>
                            <EmailIcon sx={{ fontSize: 12 }} /> 
                            &nbsp;
                            {Email}
                        </p>
                    </>;
                }} />
            </DataTable.Col>
            <DataTable.Col source="KrankenkassenNummer" />
            <DataTable.Col source="VersichertenNummer" />
            <DataTable.Col source="KrankenversicherungsTyp" />
        </DataTable>
    </List>
);

export const KundeShow = () => (
    <Show>
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
            <ReferenceManyField reference="kunde_hat_brille" target="KundenID" label="Brillen">
                <Datagrid>
                    <ReferenceField source="BrillenID" reference="brille" link="show">
                        <TextField source="id" />
                    </ReferenceField>
                </Datagrid>
            </ReferenceManyField>
        </SimpleShowLayout>
    </Show>
);

export const KundeEdit = () => (
    <Edit>
        <SimpleForm>
            <TextInput source="id" InputProps={{ disabled: true }}/>
            <DateInput source="created_at" InputProps={{ disabled: true }}/>
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

export const KundeCreate = () => (
    <Create>
        <SimpleForm>
            <TextInput source="id" />
            <DateInput source="created_at"/>
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
    </Create>
);