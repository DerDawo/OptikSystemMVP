import { useCallback, useEffect, useState } from "react";
import logo from "../assets/logo-sehzentrum.jpg";
import {
  Alert,
  AppBar,
  Badge,
  BottomNavigation,
  BottomNavigationAction,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  TextField,
  Toolbar,
  Typography,
} from "@mui/material";
import HomeIcon from "@mui/icons-material/HomeOutlined";
import EventIcon from "@mui/icons-material/EventOutlined";
import VisibilityIcon from "@mui/icons-material/VisibilityOutlined";
import ReceiptIcon from "@mui/icons-material/ReceiptLongOutlined";
import ChatIcon from "@mui/icons-material/ChatBubbleOutline";
import SettingsIcon from "@mui/icons-material/SettingsOutlined";
import {
  AbgemeldetFehler,
  aufrufen,
  fehlerText,
  sitzungLesen,
  sitzungSpeichern,
} from "./api";
import {
  geburtsdatumLesen,
  geburtsdatumTippen,
  schluesselAusHash,
  type PortalDaten,
} from "./kundenAppLogik";
import {
  BrillenpassSeite,
  EinstellungenDialog,
  NachrichtenSeite,
  RechnungenSeite,
  StartSeite,
  TermineSeite,
  type Seite,
} from "./Seiten";

/*
 * Kunden-App (kunde.html): Anmeldung mit Einladungslink + Geburtsdatum,
 * danach fünf Bereiche unten in der Leiste. Alle Daten kommen aus
 * portal_daten; nach jeder Aktion wird neu geladen.
 */

const GELESEN = "unicorn-kunden-app-gelesen";

const firmaVon = (d: PortalDaten | null) =>
  d?.betrieb?.Marke ||
  d?.betrieb?.Firmenname ||
  d?.betrieb?.Name ||
  "Ihr Optiker";

const Anmeldung = ({
  schluessel,
  angemeldet,
}: {
  schluessel: string | null;
  angemeldet: (sitzung: string) => void;
}) => {
  const [eingabe, setEingabe] = useState("");
  const [fehler, setFehler] = useState("");
  const [laeuft, setLaeuft] = useState(false);

  const anmelden = async () => {
    const datum = geburtsdatumLesen(eingabe);
    if (!datum) {
      setFehler("Bitte geben Sie Ihr Geburtsdatum so ein: TT.MM.JJJJ");
      return;
    }
    setLaeuft(true);
    setFehler("");
    try {
      const sitzung = await aufrufen<string | null>("portal_anmelden", {
        p_einladung: schluessel,
        p_geburtsdatum: datum,
      });
      if (!sitzung) {
        setFehler(
          "Das Geburtsdatum stimmt nicht. Bitte prüfen Sie Ihre Eingabe.",
        );
      } else {
        angemeldet(sitzung);
      }
    } catch (e) {
      setFehler(fehlerText(e));
    } finally {
      setLaeuft(false);
    }
  };

  return (
    <Box
      sx={{ minHeight: "100dvh", display: "grid", placeItems: "center", p: 2 }}
    >
      <Paper variant="outlined" sx={{ p: 3, maxWidth: 400, width: "100%" }}>
        <Stack gap={2}>
          <Box
            component="img"
            src={logo}
            alt=""
            sx={{ height: 72, maxWidth: 200, objectFit: "contain", mx: "auto" }}
          />
          <Typography variant="h5" textAlign="center" fontWeight={700}>
            Ihre Kunden-App
          </Typography>
          {schluessel ? (
            <>
              <Typography color="text.secondary" textAlign="center">
                Bitte bestätigen Sie zum Schutz Ihrer Daten Ihr Geburtsdatum.
              </Typography>
              <TextField
                label="Geburtsdatum"
                placeholder="TT.MM.JJJJ"
                value={eingabe}
                onChange={(e) => setEingabe(geburtsdatumTippen(e.target.value))}
                onKeyDown={(e) => e.key === "Enter" && anmelden()}
                inputProps={{ inputMode: "numeric", autoComplete: "bday" }}
                autoFocus
                fullWidth
              />
              {fehler && <Alert severity="error">{fehler}</Alert>}
              <Button
                variant="contained"
                size="large"
                onClick={anmelden}
                disabled={laeuft || !eingabe.trim()}
              >
                {laeuft ? (
                  <CircularProgress size={22} color="inherit" />
                ) : (
                  "Weiter"
                )}
              </Button>
            </>
          ) : (
            <Alert severity="info">
              Bitte öffnen Sie den persönlichen Link aus Ihrer Einladung. Sie
              haben keinen Link? Fragen Sie uns gern im Laden danach.
            </Alert>
          )}
        </Stack>
      </Paper>
    </Box>
  );
};

