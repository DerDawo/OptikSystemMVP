// Formulare-Dialog (#58): aus der Brillenkartei (BrilleShow/BrilleEdit)
// aufrufbarer Dialog, der verfügbare Dokumentvorlagen (gruppiert nach
// Kategorie) auflistet, die Auswahl mit den Daten des aktuellen
// Auftrags/Kunden befüllt und Seitenansicht/PDF/Druck anbietet.
//
// Bewusst generisch gehalten: #56 (Rechnungen) und #57 (Mahnungen) sollen
// hierauf aufsetzen, indem sie lediglich weitere `dokumentvorlage`-Datensätze
// mit Kategorie "Rechnung"/"Mahnung" anlegen - an dieser Dialog-/Render-Logik
// muss dafür nichts geändert werden.
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List as MuiList,
  ListItemButton,
  ListItemText,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DescriptionIcon from "@mui/icons-material/Description";
import ReceiptIcon from "@mui/icons-material/Receipt";
import VisibilityIcon from "@mui/icons-material/Visibility";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import PrintIcon from "@mui/icons-material/Print";
import EditNoteIcon from "@mui/icons-material/EditNote";
import {
  RaRecord,
  useGetList,
  useGetMany,
  useGetOne,
  useNotify,
  useRecordContext,
  useRefresh,
} from "react-admin";
import { supabase } from "./utils";
import {
  buildDocumentMergeValues,
  renderDocumentTemplate,
} from "./documentTemplateEngine";

// Kategorie, unter der die Rechnungsvorlage(n) in `dokumentvorlage` angelegt
// werden (siehe DOKUMENTVORLAGE_KATEGORIEN in dokumentvorlage.tsx und die
// Seed-Migration 20260831020100_seed_dokumentvorlage_rechnung.sql).
const RECHNUNG_KATEGORIE = "Rechnung";

type Dokumentvorlage = RaRecord & {
  Name: string;
  Kategorie: string;
  Vorlagentext: string;
  Aktiv: boolean;
};

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const buildPrintHtml = (title: string, body: string) => `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; padding: 2.5cm 2cm; color: #111; }
  h1 { font-size: 1.1rem; margin: 0 0 1.5em; }
  pre { font-family: inherit; font-size: 0.95rem; line-height: 1.6; white-space: pre-wrap; word-break: break-word; margin: 0; }
  @page { margin: 2cm; }
</style>
</head>
<body>
<h1>${escapeHtml(title)}</h1>
<pre>${escapeHtml(body)}</pre>
</body>
</html>`;

// Leichte, im Browser lauffähige "PDF"-Lösung ohne zusätzliche Bibliothek:
// ein separates Fenster mit druckoptimiertem CSS, dessen Druckdialog der
// Nutzer entweder an einen Drucker schickt oder als PDF speichert.
const openDocumentWindow = (
  title: string,
  body: string,
  autoPrint: boolean,
): boolean => {
  const documentWindow = window.open("", "_blank", "width=850,height=1100");
  if (!documentWindow) {
    return false;
  }
  documentWindow.document.open();
  documentWindow.document.write(buildPrintHtml(title, body));
  documentWindow.document.close();
  documentWindow.focus();
  if (autoPrint) {
    documentWindow.print();
  }
  return true;
};

interface FormulareDialogProps {
  brille: RaRecord;
  onClose: () => void;
  // Beschränkt die Vorlagenauswahl auf eine Kategorie und wählt sie bei
  // genau einem Treffer automatisch aus (Rechnung erstellen, #56).
  initialKategorie?: string;
}

