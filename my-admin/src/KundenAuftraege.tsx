import { MouseEvent, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useDataProvider,
  useGetList,
  useGetMany,
  useNotify,
  useRecordContext,
  useRefresh,
} from "react-admin";
import {
  Box,
  Button,
  Card,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import BuildIcon from "@mui/icons-material/Build";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EuroIcon from "@mui/icons-material/Euro";
import EventIcon from "@mui/icons-material/Event";
import SearchIcon from "@mui/icons-material/Search";
import { formatCurrency } from "./CurrencyField";
import { loeschSperre } from "./auftragLoeschen";
import { supabase } from "./utils";
import { useTastenkuerzel } from "./tastenkuerzel";
import { OrderStatusKey, getBrilleOrderStatus } from "./orderStatus";

/*
 * Alle Vorgänge eines Kunden in einer Liste wie in der Prisma-Kundenkartei:
 * Brillen- und Kontaktlinsenaufträge nach Datum, mit Status-Symbolen,
 * "Neu anlegen"-Menü und Suche.
 */

type Art = "brille" | "kontaktlinse";

type Datensatz = Record<string, unknown>;

type Zeile = {
  key: string;
  art: Art;
  id: unknown;
  datum: string | null;
  titel: string;
  nummer: string;
  typ: string;
  betrag: number | null;
  status: OrderStatusKey | "termin" | "termin-kommend";
  offenerBetrag: boolean;
  suchtext: string;
  datensatz: Datensatz;
};

const MAX_EINTRAEGE = 1000;

const randFarbe: Record<Zeile["status"], string> = {
  offen: "warning.main",
  bereit: "info.main",
  abgeholt: "success.main",
  termin: "divider",
  "termin-kommend": "primary.main",
};

// Spalten wie in der Prisma-Kundenmaske: Status | Art | Datum | Betrag
const SPALTEN = "3.4em minmax(0, 1fr) 6.2em 6.5em 2.2em";

// Kopfknopf "Neuanlegen" im Prisma-Blau
const prismaKopf = {
  flex: "0 1 280px",
  justifyContent: "space-between",
  bgcolor: "#1d4e8f",
  "&:hover": { bgcolor: "#173f74", transform: "none" },
  borderRadius: "4px",
  fontWeight: 700,
};

const datumText = (wert: string | null) =>
  wert ? new Date(wert).toLocaleDateString("de-DE") : "";

const zahl = (wert: unknown) => {
  if (wert === null || wert === undefined || wert === "") return null;
  const n = Number(wert);
  return Number.isFinite(n) ? n : null;
};

const text = (wert: unknown) =>
  wert === null || wert === undefined ? "" : String(wert).trim();

export const KundenAuftraege = () => {
  const kunde = useRecordContext();
  const navigate = useNavigate();
  const [suche, setSuche] = useState("");
  const [menuAnker, setMenuAnker] = useState<HTMLElement | null>(null);
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const refresh = useRefresh();
  const [loeschen, setLoeschen] = useState<Zeile | null>(null);
  const [sperre, setSperre] = useState<string | null>(null);
  const [loescht, setLoescht] = useState(false);

  const abfrage = (sortFeld: string) => ({
    filter: { kunde_id: kunde?.id },
    sort: { field: sortFeld, order: "DESC" as const },
    pagination: { page: 1, perPage: MAX_EINTRAEGE },
  });
  const optionen = { enabled: kunde?.id != null };
  const brillen = useGetList<Datensatz & { id: number }>(
    "brille",
    abfrage("Datum"),
    optionen,
  );
  const linsen = useGetList<Datensatz & { id: number }>(
    "kontaktlinse",
    abfrage("Datum"),
    optionen,
  );

  const neu = (pfad: string) => {
    setMenuAnker(null);
    if (kunde) navigate(pfad, { state: { kunde_id: kunde.id } });
  };
  useTastenkuerzel({
    b: () => neu("/brille/create"),
    l: () => neu("/kontaktlinse/create"),
  });

  const glastypIds = useMemo(
    () => [
      ...new Set(
        (brillen.data ?? [])
          .map((b) => b.Glastyp)
          .filter((id) => id !== null && id !== undefined),
      ),
    ],
    [brillen.data],
  );
  const glastypen = useGetMany<Datensatz & { id: number }>(
    "glastyp",
    { ids: glastypIds },
    { enabled: glastypIds.length > 0 },
  );

  const zeilen = useMemo<Zeile[]>(() => {
    const glastypName = new Map(
      (glastypen.data ?? []).map((g) => [g.id, text(g.Bezeichnung)]),
    );
    const liste: Zeile[] = [];
    for (const b of brillen.data ?? []) {
      const rest = zahl(b.Restbetrag);
      const titel = text(b.BrillenArt) || "Brille";
      const typ = glastypName.get(b.Glastyp as number) ?? "";
      liste.push({
        key: `brille-${b.id}`,
        art: "brille",
        id: b.id,
        datum: (b.Datum as string) ?? (b.created_at as string) ?? null,
        titel,
        nummer: `Auftrag-Nr. ${b.id}`,
        typ,
        betrag: zahl(b.Summe),
        status: getBrilleOrderStatus(b as { Abholung?: string }).key,
        offenerBetrag: rest !== null && rest > 0.005,
        suchtext: [titel, typ, b.id, b.Werkstatt, b.Notizen].join(" "),
        datensatz: b,
      });
    }
    for (const k of linsen.data ?? []) {
      const typ = [text(k.LinsentypRechts), text(k.LinsentypLinks)]
        .filter(Boolean)
        .filter((t, i, a) => a.indexOf(t) === i)
        .join(" / ");
      liste.push({
        key: `kontaktlinse-${k.id}`,
        art: "kontaktlinse",
        id: k.id,
        datum: (k.Datum as string) ?? (k.created_at as string) ?? null,
        titel: "Kontaktlinsen",
        nummer: `Auftrag-Nr. ${k.id}`,
        typ,
        betrag: zahl(k.Summe),
        status: getBrilleOrderStatus(k as { Abholung?: string }).key,
        offenerBetrag: false,
        suchtext: ["Kontaktlinsen", typ, k.id, k.Notizen].join(" "),
        datensatz: k,
      });
    }
    return liste.sort(
      (a, b) =>
        (b.datum ? new Date(b.datum).getTime() : 0) -
        (a.datum ? new Date(a.datum).getTime() : 0),
    );
  }, [brillen.data, linsen.data, glastypen.data]);

  const sichtbar = useMemo(() => {
    const begriff = suche.trim().toLowerCase();
    return zeilen.filter(
      (z) => !begriff || z.suchtext.toLowerCase().includes(begriff),
    );
  }, [zeilen, suche]);

  if (!kunde) return null;

  const laedt = brillen.isPending || linsen.isPending;

  const fragLoeschen = async (z: Zeile) => {
    let grund = loeschSperre(z.datensatz);
    if (!grund && z.art === "brille") {
      const { count, error } = await supabase
        .from("kunde_leistet_zauzahlung_fuer_brille")
        .select("*", { count: "exact", head: true })
        .eq("BrillenID", z.id as number);
      if (error) {
        notify("Auftrag konnte nicht geprüft werden.", { type: "error" });
        return;
      }
      if (count) grund = "Es ist eine Zuzahlung eingetragen.";
    }
    setSperre(grund);
    setLoeschen(z);
  };

  const endgueltigLoeschen = async () => {
    if (!loeschen) return;
    setLoescht(true);
    try {
      if (loeschen.art === "brille") {
        const { error } = await supabase
          .from("brille_hat_zusatzleistungen")
          .delete()
          .eq("BrillenID", loeschen.id as number);
        if (error) throw error;
      }
      await dataProvider.delete(loeschen.art, {
        id: loeschen.id as number,
        previousData: loeschen.datensatz as Datensatz & { id: number },
      });
      notify("Auftrag gelöscht.", { type: "success" });
      setLoeschen(null);
      refresh();
    } catch {
      notify("Auftrag konnte nicht gelöscht werden.", { type: "error" });
    } finally {
      setLoescht(false);
    }
  };

  return (
    <Card variant="outlined" sx={{ p: "1em", width: "100%", minWidth: 0 }}>
      <Box
        sx={{
          display: "flex",
          gap: 1,
          flexWrap: "wrap",
          alignItems: "center",
          mb: 1,
        }}
      >
        <Button
          variant="contained"
          endIcon={<ArrowDropDownIcon />}
          onClick={(e: MouseEvent<HTMLElement>) =>
            setMenuAnker(e.currentTarget)
          }
          sx={prismaKopf}
        >
          Neuanlegen
        </Button>
        <Menu
          anchorEl={menuAnker}
          open={Boolean(menuAnker)}
          onClose={() => setMenuAnker(null)}
        >
          <MenuItem onClick={() => neu("/brille/create")}>
            Brille
            <Typography variant="caption" color="text.secondary" sx={{ ml: 3 }}>
              Alt + B
            </Typography>
          </MenuItem>
          <MenuItem onClick={() => neu("/kontaktlinse/create")}>
            Kontaktlinsen
            <Typography variant="caption" color="text.secondary" sx={{ ml: 3 }}>
              Alt + L
            </Typography>
          </MenuItem>
        </Menu>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: SPALTEN,
          gap: "0 0.75em",
          px: 1,
          pb: 0.5,
          fontStyle: "italic",
          fontSize: "0.85rem",
          color: "text.secondary",
        }}
      >
        <span>Status</span>
        <span>Art</span>
        <span>Datum</span>
        <span style={{ textAlign: "right" }}>Betrag</span>
        <span />
      </Box>
      <Box
        sx={{
          maxHeight: { xs: "none", md: "70vh" },
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
        }}
      >
        {laedt && (
          <Typography color="text.secondary" sx={{ p: 1 }}>
            Wird geladen …
          </Typography>
        )}
        {!laedt && sichtbar.length === 0 && (
          <Typography color="text.secondary" sx={{ p: 1 }}>
            Keine Einträge.
          </Typography>
        )}
        {sichtbar.map((z) => (
          <Box
            key={z.key}
            role="button"
            tabIndex={0}
            onClick={() => navigate(`/${z.art}/${z.id}/show`)}
            onKeyDown={(e) => {
              if (e.key === "Enter") navigate(`/${z.art}/${z.id}/show`);
            }}
            sx={(theme) => ({
              display: "grid",
              gridTemplateColumns: SPALTEN,
              gap: "0 0.75em",
              alignItems: "center",
              py: 0.75,
              px: 1,
              borderLeft: "8px solid",
              borderLeftColor: randFarbe[z.status],
              borderRadius: "4px",
              bgcolor:
                theme.palette.mode === "dark"
                  ? "rgba(255,255,255,0.06)"
                  : "#f0f1f3",
              cursor: "pointer",
              "&:hover": { bgcolor: "action.hover" },
            })}
          >
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                color: "text.secondary",
              }}
            >
              {z.status === "offen" && (
                <Tooltip title="In Bearbeitung">
                  <BuildIcon fontSize="small" color="warning" />
                </Tooltip>
              )}
              {z.status === "termin-kommend" && (
                <Tooltip title="Anstehender Termin">
                  <EventIcon fontSize="small" color="primary" />
                </Tooltip>
              )}
              {z.offenerBetrag && (
                <Tooltip title="Offener Betrag">
                  <EuroIcon fontSize="small" color="error" />
                </Tooltip>
              )}
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 500 }} noWrap>
                {z.titel}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {z.nummer}
              </Typography>
            </Box>
            <Typography variant="body2">{datumText(z.datum)}</Typography>
            <Typography variant="body2" sx={{ textAlign: "right" }}>
              {z.betrag !== null ? formatCurrency(z.betrag) : ""}
            </Typography>
            <Tooltip title="Auftrag löschen">
              <IconButton
                size="small"
                aria-label={`Auftrag ${String(z.id)} löschen`}
                onClick={(e) => {
                  e.stopPropagation();
                  void fragLoeschen(z);
                }}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        ))}
      </Box>

      <TextField
        size="small"
        fullWidth
        placeholder="Suche"
        value={suche}
        onChange={(e) => setSuche(e.target.value)}
        sx={{ mt: 1.5 }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: suche ? (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  aria-label="Suche leeren"
                  onClick={() => setSuche("")}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : undefined,
          },
        }}
      />

      <Dialog open={loeschen !== null} onClose={() => setLoeschen(null)}>
        <DialogTitle>
          {sperre ? "Auftrag kann nicht gelöscht werden" : "Auftrag löschen?"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {loeschen?.titel}, {loeschen?.nummer} vom{" "}
            {datumText(loeschen?.datum ?? null)}
            {sperre
              ? `: ${sperre} Der Auftrag bleibt als Beleg erhalten.`
              : ". Das lässt sich nicht rückgängig machen."}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLoeschen(null)}>
            {sperre ? "Schließen" : "Abbrechen"}
          </Button>
          {!sperre && (
            <Button
              color="error"
              variant="contained"
              disabled={loescht}
              onClick={() => void endgueltigLoeschen()}
            >
              Endgültig löschen
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Card>
  );
};
