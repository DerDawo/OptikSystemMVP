// Code-Abfrage vor den Seiten im Menübereich "Abrechnung" (Rechnungen,
// Mahnungen, Firmenrechnung, Abgerechnete Rezepte, OPTICA-Abrechnungen).
// Der Code wird bei JEDEM Öffnen einer dieser Seiten abgefragt: Die
// Freigabe gilt nur, solange die Seite angezeigt wird. Den Code legt der
// Inhaber unter Betriebsdaten fest (AbrechnungCodeFeld); ohne Code sind die
// Seiten offen. Geprüft wird in der Datenbank (abrechnung_code_pruefen),
// der Code selbst kommt nie in den Browser.
import { FormEvent, ReactNode, useEffect, useRef, useState } from "react";
import { Title, useNotify } from "react-admin";
import {
  Alert,
  Box,
  Button,
  Card,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { supabase } from "./utils";
import { useRolle } from "./rolle";

export const AbrechnungSperre = ({
  titel,
  children,
}: {
  titel: string;
  children: ReactNode;
}) => {
  const [status, setStatus] = useState<"laedt" | "gesperrt" | "offen">("laedt");
  const [code, setCode] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);
  const [prueft, setPrueft] = useState(false);

  useEffect(() => {
    let aktiv = true;
    void supabase.rpc("abrechnung_code_gesetzt").then(({ data, error }) => {
      if (!aktiv) return;
      // im Zweifel gesperrt lassen
      setStatus(!error && data === false ? "offen" : "gesperrt");
    });
    return () => {
      aktiv = false;
    };
  }, []);

  const pruefen = async (e: FormEvent) => {
    e.preventDefault();
    if (!code) return;
    setPrueft(true);
    setFehler(null);
    const { data, error } = await supabase.rpc("abrechnung_code_pruefen", {
      p_code: code,
    });
    setPrueft(false);
    setCode("");
    if (error) setFehler(error.message);
    else if (data === true) setStatus("offen");
    else setFehler("Der Code stimmt nicht.");
  };

  if (status === "offen") return <>{children}</>;

  return (
    <Box sx={{ display: "flex", justifyContent: "center", pt: 8, px: 2 }}>
      <Title title={titel} />
      {status === "laedt" ? (
        <CircularProgress />
      ) : (
        <Card sx={{ p: 3, width: "100%", maxWidth: 360 }}>
          <Box
            component="form"
            onSubmit={(e: FormEvent) => void pruefen(e)}
            sx={{ display: "flex", flexDirection: "column", gap: 2 }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <LockOutlinedIcon color="primary" />
              <Typography component="h1" sx={{ fontSize: 18, fontWeight: 700 }}>
                {titel}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Dieser Bereich ist mit einem Code geschützt.
            </Typography>
            <TextField
              autoFocus
              type="password"
              label="Code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              slotProps={{
                htmlInput: {
                  inputMode: "numeric",
                  autoComplete: "off",
                  maxLength: 8,
                },
              }}
            />
            {fehler && <Alert severity="error">{fehler}</Alert>}
            <Button
              type="submit"
              variant="contained"
              disabled={!code || prueft}
            >
              Öffnen
            </Button>
          </Box>
        </Card>
      )}
    </Box>
  );
};

/**
 * Code-Abfrage zum Aufklappen des Menübereichs "Abrechnung". `abfragen()`
 * liefert true, wenn kein Code gesetzt ist oder der richtige Code eingegeben
 * wurde. `dialog` muss irgendwo gerendert werden. Geprüft wird wie bei den
 * Seiten selbst in der Datenbank.
 */
