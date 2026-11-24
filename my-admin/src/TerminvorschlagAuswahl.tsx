// Terminvorschlag im Nachrichten-Handy: Terminart und bis zu drei Zeiten
// wählen, belegte Zeiten im Kalender werden angezeigt, "Übernehmen" setzt
// den fertigen Text in das Nachrichtenfeld.
import { useEffect, useState } from "react";
import {
  Box,
  Button,
  IconButton,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { supabase } from "./utils";
import { RECHNUNG_ABSENDER } from "./rechnungTemplate";
import {
  MAX_VORSCHLAEGE,
  terminvorschlagText,
  ueberschneidet,
  vorgabeZeit,
} from "./terminvorschlag";

type Terminart = { id: number; name: string; dauer_min: number };
type Belegt = { Start: string; Ende: string | null };

export const TerminvorschlagAuswahl = ({
  kunde,
  uebernehmen,
  abbrechen,
}: {
  kunde: Record<string, unknown> | undefined;
  uebernehmen: (text: string) => void;
  abbrechen: () => void;
}) => {
  const [arten, setArten] = useState<Terminart[]>([]);
  const [artId, setArtId] = useState<number | "">("");
  const [zeiten, setZeiten] = useState<string[]>([vorgabeZeit(0)]);
  const [belegt, setBelegt] = useState<Belegt[]>([]);

  useEffect(() => {
    void supabase
      .from("buchung_terminart")
      .select("id,name,dauer_min")
      .eq("aktiv", true)
      .order("reihenfolge")
      .then(({ data }) => {
        const liste = (data ?? []) as Terminart[];
        setArten(liste);
        if (liste[0]) setArtId(liste[0].id);
      });
  }, []);

  // Termine in den gewählten Tagen laden, um Überschneidungen zu zeigen
  const tage = [...new Set(zeiten.filter(Boolean).map((z) => z.slice(0, 10)))]
    .sort()
    .join(",");
  useEffect(() => {
    if (!tage) return;
    const liste = tage.split(",");
    const von = new Date(`${liste[0]}T00:00`).toISOString();
    const bis = new Date(`${liste[liste.length - 1]}T23:59`).toISOString();
    void supabase
      .from("termin")
      .select("Start,Ende")
      .gte("Start", von)
      .lte("Start", bis)
      .then(({ data }) => setBelegt((data ?? []) as Belegt[]));
  }, [tage]);

  const art = arten.find((a) => a.id === artId);
  const dauer = art?.dauer_min ?? 30;
  const istBelegt = (zeit: string) => {
    if (!zeit) return false;
    const start = new Date(zeit);
    const ende = new Date(start.getTime() + dauer * 60000);
    return belegt.some((b) =>
      ueberschneidet(
        start,
        ende,
        new Date(b.Start),
        new Date(b.Ende ?? new Date(b.Start).getTime() + 30 * 60000),
      ),
    );
  };

  const setzeZeit = (i: number, wert: string) =>
    setZeiten((z) => z.map((alt, j) => (j === i ? wert : alt)));

  const gueltig = zeiten.filter(Boolean);

  return (
    <Box
      sx={{
        bgcolor: "#fff",
        borderRadius: "12px",
        p: 1.5,
        display: "flex",
        flexDirection: "column",
        gap: 1.25,
        boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
      }}
    >
      <Typography sx={{ fontWeight: 700, fontSize: 15 }}>
        Terminvorschlag
      </Typography>
      <TextField
        select
        size="small"
        label="Terminart"
        value={artId}
        onChange={(e) =>
          setArtId(e.target.value === "" ? "" : Number(e.target.value))
        }
      >
        <MenuItem value="">(ohne Angabe)</MenuItem>
        {arten.map((a) => (
          <MenuItem key={a.id} value={a.id}>
            {a.name} ({a.dauer_min} Min.)
          </MenuItem>
        ))}
      </TextField>
      {zeiten.map((zeit, i) => (
        <Box key={i}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <TextField
              size="small"
              type="datetime-local"
              label={`Zeit ${i + 1}`}
              value={zeit}
              onChange={(e) => setzeZeit(i, e.target.value)}
              slotProps={{
                inputLabel: { shrink: true },
                htmlInput: { step: 900 },
              }}
              sx={{ flex: 1 }}
            />
            {zeiten.length > 1 && (
              <IconButton
                size="small"
                aria-label={`Zeit ${i + 1} entfernen`}
                onClick={() => setZeiten((z) => z.filter((_, j) => j !== i))}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
          {istBelegt(zeit) && (
            <Typography variant="caption" color="warning.main">
              Zu dieser Zeit ist im Kalender schon ein Termin eingetragen.
            </Typography>
          )}
        </Box>
      ))}
      {zeiten.length < MAX_VORSCHLAEGE && (
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={() => setZeiten((z) => [...z, vorgabeZeit(z.length)])}
          sx={{ alignSelf: "flex-start" }}
        >
          Weitere Zeit
        </Button>
      )}
      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
        <Button size="small" onClick={abbrechen}>
          Abbrechen
        </Button>
        <Button
          size="small"
          variant="contained"
          disabled={gueltig.length === 0}
          onClick={() =>
            uebernehmen(
              terminvorschlagText({
                kunde: kunde as { Anrede?: string; Nachname?: string },
                art: art?.name ?? "",
                zeiten: gueltig,
                firma: RECHNUNG_ABSENDER.firma,
              }),
            )
          }
        >
          Übernehmen
        </Button>
      </Box>
    </Box>
  );
};
