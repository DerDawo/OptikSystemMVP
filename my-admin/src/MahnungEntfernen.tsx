// Mahnliste: Auftrag gleich aus der Liste nehmen. Rückfrage mit zwei Wegen:
// "Bezahlt" (Zahlungsstatus bezahlt, wie in der Kartei) oder "Nicht mahnen"
// (Forderung bleibt offen, Auftrag erscheint nicht mehr in der Mahnliste).
// Ausgesetzte Aufträge lassen sich über "Wieder mahnen" zurückholen.
import { useState } from "react";
import {
  useDataProvider,
  useNotify,
  useRecordContext,
  useRefresh,
} from "react-admin";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Tooltip,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { formatCurrency } from "./CurrencyField";

type Auftrag = {
  id: number;
  Rechnungsnummer?: string | null;
  Restbetrag?: number | null;
  MahnungAusgesetzt?: boolean | null;
};

const useSpeichern = () => {
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const refresh = useRefresh();
  return async (
    auftrag: Auftrag,
    daten: Record<string, unknown>,
    meldung: string,
  ) => {
    try {
      await dataProvider.update("brille", {
        id: auftrag.id,
        data: daten,
        previousData: auftrag,
      });
      notify(meldung, { type: "success" });
      refresh();
    } catch (e) {
      notify(
        `Konnte nicht gespeichert werden: ${e instanceof Error ? e.message : String(e)}`,
        { type: "error" },
      );
    }
  };
};

export const MahnungEntfernenButton = () => {
  const auftrag = useRecordContext<Auftrag>();
  const speichern = useSpeichern();
  const [offen, setOffen] = useState(false);
  const [laeuft, setLaeuft] = useState(false);
  if (!auftrag) return null;

  const nr = auftrag.Rechnungsnummer
    ? `Rechnung ${auftrag.Rechnungsnummer}`
    : `Auftrag ${auftrag.id}`;
  const ausfuehren = async (daten: Record<string, unknown>, text: string) => {
    setLaeuft(true);
    await speichern(auftrag, daten, text);
    setLaeuft(false);
    setOffen(false);
  };

  return (
    <>
      <Tooltip title="Aus der Mahnliste nehmen">
        <IconButton
          size="small"
          aria-label={`${nr} aus der Mahnliste nehmen`}
          onClick={(e) => {
            e.stopPropagation();
            setOffen(true);
          }}
        >
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Dialog
        open={offen}
        onClose={() => setOffen(false)}
        onClick={(e) => e.stopPropagation()}
      >
        <DialogTitle>{nr} aus der Mahnliste nehmen?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Offen: {formatCurrency(auftrag.Restbetrag)}. Der Auftrag selbst
            bleibt erhalten.
          </DialogContentText>
          <DialogContentText sx={{ mt: 1.5 }}>
            <strong>Bezahlt:</strong> Der Kunde hat bezahlt, der Zahlungsstatus
            wird auf „bezahlt“ gesetzt.
            <br />
            <strong>Nicht mahnen:</strong> Die Forderung bleibt offen (z. B.
            Kulanz oder Ratenvereinbarung), wird aber nicht mehr gemahnt. Unter
            „Ausgesetzte anzeigen“ lässt sich das zurücknehmen.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOffen(false)}>Abbrechen</Button>
          <Button
            disabled={laeuft}
            onClick={() =>
              void ausfuehren(
                { MahnungAusgesetzt: true },
                `${nr}: wird nicht mehr gemahnt.`,
              )
            }
          >
            Nicht mahnen
          </Button>
          <Button
            variant="contained"
            disabled={laeuft}
            onClick={() =>
              void ausfuehren(
                { Zahlungsstatus: "bezahlt" },
                `${nr}: als bezahlt markiert.`,
              )
            }
          >
            Bezahlt
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export const WiederMahnenButton = () => {
  const auftrag = useRecordContext<Auftrag>();
  const speichern = useSpeichern();
  if (!auftrag) return null;
  return (
    <Button
      size="small"
      onClick={(e) => {
        e.stopPropagation();
        void speichern(
          auftrag,
          { MahnungAusgesetzt: false },
          `Auftrag ${auftrag.id}: steht wieder in der Mahnliste.`,
        );
      }}
    >
      Wieder mahnen
    </Button>
  );
};
