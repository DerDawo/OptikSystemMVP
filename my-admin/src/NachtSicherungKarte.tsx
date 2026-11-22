import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Typography,
} from "@mui/material";
import BackupIcon from "@mui/icons-material/Backup";
import { supabase } from "./utils";
import { sicherungsAnzeige, type SicherungsStand } from "./nachtSicherung";

/*
 * Karte „Nächtliche Sicherung“: zeigt, wann die automatische verschlüsselte
 * Sicherung zuletzt gelaufen ist, und startet sie auf Knopfdruck sofort.
 * Spricht die Edge Function `datensicherung-starten` an (nur Inhaber).
 */

const FUNCTION = "datensicherung-starten";

// functions.invoke meldet bei Fehlern nur einen Statuscode; die
// verständliche Meldung steht im Body ({ error: "…" }).
const fehlerText = async (error: { message: string; context?: unknown }) => {
  if (error.context instanceof Response) {
    try {
      const body = (await error.context.clone().json()) as { error?: unknown };
      if (typeof body.error === "string" && body.error) return body.error;
    } catch {
      // kein JSON
    }
  }
  return "Der Sicherungs-Dienst ist gerade nicht erreichbar.";
};

export const NachtSicherungKarte = () => {
  const [stand, setStand] = useState<SicherungsStand | null>(null);
  const [laden, setLaden] = useState(true);
  const [startet, setStartet] = useState(false);
  const [meldung, setMeldung] = useState<string | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);

  const ladeStand = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke<SicherungsStand>(
      FUNCTION,
      { method: "GET" },
    );
    if (error) {
      setFehler(await fehlerText(error));
    } else if (data) {
      setFehler(null);
      setStand(data);
    }
    setLaden(false);
  }, []);

  useEffect(() => {
    void ladeStand();
  }, [ladeStand]);

  const anzeige = stand ? sicherungsAnzeige(stand, new Date()) : null;

  // Solange eine Sicherung läuft, alle 20 Sekunden nachsehen
  useEffect(() => {
    if (!anzeige?.laeuft) return;
    const t = setInterval(() => void ladeStand(), 20_000);
    return () => clearInterval(t);
  }, [anzeige?.laeuft, ladeStand]);

  const starten = async () => {
    setStartet(true);
    setMeldung(null);
    setFehler(null);
    const { data, error } = await supabase.functions.invoke<{
      gestartet: boolean;
      meldung: string;
    }>(FUNCTION, { method: "POST", body: {} });
    if (error) {
      setFehler(await fehlerText(error));
    } else if (data) {
      setMeldung(data.meldung);
      // GitHub braucht ein paar Sekunden, bis der neue Lauf sichtbar ist
      setTimeout(() => void ladeStand(), 5_000);
    }
    setStartet(false);
  };

  return (
    <Card variant="outlined">
      <CardContent sx={{ display: "grid", gap: 2 }}>
        <Typography variant="h6">Nächtliche Sicherung</Typography>
        <Typography variant="body2">
          Jede Nacht wird automatisch die komplette Datenbank mit allen
          Dokumenten verschlüsselt gesichert und 7 Tage aufbewahrt. Mit der
          Taste startest du eine Sicherung sofort, z. B. vor größeren
          Änderungen.
        </Typography>
        {laden && <CircularProgress size={24} />}
        {anzeige && (
          <Alert severity={anzeige.ampel} data-testid="sicherung-status">
            {anzeige.text}
          </Alert>
        )}
        <Box>
          <Button
            variant="contained"
            size="large"
            startIcon={<BackupIcon />}
            disabled={startet || laden || !!anzeige?.laeuft}
            onClick={() => void starten()}
          >
            {anzeige?.laeuft
              ? "Sicherung läuft …"
              : startet
                ? "Wird gestartet …"
                : "Sicherung jetzt starten"}
          </Button>
        </Box>
        {meldung && <Alert severity="info">{meldung}</Alert>}
        {fehler && <Alert severity="error">{fehler}</Alert>}
      </CardContent>
    </Card>
  );
};
