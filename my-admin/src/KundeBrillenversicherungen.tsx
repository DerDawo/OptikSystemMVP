import { useCallback, useEffect, useState } from "react";
import { useNotify, useRecordContext } from "react-admin";
import {
  Autocomplete,
  Box,
  Button,
  Card,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import dayjs from "dayjs";
import { supabase } from "./utils";
import { formatCurrency } from "./CurrencyField";
import {
  Brillenversicherung,
  VERSICHERUNG_STATUS,
  VERSICHERUNG_TARIFE,
  VersicherungEntwurf,
  VersicherungStatus,
  entwurfAus,
  leererEntwurf,
  pruefeEntwurf,
  sortiereVersicherungen,
  versichertePersonText,
  versicherungSummen,
  zeileAusEntwurf,
} from "./kundeBrillenversicherung";

/*
 * Bereich "Brillenversicherungen" in der Kundenkartei: die über den Partner
 * vermittelten Verträge dieses Kunden (Kunde = Versicherungsnehmer), getrennt
 * von den Aufträgen. Pro Vertrag Tarif, Vertragsbeginn, Vergütung, Status
 * (Ausstehend, Ausgezahlt, Storniert), Meldedatum und "abgetreten", wie in der
 * Vergütungsübersicht des Partners (Tabelle kunde_brillenversicherung).
 */

const TABELLE = "kunde_brillenversicherung";
const heute = () => dayjs().format("YYYY-MM-DD");
const datum = (w: string | null) => (w ? dayjs(w).format("DD.MM.YYYY") : "");

const statusFarbe: Record<VersicherungStatus, "warning" | "success" | "error"> =
  {
    Ausstehend: "warning",
    Ausgezahlt: "success",
    Storniert: "error",
  };

export const KundeBrillenversicherungen = () => {
  const kunde = useRecordContext();
  const notify = useNotify();
  const kundeId = kunde?.id as number | undefined;
  const [liste, setListe] = useState<Brillenversicherung[] | null>(null);
  const [dialog, setDialog] = useState<{
    id: number | null;
    entwurf: VersicherungEntwurf;
  } | null>(null);
  const [zeigeFehler, setZeigeFehler] = useState(false);
  const [speichert, setSpeichert] = useState(false);
  const [loeschen, setLoeschen] = useState<Brillenversicherung | null>(null);
  const [loescht, setLoescht] = useState(false);

  const laden = useCallback(async () => {
    if (kundeId == null) return;
    const { data, error } = await supabase
      .from(TABELLE)
      .select("*")
      .eq("kunde_id", kundeId);
    if (error) {
      notify("Brillenversicherungen konnten nicht geladen werden.", {
        type: "error",
      });
      setListe([]);
      return;
    }
    setListe(sortiereVersicherungen((data ?? []) as Brillenversicherung[]));
  }, [kundeId, notify]);

  useEffect(() => {
    setListe(null);
    void laden();
  }, [laden]);

  if (kundeId == null) return null;

  const oeffneNeu = () => {
    setZeigeFehler(false);
    setDialog({ id: null, entwurf: leererEntwurf(heute()) });
  };
  const oeffneBearbeiten = (v: Brillenversicherung) => {
    setZeigeFehler(false);
    setDialog({ id: v.id, entwurf: entwurfAus(v) });
  };
  const aendere = <K extends keyof VersicherungEntwurf>(
    feld: K,
    wert: VersicherungEntwurf[K],
  ) =>
    setDialog((d) =>
      d ? { ...d, entwurf: { ...d.entwurf, [feld]: wert } } : d,
    );

  const speichern = async () => {
    if (!dialog) return;
    const fehler = pruefeEntwurf(dialog.entwurf);
    if (Object.keys(fehler).length > 0) {
      setZeigeFehler(true);
      return;
    }
    setSpeichert(true);
    const zeile = zeileAusEntwurf(dialog.entwurf);
    const { error } =
      dialog.id == null
        ? await supabase.from(TABELLE).insert({ ...zeile, kunde_id: kundeId })
        : await supabase.from(TABELLE).update(zeile).eq("id", dialog.id);
    setSpeichert(false);
    if (error) {
      notify("Versicherung konnte nicht gespeichert werden.", {
        type: "error",
      });
      return;
    }
    notify(
      dialog.id == null
        ? "Versicherung angelegt."
        : "Versicherung gespeichert.",
      { type: "success" },
    );
    setDialog(null);
    await laden();
  };

  const endgueltigLoeschen = async () => {
    if (!loeschen) return;
    setLoescht(true);
    const { error } = await supabase
      .from(TABELLE)
      .delete()
      .eq("id", loeschen.id);
    setLoescht(false);
    if (error) {
      notify("Versicherung konnte nicht gelöscht werden.", { type: "error" });
      return;
    }
    notify("Versicherung gelöscht.", { type: "success" });
    setLoeschen(null);
    await laden();
  };

  const summen = liste ? versicherungSummen(liste) : null;
  const fehler = dialog ? pruefeEntwurf(dialog.entwurf) : {};
  const fehlerAn = (feld: keyof typeof fehler) =>
    zeigeFehler ? fehler[feld] : undefined;

  return (
    <Card variant="outlined" sx={{ p: 1.5, width: "100%" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, flex: 1 }}>
          Brillenversicherungen
          {summen && summen.anzahl > 0 ? ` (${summen.anzahl})` : ""}
        </Typography>
        <Button
          size="small"
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={oeffneNeu}
        >
          Neue Versicherung
        </Button>
      </Box>

      {liste === null ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
          <CircularProgress size={22} />
        </Box>
      ) : liste.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
          Noch keine Brillenversicherung. Mit „Neue Versicherung“ einen Vertrag
          mit Tarif, Vertragsbeginn und Vergütung anlegen.
        </Typography>
      ) : (
        <>
          <Box sx={{ overflowX: "auto" }}>
            <Box
              component="table"
              sx={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.9rem",
                "& th": {
                  textAlign: "left",
                  fontWeight: 600,
                  color: "text.secondary",
                  p: "4px 8px",
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  whiteSpace: "nowrap",
                },
                "& td": {
                  p: "4px 8px",
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  verticalAlign: "middle",
                },
              }}
            >
              <thead>
                <tr>
                  <th>Versicherte Person</th>
                  <th>Tarif</th>
                  <th>Beginn</th>
                  <th style={{ textAlign: "right" }}>Vergütung</th>
                  <th>Status</th>
                  <th>Gemeldet</th>
                  <th aria-label="Aktionen" />
                </tr>
              </thead>
              <tbody>
                {liste.map((v) => (
                  <tr key={v.id}>
                    <td>
                      {versichertePersonText(v)}
                      {v.Abgetreten && (
                        <Chip
                          size="small"
                          variant="outlined"
                          label="abgetreten"
                          sx={{ ml: 1 }}
                        />
                      )}
                      {v.Vertragsnummer && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: "block" }}
                        >
                          Nr. {v.Vertragsnummer}
                        </Typography>
                      )}
                    </td>
                    <td>{v.Tarif}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {datum(v.Vertragsbeginn)}
                      {v.Vertragsende ? ` – ${datum(v.Vertragsende)}` : ""}
                    </td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      {formatCurrency(v.Verguetung)}
                    </td>
                    <td>
                      <Chip
                        size="small"
                        color={statusFarbe[v.Status]}
                        label={v.Status}
                      />
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {datum(v.Gemeldet)}
                    </td>
                    <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                      <Tooltip title="Bearbeiten">
                        <IconButton
                          size="small"
                          aria-label="Versicherung bearbeiten"
                          onClick={() => oeffneBearbeiten(v)}
                        >
                          <EditOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Löschen">
                        <IconButton
                          size="small"
                          aria-label="Versicherung löschen"
                          onClick={() => setLoeschen(v)}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Box>
          </Box>
          {summen && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mt: 1 }}
            >
              Vergütung: ausstehend {formatCurrency(summen.ausstehend)} ·
              ausgezahlt {formatCurrency(summen.ausgezahlt)}
              {summen.storniert > 0
                ? ` · storniert (nicht gezählt) ${formatCurrency(summen.storniert)}`
                : ""}
            </Typography>
          )}
        </>
      )}

      <Dialog
        open={dialog != null}
        onClose={() => !speichert && setDialog(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {dialog?.id == null ? "Neue Brillenversicherung" : "Versicherung"}
        </DialogTitle>
        <DialogContent>
          {dialog && (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 1.5,
                pt: 1,
              }}
            >
              <TextField
                label="Versicherte Person"
                size="small"
                value={dialog.entwurf.VersichertePerson}
                onChange={(e) => aendere("VersichertePerson", e.target.value)}
                helperText="Leer lassen, wenn der Kunde selbst versichert ist"
                sx={{ gridColumn: { sm: "1 / -1" } }}
              />
              <Autocomplete
                freeSolo
                options={VERSICHERUNG_TARIFE}
                inputValue={dialog.entwurf.Tarif}
                onInputChange={(_, wert) => aendere("Tarif", wert)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Tarif"
                    size="small"
                    required
                    error={Boolean(fehlerAn("Tarif"))}
                    helperText={fehlerAn("Tarif")}
                  />
                )}
              />
              <TextField
                label="Vertragsnummer"
                size="small"
                value={dialog.entwurf.Vertragsnummer}
                onChange={(e) => aendere("Vertragsnummer", e.target.value)}
              />
              <TextField
                type="date"
                label="Vertragsbeginn"
                size="small"
                value={dialog.entwurf.Vertragsbeginn}
                slotProps={{ inputLabel: { shrink: true } }}
                onChange={(e) => aendere("Vertragsbeginn", e.target.value)}
              />
              <TextField
                type="date"
                label="Vertragsende"
                size="small"
                value={dialog.entwurf.Vertragsende}
                slotProps={{ inputLabel: { shrink: true } }}
                error={Boolean(fehlerAn("Vertragsende"))}
                helperText={fehlerAn("Vertragsende")}
                onChange={(e) => aendere("Vertragsende", e.target.value)}
              />
              <TextField
                label="Vergütung (€)"
                size="small"
                value={dialog.entwurf.Verguetung}
                onChange={(e) => aendere("Verguetung", e.target.value)}
                error={Boolean(fehlerAn("Verguetung"))}
                helperText={fehlerAn("Verguetung")}
                slotProps={{ htmlInput: { inputMode: "decimal" } }}
              />
              <TextField
                select
                label="Status"
                size="small"
                value={dialog.entwurf.Status}
                onChange={(e) =>
                  aendere("Status", e.target.value as VersicherungStatus)
                }
              >
                {VERSICHERUNG_STATUS.map((s) => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                type="date"
                label="Gemeldet am"
                size="small"
                value={dialog.entwurf.Gemeldet}
                slotProps={{ inputLabel: { shrink: true } }}
                onChange={(e) => aendere("Gemeldet", e.target.value)}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={dialog.entwurf.Abgetreten}
                    onChange={(e) => aendere("Abgetreten", e.target.checked)}
                  />
                }
                label="Abgetreten"
              />
              <TextField
                label="Bemerkung"
                size="small"
                multiline
                minRows={2}
                value={dialog.entwurf.Bemerkung}
                onChange={(e) => aendere("Bemerkung", e.target.value)}
                sx={{ gridColumn: { sm: "1 / -1" } }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button disabled={speichert} onClick={() => setDialog(null)}>
            Abbrechen
          </Button>
          <Button
            variant="contained"
            disabled={speichert}
            onClick={() => void speichern()}
            startIcon={speichert ? <CircularProgress size={16} /> : undefined}
          >
            Speichern
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={loeschen != null}
        onClose={() => !loescht && setLoeschen(null)}
      >
        <DialogTitle>Versicherung löschen?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Der Vertrag {loeschen?.Tarif} (
            {loeschen ? versichertePersonText(loeschen) : ""}) wird endgültig
            gelöscht. Wenn er nur nicht mehr gilt, setze lieber den Status auf
            „Storniert“.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button disabled={loescht} onClick={() => setLoeschen(null)}>
            Abbrechen
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={loescht}
            onClick={() => void endgueltigLoeschen()}
          >
            Löschen
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};
