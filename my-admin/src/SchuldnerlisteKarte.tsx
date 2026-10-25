import { useCallback, useEffect, useMemo, useState } from "react";
import { useNotify } from "react-admin";
import { useNavigate } from "react-router-dom";
import {
  Box,
  ButtonBase,
  Card,
  IconButton,
  InputBase,
  Tooltip,
  Typography,
} from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import dayjs from "dayjs";
import { tokensFor } from "./designTokens";
import { formatEuro } from "./rechnungTemplate";
import {
  filtereSchuldner,
  summeOffen,
  tageOffen,
  type Schuldner,
} from "./schuldnerliste";
import { supabase } from "./utils";

/*
 * Schuldnerliste im Dashboard - nur für den Inhaber. Die Karte fragt zuerst
 * ist_inhaber() ab und rendert für alle anderen nichts; die Daten selbst sind
 * zusätzlich per RLS gesperrt. "Bezahlt" setzt BezahltAm, der Posten
 * verschwindet aus der Liste.
 */
export const SchuldnerlisteKarte = () => {
  const [inhaber, setInhaber] = useState(false);
  const [zeilen, setZeilen] = useState<Schuldner[]>([]);
  const [suche, setSuche] = useState("");
  const navigate = useNavigate();
  const notify = useNotify();

  const laden = useCallback(async () => {
    const { data, error } = await supabase
      .from("schuldnerliste")
      .select("*")
      .is("BezahltAm", null)
      .order("Datum", { ascending: true });
    if (error) {
      notify("Schuldnerliste konnte nicht geladen werden.", { type: "error" });
      return;
    }
    setZeilen((data ?? []) as Schuldner[]);
  }, [notify]);

  useEffect(() => {
    let aktiv = true;
    supabase.rpc("ist_inhaber").then(({ data }) => {
      if (aktiv && data === true) {
        setInhaber(true);
        void laden();
      }
    });
    return () => {
      aktiv = false;
    };
  }, [laden]);

  const sichtbar = useMemo(
    () => filtereSchuldner(zeilen, suche),
    [zeilen, suche],
  );

  if (!inhaber) return null;

  const bezahlt = async (zeile: Schuldner) => {
    const { error } = await supabase
      .from("schuldnerliste")
      .update({ BezahltAm: dayjs().format("YYYY-MM-DD") })
      .eq("id", zeile.id);
    if (error) {
      notify("Konnte nicht als bezahlt markiert werden.", { type: "error" });
      return;
    }
    setZeilen((alt) => alt.filter((z) => z.id !== zeile.id));
    notify(`${zeile.Kunde}: als bezahlt markiert`, { type: "success" });
  };

  return (
    <Card
      component="section"
      sx={{
        p: "16px 18px",
        mt: 2,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        gap: 0.75,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
        <Typography
          component="h2"
          sx={{ fontSize: 15, fontWeight: 700, flex: 1 }}
        >
          Schuldnerliste
        </Typography>
        <Typography
          sx={{ fontSize: 13, fontWeight: 700, color: "warning.dark" }}
        >
          {formatEuro(summeOffen(zeilen))} · {zeilen.length}
        </Typography>
      </Box>
      <Typography
        sx={{
          fontSize: 12,
          color: (theme) => tokensFor(theme).text3,
          mt: -0.5,
        }}
      >
        Offene Posten, nur für dich sichtbar. Häkchen = bezahlt.
      </Typography>
      <InputBase
        placeholder="Suchen (Name, Auftrag, Bemerkung)"
        value={suche}
        onChange={(e) => setSuche(e.target.value)}
        inputProps={{ "aria-label": "Schuldnerliste durchsuchen" }}
        sx={{
          fontSize: 13.5,
          px: 1.5,
          py: 0.25,
          borderRadius: "10px",
          border: 1,
          borderColor: "divider",
        }}
      />
      {sichtbar.length === 0 ? (
        <Typography
          sx={{ fontSize: 13.5, color: "text.secondary", px: 1.5, py: 1 }}
        >
          {zeilen.length === 0 ? "Keine offenen Posten." : "Keine Treffer."}
        </Typography>
      ) : (
        <Box
          tabIndex={0}
          role="list"
          aria-label="Schuldnerliste, scrollbar"
          sx={{
            display: "flex",
            flexDirection: "column",
            maxHeight: 8 * 56,
            overflowY: "auto",
            overscrollBehavior: "contain",
            scrollbarGutter: "stable",
          }}
        >
          {sichtbar.map((z) => {
            const detail = [
              z.Datum ? dayjs(z.Datum).format("DD.MM.YYYY") : "",
              z.Beleg,
              z.AuftragsNr,
              z.Zahlart && z.Zahlart !== "–" ? z.Zahlart : "",
              `${tageOffen(z.Datum)} Tage`,
              z.Bemerkung,
            ]
              .filter(Boolean)
              .join(" · ");
            return (
              <Box
                key={z.id}
                role="listitem"
                sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
              >
                <ButtonBase
                  disabled={!z.kunde_id}
                  onClick={() => navigate(`/kunde/${z.kunde_id}/show`)}
                  sx={(theme) => ({
                    flex: 1,
                    minWidth: 0,
                    display: "block",
                    textAlign: "left",
                    px: 1.5,
                    py: 0.75,
                    borderRadius: "10px",
                    "&:hover": { backgroundColor: tokensFor(theme).hover },
                  })}
                >
                  <Typography noWrap sx={{ fontWeight: 600, fontSize: 14 }}>
                    {z.Kunde} · {formatEuro(Number(z.Offen))}
                  </Typography>
                  <Typography
                    noWrap
                    sx={{
                      fontSize: 12.5,
                      color: (theme) => tokensFor(theme).text3,
                    }}
                  >
                    {detail}
                  </Typography>
                </ButtonBase>
                <Tooltip title="Als bezahlt markieren">
                  <IconButton
                    size="small"
                    aria-label={`${z.Kunde} als bezahlt markieren`}
                    onClick={() => void bezahlt(z)}
                    color="success"
                  >
                    <CheckIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            );
          })}
        </Box>
      )}
    </Card>
  );
};
