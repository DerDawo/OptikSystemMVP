import { DataTable, DateField, List } from 'react-admin';

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