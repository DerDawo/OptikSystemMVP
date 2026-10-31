import { useEffect, useState } from "react";
import { useNotify } from "react-admin";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";
import dayjs from "dayjs";
import {
  leereRezeptEingabe,
  rezeptAusEingabe,
  rezeptEingabeFehlt,
  type RezeptEingabe,
  type RezeptKunde,
} from "./kassenrezept";
import { RECHNUNG_ABSENDER } from "./rechnungTemplate";
import { supabase } from "./utils";

/*
 * Kassenrezept von Hand beim Kunden erfassen, wenn es (noch) nicht aus einer
 * Rezeptübersicht importiert wurde. Name, Kasse und Versichertennummer kommen
 * aus der Kundenkartei.
 */
export const NeuesRezeptDialog = ({
  offen,
  kundeId,
  kunde,
  onSchliessen,
  onGespeichert,
}: {
  offen: boolean;
  kundeId: number;
  kunde: RezeptKunde;
  onSchliessen: () => void;
  onGespeichert: () => void;
}) => {
  const notify = useNotify();
  const [eingabe, setEingabe] = useState<RezeptEingabe>(() =>
    leereRezeptEingabe(dayjs().format("YYYY-MM-DD")),
  );
  const [speichert, setSpeichert] = useState(false);

  useEffect(() => {
    if (offen) setEingabe(leereRezeptEingabe(dayjs().format("YYYY-MM-DD")));
  }, [offen]);

  const setze = (feld: keyof RezeptEingabe, wert: string) =>
    setEingabe((alt) => ({ ...alt, [feld]: wert }));

  const fehlt = rezeptEingabeFehlt(eingabe);

  const speichern = async () => {
    setSpeichert(true);
    const { error } = await supabase
      .from("kassenrezept")
      .insert(
        rezeptAusEingabe(kundeId, kunde, eingabe, RECHNUNG_ABSENDER.mwstSatz),
      );
    setSpeichert(false);
    if (error) {
      notify(
        error.code === "23505"
          ? "Diese Belegnummer gibt es schon."
          : `Rezept konnte nicht gespeichert werden: ${error.message}`,
        { type: "error" },
      );
      return;
    }
    notify("Rezept gespeichert.", { type: "success" });
    onGespeichert();
  };

  return (
    <Dialog
      open={offen}
      onClose={() => !speichert && onSchliessen()}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>Neues Rezept</DialogTitle>
      <DialogContent>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            gap: 1.5,
            pt: 1,
          }}
        >
          <TextField
            required
            type="date"
            size="small"
            label="Rezept vom"
            value={eingabe.rezeptdatum}
            onChange={(e) => setze("rezeptdatum", e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            required
            type="month"
            size="small"
            label="Abrechnungsmonat"
            value={eingabe.monat}
            onChange={(e) => setze("monat", e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            required
            size="small"
            label="Belegnummer"
            value={eingabe.beleg}
            onChange={(e) => setze("beleg", e.target.value)}
          />
          <TextField
            required
            size="small"
            label="Leistung"
            value={eingabe.leistung}
            onChange={(e) => setze("leistung", e.target.value)}
          />
          <TextField
            required
            size="small"
            label="Brutto (€)"
            inputMode="decimal"
            value={eingabe.brutto}
            onChange={(e) => setze("brutto", e.target.value)}
          />
          <TextField
            size="small"
            label="Zuzahlung (€)"
            inputMode="decimal"
            value={eingabe.zuzahlung}
            onChange={(e) => setze("zuzahlung", e.target.value)}
          />
          <TextField
            size="small"
            multiline
            label="Bemerkung"
            value={eingabe.bemerkung}
            onChange={(e) => setze("bemerkung", e.target.value)}
            sx={{ gridColumn: "1 / -1" }}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button disabled={speichert} onClick={onSchliessen}>
          Abbrechen
        </Button>
        <Button
          variant="contained"
          disabled={speichert || fehlt.length > 0}
          onClick={() => void speichern()}
          startIcon={speichert ? <CircularProgress size={16} /> : undefined}
        >
          Speichern
        </Button>
      </DialogActions>
    </Dialog>
  );
};
