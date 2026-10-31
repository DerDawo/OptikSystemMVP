import { useEffect, useMemo, useState } from "react";
import { Title, useNotify } from "react-admin";
import { Link as RouterLink } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CircularProgress,
  Link,
  TextField,
  Typography,
} from "@mui/material";
import dayjs from "dayjs";
import {
  STATUS,
  schlechtesterStatus,
  type Auge,
  type Augenbefund,
} from "./fundusbericht";
import { DOKUMENT_BUCKET } from "./kundeDokumenteSpeicher";
import { supabase } from "./utils";

/*
 * Freigegebene Fundusberichte (Tabelle fundusbericht): als zentrales Archiv
 * über alle Kunden und, mit kundeId, als Verlauf in der Kundenkartei.
 */

type Zeile = {
  id: number;
  kunde_id: number;
  Untersuchung: string;
  Untersucher: string;
  Befund: Record<Auge, Augenbefund>;
  kunde: { Vorname: string | null; Nachname: string | null } | null;
  bericht: { Pfad: string } | null;
};

const statusFarbe = (status: ReturnType<typeof schlechtesterStatus>) =>
  status
    ? `rgb(${STATUS[status].farbe.map((f) => f * 255).join(",")})`
    : undefined;

export const FundusberichtListe = ({
  kundeId,
  stand,
}: {
  kundeId?: number;
  stand?: unknown;
}) => {
  const notify = useNotify();
  const [zeilen, setZeilen] = useState<Zeile[] | null>(null);
  const [suche, setSuche] = useState("");

  useEffect(() => {
    let aktiv = true;
    let abfrage = supabase
      .from("fundusbericht")
      .select(
        'id, kunde_id, "Untersuchung", "Untersucher", "Befund", kunde(Vorname:"Vorname", Nachname:"Nachname"), bericht:kunde_dokument!fundusbericht_Bericht_fkey(Pfad:"Pfad")',
      )
      .order("Untersuchung", { ascending: false })
      .limit(500);
    if (kundeId != null) abfrage = abfrage.eq("kunde_id", kundeId);
    void abfrage.then(({ data, error }) => {
      if (!aktiv) return;
      if (error)
        notify("Fundusberichte konnten nicht geladen werden.", {
          type: "error",
        });
      setZeilen((data ?? []) as unknown as Zeile[]);
    });
    return () => {
      aktiv = false;
    };
  }, [kundeId, stand, notify]);

  const sichtbar = useMemo(() => {
    const begriff = suche.trim().toLowerCase();
    return (zeilen ?? []).filter(
      (z) =>
        !begriff ||
        `${z.kunde?.Nachname ?? ""} ${z.kunde?.Vorname ?? ""} ${z.Untersucher}`
          .toLowerCase()
          .includes(begriff),
    );
  }, [zeilen, suche]);

  const oeffnen = async (pfad: string) => {
    const fenster = window.open("about:blank", "_blank");
    const { data, error } = await supabase.storage
      .from(DOKUMENT_BUCKET)
      .createSignedUrl(pfad, 60);
    if (error || !data?.signedUrl) {
      fenster?.close();
      notify("Bericht konnte nicht geöffnet werden.", { type: "error" });
      return;
    }
    if (fenster) fenster.location.href = data.signedUrl;
  };

  if (zeilen === null) return <CircularProgress size={22} />;
  if (kundeId != null && zeilen.length === 0) return null;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      {kundeId == null ? (
        <TextField
          size="small"
          label="Suchen (Name, Untersucher)"
          value={suche}
          onChange={(e) => setSuche(e.target.value)}
          sx={{ maxWidth: 320 }}
        />
      ) : (
        <Typography variant="subtitle2">Verlauf Fundusberichte</Typography>
      )}
      {sichtbar.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Keine Fundusberichte gefunden.
        </Typography>
      ) : (
        sichtbar.map((z) => {
          const status = schlechtesterStatus(z.Befund);
          return (
            <Box
              key={z.id}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                flexWrap: "wrap",
                py: 0.5,
                borderBottom: 1,
                borderColor: "divider",
              }}
            >
              <Typography variant="body2" sx={{ width: 130 }}>
                {dayjs(z.Untersuchung).format("DD.MM.YYYY HH:mm")}
              </Typography>
              {kundeId == null && (
                <Link
                  component={RouterLink}
                  to={`/kunde/${z.kunde_id}/show`}
                  variant="body2"
                  sx={{ flex: "1 1 180px" }}
                >
                  {[z.kunde?.Nachname, z.kunde?.Vorname]
                    .filter(Boolean)
                    .join(", ")}
                </Link>
              )}
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ flex: "1 1 120px" }}
              >
                {z.Untersucher}
              </Typography>
              <Typography
                variant="body2"
                sx={{ width: 160, fontWeight: 600, color: statusFarbe(status) }}
              >
                {status ? STATUS[status].name : "–"}
              </Typography>
              <Button
                size="small"
                disabled={!z.bericht}
                onClick={() => z.bericht && void oeffnen(z.bericht.Pfad)}
              >
                PDF
              </Button>
            </Box>
          );
        })
      )}
    </Box>
  );
};

export const Fundusarchiv = () => (
  <Box sx={{ p: { xs: 1, md: 2 } }}>
    <Title title="Fundusarchiv" />
    <Card sx={{ p: 2 }}>
      <FundusberichtListe />
    </Card>
  </Box>
);
