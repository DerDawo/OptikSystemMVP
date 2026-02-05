import { DataTable, DateField, List } from 'react-admin';

export const FassungList = () => (
    <List>
        <DataTable>
            <DataTable.Col source="id" />
            <DataTable.Col source="created_at">
                <DateField source="created_at" />
            </DataTable.Col>
            <DataTable.Col source="Lagernummer" />
            <DataTable.Col source="Bezeichnung" />
            <DataTable.Col source="Linie" />
            <DataTable.Col source="Farbe" />
            <DataTable.Col source="Groesse" />
            <DataTable.NumberCol source="Betrag" />
            <DataTable.Col source="Hersteller" />
        </DataTable>
    </List>
);