import { useState } from "react";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import SyncIcon from "@mui/icons-material/Sync";
import { useGetOne, useNotify, useRefresh } from "react-admin";
import { supabase } from "./utils";

type Ergebnis = {
  neu?: number;
  geaendert?: number;
  geloescht?: number;
  ohneKunde?: number;
  uebersprungen?: boolean;
  fehler?: string;
};

const zeitText = (wert?: string | null) =>
  wert
    ? new Date(wert).toLocaleString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

// Knopf "Mit Google abgleichen" (Edge Function google-kalender) samt Stand
// des letzten Abgleichs. Der Abgleich läuft zusätzlich alle 15 Minuten.
export const GoogleAbgleichButton = ({
  onFertig,
}: {
  onFertig?: () => void;
}) => {
  const notify = useNotify();
  const refresh = useRefresh();
  const [laeuft, setLaeuft] = useState(false);
  const { data: stand, refetch } = useGetOne(
    "kalender_abgleich",
    { id: 1 },
    { retry: false },
  );

  const abgleichen = async () => {
    setLaeuft(true);
    try {
      const { data, error } =
        await supabase.functions.invoke<Ergebnis>("google-kalender");
      if (error) throw error;
      if (data?.fehler) throw new Error(data.fehler);
      notify(
        data?.uebersprungen
          ? "Gerade erst abgeglichen – die Termine sind aktuell."
          : `Google-Kalender abgeglichen: ${data?.neu ?? 0} neu, ${data?.geaendert ?? 0} aktualisiert, ${data?.geloescht ?? 0} entfernt${data?.ohneKunde ? `, ${data.ohneKunde} ohne Kunde` : ""}.`,
        { type: "success" },
      );
      refresh();
      refetch();
      onFertig?.();
    } catch (error) {
      notify(
        `Abgleich mit Google nicht möglich: ${error instanceof Error ? error.message : String(error)}`,
        { type: "warning" },
      );
    } finally {
      setLaeuft(false);
    }
  };

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      {stand?.zuletzt && (
        <Typography
          variant="caption"
          color={stand.fehler ? "error" : "text.secondary"}
        >
          {stand.fehler
            ? `Letzter Abgleich fehlgeschlagen (${zeitText(stand.zuletzt)})`
            : `Abgleich ${zeitText(stand.zuletzt)}`}
        </Typography>
      )}
      <Button
        size="small"
        startIcon={
          laeuft ? (
            <CircularProgress size={14} />
          ) : (
            <SyncIcon fontSize="small" />
          )
        }
        onClick={abgleichen}
        disabled={laeuft}
      >
        Mit Google abgleichen
      </Button>
    </Box>
  );
};
