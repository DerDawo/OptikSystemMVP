import { ReactNode, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Divider,
  ListItemText,
  Menu,
  MenuItem,
  Typography,
} from "@mui/material";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";

// Menüs wie in Prisma: "Gehe zu" (Navigation mit Tastenkürzeln) in der
// oberen Leiste und "Optionen" (seltener gebrauchte Aktionen) auf den
// Karteiseiten.

const GEHE_ZU: ({ text: string; to: string; kuerzel?: string } | null)[] = [
  { text: "Kunden", to: "/kunde" },
  { text: "Kundensuche", to: "/search", kuerzel: "Alt+K" },
  { text: "Brillen-Kartei", to: "/brille" },
  { text: "CL-Kartei", to: "/kontaktlinse" },
  { text: "Terminplaner", to: "/kalender", kuerzel: "Alt+T" },
  null,
  { text: "Rechnungen", to: "/rechnungen" },
  { text: "Mahnungen", to: "/mahnungen" },
  { text: "Glaskatalog", to: "/glaskatalog" },
  { text: "Fassungen", to: "/fassung" },
  null,
  { text: "Textverarbeitung (Vorlagen)", to: "/dokumentvorlage" },
  { text: "Statistiken", to: "/statistiken" },
  { text: "Betriebsdaten", to: "/betrieb/1" },
];

export const GeheZuMenu = () => {
  const navigate = useNavigate();
  const [anker, setAnker] = useState<HTMLElement | null>(null);
  const offen = Boolean(anker);
  return (
    <>
      <Button
        size="small"
        endIcon={<ArrowDropDownIcon />}
        onClick={(e) => setAnker(e.currentTarget)}
        aria-haspopup="menu"
        aria-expanded={offen}
        aria-controls={offen ? "gehe-zu-menu" : undefined}
        sx={{
          minHeight: 34,
          color: "text.primary",
          display: { xs: "none", md: "inline-flex" },
        }}
      >
        Gehe zu
      </Button>
      <Menu
        id="gehe-zu-menu"
        anchorEl={anker}
        open={offen}
        onClose={() => setAnker(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        slotProps={{ paper: { sx: { mt: 1, minWidth: 260 } } }}
      >
        {GEHE_ZU.map((eintrag, i) =>
          eintrag ? (
            <MenuItem
              key={eintrag.to}
              dense
              onClick={() => {
                setAnker(null);
                navigate(eintrag.to);
              }}
            >
              <ListItemText primary={eintrag.text} />
              {eintrag.kuerzel && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ ml: 3 }}
                >
                  {eintrag.kuerzel}
                </Typography>
              )}
            </MenuItem>
          ) : (
            <Divider key={`trenner-${i}`} />
          ),
        )}
      </Menu>
    </>
  );
};

// "Optionen ▾" mit Aktions-Knöpfen als Menüeinträge. Das Menü bleibt
// eingehängt (keepMounted), damit Dialoge, die ein Knopf öffnet, nach dem
// Schließen des Menüs offen bleiben.
export const OptionenMenu = ({ children }: { children: ReactNode }) => {
  const [anker, setAnker] = useState<HTMLElement | null>(null);
  const offen = Boolean(anker);
  return (
    <>
      <Button
        endIcon={<ArrowDropDownIcon />}
        onClick={(e) => setAnker(e.currentTarget)}
        aria-haspopup="menu"
        aria-expanded={offen}
      >
        Optionen
      </Button>
      <Menu
        anchorEl={anker}
        open={offen}
        onClose={() => setAnker(null)}
        keepMounted
        slotProps={{ paper: { sx: { mt: 0.5, minWidth: 260 } } }}
      >
        <Box
          onClickCapture={() => setAnker(null)}
          sx={{
            display: "flex",
            flexDirection: "column",
            "& .MuiButton-root": {
              justifyContent: "flex-start",
              width: "100%",
              px: 2,
              py: 0.75,
              borderRadius: 0,
              border: "none",
              boxShadow: "none",
              bgcolor: "transparent",
              color: "text.primary",
              fontWeight: 400,
              textTransform: "none",
            },
            "& .MuiButton-root:hover": {
              bgcolor: "action.hover",
              border: "none",
              boxShadow: "none",
            },
            "& .MuiButton-startIcon": { color: "text.secondary" },
          }}
        >
          {children}
        </Box>
      </Menu>
    </>
  );
};
