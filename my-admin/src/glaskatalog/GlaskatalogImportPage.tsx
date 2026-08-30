import { ChangeEvent, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Typography,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { Title } from "react-admin";
import { supabase } from "../utils";
import { readSf6Zip } from "./sf6Zip";
import { parseSf6Katalog } from "./sf6Format";
import { importSf6Katalog, Sf6ImportSummary } from "./sf6Import";

type ImportStatus = "idle" | "running" | "done" | "error";

export const GlaskatalogImportPage = () => {
  const [status, setStatus] = useState<ImportStatus>("idle");
  const [log, setLog] = useState<string[]>([]);
  const [summary, setSummary] = useState<Sf6ImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setStatus("running");
    setSummary(null);
    setError(null);
    setLog([`Lese "${file.name}" ...`]);

    try {
      const files = await readSf6Zip(file);
      setLog((prev) => [...prev, "Parse SF6-Dateien ..."]);
      const katalog = parseSf6Katalog(files);
      setLog((prev) => [
        ...prev,
        `Hersteller: ${katalog.hersteller.name} (${katalog.hersteller.code})`,
        `${katalog.produkte.length} Grundgläser, ${katalog.optionen.length} Optionen gefunden.`,
      ]);

      const result = await importSf6Katalog(supabase, katalog, (message) => {
        setLog((prev) => [...prev, message]);
      });

      setSummary(result);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus("error");
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: "1em",
        width: "100%",
        maxWidth: 800,
        padding: { xs: "0.5em", md: "1em" },
      }}
    >
      <Title title="Glaskatalog-Import" />
      <Card variant="outlined" sx={{ padding: "1.5em" }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          SF6-Herstellerkatalog importieren
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Lädt eine SF6-Preisliste (ZIP-Datei eines Glasherstellers, z. B.
          „POL-POL--DE-...ZIP“) hoch und befüllt daraus den Glaskatalog. Ein
          erneuter Import mit einer neueren Preisliste aktualisiert bestehende
          Katalogeinträge, ohne bereits erstellte Aufträge zu verändern.
        </Typography>
        <Button
          variant="contained"
          component="label"
          startIcon={<UploadFileIcon />}
          disabled={status === "running"}
        >
          SF6-ZIP auswählen
          <input type="file" accept=".zip" hidden onChange={handleFileChange} />
        </Button>
      </Card>

      {status === "running" && <LinearProgress />}

      {log.length > 0 && (
        <Card variant="outlined" sx={{ padding: "1em" }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Ablauf
          </Typography>
          <List dense>
            {log.map((entry, index) => (
              <ListItem key={index} disableGutters>
                <ListItemText primary={entry} />
              </ListItem>
            ))}
          </List>
        </Card>
      )}

      {error && <Alert severity="error">{error}</Alert>}

      {summary && (
        <Alert severity="success">
          Import von „{summary.herstellerName}“ abgeschlossen:{" "}
          {summary.produkteGesamt} Grundgläser und {summary.optionenGesamt}{" "}
          Optionen importiert/aktualisiert
          {summary.produkteDeaktiviert > 0
            ? `, ${summary.produkteDeaktiviert} nicht mehr gelieferte Grundgläser deaktiviert`
            : ""}
          , {summary.verknuepfungenGesamt} Verfügbarkeits-Verknüpfungen
          aufgebaut. Die Gläser stehen ab sofort unter „Glastyp“ zur Auswahl.
        </Alert>
      )}
    </Box>
  );
};
