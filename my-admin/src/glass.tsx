import { 
    BooleanField, 
    DataTable, 
    DateField, 
    List, 
    ReferenceManyField, 
    Datagrid,
    NumberField, 
    Show, 
    SimpleShowLayout, 
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
        <SimpleShowLayout>
            <TextField source="id" />
            <DateField source="created_at" />
            <NumberField source="Sph" />
            <NumberField source="Cyl" />
            <NumberField source="A" />
            <NumberField source="PD" />
            <NumberField source="Add" />
            <NumberField source="y_h" />
            <NumberField source="Pr" />
            <NumberField source="B" />
            <NumberField source="HSA" />
            <NumberField source="Vis" />
            <NumberField source="iod" />
            <BooleanField source="Liefern" />
            <CurrencyField source="Betrag" />
            <TextField source="Seite" />
            <ReferenceManyField reference="brille" target="GlasLinks" label="Brillen (Links)">
                <Datagrid>
                    <TextField source="id" />
                    <TextField source="Berater" />
                    <DateField source="Datum" />
                </Datagrid>
            </ReferenceManyField>
            <ReferenceManyField reference="brille" target="GlasRechts" label="Brillen (Rechts)">
                <Datagrid>
                    <TextField source="id" />
                    <TextField source="Berater" />
                    <DateField source="Datum" />
                </Datagrid>
            </ReferenceManyField>
        </SimpleShowLayout>
    </Show>
);


export const GlassEdit = () => (
    <Edit>
        <SimpleForm>
            <TextInput source="id" />
            <DateInput source="created_at" />
            <NumberInput source="Sph" />
            <NumberInput source="Cyl" />
            <NumberInput source="A" />
            <NumberInput source="PD" />
            <NumberInput source="Add" />
            <NumberInput source="y_h" />
            <NumberInput source="Pr" />
            <NumberInput source="B" />
            <NumberInput source="HSA" />
            <NumberInput source="Vis" />
            <NumberInput source="iod" />
            <BooleanInput source="Liefern" />
            <NumberInput source="Betrag" />
            <TextInput source="Seite" />
        </SimpleForm>
    </Edit>
);

export const GlassCreate = () => (
    <Create>
        <SimpleForm>
            <TextInput source="id" />
            <DateInput source="created_at" />
            <NumberInput source="Sph" />
            <NumberInput source="Cyl" />
            <NumberInput source="A" />
            <NumberInput source="PD" />
            <NumberInput source="Add" />
            <NumberInput source="y_h" />
            <NumberInput source="Pr" />
            <NumberInput source="B" />
            <NumberInput source="HSA" />
            <NumberInput source="Vis" />
            <NumberInput source="iod" />
            <BooleanInput source="Liefern" />
            <NumberInput source="Betrag" />
            <TextInput source="Seite" />
        </SimpleForm>
    </Create>
);