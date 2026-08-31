// "Karteikarte kopieren" (#53): legt aus einer bestehenden Brillenkartei einen
// neuen Auftrag für denselben Kunden an. Der Nutzer wählt per Checkbox, welche
// Datenblöcke aus dem bestehenden Auftrag in den neuen übernommen werden
// sollen; Preis-/Zahlungsfelder werden für den neuen Auftrag immer
// zurückgesetzt (Summe wird ohnehin automatisch neu berechnet, siehe #52).
import { useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  FormGroup,
  IconButton,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import {
  RaRecord,
  useDataProvider,
  useNotify,
  useRecordContext,
} from "react-admin";
import { useNavigate } from "react-router-dom";

// Nur die optischen Werte, ohne Preis ("Betrag") und Bestellstatus
// ("Liefern"/"Auftragsstatus") - die sollen für den neuen Auftrag frisch
// erfasst werden.
const OPTISCHE_GLAS_FELDER = [
  "Seite",
  "Sph",
  "Cyl",
  "A",
  "PD",
  "Add",
  "y_h",
  "Pr",
  "B",
  "HSA",
  "Vis",
  "iod",
] as const;

const pickGlasFelder = (glas: RaRecord) =>
  Object.fromEntries(
    OPTISCHE_GLAS_FELDER.filter((feld) => glas[feld] !== undefined).map(
      (feld) => [feld, glas[feld]],
    ),
  );

type Auswahl = {
  glaswerte: boolean;
  glasausfuehrung: boolean;
  fassung: boolean;
  formdaten: boolean;
};

const alleAusgewaehlt = (auswahl: Auswahl) =>
  auswahl.glaswerte &&
  auswahl.glasausfuehrung &&
  auswahl.fassung &&
  auswahl.formdaten;

interface KarteikarteKopierenDialogProps {
  original: RaRecord;
  onClose: () => void;
}

const KarteikarteKopierenDialog = ({
  original,
  onClose,
}: KarteikarteKopierenDialogProps) => {
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const navigate = useNavigate();

  const [auswahl, setAuswahl] = useState<Auswahl>({
    glaswerte: false,
    glasausfuehrung: false,
    fassung: false,
    formdaten: false,
  });
  const [submitting, setSubmitting] = useState(false);

  const setzeAuswahl = (feld: keyof Auswahl, checked: boolean) =>
    setAuswahl((prev) => ({ ...prev, [feld]: checked }));

  const setzeAlle = (checked: boolean) =>
    setAuswahl({
      glaswerte: checked,
      glasausfuehrung: checked,
      fassung: checked,
      formdaten: checked,
    });

  const handleKopieren = async () => {
    setSubmitting(true);
    try {
      const glasIds = [original.GlasLinks, original.GlasRechts].filter(
        (id) => id !== null && id !== undefined,
      );
      const quellGlaeserById = new Map<unknown, RaRecord>();
      if (auswahl.glaswerte && glasIds.length > 0) {
        const { data } = await dataProvider.getMany("glass", { ids: glasIds });
        data.forEach((glas) => quellGlaeserById.set(glas.id, glas));
      }

      const kopiereGlas = async (glasId: unknown) => {
        const quelle = quellGlaeserById.get(glasId);
        if (!quelle) return undefined;
        const { data } = await dataProvider.create("glass", {
          data: pickGlasFelder(quelle),
        });
        return data.id;
      };

      const neueGlasLinksId =
        auswahl.glaswerte && original.GlasLinks != null
          ? await kopiereGlas(original.GlasLinks)
          : undefined;
      const neueGlasRechtsId =
        auswahl.glaswerte && original.GlasRechts != null
          ? await kopiereGlas(original.GlasRechts)
          : undefined;

      const heute = new Date().toISOString().slice(0, 10);

      const neueBrille: Record<string, unknown> = {
        kunde_id: original.kunde_id,
        Datum: heute,
        Anzahlung: 0,
        KKAnteil: 0,
        Rechnungsnummer: null,
        Zahlungsstatus: "offen",
      };

      if (neueGlasLinksId !== undefined) {
        neueBrille.GlasLinks = neueGlasLinksId;
      }
      if (neueGlasRechtsId !== undefined) {
        neueBrille.GlasRechts = neueGlasRechtsId;
      }
      if (auswahl.glasausfuehrung && original.Glastyp != null) {
        neueBrille.Glastyp = original.Glastyp;
      }
      if (auswahl.fassung && original.Fassung != null) {
        neueBrille.Fassung = original.Fassung;
      }
      if (auswahl.formdaten) {
        neueBrille.BrillenArt = original.BrillenArt;
        neueBrille.Berater = original.Berater;
        neueBrille.Refraktion = original.Refraktion;
        neueBrille.Werkstatt = original.Werkstatt;
        neueBrille.Notizen = original.Notizen;
        neueBrille.RabattBezeichnung = original.RabattBezeichnung;
        neueBrille.RabattProzent = original.RabattProzent;
        neueBrille.ZusatzleistungIDs = original.ZusatzleistungIDs ?? [];
      }

      const { data } = await dataProvider.create("brille", {
        data: neueBrille,
      });

      notify("Neuer Auftrag aus Karteikarte angelegt.", { type: "success" });
      onClose();
      navigate(`/brille/${data.id}`);
    } catch {
      notify("Karteikarte konnte nicht kopiert werden", { type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open
      onClose={submitting ? undefined : onClose}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        Karteikarte kopieren
        <IconButton onClick={onClose} disabled={submitting} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Legt einen neuen Auftrag für denselben Kunden mit neuer Auftragsnummer
          und aktuellem Datum an. Preis- und Zahlungsfelder werden für den neuen
          Auftrag immer zurückgesetzt.
        </Typography>
        <FormGroup>
          <FormControlLabel
            control={
              <Checkbox
                checked={alleAusgewaehlt(auswahl)}
                onChange={(e) => setzeAlle(e.target.checked)}
              />
            }
            label={<strong>Alle Einträge</strong>}
          />
          <Divider sx={{ my: 1 }} />
          <FormControlLabel
            control={
              <Checkbox
                checked={auswahl.glaswerte}
                onChange={(e) => setzeAuswahl("glaswerte", e.target.checked)}
              />
            }
            label="Glaswerte (Sph, Cyl, A, PD, Add, y/h, Pr, B, HSA, Vis, iod)"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={auswahl.glasausfuehrung}
                onChange={(e) =>
                  setzeAuswahl("glasausfuehrung", e.target.checked)
                }
              />
            }
            label="Glasausführung (Glastyp, Hersteller, Vergütung, Farbe)"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={auswahl.fassung}
                onChange={(e) => setzeAuswahl("fassung", e.target.checked)}
              />
            }
            label="Fassung"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={auswahl.formdaten}
                onChange={(e) => setzeAuswahl("formdaten", e.target.checked)}
              />
            }
            label="vorhandene Formdaten kopieren (BrillenArt, Berater, Refraktion, Werkstatt, Notizen, Rabatt, Zusatzleistungen)"
          />
        </FormGroup>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Abbrechen
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button
          variant="contained"
          startIcon={<ContentCopyIcon />}
          disabled={submitting}
          onClick={handleKopieren}
        >
          Karteikarte kopieren
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Button für die Brillenkartei (BrilleShow/BrilleEdit), der den
// "Karteikarte kopieren"-Dialog öffnet.
export const KarteikarteKopierenButton = () => {
  const record = useRecordContext();
  const [open, setOpen] = useState(false);

  if (!record) return null;

  return (
    <>
      <Button startIcon={<ContentCopyIcon />} onClick={() => setOpen(true)}>
        Karteikarte kopieren
      </Button>
      {open && (
        <KarteikarteKopierenDialog
          original={record}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
};
