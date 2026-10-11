import { Box, IconButton, Tooltip } from "@mui/material";
import { TextField, useRecordContext } from "react-admin";
import PhoneIcon from "@mui/icons-material/Phone";
import SmsIcon from "@mui/icons-material/Sms";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import EmailIcon from "@mui/icons-material/Email";
import { KontaktAktion, kontaktAktionen } from "./kontaktLinks";

const SYMBOLE: Record<KontaktAktion["art"], typeof PhoneIcon> = {
  anrufen: PhoneIcon,
  sms: SmsIcon,
  whatsapp: WhatsAppIcon,
  email: EmailIcon,
};

// Kontaktfeld der Kundenseite mit Knöpfen zur direkten Kontaktaufnahme
// hinter dem Wert (kontaktLinks.ts)
export const KontaktFeld = ({ source }: { source: string }) => {
  const record = useRecordContext();
  const aktionen = kontaktAktionen(record?.[source]);
  return (
    <Box
      sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap" }}
    >
      <TextField source={source} />
      {aktionen.map((aktion) => {
        const Symbol = SYMBOLE[aktion.art];
        const extern = aktion.href.startsWith("http");
        return (
          <Tooltip key={aktion.art} title={aktion.titel}>
            <IconButton
              size="small"
              component="a"
              href={aktion.href}
              target={extern ? "_blank" : undefined}
              rel={extern ? "noopener noreferrer" : undefined}
              aria-label={aktion.titel}
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
    </Box>
  );
};
