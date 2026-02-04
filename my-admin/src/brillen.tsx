import { DataTable, DateField, List, ReferenceField } from 'react-admin';

export const BrilleList = () => (
    <List>
        <DataTable>
            <DataTable.Col source="id" />
            <DataTable.Col source="created_at">
                <DateField source="created_at" />
            </DataTable.Col>
            <DataTable.Col source="Berater" />
            <DataTable.Col source="Refraktion" />
            <DataTable.Col source="Datum">
                <DateField source="Datum" />
            </DataTable.Col>
            <DataTable.Col source="Werkstatt" />
            <DataTable.Col source="Abholung">
                <DateField source="Abholung" />
            </DataTable.Col>
            <DataTable.Col source="Notizen" />
            <DataTable.NumberCol source="GlasLinks" >
                <ReferenceField source="GlassLinks" reference="glass" />
            </DataTable.NumberCol>
            <DataTable.NumberCol source="GlasRechts" >
                <ReferenceField source="GlasRechts" reference="glass" />
            </DataTable.NumberCol>
            <DataTable.NumberCol source="Fassung" />
            <DataTable.NumberCol source="Glastyp" />
            <DataTable.Col source="RabattBezeichnung" />
            <DataTable.NumberCol source="Summe" />
            <DataTable.Col source="BrillenArt" />
        </DataTable>
    </List>
);
