import { DataTable, DateField, List } from 'react-admin';

export const GlastypList = () => (
    <List>
        <DataTable>
            <DataTable.Col source="id" />
            <DataTable.Col source="created_at">
                <DateField source="created_at" />
            </DataTable.Col>
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