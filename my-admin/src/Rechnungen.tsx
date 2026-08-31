// Rechnungen-Übersicht (#56): listet alle Aufträge (`brille`), denen bereits
// eine Rechnungsnummer zugewiesen wurde. Verlinkt aus dem Menüpunkt
// "Rechnungen" (MyMenu.tsx) auf die Route "/rechnungen" (App.tsx) - bewusst
// keine eigene react-admin `Resource`, sondern eine mit `ListBase` gefilterte
// Sicht auf die bestehende `brille`-Tabelle (gleiches Muster wie
// LastCustomersSearched.tsx).
import { Box } from "@mui/material";
import {
  DataTable,
  DateField,
  FunctionField,
  ListBase,
  Pagination,
  ReferenceField,
  Title,
} from "react-admin";
import { CurrencyField } from "./CurrencyField";
import { BrilleStatusChip, brilleRowSx } from "./orderStatus";

export const RechnungenList = () => (
  <Box sx={{ display: "flex", flexDirection: "column", gap: "1em" }}>
    <Title title="Rechnungen" />
    <ListBase
      resource="brille"
      disableSyncWithLocation
      storeKey={false}
      filter={{ "Rechnungsnummer@not": "is.null" }}
      sort={{ field: "Rechnungsnummer", order: "DESC" }}
      perPage={25}
    >
      <DataTable rowSx={brilleRowSx} bulkActionButtons={false}>
        <DataTable.Col source="Rechnungsnummer" label="Rechnungsnr." />
        <DataTable.Col source="id" label="Auftrag Nr." />
        <DataTable.Col label="Kunde">
          <ReferenceField source="kunde_id" reference="kunde" link="show">
            <FunctionField
              render={(record) => {
                if (!record) return "";
                const anrede = record.Anrede ? record.Anrede : "";
                const nachname = record.Nachname ? record.Nachname : "";
                const vorname = record.Vorname ? record.Vorname : "";
                return `${anrede} ${vorname} ${nachname}`.trim();
              }}
            />
          </ReferenceField>
        </DataTable.Col>
        <DataTable.Col source="Datum">
          <DateField source="Datum" />
        </DataTable.Col>
        <DataTable.Col label="Status">
          <FunctionField
            render={(record) => <BrilleStatusChip record={record} />}
          />
        </DataTable.Col>
        <DataTable.Col sx={{ textAlign: "end" }} source="Summe">
          <CurrencyField source="Summe" />
        </DataTable.Col>
        <DataTable.Col sx={{ textAlign: "end" }} source="Anzahlung">
          <CurrencyField source="Anzahlung" />
        </DataTable.Col>
        <DataTable.Col
          sx={{ textAlign: "end" }}
          source="KKAnteil"
          label="KK-Anteil"
        >
          <CurrencyField source="KKAnteil" />
        </DataTable.Col>
        <DataTable.Col source="Zahlungsstatus" />
      </DataTable>
      <Pagination />
    </ListBase>
  </Box>
);
