import { useEffect, useState } from "react";
import { useNotify } from "react-admin";
import {
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
} from "@mui/material";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
import {
  FarbeHaeufigkeit,
  GLAS_ZUSAETZE,
  farbVorschlaege,
  hatZusatz,
  zusatzUmschalten,
} from "./glasBemerkung";
import { supabase } from "./utils";

// Tönungen nach Häufigkeit; einmal je Sitzung geladen
let farbCache: Promise<string[]> | null = null;
const ladeFarben = () => {
  farbCache ??= Promise.resolve(
    supabase
      .from("glas_farbe_haeufigkeit")
      .select("Farbe,Anzahl")
      .order("Anzahl", { ascending: false })
      .limit(500),
  ).then(({ data, error }) => {
    if (error) {
      farbCache = null;
      return farbVorschlaege([]);
    }
    return farbVorschlaege((data ?? []) as FarbeHaeufigkeit[]);
  });
  return farbCache;
};

/** Vorschläge für das Feld "Farbe": häufig bestellte Tönungen zuerst. */
export const useGlasFarben = () => {
  const [liste, setListe] = useState<string[]>(() => farbVorschlaege([]));
  useEffect(() => {
    let aktiv = true;
    void ladeFarben().then((l) => aktiv && setListe(l));
    return () => {
      aktiv = false;
    };
  }, []);
  return liste;
};

/*
 * Knopf ▾ am Feld "Bemerkung zum Glas": Sondercurve, Extra Durchmesser,
 * Mustertönung an- und abhaken. Der übrige Text im Feld bleibt erhalten.
 */
export const GlasZusatzAuswahl = ({
  wert,
  speichere,
}: {
  wert: unknown;
  speichere: (neu: string | null) => Promise<unknown>;
}) => {
  const notify = useNotify();
  const [anker, setAnker] = useState<HTMLElement | null>(null);
  const [laeuft, setLaeuft] = useState(false);

  const umschalten = async (zusatz: string) => {
    setLaeuft(true);
    try {
      const neu = zusatzUmschalten(wert, zusatz);
      await speichere(neu || null);
    } catch {
      notify("Bemerkung zum Glas: Änderung konnte nicht gespeichert werden.", {
        type: "error",
      });
    } finally {
      setLaeuft(false);
    }
  };

  return (
    <>
      <Tooltip title="Zusatz auswählen">
        <IconButton
          size="small"
          aria-label="Zusatz zum Glas auswählen"
          aria-haspopup="menu"
          onClick={(e) => setAnker(e.currentTarget)}
          sx={{ p: 0, ml: 0.5, flexShrink: 0 }}
        >
          <ArrowDropDownIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anker}
        open={Boolean(anker)}
        onClose={() => setAnker(null)}
      >
        {GLAS_ZUSAETZE.map((zusatz) => {
          const an = hatZusatz(wert, zusatz);
          return (
            <MenuItem
              key={zusatz}
              dense
              disabled={laeuft}
              onClick={() => void umschalten(zusatz)}
            >
              <ListItemIcon>
                {an ? (
                  <CheckBoxIcon fontSize="small" color="primary" />
                ) : (
                  <CheckBoxOutlineBlankIcon fontSize="small" />
                )}
              </ListItemIcon>
              <ListItemText primary={zusatz} />
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
};
