import { useEffect, useState } from "react";
import {
  useGetMany,
  useGetOne,
  useNotify,
  useRecordContext,
} from "react-admin";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Tooltip,
  Typography,
} from "@mui/material";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import EmailIcon from "@mui/icons-material/Email";
import SmsOutlinedIcon from "@mui/icons-material/SmsOutlined";
import DownloadIcon from "@mui/icons-material/Download";
import { belegVersenden, htmlAlsBild } from "./belegPdf";
import {
  BRILLENPASS_BREITE,
  brillenpassHtml,
  brillenpassText,
  type BrillenpassDaten,
} from "./brillenpass";
import {
  buildExternalMessageUrl,
  choosePhoneNumberForMessaging,
  openExternalMessage,
} from "./messaging";

/*
 * Brillenkartei -> Symbol "Brillenpass": Vorschau der Karte im Handyformat
 * und Versand per WhatsApp oder E-Mail (Bild + Werte als Text), per SMS (nur
 * Text) oder als Bild speichern.
 */

// Öffnet den Dialog von außen, z. B. aus "Optionen ▾" der Brillenkartei
export const BRILLENPASS_OEFFNEN = "brillenpass-oeffnen";

type Datensatz = Record<string, unknown> & { id: number | string };

const herunterladen = (datei: File) => {
  const url = URL.createObjectURL(datei);
  const a = document.createElement("a");
  a.href = url;
  a.download = datei.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

export const BrillenpassButton = () => {
  const brille = useRecordContext<Datensatz>();
  const notify = useNotify();
  const [offen, setOffen] = useState(false);
  const [laeuft, setLaeuft] = useState<string | null>(null);
  useEffect(() => {
    const oeffnen = () => setOffen(true);
    window.addEventListener(BRILLENPASS_OEFFNEN, oeffnen);
    return () => window.removeEventListener(BRILLENPASS_OEFFNEN, oeffnen);
  }, []);
  const { data: kunde } = useGetOne<Datensatz>(
    "kunde",
    { id: brille?.kunde_id as number },
    { enabled: offen && brille?.kunde_id != null },
  );
  const glasIds = [brille?.GlasRechts, brille?.GlasLinks].filter(
    (id): id is number => typeof id === "number",
  );
  const { data: glaeser } = useGetMany<Datensatz>(
    "glass",
    { ids: glasIds },
    { enabled: offen && glasIds.length > 0 },
  );
  if (!brille) return null;

  const daten: BrillenpassDaten = {
    brille,
    kunde,
    glasRechts: glaeser?.find((g) => g.id === brille.GlasRechts),
    glasLinks: glaeser?.find((g) => g.id === brille.GlasLinks),
  };
  const html = brillenpassHtml(daten);
  const textNachricht = brillenpassText(daten);
  const dateiname = `Brillenpass-${String(kunde?.Nachname ?? "Kunde").replace(/[^\wäöüÄÖÜß-]+/g, "-")}-${brille.id}.png`;
  const handy = choosePhoneNumberForMessaging([
    kunde?.Handy as string | undefined,
    kunde?.TelefonnummerPrivat as string | undefined,
  ]);
  const email = String(kunde?.Email ?? "").trim();

  const bild = () => htmlAlsBild(html, BRILLENPASS_BREITE, dateiname, ".pass");

  const senden = async (kanal: "whatsapp" | "email") => {
    setLaeuft(kanal);
    try {
      const datei = await bild();
      const ergebnis = await belegVersenden(
        kanal,
        datei,
        {
          an: kanal === "email" ? email : handy,
          betreff: "Ihr Brillenpass",
          text: textNachricht,
        },
        (adresse) =>
          notify(
            `E-Mail-Adresse ${adresse} kopiert – in der E-Mail beim Empfänger einfügen.`,
            { type: "info", autoHideDuration: 15000 },
          ),
      );
      if (ergebnis === "heruntergeladen") {
        notify(
          kanal === "email"
            ? `Bild „${datei.name}“ im Ordner „Downloads“ gespeichert und Gmail geöffnet – bitte das Bild in die E-Mail ziehen.`
            : `Bild „${datei.name}“ im Ordner „Downloads“ gespeichert und WhatsApp-Chat des Kunden geöffnet – bitte das Bild in den Chat ziehen.`,
          { type: "info", autoHideDuration: 15000 },
        );
      }
    } catch {
      notify("Brillenpass konnte nicht erstellt werden.", { type: "error" });
    } finally {
      setLaeuft(null);
    }
  };

  const sms = () => {
    openExternalMessage(
      buildExternalMessageUrl("sms", { to: handy, message: textNachricht }),
    );
  };

  const speichern = async () => {
    setLaeuft("bild");
    try {
      herunterladen(await bild());
    } catch {
      notify("Bild konnte nicht erstellt werden.", { type: "error" });
    } finally {
      setLaeuft(null);
    }
  };

  return (
    <>
      <Tooltip title="Brillenpass ans Handy" placement="left">
        <IconButton
          onClick={() => setOffen(true)}
          aria-label="Brillenpass ans Handy"
          sx={{ color: "inherit" }}
        >
          <BadgeOutlinedIcon />
        </IconButton>
      </Tooltip>
      <Dialog open={offen} onClose={() => setOffen(false)} maxWidth="sm">
        <DialogTitle>Brillenpass ans Handy</DialogTitle>
        <DialogContent>
          <Box
            component="iframe"
            title="Brillenpass"
            srcDoc={html}
            sx={{
              width: BRILLENPASS_BREITE + 4,
              maxWidth: "100%",
              height: 290,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
              display: "block",
              mx: "auto",
            }}
          />
          <Typography
            sx={{
              fontSize: 12.5,
              color: "text.secondary",
              mt: 1,
              maxWidth: 440,
            }}
          >
            Per WhatsApp oder E-Mail geht der Pass als Bild mit den Werten als
            Text; per SMS nur der Text.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ flexWrap: "wrap", gap: 1 }}>
          <Button
            startIcon={<WhatsAppIcon />}
            disabled={laeuft !== null || !handy}
            onClick={() => senden("whatsapp")}
            sx={{ color: "#1da851" }}
          >
            {laeuft === "whatsapp" ? "Wird erstellt …" : "Per WhatsApp"}
          </Button>
          <Button
            startIcon={<EmailIcon />}
            disabled={laeuft !== null || !email}
            onClick={() => senden("email")}
          >
            {laeuft === "email" ? "Wird erstellt …" : "Per E-Mail"}
          </Button>
          <Button
            startIcon={<SmsOutlinedIcon />}
            disabled={laeuft !== null || !handy}
            onClick={sms}
          >
            Per SMS
          </Button>
          <Button
            startIcon={<DownloadIcon />}
            disabled={laeuft !== null}
            onClick={speichern}
          >
            Bild speichern
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button onClick={() => setOffen(false)}>Schließen</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
