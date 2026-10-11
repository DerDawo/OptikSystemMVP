import { useState } from "react";
import { Box, IconButton, Tooltip } from "@mui/material";
import { TextField, useRecordContext } from "react-admin";
import PhoneIcon from "@mui/icons-material/Phone";
import SmsIcon from "@mui/icons-material/Sms";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import EmailIcon from "@mui/icons-material/Email";
import { KontaktAktion, kontaktAktionen } from "./kontaktLinks";
import { NachrichtHandy, NachrichtKanal } from "./NachrichtHandy";

const SYMBOLE: Record<KontaktAktion["art"], typeof PhoneIcon> = {
  anrufen: PhoneIcon,
  sms: SmsIcon,
  whatsapp: WhatsAppIcon,
  email: EmailIcon,
};

// Kontaktfeld der Kundenseite mit Knöpfen zur direkten Kontaktaufnahme
// hinter dem Wert (kontaktLinks.ts). WhatsApp und SMS öffnen das
// Handy-Fenster zum Schreiben der Nachricht (NachrichtHandy).
export const KontaktFeld = ({ source }: { source: string }) => {
  const record = useRecordContext();
  const [kanal, setKanal] = useState<NachrichtKanal | null>(null);
  const aktionen = kontaktAktionen(record?.[source]);
  return (
    <Box
      sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap" }}
    >
      <TextField source={source} />
      {aktionen.map((aktion) => {
        const Symbol = SYMBOLE[aktion.art];
        const nachricht = aktion.art === "whatsapp" || aktion.art === "sms";
        const titel =
          aktion.art === "whatsapp"
            ? "WhatsApp-Nachricht schreiben"
            : aktion.titel;
        return (
          <Tooltip key={aktion.art} title={titel}>
            <IconButton
              size="small"
              {...(nachricht
                ? {
                    onClick: () => setKanal(aktion.art as NachrichtKanal),
                  }
                : { component: "a", href: aktion.href })}
              aria-label={titel}
              sx={{
                p: 0.5,
                color: aktion.art === "whatsapp" ? "#25D366" : "primary.main",
              }}
            >
              <Symbol sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        );
      })}
      {kanal && (
        <NachrichtHandy
          offen
          onClose={() => setKanal(null)}
          kanal={kanal}
          nummer={String(record?.[source] ?? "")}
          kunde={record}
        />
      )}
    </Box>
  );
};