const FormulareDialog = ({
  brille,
  onClose,
  initialKategorie,
}: FormulareDialogProps) => {
  const notify = useNotify();
  const [selectedVorlage, setSelectedVorlage] =
    useState<Dokumentvorlage | null>(null);

  const { data: vorlagen, isPending: vorlagenLoading } =
    useGetList<Dokumentvorlage>("dokumentvorlage", {
      pagination: { page: 1, perPage: 200 },
      sort: { field: "Kategorie", order: "ASC" },
      filter: { Aktiv: true },
    });

  useEffect(() => {
    if (!initialKategorie || vorlagenLoading || selectedVorlage) {
      return;
    }
    const treffer = (vorlagen ?? []).filter(
      (vorlage) => vorlage.Kategorie === initialKategorie,
    );
    if (treffer.length === 1) {
      setSelectedVorlage(treffer[0]);
    }
  }, [initialKategorie, vorlagenLoading, vorlagen, selectedVorlage]);

  const zusatzleistungIds: number[] = (brille.ZusatzleistungIDs ?? []).filter(
    (id: number | null | undefined) => id !== null && id !== undefined,
  );
  const { data: zusatzleistungen } = useGetMany(
    "zusatzleistung",
    { ids: zusatzleistungIds },
    { enabled: zusatzleistungIds.length > 0 },
  );

  const { data: kunde } = useGetOne(
    "kunde",
    { id: brille.kunde_id },
    { enabled: Boolean(brille.kunde_id) },
  );
  const { data: glasLinks } = useGetOne(
    "glass",
    { id: brille.GlasLinks },
    { enabled: Boolean(brille.GlasLinks) },
  );
  const { data: glasRechts } = useGetOne(
    "glass",
    { id: brille.GlasRechts },
    { enabled: Boolean(brille.GlasRechts) },
  );
  const { data: fassung } = useGetOne(
    "fassung",
    { id: brille.Fassung },
    { enabled: Boolean(brille.Fassung) },
  );
  const { data: glastyp } = useGetOne(
    "glastyp",
    { id: brille.Glastyp },
    { enabled: Boolean(brille.Glastyp) },
  );

  const mergeValues = useMemo(
    () =>
      buildDocumentMergeValues({
        kunde,
        brille,
        glasLinks,
        glasRechts,
        fassung,
        glastyp,
        zusatzleistungen,
      }),
    [kunde, brille, glasLinks, glasRechts, fassung, glastyp, zusatzleistungen],
  );

  const renderedText = selectedVorlage
    ? renderDocumentTemplate(selectedVorlage.Vorlagentext ?? "", mergeValues)
    : "";

  const groupedVorlagen = useMemo(() => {
    const map = new Map<string, Dokumentvorlage[]>();
    (vorlagen ?? [])
      .filter(
        (vorlage) =>
          !initialKategorie || vorlage.Kategorie === initialKategorie,
      )
      .forEach((vorlage) => {
        const list = map.get(vorlage.Kategorie) ?? [];
        list.push(vorlage);
        map.set(vorlage.Kategorie, list);
      });
    return Array.from(map.entries());
  }, [vorlagen, initialKategorie]);

  const handleAction = (
    autoPrint: boolean,
    successMessage: string,
    blockedMessage: string,
  ) => {
    if (!selectedVorlage) {
      return;
    }
    const opened = openDocumentWindow(
      selectedVorlage.Name,
      renderedText,
      autoPrint,
    );
    notify(opened ? successMessage : blockedMessage, {
      type: opened ? "success" : "warning",
    });
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {initialKategorie ? `${initialKategorie} erstellen` : "Formulare"}
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {!selectedVorlage ? (
          <>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Vorlage auswählen, um sie mit den Daten dieses Auftrags und Kunden
              zu befüllen.
            </Typography>
            {vorlagenLoading && (
              <Typography color="text.secondary">Lade Vorlagen…</Typography>
            )}
            {!vorlagenLoading && groupedVorlagen.length === 0 && (
              <Alert severity="info">
                {initialKategorie
                  ? `Keine aktive Dokumentvorlage der Kategorie „${initialKategorie}“ vorhanden. Vorlagen können unter „Dokumentvorlagen“ angelegt werden.`
                  : "Keine aktiven Dokumentvorlagen vorhanden. Vorlagen können unter „Dokumentvorlagen“ angelegt werden."}
              </Alert>
            )}
            {groupedVorlagen.map(([kategorie, list]) => (
              <Box key={kategorie} sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  {kategorie}
                </Typography>
                <MuiList
                  dense
                  sx={{
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 1,
                  }}
                >
                  {list.map((vorlage) => (
                    <ListItemButton
                      key={vorlage.id}
                      onClick={() => setSelectedVorlage(vorlage)}
                    >
                      <ListItemText primary={vorlage.Name} />
                    </ListItemButton>
                  ))}
                </MuiList>
              </Box>
            ))}
          </>
        ) : (
          <>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => setSelectedVorlage(null)}
              sx={{ mb: 2 }}
            >
              Zurück zur Auswahl
            </Button>
            <Box
              sx={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 1,
                mb: 1,
              }}
            >
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {selectedVorlage.Name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedVorlage.Kategorie}
                </Typography>
              </Box>
              <Button
                size="small"
                startIcon={<EditNoteIcon />}
                component={Link}
                to={`/dokumentvorlage/${selectedVorlage.id}`}
                target="_blank"
              >
                Text ändern
              </Button>
            </Box>
            <Box
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
                p: 2,
                maxHeight: 420,
                overflowY: "auto",
                whiteSpace: "pre-wrap",
                overflowWrap: "break-word",
                fontFamily: "inherit",
              }}
            >
              {renderedText || "(Vorlage ist leer)"}
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ flexWrap: "wrap", gap: 1 }}>
        {selectedVorlage && (
          <>
            <Button
              startIcon={<VisibilityIcon />}
              onClick={() =>
                handleAction(
                  false,
                  "Seitenansicht geöffnet.",
                  "Seitenansicht konnte nicht geöffnet werden (Pop-up blockiert?).",
                )
              }
            >
              Seitenansicht
            </Button>
            <Button
              startIcon={<PictureAsPdfIcon />}
              onClick={() =>
                handleAction(
                  true,
                  "Druckdialog geöffnet – bitte „Als PDF speichern“ als Ziel wählen.",
                  "PDF konnte nicht erstellt werden (Pop-up blockiert?).",
                )
              }
            >
              PDF erstellen
            </Button>
            <Button
              variant="contained"
              startIcon={<PrintIcon />}
              onClick={() =>
                handleAction(
                  true,
                  "Druckdialog geöffnet.",
                  "Dokument konnte nicht gedruckt werden (Pop-up blockiert?).",
                )
              }
            >
              Drucken
            </Button>
          </>
        )}
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose}>Schließen</Button>
      </DialogActions>
    </Dialog>
  );
};

