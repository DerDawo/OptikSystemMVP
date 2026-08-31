// Glasassistent (#51): mehrstufiger Auswahldialog, der aus der Brillenkartei
// (BrilleEdit) heraus den Herstellerkatalog aus #23 durchsucht (Hersteller ->
// Grundglas -> Beschichtung/Farbe) und die Auswahl als glasstyp-Datensatz
// sowie Betrag der referenzierten glass-Datensätze in den Auftrag übernimmt.
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Radio,
  RadioGroup,
  Step,
  StepLabel,
  Stepper,
  TextField as MuiTextField,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import {
  RaRecord,
  useDataProvider,
  useGetList,
  useGetMany,
  useGetOne,
  useNotify,
  useRecordContext,
} from "react-admin";
import { useFormContext, useWatch } from "react-hook-form";

type Glashersteller = RaRecord & { code: string; name: string };
type Glaskatalog = RaRecord & {
  glashersteller_id: string;
  esd_code: string;
  bezeichnung: string;
  brechungsindex: number | null;
  basispreis: number | null;
  aktiv: boolean;
};
type GlaskatalogOption = RaRecord & {
  glashersteller_id: string;
  code: string;
  bezeichnung: string;
  typ: "beschichtung" | "farbe";
  preis: number | null;
};
type GlaskatalogHatOption = RaRecord & {
  glaskatalog_id: string;
  glaskatalog_option_id: string;
};
type Glastyp = RaRecord & {
  Bezeichnung?: string;
  Hersteller?: string;
  Verguetung?: string;
  Farbe?: string;
  glaskatalog_id?: string | null;
};

type Auge = "links" | "rechts" | "beide";
type Identifier = string | number;

const formatPreis = (value: number | null | undefined) =>
  (value ?? 0).toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + " €";

const STEPS = ["Hersteller", "Grundglas", "Optionen", "Zusammenfassung"];

interface GlasassistentDialogProps {
  onClose: () => void;
  glastypId?: Identifier | null;
  glasLinksId?: Identifier | null;
  glasRechtsId?: Identifier | null;
}