export const KundenApp = () => {
  const [schluessel] = useState(() => schluesselAusHash(window.location.hash));
  const [sitzung, setSitzung] = useState<string | null>(() => sitzungLesen());
  const [daten, setDaten] = useState<PortalDaten | null>(null);
  const [fehler, setFehler] = useState("");
  const [seite, setSeite] = useState<Seite>("start");
  const [einstellungen, setEinstellungen] = useState(false);
  const [gelesenBis, setGelesenBis] = useState(() => {
    try {
      return window.localStorage.getItem(GELESEN) ?? "";
    } catch {
      return "";
    }
  });

  // Antworten des Ladens gelten als gelesen, sobald die Nachrichten offen sind
  useEffect(() => {
    if (seite !== "nachrichten" || !daten) return;
    const neueste = daten.nachrichten.reduce(
      (m, n) => (n.created_at > m ? n.created_at : m),
      gelesenBis,
    );
    if (neueste === gelesenBis) return;
    setGelesenBis(neueste);
    try {
      window.localStorage.setItem(GELESEN, neueste);
    } catch {
      // ohne Speicher zählt die Plakette beim nächsten Öffnen erneut
    }
  }, [seite, daten, gelesenBis]);

  const abmelden = useCallback(() => {
    sitzungSpeichern(null);
    setSitzung(null);
    setDaten(null);
  }, []);

  const laden = useCallback(async () => {
    if (!sitzung) return;
    try {
      setDaten(
        await aufrufen<PortalDaten>("portal_daten", { p_sitzung: sitzung }),
      );
      setFehler("");
    } catch (e) {
      if (e instanceof AbgemeldetFehler) abmelden();
      else setFehler(fehlerText(e));
    }
  }, [sitzung, abmelden]);

  useEffect(() => {
    laden();
  }, [laden]);

  // beim Zurückkommen in die App aktualisieren (Antworten des Ladens)
  useEffect(() => {
    const sichtbar = () => document.visibilityState === "visible" && laden();
    document.addEventListener("visibilitychange", sichtbar);
    return () => document.removeEventListener("visibilitychange", sichtbar);
  }, [laden]);

  useEffect(() => {
    document.title = daten ? `${firmaVon(daten)} – Kunden-App` : "Kunden-App";
  }, [daten]);

  if (!sitzung) {
    return (
      <Anmeldung
        schluessel={schluessel}
        angemeldet={(s) => {
          sitzungSpeichern(s);
          setSitzung(s);
        }}
      />
    );
  }

  if (!daten) {
    return (
      <Box
        sx={{
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          p: 2,
        }}
      >
        {fehler ? (
          <Stack gap={2} alignItems="center">
            <Alert severity="error">{fehler}</Alert>
            <Button onClick={laden}>Noch einmal versuchen</Button>
          </Stack>
        ) : (
          <CircularProgress />
        )}
      </Box>
    );
  }

  const ungelesen =
    seite === "nachrichten"
      ? 0
      : daten.nachrichten.filter(
          (n) => !n.von_kunde && n.created_at > gelesenBis,
        ).length;
  const aktion = async (name: string, argumente: Record<string, unknown>) => {
    try {
      const ergebnis = await aufrufen(name, {
        p_sitzung: sitzung,
        ...argumente,
      });
      await laden();
      return ergebnis;
    } catch (e) {
      if (e instanceof AbgemeldetFehler) abmelden();
      throw e;
    }
  };

  const props = { daten, aktion, wechseln: setSeite, firma: firmaVon(daten) };

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        bgcolor: "#f4f6fa",
        pb: "calc(72px + env(safe-area-inset-bottom))",
      }}
    >
      <AppBar position="sticky" elevation={0}>
        <Toolbar sx={{ gap: 1 }}>
          <Box
            component="img"
            src={logo}
            alt=""
            sx={{
              height: 32,
              width: 42,
              objectFit: "contain",
              borderRadius: 1,
              bgcolor: "#fff",
              p: "2px",
            }}
          />
          <Typography variant="h6" sx={{ flex: 1, fontSize: "1.05rem" }} noWrap>
            {firmaVon(daten)}
          </Typography>
          <IconButton
            color="inherit"
            aria-label="Einstellungen"
            onClick={() => setEinstellungen(true)}
          >
            <SettingsIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box sx={{ maxWidth: 640, mx: "auto", px: 2, py: 2 }}>
        {fehler && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {fehler}
          </Alert>
        )}
        {seite === "start" && <StartSeite {...props} />}
        {seite === "termine" && <TermineSeite {...props} />}
        {seite === "pass" && <BrillenpassSeite {...props} />}
        {seite === "rechnungen" && <RechnungenSeite {...props} />}
        {seite === "nachrichten" && <NachrichtenSeite {...props} />}
      </Box>

      <Paper
        elevation={8}
        sx={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          pb: "env(safe-area-inset-bottom)",
          zIndex: 10,
        }}
      >
        <BottomNavigation
          showLabels
          value={seite}
          onChange={(_, neu) => {
            setSeite(neu);
            window.scrollTo({ top: 0 });
          }}
          sx={{ "& .MuiBottomNavigationAction-root": { minWidth: 0, px: 0.5 } }}
        >
          <BottomNavigationAction
            value="start"
            label="Start"
            icon={<HomeIcon />}
          />
          <BottomNavigationAction
            value="termine"
            label="Termine"
            icon={<EventIcon />}
          />
          <BottomNavigationAction
            value="pass"
            label="Brillenpass"
            icon={<VisibilityIcon />}
          />
          <BottomNavigationAction
            value="rechnungen"
            label="Rechnungen"
            icon={<ReceiptIcon />}
          />
          <BottomNavigationAction
            value="nachrichten"
            label="Nachrichten"
            icon={
              <Badge color="error" badgeContent={ungelesen} max={9}>
                <ChatIcon />
              </Badge>
            }
          />
        </BottomNavigation>
      </Paper>

      <EinstellungenDialog
        offen={einstellungen}
        schliessen={() => setEinstellungen(false)}
        {...props}
        abmelden={async () => {
          try {
            await aufrufen("portal_abmelden", { p_sitzung: sitzung });
          } catch {
            // trotzdem lokal abmelden
          }
          setEinstellungen(false);
          abmelden();
        }}
      />
    </Box>
  );
};
