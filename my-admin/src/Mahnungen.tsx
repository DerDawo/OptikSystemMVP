// Mahnungen-Übersicht (#57): listet alle Aufträge (`brille`), die bereits
// fakturiert (Rechnungsnummer gesetzt), aber noch nicht bezahlt sind
// (Zahlungsstatus = 'offen') und noch einen offenen Restbetrag haben. Analog
// zu Rechnungen.tsx bewusst keine eigene react-admin `Resource`, sondern eine
// mit `ListBase` gefilterte Sicht auf die bestehende `brille`-Tabelle.
// Verlinkt aus dem Menüpunkt "Mahnungen" (MyMenu.tsx) auf die Route
// "/mahnungen" (App.tsx).
import { Box } from "@mui/material";
import {
  DataTable,
  DateField,
  FunctionField,
  ListBase,
  Pagination,
  RecordContextProvider,
  ReferenceField,
  Title,
} from "react-admin";
import { CurrencyField } from "./CurrencyField";
import { MahnungErstellenButton } from "./FormulareDialog";
import { brilleRowSx } from "./orderStatus";

export const MahnungenList = () => (
  <Box sx={{ display: "flex", flexDirection: "column", gap: "1em" }}>
    <Title title="Mahnungen" />
    <ListBase
      resource="brille"
      disableSyncWithLocation
      storeKey={false}
      filter={{
        Zahlungsstatus: "offen",
        "Rechnungsnummer@not": "is.null",
        "Restbetrag@gt": 0,
      }}
      sort={{ field: "Abholung", order: "ASC" }}
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
        <DataTable.Col source="Abholung" label="Abholung (Alter)">
          <DateField source="Abholung" />
        </DataTable.Col>
        <DataTable.Col sx={{ textAlign: "end" }} source="Restbetrag">
          <CurrencyField source="Restbetrag" />
        </DataTable.Col>
        <DataTable.Col source="Mahnstufe" label="Mahnstufe" />
        <DataTable.Col label="Aktion">
          <FunctionField
            render={(record) => (
              <RecordContextProvider value={record}>
                <MahnungErstellenButton />
              </RecordContextProvider>
            )}
          />
        </DataTable.Col>
      </DataTable>
      <Pagination />
    </ListBase>
  </Box>
);