const GlasassistentDialog = ({
  onClose,
  glastypId,
  glasLinksId,
  glasRechtsId,
}: GlasassistentDialogProps) => {
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const { setValue } = useFormContext();

  const [activeStep, setActiveStep] = useState(0);
  const [herstellerId, setHerstellerId] = useState<Identifier | null>(null);
  const [grundglasId, setGrundglasId] = useState<Identifier | null>(null);
  const [beschichtungId, setBeschichtungId] = useState<Identifier | null>(null);
  const [farbeId, setFarbeId] = useState<Identifier | null>(null);
  const [auge, setAuge] = useState<Auge>(
    glasLinksId && glasRechtsId ? "beide" : glasRechtsId ? "rechts" : "links",
  );
  const [herstellerSuche, setHerstellerSuche] = useState("");
  const [grundglasSuche, setGrundglasSuche] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [prefilled, setPrefilled] = useState(false);

  // Bereits gewählten Glastyp laden, um bei erneutem Aufruf des Assistenten
  // (z. B. um die Farbe zu ändern) Hersteller/Grundglas/Optionen vorzubelegen
  // und zu entscheiden, ob der bestehende Datensatz aktualisiert werden kann.
  const { data: bestehenderGlastyp } = useGetOne<Glastyp>(
    "glastyp",
    { id: glastypId as Identifier },
    { enabled: Boolean(glastypId) },
  );
  const { data: bestehendesGrundglas } = useGetOne<Glaskatalog>(
    "glaskatalog",
    { id: bestehenderGlastyp?.glaskatalog_id as string },
    { enabled: Boolean(bestehenderGlastyp?.glaskatalog_id) },
  );

  useEffect(() => {
    if (prefilled || !bestehendesGrundglas) return;
    setHerstellerId(bestehendesGrundglas.glashersteller_id);
    setGrundglasId(bestehendesGrundglas.id);
    setPrefilled(true);
  }, [bestehendesGrundglas, prefilled]);

  const { data: glasLinksRecord } = useGetOne(
    "glass",
    { id: glasLinksId as Identifier },
    { enabled: Boolean(glasLinksId) },
  );
  const { data: glasRechtsRecord } = useGetOne(
    "glass",
    { id: glasRechtsId as Identifier },
    { enabled: Boolean(glasRechtsId) },
  );

  const { data: hersteller } = useGetList<Glashersteller>("glashersteller", {
    pagination: { page: 1, perPage: 200 },
    sort: { field: "name", order: "ASC" },
  });

  const { data: grundglaeser } = useGetList<Glaskatalog>(
    "glaskatalog",
    {
      pagination: { page: 1, perPage: 1000 },
      sort: { field: "bezeichnung", order: "ASC" },
      filter: { glashersteller_id: herstellerId, aktiv: true },
    },
    { enabled: Boolean(herstellerId) },
  );

  const { data: hatOptionen } = useGetList<GlaskatalogHatOption>(
    "glaskatalog_hat_option",
    {
      pagination: { page: 1, perPage: 1000 },
      filter: { glaskatalog_id: grundglasId },
    },
    { enabled: Boolean(grundglasId) },
  );

  const optionIds = useMemo(
    () => (hatOptionen ?? []).map((row) => row.glaskatalog_option_id),
    [hatOptionen],
  );

  const { data: optionen } = useGetMany<GlaskatalogOption>(
    "glaskatalog_option",
    { ids: optionIds },
    { enabled: optionIds.length > 0 },
  );

  const selectedHersteller = useMemo(
    () => hersteller?.find((h) => h.id === herstellerId),
    [hersteller, herstellerId],
  );
  const selectedGrundglas = useMemo(
    () => grundglaeser?.find((g) => g.id === grundglasId),
    [grundglaeser, grundglasId],
  );
  const beschichtungen = useMemo(
    () => (optionen ?? []).filter((o) => o.typ === "beschichtung"),
    [optionen],
  );
  const farben = useMemo(
    () => (optionen ?? []).filter((o) => o.typ === "farbe"),
    [optionen],
  );
  const selectedBeschichtung = useMemo(
    () => beschichtungen.find((o) => o.id === beschichtungId),
    [beschichtungen, beschichtungId],
  );
  const selectedFarbe = useMemo(
    () => farben.find((o) => o.id === farbeId),
    [farben, farbeId],
  );

  // Vorherige Beschichtung/Farbe (Freitext auf glasstyp) den Katalogoptionen
  // zuordnen, sobald diese geladen sind, damit ein erneuter Aufruf des
  // Assistenten die letzte Auswahl vorbelegt.
  useEffect(() => {
    if (!bestehenderGlastyp || beschichtungen.length === 0) return;
    setBeschichtungId((prev) => {
      if (prev !== null) return prev;
      const match = beschichtungen.find(
        (o) => o.bezeichnung === bestehenderGlastyp.Verguetung,
      );
      return match ? match.id : prev;
    });
  }, [bestehenderGlastyp, beschichtungen]);

  useEffect(() => {
    if (!bestehenderGlastyp || farben.length === 0) return;
    setFarbeId((prev) => {
      if (prev !== null) return prev;
      const match = farben.find(
        (o) => o.bezeichnung === bestehenderGlastyp.Farbe,
      );
      return match ? match.id : prev;
    });
  }, [bestehenderGlastyp, farben]);

  const gesamtpreis =
    (selectedGrundglas?.basispreis ?? 0) +
    (selectedBeschichtung?.preis ?? 0) +
    (selectedFarbe?.preis ?? 0);

  const gefilterteHersteller = useMemo(() => {
    const suche = herstellerSuche.trim().toLowerCase();
    if (!suche) return hersteller ?? [];
    return (hersteller ?? []).filter((h) =>
      h.name.toLowerCase().includes(suche),
    );
  }, [hersteller, herstellerSuche]);

  const gefilterteGrundglaeser = useMemo(() => {
    const suche = grundglasSuche.trim().toLowerCase();
    if (!suche) return grundglaeser ?? [];
    return (grundglaeser ?? []).filter(
      (g) =>
        g.bezeichnung.toLowerCase().includes(suche) ||
        g.esd_code.toLowerCase().includes(suche),
    );
  }, [grundglaeser, grundglasSuche]);

  const canNext =
    [Boolean(herstellerId), Boolean(grundglasId), true][activeStep] ?? false;

  const handleApply = async () => {
    if (!selectedGrundglas || !selectedHersteller) return;
    setSubmitting(true);
    try {
      const payload = {
        Bezeichnung: selectedGrundglas.bezeichnung,
        Hersteller: selectedHersteller.name,
        Verguetung: selectedBeschichtung?.bezeichnung ?? "",
        Farbe: selectedFarbe?.bezeichnung ?? "",
        glaskatalog_id: selectedGrundglas.id,
      };

      let resolvedGlastypId: Identifier | undefined = bestehenderGlastyp?.id;
      if (
        resolvedGlastypId &&
        bestehenderGlastyp?.glaskatalog_id === selectedGrundglas.id
      ) {
        await dataProvider.update("glastyp", {
          id: resolvedGlastypId,
          data: payload,
          previousData: bestehenderGlastyp,
        });
      } else {
        const { data } = await dataProvider.create("glastyp", {
          data: payload,
        });
        resolvedGlastypId = data.id;
      }
      setValue("Glastyp", resolvedGlastypId, { shouldDirty: true });

      const applyToEye = async (
        feld: "GlasLinks" | "GlasRechts",
        aktuelleId: Identifier | null | undefined,
        aktuellerRecord: RaRecord | undefined,
      ) => {
        if (aktuelleId) {
          await dataProvider.update("glass", {
            id: aktuelleId,
            data: { Betrag: gesamtpreis },
            previousData: aktuellerRecord ?? { id: aktuelleId },
          });
        } else {
          const { data } = await dataProvider.create("glass", {
            data: { Betrag: gesamtpreis },
          });
          setValue(feld, data.id, { shouldDirty: true });
        }
      };

      if (auge === "links" || auge === "beide") {
        await applyToEye("GlasLinks", glasLinksId, glasLinksRecord);
      }
      if (auge === "rechts" || auge === "beide") {
        await applyToEye("GlasRechts", glasRechtsId, glasRechtsRecord);
      }

      notify(
        "Glasauswahl übernommen. Preis-Felder bei Bedarf manuell nachjustieren und den Auftrag speichern.",
        { type: "success" },
      );
      onClose();
    } catch {
      notify("Glasauswahl konnte nicht übernommen werden", { type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open
      onClose={submitting ? undefined : onClose}
      fullWidth
      maxWidth="md"
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        Glasassistent
        <IconButton onClick={onClose} disabled={submitting} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "2fr 1fr" },
            gap: 2,
          }}
        >
          <Box sx={{ minHeight: 320, minWidth: 0 }}>
            {activeStep === 0 && (
              <>
                <MuiTextField
                  fullWidth
                  size="small"
                  label="Hersteller suchen"
                  value={herstellerSuche}
                  onChange={(e) => setHerstellerSuche(e.target.value)}
                  sx={{ mb: 1 }}
                />
                <List sx={{ maxHeight: 320, overflowY: "auto" }}>
                  {gefilterteHersteller.map((h) => (
                    <ListItemButton
                      key={h.id}
                      selected={h.id === herstellerId}
                      onClick={() => {
                        setHerstellerId(h.id);
                        setGrundglasId(null);
                      }}
                    >
                      <Radio
                        checked={h.id === herstellerId}
                        size="small"
                        sx={{ mr: 1 }}
                      />
                      <ListItemText primary={h.name} secondary={h.code} />
                    </ListItemButton>
                  ))}
                  {gefilterteHersteller.length === 0 && (
                    <Typography color="text.secondary" sx={{ p: 2 }}>
                      Keine Hersteller gefunden.
                    </Typography>
                  )}
                </List>
              </>
            )}

            {activeStep === 1 && (
              <>
                <MuiTextField
                  fullWidth
                  size="small"
                  label="Grundglas suchen (Bezeichnung/ESD-Code)"
                  value={grundglasSuche}
                  onChange={(e) => setGrundglasSuche(e.target.value)}
                  sx={{ mb: 1 }}
                />
                <List sx={{ maxHeight: 320, overflowY: "auto" }}>
                  {gefilterteGrundglaeser.map((g) => (
                    <ListItemButton
                      key={g.id}
                      selected={g.id === grundglasId}
                      onClick={() => {
                        setGrundglasId(g.id);
                        setBeschichtungId(null);
                        setFarbeId(null);
                      }}
                    >
                      <Radio
                        checked={g.id === grundglasId}
                        size="small"
                        sx={{ mr: 1 }}
                      />
                      <ListItemText
                        primary={`${g.bezeichnung} (${g.esd_code})`}
                        secondary={`Index ${g.brechungsindex ?? "–"} · ${formatPreis(g.basispreis)}`}
                      />
                    </ListItemButton>
                  ))}
                  {gefilterteGrundglaeser.length === 0 && (
                    <Typography color="text.secondary" sx={{ p: 2 }}>
                      Keine Grundgläser für diesen Hersteller gefunden.
                    </Typography>
                  )}
                </List>
              </>
            )}

            {activeStep === 2 && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                    Beschichtung / Entspiegelung / Hartschicht
                  </Typography>
                  <List sx={{ maxHeight: 200, overflowY: "auto" }} dense>
                    <ListItemButton
                      selected={beschichtungId === null}
                      onClick={() => setBeschichtungId(null)}
                    >
                      <Radio
                        checked={beschichtungId === null}
                        size="small"
                        sx={{ mr: 1 }}
                      />
                      <ListItemText primary="Keine" />
                    </ListItemButton>
                    {beschichtungen.map((o) => (
                      <ListItemButton
                        key={o.id}
                        selected={o.id === beschichtungId}
                        onClick={() => setBeschichtungId(o.id)}
                      >
                        <Radio
                          checked={o.id === beschichtungId}
                          size="small"
                          sx={{ mr: 1 }}
                        />
                        <ListItemText
                          primary={o.bezeichnung}
                          secondary={formatPreis(o.preis)}
                        />
                      </ListItemButton>
                    ))}
                    {beschichtungen.length === 0 && (
                      <Typography color="text.secondary" sx={{ p: 1 }}>
                        Keine Beschichtungen für dieses Grundglas verfügbar.
                      </Typography>
                    )}
                  </List>
                </Box>
                <Divider />
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                    Farbe / Tönung
                  </Typography>
                  <List sx={{ maxHeight: 200, overflowY: "auto" }} dense>
                    <ListItemButton
                      selected={farbeId === null}
                      onClick={() => setFarbeId(null)}
                    >
                      <Radio
                        checked={farbeId === null}
                        size="small"
                        sx={{ mr: 1 }}
                      />
                      <ListItemText primary="Keine" />
                    </ListItemButton>
                    {farben.map((o) => (
                      <ListItemButton
                        key={o.id}
                        selected={o.id === farbeId}
                        onClick={() => setFarbeId(o.id)}
                      >
                        <Radio
                          checked={o.id === farbeId}
                          size="small"
                          sx={{ mr: 1 }}
                        />
                        <ListItemText
                          primary={o.bezeichnung}
                          secondary={formatPreis(o.preis)}
                        />
                      </ListItemButton>
                    ))}
                    {farben.length === 0 && (
                      <Typography color="text.secondary" sx={{ p: 1 }}>
                        Keine Farben für dieses Grundglas verfügbar.
                      </Typography>
                    )}
                  </List>
                </Box>
              </Box>
            )}

            {activeStep === 3 && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Typography variant="subtitle2">
                  Für welches Auge übernehmen?
                </Typography>
                <RadioGroup
                  row
                  value={auge}
                  onChange={(e) => setAuge(e.target.value as Auge)}
                >
                  <FormControlLabel
                    value="links"
                    control={<Radio />}
                    label="Nur links"
                  />
                  <FormControlLabel
                    value="rechts"
                    control={<Radio />}
                    label="Nur rechts"
                  />
                  <FormControlLabel
                    value="beide"
                    control={<Radio />}
                    label="Beide (gleicher Preis)"
                  />
                </RadioGroup>
                <Alert severity="info">
                  Der berechnete Gesamtpreis wird in das Betrag-Feld des/der
                  gewählten Glas-Datensätze übernommen und bleibt danach manuell
                  nachjustierbar (z. B. bei abweichenden Preisen links/rechts).
                </Alert>
              </Box>
            )}
          </Box>

          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Zusammenfassung
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              <Typography variant="body2">
                <strong>Hersteller:</strong> {selectedHersteller?.name ?? "–"}
              </Typography>
              <Typography variant="body2">
                <strong>Grundglas:</strong>{" "}
                {selectedGrundglas?.bezeichnung ?? "–"}
              </Typography>
              <Typography variant="body2">
                <strong>ESD-Code:</strong> {selectedGrundglas?.esd_code ?? "–"}
              </Typography>
              <Typography variant="body2">
                <strong>Beschichtung:</strong>{" "}
                {selectedBeschichtung?.bezeichnung ?? "keine"}
              </Typography>
              <Typography variant="body2">
                <strong>Farbe:</strong> {selectedFarbe?.bezeichnung ?? "keine"}
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Typography variant="h6">{formatPreis(gesamtpreis)}</Typography>
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Abbrechen
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button
          disabled={activeStep === 0 || submitting}
          onClick={() => setActiveStep((s) => s - 1)}
        >
          Zurück
        </Button>
        {activeStep < STEPS.length - 1 ? (
          <Button
            variant="contained"
            disabled={!canNext}
            onClick={() => setActiveStep((s) => s + 1)}
          >
            Weiter
          </Button>
        ) : (
          <Button
            variant="contained"
            startIcon={<AutoFixHighIcon />}
            disabled={submitting || !selectedGrundglas}
            onClick={handleApply}
          >
            Zurück zu Auftrag
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

// Button für die Brillenkartei (BrilleEdit), der den Glasassistenten öffnet.
// Liest die aktuellen (ggf. noch ungespeicherten) Formularwerte für
// Glastyp/GlasLinks/GlasRechts, damit der Assistent eine bestehende Auswahl
// vorbelegen und die richtigen glass-Datensätze aktualisieren kann.
export const GlasassistentButton = () => {
  const record = useRecordContext();
  const [open, setOpen] = useState(false);
  const glastypId = useWatch({ name: "Glastyp" });
  const glasLinksId = useWatch({ name: "GlasLinks" });
  const glasRechtsId = useWatch({ name: "GlasRechts" });

  if (!record) return null;

  return (
    <>
      <Button
        variant="outlined"
        startIcon={<AutoFixHighIcon />}
        onClick={() => setOpen(true)}
      >
        Glasassistent
      </Button>
      {open && (
        <GlasassistentDialog
          onClose={() => setOpen(false)}
          glastypId={glastypId}
          glasLinksId={glasLinksId}
          glasRechtsId={glasRechtsId}
        />
      )}
    </>
  );
};
