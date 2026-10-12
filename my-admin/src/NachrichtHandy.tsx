import { useEffect, useState } from "react";
import { useGetList, useNotify } from "react-admin";
import {
  Avatar,
  Box,
  Chip,
  Dialog,
  IconButton,
  InputBase,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SendIcon from "@mui/icons-material/Send";
import {
  buildExternalMessageUrl,
  normalizePhoneNumberForSms,
  openExternalMessage,
} from "./messaging";
import { renderMessageTemplate } from "./nachrichtenPlatzhalter";

/*
 * Nachricht an einen Kunden im Stil eines Handys: oben Name und Nummer,
 * Vorlagen zum Antippen (Tabelle "nachrichten", Platzhalter werden ersetzt),
 * unten das Eingabefeld mit Senden-Knopf. "Senden" öffnet WhatsApp bzw. die
 * SMS-App mit der fertigen Nachricht an diese Nummer - der Versand selbst
 * geschieht dort (direkter Versand bräuchte die WhatsApp Business API).
 */

export type NachrichtKanal = "whatsapp" | "sms";

const FARBEN: Record<NachrichtKanal, { kopf: string; blase: string }> = {
  whatsapp: { kopf: "#075E54", blase: "#DCF8C6" },
  sms: { kopf: "#1d4e8f", blase: "#D6E6FB" },
};

const text = (wert: unknown) =>
  wert === null || wert === undefined ? "" : String(wert).trim();

export const NachrichtHandy = ({
  offen,
  onClose,
  kanal,
  nummer,
  kunde,
}: {
  offen: boolean;
  onClose: () => void;
  kanal: NachrichtKanal;
  nummer: string;
  kunde: Record<string, unknown> | undefined;
}) => {
  const notify = useNotify();
  const [nachricht, setNachricht] = useState("");
  useEffect(() => {
    if (offen) setNachricht("");
  }, [offen]);

  const { data: vorlagen } = useGetList(
    "nachrichten",
    {
      pagination: { page: 1, perPage: 50 },
      sort: { field: "id", order: "ASC" },
    },
    { enabled: offen },
  );

  const name = [text(kunde?.Vorname), text(kunde?.Nachname)]
    .filter(Boolean)
    .join(" ");
  const empfaenger = {
    id: text(kunde?.id),
    anrede: text(kunde?.Anrede),
    vorname: text(kunde?.Vorname),
    nachname: text(kunde?.Nachname),
    fullName: name,
    email: text(kunde?.Email),
    phoneNumber: nummer,
  };
  const farben = FARBEN[kanal];

  const senden = () => {
    const inhalt = nachricht.trim();
    if (!inhalt) return;
    openExternalMessage(
      buildExternalMessageUrl(kanal, { to: nummer, message: inhalt }),
    );
    notify(
      kanal === "whatsapp"
        ? "WhatsApp geöffnet. Der Text ist auch kopiert – ist das Eingabefeld leer, hineinklicken und Strg+V drücken, dann senden."
        : "SMS-App wurde mit der Nachricht geöffnet.",
      {
        type: "info",
        autoHideDuration: kanal === "whatsapp" ? 15000 : undefined,
      },
    );
    onClose();
  };

  return (
    <Dialog
      open={offen}
      onClose={onClose}
      PaperProps={{
        sx: {
          bgcolor: "transparent",
          boxShadow: "none",
          overflow: "visible",
        },
      }}
    >
      {/* Handy-Rahmen */}
      <Box
        sx={{
          width: 360,
          maxWidth: "92vw",
          height: 640,
          maxHeight: "88vh",
          bgcolor: "#111",
          borderRadius: "40px",
          p: "12px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
        }}
      >
        <Box
          sx={{
            height: "100%",
            borderRadius: "30px",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            bgcolor: kanal === "whatsapp" ? "#ECE5DD" : "#F2F4F7",
          }}
        >
          {/* Kopfzeile mit Kontakt */}
          <Box
            sx={{
              bgcolor: farben.kopf,
              color: "#fff",
              display: "flex",
              alignItems: "center",
              gap: 1.25,
              px: 1.5,
              pt: 2.5,
              pb: 1.25,
            }}
          >
            <Avatar
              sx={{ bgcolor: "rgba(255,255,255,0.25)", width: 38, height: 38 }}
            >
              {(text(kunde?.Vorname)[0] ?? "") +
                (text(kunde?.Nachname)[0] ?? "")}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontWeight: 600, lineHeight: 1.2 }} noWrap>
                {name || "Kunde"}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.85 }} noWrap>
                {kanal === "whatsapp" ? "WhatsApp" : "SMS"} ·{" "}
                {normalizePhoneNumberForSms(nummer)}
              </Typography>
            </Box>
            <IconButton
              onClick={onClose}
              aria-label="Schließen"
              sx={{ color: "#fff" }}
              size="small"
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          {/* Verlauf: Vorschau der Nachricht als Sprechblase */}
          <Box
            sx={{
              flex: 1,
              overflowY: "auto",
              p: 1.5,
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              gap: 1,
            }}
          >
            {nachricht.trim() ? (
              <Box
                sx={{
                  alignSelf: "flex-end",
                  maxWidth: "85%",
                  bgcolor: farben.blase,
                  color: "#111",
                  px: 1.25,
                  py: 0.75,
                  borderRadius: "10px 10px 2px 10px",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  fontSize: "0.9rem",
                  boxShadow: "0 1px 1px rgba(0,0,0,0.12)",
                }}
              >
                {nachricht}
              </Box>
            ) : (
              <Typography
                variant="body2"
                sx={{ textAlign: "center", color: "#667", mb: 1 }}
              >
                Vorlage antippen oder Nachricht unten eintippen.
              </Typography>
            )}
          </Box>

          {/* Vorlagen */}
          {(vorlagen ?? []).length > 0 && (
            <Box
              sx={{
                display: "flex",
                gap: 0.75,
                overflowX: "auto",
                px: 1.25,
                pb: 1,
                flexShrink: 0,
              }}
            >
              {(vorlagen ?? []).map((v) => {
                const titel = text(v.Titel) || text(v.bezeichnung);
                const inhalt = text(v.Text) || text(v.template);
                if (!inhalt) return null;
                return (
                  <Chip
                    key={v.id}
                    label={titel || inhalt.slice(0, 24)}
                    size="small"
                    onClick={() =>
                      setNachricht(renderMessageTemplate(inhalt, empfaenger))
                    }
                    sx={{ bgcolor: "#fff", flexShrink: 0 }}
                  />
                );
              })}
            </Box>
          )}

          {/* Eingabezeile */}
          <Box
            sx={{
              display: "flex",
              alignItems: "flex-end",
              gap: 1,
              px: 1,
              pb: 2,
              flexShrink: 0,
            }}
          >
            <InputBase
              autoFocus
              multiline
              maxRows={6}
              value={nachricht}
              onChange={(e) => setNachricht(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  senden();
                }
              }}
              placeholder="Nachricht"
              inputProps={{ "aria-label": "Nachricht" }}
              sx={{
                flex: 1,
                bgcolor: "#fff",
                color: "#111",
                borderRadius: "22px",
                px: 2,
                py: 1,
                fontSize: "0.95rem",
              }}
            />
            <IconButton
              onClick={senden}
              disabled={!nachricht.trim()}
              aria-label="Senden"
              sx={{
                bgcolor: kanal === "whatsapp" ? "#25D366" : farben.kopf,
                color: "#fff",
                width: 44,
                height: 44,
                "&:hover": {
                  bgcolor: kanal === "whatsapp" ? "#1ebe5b" : "#173f74",
                },
                "&.Mui-disabled": { bgcolor: "#9aa", color: "#fff" },
              }}
            >
              <SendIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </Box>
    </Dialog>
  );
};