// Button für die Brillenkartei (BrilleShow/BrilleEdit), der den
// Formulare-Dialog für den aktuellen Auftrag öffnet.
export const FormulareButton = () => {
  const record = useRecordContext();
  const [open, setOpen] = useState(false);

  if (!record) {
    return null;
  }

  return (
    <>
      <Button
        variant="outlined"
        startIcon={<DescriptionIcon />}
        onClick={() => setOpen(true)}
      >
        Formulare
      </Button>
      {open && (
        <FormulareDialog brille={record} onClose={() => setOpen(false)} />
      )}
    </>
  );
};

// "Rechnung erstellen"-Button für die Brillenkartei (#56): vergibt bei Bedarf
// zuerst die fortlaufende Rechnungsnummer (RPC `assign_rechnungsnummer`,
// siehe Migration 20260831020000_rechnungsnummer_vergabe.sql) und öffnet
// anschließend den Formulare-Dialog, auf die Kategorie "Rechnung" gefiltert.
export const RechnungErstellenButton = () => {
  const record = useRecordContext();
  const notify = useNotify();
  const refresh = useRefresh();
  const [open, setOpen] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [rechnungsBrille, setRechnungsBrille] = useState<RaRecord | null>(null);

  if (!record) {
    return null;
  }

  const handleClick = async () => {
    if (record.Rechnungsnummer) {
      setRechnungsBrille(record);
      setOpen(true);
      return;
    }
    setAssigning(true);
    try {
      const { data, error } = await supabase.rpc("assign_rechnungsnummer", {
        p_brille_id: record.id,
      });
      if (error) {
        throw error;
      }
      setRechnungsBrille({ ...record, Rechnungsnummer: data as string });
      notify(`Rechnungsnummer ${data} vergeben.`, { type: "success" });
      refresh();
      setOpen(true);
    } catch {
      notify("Rechnungsnummer konnte nicht vergeben werden.", {
        type: "error",
      });
    } finally {
      setAssigning(false);
    }
  };

  return (
    <>
      <Button
        variant="contained"
        startIcon={<ReceiptIcon />}
        onClick={handleClick}
        disabled={assigning}
      >
        Rechnung erstellen
      </Button>
      {open && rechnungsBrille && (
        <FormulareDialog
          brille={rechnungsBrille}
          initialKategorie={RECHNUNG_KATEGORIE}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
};
