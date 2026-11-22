import { useCallback, useEffect, useMemo, useState } from "react";
import { useNotify } from "react-admin";
import QRCode from "qrcode";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import { supabase } from "./utils";
import {
  buildExternalMessageUrl,
  choosePhoneNumberForMessaging,
  openExternalMessage,
} from "./messaging";
import { RECHNUNG_ABSENDER } from "./rechnungTemplate";
import { einladungsLink, einladungsText } from "./kundenapp/kundenAppLogik";

/*
 * Einladung zur Kunden-App aus der Karteikarte: erstellt einen persönlichen
 * Link (portal_einladen; eine neue Einladung macht die alte ungültig) und
 * zeigt ihn als QR-Code zum Scannen im Laden sowie zum Verschicken per
 * WhatsApp, SMS oder E-Mail. Der Schlüssel wird nur in diesem Moment
 * angezeigt, gespeichert ist nur sein Hash.
 */

type Status = {
  aktiv: boolean;
  erstellt_am?: string;
  gueltig_bis?: string;
  gesperrt_bis?: string | null;
  angemeldet?: boolean;
  zuletzt_genutzt?: string | null;
};

const datum = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString("de-DE") : "";

const qrSvg = (inhalt: string) => {
  const { modules } = QRCode.create(inhalt, { errorCorrectionLevel: "M" });
  const n = modules.size;
  const rand = 4;
  const pfad: string[] = [];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (modules.get(y, x)) pfad.push(`M${x + rand} ${y + rand}h1v1h-1z`);
    }
  }
  const g = n + 2 * rand;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${g} ${g}" shape-rendering="crispEdges" role="img" aria-label="QR-Code zur Kunden-App"><rect width="${g}" height="${g}" fill="#fff"/><path d="${pfad.join("")}" fill="#000"/></svg>`;
};

export const KundenAppEinladung = ({
  offen,
  onClose,
  kunde,
}: {
  offen: boolean;
  onClose: () => void;
  kunde: Record<string, unknown>;
}) => {
  const notify = useNotify();
  const [status, setStatus] = useState<Status | null>(null);
  const [link, setLink] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");

  const ladeStatus = useCallback(() => {
    supabase
      .rpc("portal_zugang_status", { p_kunde_id: kunde.id })
      .then(({ data, error }) => {
        if (error) return setFehler(error.message);
        setStatus(data as Status);
      });
  }, [kunde.id]);

  useEffect(() => {
    if (!offen) return;
    setLink("");
    setFehler("");
    ladeStatus();
  }, [offen, ladeStatus]);

  const einladen = async () => {
    setLaeuft(true);
    setFehler("");
    const { data, error } = await supabase.rpc("portal_einladen", {
      p_kunde_id: kunde.id,
    });
    setLaeuft(false);
    if (error) return setFehler(error.message);
    setLink(
      einladungsLink(
        window.location.origin,
        (data as { schluessel: string }).schluessel,
      ),
    );
    ladeStatus();
  };

  const sperren = async () => {
    const { error } = await supabase.rpc("portal_widerrufen", {
      p_kunde_id: kunde.id,
    });
    if (error) return setFehler(error.message);
    setLink("");
    notify("Zugang zur Kunden-App gesperrt.", { type: "info" });
    ladeStatus();
  };

  const firma = RECHNUNG_ABSENDER.marke || RECHNUNG_ABSENDER.firma;
  const text = link ? einladungsText(kunde, link, firma) : "";
  const handy = choosePhoneNumberForMessaging([
    kunde.Handy as string,
    kunde.TelefonnummerPrivat as string,
  ]);
  const email = String(kunde.Email ?? "").trim();
  const svg = useMemo(() => (link ? qrSvg(link) : ""), [link]);

  const senden = (kanal: "whatsapp" | "sms" | "email") =>
    openExternalMessage(
      buildExternalMessageUrl(kanal, {
        to: kanal === "email" ? email : handy,
        subject: `Ihre Kunden-App von ${firma}`,
        message: text,
      }),
    );

  const ohneGeburtsdatum = !kunde.Geburtsdatum;

  return (
    <Dialog open={offen} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Kunden-App</DialogTitle>
      <DialogContent dividers>
        <Stack gap={2}>
          <Typography color="text.secondary">
            In der Kunden-App sieht der Kunde seine Termine, den Brillenpass,
            den Stand seiner Aufträge und seine Rechnungen. Er kann dem Laden
            schreiben und seine Einwilligungen selbst ändern. Nachrichten
            erscheinen unter „Online-Anfragen“.
          </Typography>

          {status === null ? (
            <CircularProgress size={22} />
          ) : status.aktiv ? (
            <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center">
              <Chip color="success" label="Eingeladen" size="small" />
              <Typography variant="body2">
                am {datum(status.erstellt_am)}, gültig bis{" "}
                {datum(status.gueltig_bis)}
                {status.angemeldet
                  ? ` · zuletzt genutzt ${datum(status.zuletzt_genutzt)}`
                  : " · noch nicht geöffnet"}
              </Typography>
              {status.gesperrt_bis && (
                <Chip
                  color="warning"
                  size="small"
                  label="nach Fehlversuchen kurz gesperrt"
                />
              )}
            </Stack>
          ) : (
            <Chip
              label="Noch nicht eingeladen"
              size="small"
              sx={{ alignSelf: "flex-start" }}
            />
          )}

          {ohneGeburtsdatum && (
            <Alert severity="warning">
              Bitte zuerst das Geburtsdatum in der Karteikarte eintragen. Der
              Kunde bestätigt damit beim ersten Öffnen, dass er es selbst ist.
            </Alert>
          )}
          {fehler && <Alert severity="error">{fehler}</Alert>}

          {link && (
            <Stack gap={1.5} alignItems="center">
              <Box
                sx={{ width: 220, height: 220 }}
                dangerouslySetInnerHTML={{ __html: svg }}
              />
              <Typography variant="body2" textAlign="center">
                Mit der Handy-Kamera scannen oder verschicken. Der Link ist nur
                jetzt sichtbar; eine neue Einladung macht ihn ungültig.
              </Typography>
              <Stack
                direction="row"
                gap={1}
                flexWrap="wrap"
                justifyContent="center"
              >
                <Button
                  variant="contained"
                  disabled={!handy}
                  onClick={() => senden("whatsapp")}
                  sx={{ bgcolor: "#25D366", "&:hover": { bgcolor: "#1da851" } }}
                >
                  WhatsApp
                </Button>
                <Button
                  variant="contained"
                  disabled={!handy}
                  onClick={() => senden("sms")}
                >
                  SMS
                </Button>
                <Button
                  variant="contained"
                  disabled={!email}
                  onClick={() => senden("email")}
                >
                  E-Mail
                </Button>
                <Button
                  variant="outlined"
                  onClick={() =>
                    navigator.clipboard
                      ?.writeText(link)
                      .then(() => notify("Link kopiert.", { type: "info" }))
                  }
                >
                  Link kopieren
                </Button>
              </Stack>
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ justifyContent: "space-between" }}>
        <Button color="error" disabled={!status?.aktiv} onClick={sperren}>
          Zugang sperren
        </Button>
        <Stack direction="row" gap={1}>
          <Button onClick={onClose}>Schließen</Button>
          <Button
            variant="contained"
            onClick={einladen}
            disabled={laeuft || ohneGeburtsdatum}
          >
            {status?.aktiv ? "Neuen Link erstellen" : "Einladung erstellen"}
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
};
