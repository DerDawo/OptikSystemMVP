import { useState } from "react";
import {
  RaRecord,
  useGetOne,
  useNotify,
  useRecordContext,
  useRefresh,
} from "react-admin";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";
import ReceiptIcon from "@mui/icons-material/Receipt";
import PrintIcon from "@mui/icons-material/Print";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import EmailIcon from "@mui/icons-material/Email";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import { supabase } from "./utils";
import {
  RECHNUNG_ABSENDER,
  buildKontaktlinsenRechnungPreviewHtml,
  buildKontaktlinsenRechnungPrintHtml,
} from "./rechnungTemplate";
import { belegAlsPdf, belegVersenden } from "./belegPdf";
import { druckfensterOeffnen } from "./druckfenster";
import { choosePhoneNumberForMessaging } from "./messaging";

/*
 * "Rechnung erstellen" für Kontaktlinsenaufträge: vergibt beim ersten Mal die
 * nächste fortlaufende Rechnungsnummer (gemeinsamer Zähler mit Brillen, RPC
 * `assign_rechnungsnummer_kontaktlinse`) und zeigt die Rechnung im
 * Briefpapier - mit Drucken, PDF, E-Mail und WhatsApp.
 */

export const KontaktlinseRechnungButton = () => {
  const cl = useRecordContext();
  const notify = useNotify();
  const refresh = useRefresh();
  const [offen, setOffen] = useState(false);
  const [vergibt, setVergibt] = useState(false);
  const [rechnung, setRechnung] = useState<RaRecord | null>(null);
  const [versendet, setVersendet] = useState<"email" | "whatsapp" | null>(null);
  const { data: kunde } = useGetOne(
    "kunde",
    { id: cl?.kunde_id },
    { enabled: cl?.kunde_id != null },
  );

  if (!cl) return null;

  const oeffnen = async () => {
    if (cl.Rechnungsnummer) {
      setRechnung(cl);
      setOffen(true);
      return;
    }
    setVergibt(true);
    try {
      const { data, error } = await supabase.rpc(
        "assign_rechnungsnummer_kontaktlinse",
        { p_kontaktlinse_id: cl.id },
      );
      if (error) throw error;
      setRechnung({ ...cl, Rechnungsnummer: data as string });
      notify(`Rechnungsnummer ${data} vergeben.`, { type: "success" });
      refresh();
      setOffen(true);
    } catch {
      notify("Rechnungsnummer konnte nicht vergeben werden.", {
        type: "error",
      });
    } finally {
      setVergibt(false);
    }
  };

  const daten = rechnung
    ? {
        kontaktlinse: rechnung,
        kunde: kunde ?? undefined,
        rechnungsnummer: String(rechnung.Rechnungsnummer ?? ""),
      }
    : null;

  const versenden = async (kanal: "email" | "whatsapp") => {
    if (!daten) return;
    setVersendet(kanal);
    try {
      const nummer = daten.rechnungsnummer;
      const datei = await belegAlsPdf(
        buildKontaktlinsenRechnungPrintHtml(daten),
        `Rechnung-${nummer}.pdf`,
      );
      const nachname = String(kunde?.Nachname ?? "").trim();
      const anrede = String(kunde?.Anrede ?? "").trim();
      const gruss =
        anrede === "Frau" && nachname
          ? `Sehr geehrte Frau ${nachname}`
          : anrede === "Herr" && nachname
            ? `Sehr geehrter Herr ${nachname}`
            : "Guten Tag";
      const ergebnis = await belegVersenden(
        kanal,
        datei,
        {
          an:
            kanal === "email"
              ? String(kunde?.Email ?? "").trim()
              : choosePhoneNumberForMessaging([
                  kunde?.Handy,
                  kunde?.TelefonnummerPrivat,
                ]),
          betreff: `Rechnung ${nummer}`,
          text: `${gruss},\n\nanbei erhalten Sie Ihre Rechnung Nr. ${nummer} als PDF.\n\nMit freundlichen Grüßen\n${RECHNUNG_ABSENDER.firma}`,
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
            ? `PDF „${datei.name}“ im Ordner „Downloads“ gespeichert und Gmail geöffnet – bitte das PDF in die E-Mail ziehen.`
            : `PDF „${datei.name}“ im Ordner „Downloads“ gespeichert und WhatsApp-Chat des Kunden geöffnet – bitte das PDF in den Chat ziehen.`,
          { type: "info", autoHideDuration: 15000 },
        );
      }
    } catch {
      notify("PDF konnte nicht erstellt werden.", { type: "error" });
    } finally {
      setVersendet(null);
    }
  };

  const drucken = (alsPdf: boolean) => {
    if (!daten) return;
    // der Druckdialog druckt oder speichert als PDF
    const ok = druckfensterOeffnen(
      buildKontaktlinsenRechnungPrintHtml(daten),
      true,
    );
    notify(
      ok
        ? alsPdf
          ? "Druckdialog geöffnet – bitte „Als PDF speichern“ als Ziel wählen."
          : "Druckdialog geöffnet."
        : "Fenster konnte nicht geöffnet werden (Pop-up blockiert?).",
      { type: ok ? "success" : "warning" },
    );
  };

  return (
    <>
      <Button
        variant="contained"
        startIcon={<ReceiptIcon />}
        onClick={oeffnen}
        disabled={vergibt}
      >
        Rechnung erstellen
      </Button>
      <Dialog
        open={offen && Boolean(daten)}
        onClose={() => setOffen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Rechnung {daten?.rechnungsnummer}</DialogTitle>
        <DialogContent>
          {daten && (
            <Box
              component="iframe"
              title="Rechnung"
              srcDoc={buildKontaktlinsenRechnungPreviewHtml(daten)}
              sx={{
                width: "100%",
                height: 520,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
              }}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ flexWrap: "wrap", gap: 1 }}>
          <Button
            startIcon={<PictureAsPdfIcon />}
            onClick={() => drucken(true)}
          >
            PDF erstellen
          </Button>
          <Button
            variant="contained"
            startIcon={<PrintIcon />}
            onClick={() => drucken(false)}
          >
            Drucken
          </Button>
          <Button
            startIcon={<EmailIcon />}
            disabled={versendet !== null}
            onClick={() => versenden("email")}
          >
            {versendet === "email" ? "PDF wird erstellt …" : "Per E-Mail"}
          </Button>
          <Button
            startIcon={<WhatsAppIcon />}
            disabled={versendet !== null}
            onClick={() => versenden("whatsapp")}
            sx={{ color: "#1da851" }}
          >
            {versendet === "whatsapp" ? "PDF wird erstellt …" : "Per WhatsApp"}
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button onClick={() => setOffen(false)}>Schließen</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
