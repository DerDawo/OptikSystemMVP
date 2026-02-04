import { BooleanField, DataTable, DateField, List } from 'react-admin';

export const GlassList = () => (
    <List>
        <DataTable>
            <DataTable.Col source="id" />
            <DataTable.Col source="created_at">
                <DateField source="created_at" />
            </DataTable.Col>
            <DataTable.NumberCol source="Sph" />
            <DataTable.NumberCol source="Cyl" />
            <DataTable.NumberCol source="A" />
            <DataTable.NumberCol source="PD" />
            <DataTable.NumberCol source="Add" />
            <DataTable.NumberCol source="y_h" />
            <DataTable.NumberCol source="Pr" />
            <DataTable.NumberCol source="B" />
            <DataTable.NumberCol source="HSA" />
            <DataTable.NumberCol source="Vis" />
            <DataTable.NumberCol source="iod" />
            <DataTable.Col source="Liefern">
                <BooleanField source="Liefern" />
            </DataTable.Col>
            <DataTable.NumberCol source="Betrag" />
            <DataTable.Col source="Seite" />
        </DataTable>
    </List>
);