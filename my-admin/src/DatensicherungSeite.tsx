import { useState } from "react";
import { Title } from "react-admin";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  LinearProgress,
  Typography,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import { supabase } from "./utils";
import {
  erstelleSicherung,
  sicherungDateiname,
  sicherungUmfang,
} from "./datensicherung";

/*
 * Einstellungen → Datensicherung: lädt alle Geschäftsdaten (Kunden,
 * Aufträge, Rechnungen, Rezepte, Termine, Einstellungen …) als eine Datei
 * herunter. Ergänzt die nächtliche verschlüsselte Sicherung.
 */

// seitenweise lesen, nach id sortiert; Tabellen ohne id unsortiert
const lies = async (tabelle: string, von: number, bis: number) => {
  const sortiert = await supabase
    .from(tabelle)
    .select("*")
    .order("id")
    .range(von, bis);
  if (!sortiert.error) return sortiert;
  return supabase.from(tabelle).select("*").range(von, bis);
};

const herunterladen = (inhalt: string, dateiname: string) => {
  const url = URL.createObjectURL(
    new Blob([inhalt], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = dateiname;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const DatensicherungSeite = () => {
  const [laeuft, setLaeuft] = useState(false);
  const [stand, setStand] = useState<{ nr: number; gesamt: number } | null>(
    null,
  );
  const [ergebnis, setErgebnis] = useState<{
    datei: string;
    datensaetze: number;
    fehler: string[];
  } | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);

  const sichern = async () => {
    setLaeuft(true);
    setErgebnis(null);
    setFehler(null);
    try {
      const jetzt = new Date();
      const s = await erstelleSicherung(
        lies,
        (_, nr, gesamt) => setStand({ nr, gesamt }),
        jetzt,
      );
      const datei = sicherungDateiname(jetzt);
      herunterladen(JSON.stringify(s), datei);
      setErgebnis({
        datei,
        datensaetze: sicherungUmfang(s).datensaetze,
        fehler: Object.keys(s.fehler),
      });
    } catch (f) {
      setFehler((f as Error).message);
    }
    setStand(null);
    setLaeuft(false);
  };

  return (
    <Box sx={{ maxWidth: 720, mt: 2 }}>
      <Title title="Datensicherung" />
      <Card variant="outlined">
        <CardContent sx={{ display: "grid", gap: 2 }}>
          <Typography variant="h6">Datensicherung herunterladen</Typography>
          <Typography variant="body2">
            Speichert alle Kunden, Aufträge, Gläser, Rechnungen, Rezepte,
            Termine, Nachrichten und Einstellungen als eine Datei in
            „Downloads“. Bewahre sie sicher auf (z. B. auf einem USB-Stick),
            denn sie enthält Gesundheitsdaten deiner Kunden.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Nicht enthalten sind hochgeladene Dateien (Dokumente, Fundusbilder)
            und der Glaskatalog; die sichert die nächtliche Sicherung mit.
          </Typography>
          <Box>
            <Button
              variant="contained"
              size="large"
              startIcon={<DownloadIcon />}
              disabled={laeuft}
              onClick={() => void sichern()}
            >
              {laeuft ? "Sicherung läuft …" : "Datensicherung herunterladen"}
            </Button>
          </Box>
          {stand && (
            <LinearProgress
              variant="determinate"
              value={(stand.nr / stand.gesamt) * 100}
            />
          )}
          {ergebnis && (
            <Alert severity={ergebnis.fehler.length ? "warning" : "success"}>
              {ergebnis.datensaetze.toLocaleString("de-DE")} Datensätze
              gesichert in „{ergebnis.datei}“.
              {ergebnis.fehler.length > 0 &&
                ` Nicht gesichert: ${ergebnis.fehler.join(", ")}.`}
            </Alert>
          )}
          {fehler && (
            <Alert severity="error">Sicherung fehlgeschlagen: {fehler}</Alert>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};
