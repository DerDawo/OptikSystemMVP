// Mahnungen-Übersicht (#57): listet alle Aufträge (`brille`), die bereits
// fakturiert (Rechnungsnummer gesetzt), aber noch nicht bezahlt sind
// (Zahlungsstatus "offen" oder "teilweise offen") und noch einen offenen Restbetrag haben. Analog
// zu Rechnungen.tsx bewusst keine eigene react-admin `Resource`, sondern eine
// mit `ListBase` gefilterte Sicht auf die bestehende `brille`-Tabelle.
// Verlinkt aus dem Menüpunkt "Mahnungen" (MyMenu.tsx) auf die Route
// "/mahnungen" (App.tsx).
import PlaylistRemoveIcon from "@mui/icons-material/PlaylistRemove";
import UndoIcon from "@mui/icons-material/Undo";
import { Box, Button, FormControlLabel, Switch } from "@mui/material";
import { useState } from "react";
import {
  Confirm,
  DataTable,
  DateField,
  FunctionField,
  ListBase,
  Pagination,
  RecordContextProvider,
  ReferenceField,
  Title,
  useNotify,
  useRecordContext,
  useRefresh,
  useUpdate,
} from "react-admin";
import { CurrencyField } from "./CurrencyField";
import { MahnungErstellenButton } from "./FormulareDialog";
import { brilleRowSx } from "./orderStatus";
import { MAHNBARE_ZAHLUNGSSTATUS } from "./zahlungsstatus";

// Entfernt einen Auftrag aus der Mahnliste (Rückfrage, danach Flag
// "MahnlisteAusgeblendet"). Auftrag und Rechnung bleiben erhalten; über
// "Entfernte anzeigen" lässt sich der Eintrag wieder zurückholen.
const MahnlisteEintragButton = ({ entfernt }: { entfernt: boolean }) => {
  const record = useRecordContext();
  const notify = useNotify();
  const refresh = useRefresh();
  const [update, { isPending }] = useUpdate();
  const [frage, setFrage] = useState(false);

  if (!record) return null;

  const setzen = (ausgeblendet: boolean) => {
    setFrage(false);
    update(
      "brille",
      {
        id: record.id,
        data: { MahnlisteAusgeblendet: ausgeblendet },
        previousData: record,
      },
      {
        onSuccess: () => {
          notify(
            ausgeblendet
              ? `Rechnung ${record.Rechnungsnummer} aus der Mahnliste entfernt.`
              : `Rechnung ${record.Rechnungsnummer} wieder in der Mahnliste.`,
            { type: "success" },
          );
          refresh();
        },
        onError: () =>
          notify("Eintrag konnte nicht geändert werden.", { type: "error" }),
      },
    );
  };

  return entfernt ? (
    <Button
      variant="outlined"
      startIcon={<UndoIcon />}
      disabled={isPending}
      onClick={() => setzen(false)}
    >
      Zurückholen
    </Button>
  ) : (
    <>
      <Button
        variant="outlined"
        color="inherit"
        startIcon={<PlaylistRemoveIcon />}
        disabled={isPending}
        onClick={() => setFrage(true)}
      >
        Entfernen
      </Button>
      <Confirm
        isOpen={frage}
        title={`Rechnung ${record.Rechnungsnummer} aus der Mahnliste entfernen?`}
        content="Der Auftrag und die Rechnung bleiben unverändert erhalten, der Eintrag erscheint nur nicht mehr in dieser Liste. Über „Entfernte anzeigen“ lässt er sich zurückholen."
        confirm="Entfernen"
        cancel="Abbrechen"
        onConfirm={() => setzen(true)}
        onClose={() => setFrage(false)}
      />
    </>
  );
};

export const MahnungenList = () => {
  const [entfernteAnzeigen, setEntfernteAnzeigen] = useState(false);
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "1em" }}>
      <Title title="Mahnungen" />
      <FormControlLabel
        sx={{ alignSelf: "flex-end" }}
        control={
          <Switch
            checked={entfernteAnzeigen}
            onChange={(e) => setEntfernteAnzeigen(e.target.checked)}
          />
        }
        label="Entfernte anzeigen"
      />
      <ListBase
        key={String(entfernteAnzeigen)}
        resource="brille"
        disableSyncWithLocation
        storeKey={false}
        filter={{
          "Zahlungsstatus@in": `(${MAHNBARE_ZAHLUNGSSTATUS.map((s) => `"${s}"`).join(",")})`,
          "Rechnungsnummer@not": "is.null",
          "Restbetrag@gt": 0,
          MahnlisteAusgeblendet: entfernteAnzeigen,
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
                  <Box sx={{ display: "flex", gap: 1 }}>
                    {!entfernteAnzeigen && <MahnungErstellenButton />}
                    <MahnlisteEintragButton entfernt={entfernteAnzeigen} />
                  </Box>
                </RecordContextProvider>
              )}
            />
          </DataTable.Col>
        </DataTable>
        <Pagination />
      </ListBase>
    </Box>
  );
};
