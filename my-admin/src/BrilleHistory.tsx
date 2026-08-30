import { Datagrid, DateField, FunctionField, TextField } from "react-admin";
import { BrilleStatusChip, brilleRowSx } from "./orderStatus";

// Reused as the "Verlauf"/history datagrid on both the Kunde and Brille detail pages.
export const BrilleHistoryDatagrid = () => (
  <Datagrid rowClick="show" bulkActionButtons={false} rowSx={brilleRowSx}>
    <DateField source="Datum" label="Datum" />
    <TextField source="BrillenArt" label="Art" />
    <FunctionField
      label="Status"
      render={(record) => <BrilleStatusChip record={record} />}
    />
    <DateField source="Abholung" label="Abholung" />
    <TextField source="Werkstatt" label="Werkstatt" />
  </Datagrid>
);
