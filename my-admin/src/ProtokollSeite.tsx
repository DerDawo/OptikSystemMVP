// Einstellungen → Änderungsprotokoll (nur Inhaber): wer hat wann was
// angelegt, geändert oder gelöscht. Die Einträge schreibt die Datenbank
// selbst (Trigger), niemand kann sie über die App ändern.
import {
  DataTable,
  DateInput,
  List,
  SelectInput,
  TextInput,
  useRecordContext,
} from "react-admin";
import { Alert, Box, Typography } from "@mui/material";
import dayjs from "dayjs";
import { BEREICHE, aenderungsZeilen, bereichName } from "./protokoll";
import { useRolle } from "./rolle";

const filter = [
  <SelectInput
    key="tabelle"
    source="tabelle"
    label="Bereich"
    choices={Object.entries(BEREICHE).map(([id, name]) => ({ id, name }))}
    alwaysOn
  />,
  <TextInput
    key="benutzer"
    source="benutzer@ilike"
    label="Benutzer"
    alwaysOn
  />,
  <TextInput key="id" source="datensatz_id" label="Datensatz-Nr." />,
  <SelectInput
    key="aktion"
    source="aktion"
    label="Aktion"
    choices={["angelegt", "geändert", "gelöscht"].map((a) => ({
      id: a,
      name: a,
    }))}
  />,
  <DateInput key="ab" source="zeitpunkt@gte" label="ab Datum" />,
];

const Zeitpunkt = () => {
  const e = useRecordContext();
  return e ? (
    <Box component="span" sx={{ whiteSpace: "nowrap" }}>
      {dayjs(String(e.zeitpunkt)).format("DD.MM.YYYY HH:mm:ss")}
    </Box>
  ) : null;
};

const Bereich = () => {
  const e = useRecordContext();
  return e ? (
    <>
      {bereichName(String(e.tabelle))}
      {e.datensatz_id ? ` Nr. ${e.datensatz_id}` : ""}
    </>
  ) : null;
};

const Aenderungen = () => {
  const e = useRecordContext();
  if (!e) return null;
  const zeilen = aenderungsZeilen({
    aktion: String(e.aktion),
    alt: e.alt,
    neu: e.neu,
  });
  const sichtbar = zeilen.slice(0, 8);
  return (
    <Box sx={{ fontSize: 13, lineHeight: 1.45 }}>
      {sichtbar.map((z, i) => (
        <div key={i}>{z}</div>
      ))}
      {zeilen.length > sichtbar.length && (
        <Typography variant="caption" color="text.secondary">
          … und {zeilen.length - sichtbar.length} weitere Felder
        </Typography>
      )}
    </Box>
  );
};

export const ProtokollSeite = () => {
  const rolle = useRolle();
  if (rolle && rolle !== "inhaber") {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        Das Änderungsprotokoll kann nur der Inhaber einsehen.
      </Alert>
    );
  }
  return (
    <List
      resource="aenderungsprotokoll"
      title="Änderungsprotokoll"
      filters={filter}
      sort={{ field: "zeitpunkt", order: "DESC" }}
      perPage={50}
      exporter={false}
    >
      <DataTable bulkActionButtons={false} rowClick={false}>
        <DataTable.Col source="zeitpunkt" label="Zeitpunkt">
          <Zeitpunkt />
        </DataTable.Col>
        <DataTable.Col source="benutzer" label="Benutzer" />
        <DataTable.Col source="aktion" label="Aktion" />
        <DataTable.Col source="tabelle" label="Bereich">
          <Bereich />
        </DataTable.Col>
        <DataTable.Col label="Änderungen" disableSort>
          <Aenderungen />
        </DataTable.Col>
      </DataTable>
    </List>
  );
};
