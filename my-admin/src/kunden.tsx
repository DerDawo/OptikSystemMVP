import { DataTable, List } from 'react-admin';
import { DateField, Show, SimpleShowLayout, TextField } from 'react-admin';
import { DateInput, Edit, SimpleForm, TextInput } from 'react-admin';
import { Create } from 'react-admin';

export const KundenList = () => (
    <List>
        <DataTable>
            <DataTable.Col source="id" />
            <DataTable.Col source="created_at">
                <DateField source="created_at" />
            </DataTable.Col>
            <DataTable.Col source="KundenNummer" />
            <DataTable.Col source="Aufnahmedatum">
                <DateField source="Aufnahmedatum" />
            </DataTable.Col>
            <DataTable.Col source="Anrede" />
            <DataTable.Col source="Nachname" />
            <DataTable.Col source="Vorname" />
            <DataTable.Col source="Geburtsdatum">
                <DateField source="Geburtsdatum" />
            </DataTable.Col>
            <DataTable.Col source="Geschlecht" />
            <DataTable.Col source="Straße" />
            <DataTable.Col source="Tätigkeit" />
            <DataTable.Col source="TelefonnummerPrivat" />
            <DataTable.Col source="Email" />
            <DataTable.Col source="KrankenkassenNummer" />
            <DataTable.Col source="VersichertenNummer" />
            <DataTable.Col source="Postleitzahl" />
            <DataTable.Col source="Hausnummer" />
            <DataTable.Col source="Stadt" />
            <DataTable.Col source="TelefonnummerGeschaeftlich" />
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