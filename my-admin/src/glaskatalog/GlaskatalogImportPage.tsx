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

/*
 * SF6-Herstellerkataloge (ZIP) hochladen - als eigene Seite und als Fenster
 * auf der Glaskatalog-Liste. Mehrere ZIP-Dateien werden nacheinander
 * importiert.
 */
export const Sf6Import = ({ nachImport }: { nachImport?: () => void }) => {
  const [status, setStatus] = useState<ImportStatus>("idle");
  const [log, setLog] = useState<string[]>([]);
  const [summaries, setSummaries] = useState<Sf6ImportSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const dateien = [...(event.target.files ?? [])];
    event.target.value = "";
    if (dateien.length === 0) return;

    setStatus("running");
    setSummaries([]);
    setError(null);
    setLog([]);

    const fehler: string[] = [];
    for (const file of dateien) {
      setLog((prev) => [...prev, `Lese "${file.name}" ...`]);
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
        setSummaries((prev) => [...prev, result]);
      } catch (err) {
        fehler.push(
          `${file.name}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
    if (fehler.length > 0) {
      setError(fehler.join("\n"));
      setStatus("error");
    } else {
      setStatus("done");
    }
    nachImport?.();
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "1em" }}>
      <Card variant="outlined" sx={{ padding: "1.5em" }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          SF6-Herstellerkatalog importieren
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Lädt SF6-Preislisten (ZIP-Dateien der Glashersteller, z. B.
          „POL-POL--DE-...ZIP“, auch mehrere auf einmal) hoch und befüllt daraus
          den Glaskatalog. Ein erneuter Import mit einer neueren Preisliste
          aktualisiert bestehende Katalogeinträge, ohne bereits erstellte
          Aufträge zu verändern.
        </Typography>
        <Button
          variant="contained"
          component="label"
          startIcon={<UploadFileIcon />}
          disabled={status === "running"}
        >
          SF6-ZIP-Dateien auswählen
          <input
            type="file"
            accept=".zip"
            multiple
            hidden
            onChange={handleFileChange}
          />
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

      {error && (
        <Alert severity="error" sx={{ whiteSpace: "pre-line" }}>
          {error}
        </Alert>
      )}

      {summaries.map((summary) => (
        <Alert severity="success" key={summary.herstellerName}>
          Import von „{summary.herstellerName}“ abgeschlossen:{" "}
          {summary.produkteGesamt} Grundgläser und {summary.optionenGesamt}{" "}
          Optionen importiert/aktualisiert
          {summary.produkteDeaktiviert > 0
            ? `, ${summary.produkteDeaktiviert} nicht mehr gelieferte Grundgläser deaktiviert`
            : ""}
          , {summary.verknuepfungenGesamt} Verfügbarkeits-Verknüpfungen
          aufgebaut. Die Gläser stehen ab sofort im Glasassistenten zur Auswahl.
        </Alert>
      ))}
    </Box>
  );
};

export const GlaskatalogImportPage = () => (
  <Box
    sx={{
      width: "100%",
      maxWidth: 800,
      padding: { xs: "0.5em", md: "1em" },
    }}
  >
    <Title title="Glaskatalog-Import" />
    <Sf6Import />
  </Box>
);