export const useAbrechnungFreigabe = () => {
  const [offen, setOffen] = useState(false);
  const [code, setCode] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);
  const [prueft, setPrueft] = useState(false);
  const antwort = useRef<((ok: boolean) => void) | null>(null);

  const abschliessen = (ok: boolean) => {
    setOffen(false);
    setCode("");
    antwort.current?.(ok);
    antwort.current = null;
  };

  const abfragen = async (): Promise<boolean> => {
    const { data, error } = await supabase.rpc("abrechnung_code_gesetzt");
    // ohne gesetzten Code ist der Bereich offen; im Zweifel nachfragen
    if (!error && data === false) return true;
    return new Promise<boolean>((resolve) => {
      antwort.current = resolve;
      setFehler(null);
      setOffen(true);
    });
  };

  const pruefen = async (e: FormEvent) => {
    e.preventDefault();
    if (!code) return;
    setPrueft(true);
    setFehler(null);
    const { data, error } = await supabase.rpc("abrechnung_code_pruefen", {
      p_code: code,
    });
    setPrueft(false);
    setCode("");
    if (error) setFehler(error.message);
    else if (data === true) abschliessen(true);
    else setFehler("Der Code stimmt nicht.");
  };

  const dialog = (
    <Dialog
      open={offen}
      onClose={() => abschliessen(false)}
      maxWidth="xs"
      fullWidth
    >
      <Box component="form" onSubmit={(e: FormEvent) => void pruefen(e)}>
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <LockOutlinedIcon color="primary" /> Abrechnung
        </DialogTitle>
        <DialogContent
          sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}
        >
          <Typography variant="body2" color="text.secondary">
            Dieser Bereich ist mit einem Code geschützt.
          </Typography>
          <TextField
            autoFocus
            type="password"
            label="Code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            slotProps={{
              htmlInput: {
                inputMode: "numeric",
                autoComplete: "off",
                maxLength: 8,
              },
            }}
          />
          {fehler && <Alert severity="error">{fehler}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => abschliessen(false)}>Abbrechen</Button>
          <Button type="submit" variant="contained" disabled={!code || prueft}>
            Öffnen
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );

  return { abfragen, dialog };
};

/**
 * Betriebsdaten: Code für den Bereich "Abrechnung" festlegen, ändern oder
 * entfernen (nur Inhaber).
 */
export const AbrechnungCodeFeld = () => {
  const rolle = useRolle();
  const notify = useNotify();
  const [gesetzt, setGesetzt] = useState<boolean | null>(null);
  const [code, setCode] = useState("");
  const [wiederholung, setWiederholung] = useState("");
  const [laeuft, setLaeuft] = useState(false);

  const laden = () =>
    void supabase
      .rpc("abrechnung_code_gesetzt")
      .then(({ data }) => setGesetzt(data === true));
  useEffect(laden, []);

  if (rolle && rolle !== "inhaber") {
    return (
      <Typography variant="body2" color="text.secondary">
        Nur der Inhaber kann den Code ändern.
      </Typography>
    );
  }

  const speichern = async (neu: string) => {
    setLaeuft(true);
    const { error } = await supabase.rpc("abrechnung_code_setzen", {
      p_code: neu,
    });
    setLaeuft(false);
    if (error) {
      notify(error.message, { type: "error" });
      return;
    }
    setCode("");
    setWiederholung("");
    notify(neu ? "Code gespeichert." : "Code entfernt, Abrechnung ist offen.", {
      type: "success",
    });
    laden();
  };

  const gueltig = /^\d{4,8}$/.test(code) && code === wiederholung;
  const nurZiffern = (wert: string) => wert.replace(/\D/g, "").slice(0, 8);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      <Typography variant="body2" color="text.secondary">
        Rechnungen, Mahnungen, Firmenrechnung, Abgerechnete Rezepte und
        OPTICA-Abrechnungen fragen bei jedem Öffnen diesen Code ab (4–8
        Ziffern).{" "}
        {gesetzt == null
          ? ""
          : gesetzt
            ? "Ein Code ist festgelegt."
            : "Zurzeit ist kein Code festgelegt, der Bereich ist offen."}
      </Typography>
      <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
        <TextField
          size="small"
          type="password"
          label={gesetzt ? "Neuer Code" : "Code"}
          value={code}
          onChange={(e) => setCode(nurZiffern(e.target.value))}
          slotProps={{
            htmlInput: { inputMode: "numeric", autoComplete: "new-password" },
          }}
        />
        <TextField
          size="small"
          type="password"
          label="Code wiederholen"
          value={wiederholung}
          onChange={(e) => setWiederholung(nurZiffern(e.target.value))}
          error={wiederholung.length > 0 && wiederholung !== code}
          slotProps={{
            htmlInput: { inputMode: "numeric", autoComplete: "new-password" },
          }}
        />
        <Button
          variant="contained"
          disabled={!gueltig || laeuft}
          onClick={() => void speichern(code)}
        >
          Code speichern
        </Button>
        {gesetzt && (
          <Button
            color="error"
            disabled={laeuft}
            onClick={() => {
              if (window.confirm("Code entfernen? Der Bereich ist dann offen."))
                void speichern("");
            }}
          >
            Code entfernen
          </Button>
        )}
      </Box>
    </Box>
  );
};
