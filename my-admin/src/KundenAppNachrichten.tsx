import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useNotify } from "react-admin";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { supabase } from "./utils";

/*
 * Nachrichten aus der Kunden-App (Tabelle portal_nachricht) auf der Seite
 * „Online-Anfragen“: offene Nachrichten, Absage-Wünsche und
 * Rechnungskopien. Eine Antwort erscheint beim Kunden in der App.
 */

export const KUNDEN_APP_GEAENDERT = "kunden-app-nachrichten-geaendert";

type Zeile = {
  id: number;
  created_at: string;
  kunde_id: number;
  art: string;
  text: string;
  termin_id: number | null;
  kunde: {
    Vorname: string | null;
    Nachname: string | null;
    Anrede: string | null;
  } | null;
};

const ART: Record<
  string,
  { name: string; farbe: "default" | "error" | "info" }
> = {
  nachricht: { name: "Nachricht", farbe: "default" },
  absage: { name: "Termin absagen", farbe: "error" },
  rechnung: { name: "Rechnungskopie", farbe: "info" },
};

const zeitpunkt = (iso: string) =>
  new Date(iso).toLocaleString("de-DE", {
    timeZone: "Europe/Berlin",
    dateStyle: "short",
    timeStyle: "short",
  });

// Anzahl offener Nachrichten fürs Menü
export const useOffeneKundenAppNachrichten = () => {
  const [anzahl, setAnzahl] = useState(0);
  useEffect(() => {
    const laden = () =>
      supabase
        .from("portal_nachricht")
        .select("id", { count: "exact", head: true })
        .eq("von_kunde", true)
        .is("erledigt_am", null)
        .then(({ count }) => setAnzahl(count ?? 0));
    laden();
    const timer = window.setInterval(laden, 120_000);
    window.addEventListener(KUNDEN_APP_GEAENDERT, laden);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener(KUNDEN_APP_GEAENDERT, laden);
    };
  }, []);
  return anzahl;
};

const NachrichtKarte = ({ n, fertig }: { n: Zeile; fertig: () => void }) => {
  const notify = useNotify();
  const [antwort, setAntwort] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  const art = ART[n.art] ?? ART.nachricht;
  const name =
    [n.kunde?.Vorname, n.kunde?.Nachname].filter(Boolean).join(" ") ||
    `Kunde ${n.kunde_id}`;

  const erledigen = async (mitAntwort: boolean) => {
    setLaeuft(true);
    const { data: sitzung } = await supabase.auth.getUser();
    const wer = sitzung.user?.email ?? null;
    if (mitAntwort && antwort.trim()) {
      const { error } = await supabase.from("portal_nachricht").insert({
        kunde_id: n.kunde_id,
        von_kunde: false,
        art: "antwort",
        text: antwort.trim(),
      });
      if (error) {
        setLaeuft(false);
        return notify(error.message, { type: "error" });
      }
    }
    const { error } = await supabase
      .from("portal_nachricht")
      .update({ erledigt_am: new Date().toISOString(), erledigt_von: wer })
      .eq("id", n.id);
    setLaeuft(false);
    if (error) return notify(error.message, { type: "error" });
    notify(
      mitAntwort && antwort.trim()
        ? "Antwort steht in der Kunden-App."
        : "Erledigt.",
      {
        type: "success",
      },
    );
    fertig();
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack
          direction={{ xs: "column", md: "row" }}
          gap={2}
          justifyContent="space-between"
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
              <Typography fontWeight={700}>
                <Link to={`/kunde/${n.kunde_id}/show`}>{name}</Link>
              </Typography>
              <Chip size="small" label={art.name} color={art.farbe} />
              <Typography variant="body2" color="text.secondary">
                {zeitpunkt(n.created_at)}
              </Typography>
            </Stack>
            <Typography
              sx={{ mt: 1, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
            >
              {n.text}
            </Typography>
            {n.art === "absage" && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Bitte den Termin im Kalender löschen oder verschieben und dem
                Kunden kurz antworten.
              </Typography>
            )}
          </Box>
          <Stack gap={1} sx={{ width: { md: 360 } }}>
            <TextField
              size="small"
              label="Antwort in die Kunden-App"
              value={antwort}
              onChange={(e) => setAntwort(e.target.value)}
              multiline
              minRows={2}
            />
            <Stack direction="row" gap={1} justifyContent="flex-end">
              <Button disabled={laeuft} onClick={() => erledigen(false)}>
                Erledigt ohne Antwort
              </Button>
              <Button
                variant="contained"
                disabled={laeuft || !antwort.trim()}
                onClick={() => erledigen(true)}
              >
                Antworten
              </Button>
            </Stack>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
};

export const KundenAppNachrichten = () => {
  const [liste, setListe] = useState<Zeile[] | null>(null);
  const [fehler, setFehler] = useState("");

  const laden = useCallback(() => {
    supabase
      .from("portal_nachricht")
      .select(
        "id, created_at, kunde_id, art, text, termin_id, kunde(Vorname, Nachname, Anrede)",
      )
      .eq("von_kunde", true)
      .is("erledigt_am", null)
      .order("created_at", { ascending: true })
      .limit(100)
      .then(({ data, error }) => {
        if (error) return setFehler(error.message);
        setListe((data ?? []) as unknown as Zeile[]);
        window.dispatchEvent(new Event(KUNDEN_APP_GEAENDERT));
      });
  }, []);
  useEffect(laden, [laden]);

  return (
    <Stack gap={2}>
      <Typography variant="h5">Nachrichten aus der Kunden-App</Typography>
      {fehler && <Alert severity="error">{fehler}</Alert>}
      {liste && liste.length === 0 && (
        <Alert severity="info">Keine offenen Nachrichten.</Alert>
      )}
      {liste?.map((n) => (
        <NachrichtKarte key={n.id} n={n} fertig={laden} />
      ))}
    </Stack>
  );
};
