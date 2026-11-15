// Einstellungen → Benutzer und Rollen (nur Inhaber): alle Logins mit Rolle.
// Die Rolle wird in `benutzer_rolle` gespeichert; ohne Eintrag gilt ein
// Login als Optiker. "Gesperrt" nimmt einem Login alle Rechte, ohne ihn zu
// löschen. Der Hauptinhaber (inhaber_zugang) ist fest und kann sich nicht
// aussperren.
import { useCallback, useEffect, useState } from "react";
import { Title, useNotify } from "react-admin";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import dayjs from "dayjs";
import { supabase } from "./utils";
import { ROLLEN, rollenName, useRolle } from "./rolle";

type Benutzer = {
  email: string;
  name: string | null;
  rolle: string;
  aktiv: boolean;
  hauptinhaber: boolean;
  hat_login: boolean;
  letzte_anmeldung: string | null;
};

const GESPERRT = "gesperrt";

const Zeile = ({
  b,
  gespeichert,
}: {
  b: Benutzer;
  gespeichert: () => void;
}) => {
  const notify = useNotify();
  const [name, setName] = useState(b.name ?? "");
  const [wahl, setWahl] = useState(b.aktiv ? b.rolle : GESPERRT);
  const [speichert, setSpeichert] = useState(false);
  const geaendert =
    name !== (b.name ?? "") || wahl !== (b.aktiv ? b.rolle : GESPERRT);

  const speichern = async () => {
    setSpeichert(true);
    const gesperrt = wahl === GESPERRT;
    const { error } = await supabase.from("benutzer_rolle").upsert({
      email: b.email,
      name: name.trim() || null,
      rolle: gesperrt ? b.rolle : wahl,
      aktiv: !gesperrt,
      geaendert_am: new Date().toISOString(),
    });
    setSpeichert(false);
    if (error) {
      notify(`Konnte nicht gespeichert werden: ${error.message}`, {
        type: "error",
      });
      return;
    }
    notify("Gespeichert. Gilt ab dem nächsten Laden der Seite.", {
      type: "success",
    });
    gespeichert();
  };

  return (
    <TableRow>
      <TableCell>
        <Typography variant="body2">{b.email}</Typography>
        {!b.hat_login && (
          <Typography variant="caption" color="warning.main">
            noch kein Login angelegt
          </Typography>
        )}
      </TableCell>
      <TableCell>
        <TextField
          size="small"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          disabled={b.hauptinhaber}
        />
      </TableCell>
      <TableCell>
        {b.hauptinhaber ? (
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Inhaber (fest)
          </Typography>
        ) : (
          <TextField
            select
            size="small"
            value={wahl}
            onChange={(e) => setWahl(e.target.value)}
            sx={{ minWidth: 150 }}
          >
            {ROLLEN.map((r) => (
              <MenuItem key={r.id} value={r.id}>
                {r.name}
              </MenuItem>
            ))}
            <MenuItem value={GESPERRT}>Gesperrt</MenuItem>
          </TextField>
        )}
      </TableCell>
      <TableCell>
        {b.letzte_anmeldung
          ? dayjs(b.letzte_anmeldung).format("DD.MM.YYYY HH:mm")
          : "–"}
      </TableCell>
      <TableCell align="right">
        {!b.hauptinhaber && (
          <Button
            size="small"
            variant="contained"
            disabled={!geaendert || speichert}
            onClick={() => void speichern()}
          >
            Speichern
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
};

const NeuerEintrag = ({ gespeichert }: { gespeichert: () => void }) => {
  const notify = useNotify();
  const [email, setEmail] = useState("");
  const [rolle, setRolle] = useState("aushilfe");
  const gueltig = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const anlegen = async () => {
    const { error } = await supabase.from("benutzer_rolle").upsert({
      email: email.trim().toLowerCase(),
      rolle,
      aktiv: true,
      geaendert_am: new Date().toISOString(),
    });
    if (error) {
      notify(`Konnte nicht gespeichert werden: ${error.message}`, {
        type: "error",
      });
      return;
    }
    setEmail("");
    gespeichert();
  };
  return (
    <Box
      sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}
    >
      <TextField
        size="small"
        label="E-Mail eines Logins"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        sx={{ minWidth: 260 }}
      />
      <TextField
        select
        size="small"
        label="Rolle"
        value={rolle}
        onChange={(e) => setRolle(e.target.value)}
        sx={{ minWidth: 150 }}
      >
        {ROLLEN.map((r) => (
          <MenuItem key={r.id} value={r.id}>
            {r.name}
          </MenuItem>
        ))}
      </TextField>
      <Button
        variant="outlined"
        disabled={!gueltig}
        onClick={() => void anlegen()}
      >
        Rolle festlegen
      </Button>
    </Box>
  );
};

export const BenutzerSeite = () => {
  const eigeneRolle = useRolle();
  const [liste, setListe] = useState<Benutzer[] | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);

  const laden = useCallback(() => {
    void supabase.rpc("benutzer_uebersicht").then(({ data, error }) => {
      if (error) setFehler(error.message);
      else setListe((data ?? []) as Benutzer[]);
    });
  }, []);
  useEffect(laden, [laden]);

  return (
    <Card sx={{ mt: 2 }}>
      <Title title="Benutzer und Rollen" />
      <CardContent sx={{ display: "grid", gap: 2 }}>
        <Typography variant="h6">Benutzer und Rollen</Typography>
        {eigeneRolle && eigeneRolle !== "inhaber" ? (
          <Alert severity="info">
            Nur der Inhaber kann Rollen vergeben. Ihre Rolle:{" "}
            {rollenName(eigeneRolle)}.
          </Alert>
        ) : (
          <>
            <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
              {ROLLEN.map((r) => (
                <Typography component="li" variant="body2" key={r.id}>
                  <strong>{r.name}:</strong> {r.text}
                </Typography>
              ))}
              <Typography component="li" variant="body2">
                <strong>Gesperrt:</strong> sieht nichts mehr (z. B. ehemalige
                Mitarbeiter), der Login bleibt erhalten.
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Logins ohne festgelegte Rolle gelten als Optiker. Neue Logins
              legen Sie wie bisher in Supabase an.
            </Typography>
            {fehler && <Alert severity="error">{fehler}</Alert>}
            {!liste && !fehler ? (
              <CircularProgress size={24} />
            ) : (
              liste && (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Login (E-Mail)</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>Rolle</TableCell>
                      <TableCell>Letzte Anmeldung</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {liste.map((b) => (
                      <Zeile
                        key={`${b.email}-${b.rolle}-${b.aktiv}-${b.name}`}
                        b={b}
                        gespeichert={laden}
                      />
                    ))}
                  </TableBody>
                </Table>
              )
            )}
            <NeuerEintrag gespeichert={laden} />
          </>
        )}
      </CardContent>
    </Card>
  );
};
