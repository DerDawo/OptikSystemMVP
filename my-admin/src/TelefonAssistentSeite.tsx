import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Title, useNotify } from "react-admin";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Collapse,
  IconButton,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { supabase } from "./utils";

/*
 * Menü „Telefon-Assistent“: was der KI-Telefonassistent (ElevenLabs) erledigt
 * hat. Oben offene Rückrufbitten und Fragen, die er nicht beantworten konnte
 * (eine Antwort hier kennt er ab dem nächsten Anruf), darunter alle Anrufe
 * und das hinterlegte Wissen. Terminanfragen vom Telefon erscheinen unter
 * „Online-Anfragen“.
 */

export const TELEFON_GEAENDERT = "telefon-assistent-geaendert";

type Anruf = {
  id: number;
  created_at: string;
  conversation_id: string;
  anrufer_nummer: string | null;
  kunde_id: number | null;
  dauer_sek: number | null;
  zusammenfassung: string | null;
  transkript: { role?: string; message?: string }[] | null;
  ergebnis: string | null;
  buchung_anfrage_id: number | null;
  rueckruf_erbeten: boolean;
  rueckruf_name: string | null;
  rueckruf_nummer: string | null;
  rueckruf_anliegen: string | null;
  dringend: boolean;
  auftrag_auskunft: boolean;
  erledigt_am: string | null;
  erledigt_von: string | null;
  kunde: { Vorname: string | null; Nachname: string | null } | null;
};
type Luecke = {
  id: number;
  created_at: string;
  frage: string;
  conversation_id: string | null;
};
type Wissen = { id: number; frage: string; antwort: string; aktiv: boolean };

const ERGEBNIS: Record<
  string,
  {
    name: string;
    farbe: "default" | "success" | "warning" | "error" | "info";
  }
> = {
  termin: { name: "Termin vorgemerkt", farbe: "success" },
  rueckruf: { name: "Rückruf erbeten", farbe: "warning" },
  auskunft: { name: "Auskunft", farbe: "info" },
  notfall: { name: "Notfall verwiesen", farbe: "error" },
  abgebrochen: { name: "Abgebrochen", farbe: "default" },
};

const zeitpunkt = (iso: string) =>
  new Date(iso).toLocaleString("de-DE", {
    timeZone: "Europe/Berlin",
    dateStyle: "short",
    timeStyle: "short",
  });

const dauer = (s: number | null) =>
  s == null ? "" : s < 60 ? `${s} s` : `${Math.round(s / 60)} min`;

const kundeName = (a: Anruf) =>
  [a.kunde?.Vorname, a.kunde?.Nachname].filter(Boolean).join(" ");

// Offene Rückrufbitten + offene Fragen fürs Menü
export const useOffeneTelefonAufgaben = () => {
  const [anzahl, setAnzahl] = useState(0);
  useEffect(() => {
    const laden = () =>
      Promise.all([
        supabase
          .from("telefon_anruf")
          .select("id", { count: "exact", head: true })
          .eq("rueckruf_erbeten", true)
          .is("erledigt_am", null),
        supabase
          .from("telefon_wissensluecke")
          .select("id", { count: "exact", head: true })
          .eq("status", "offen"),
      ]).then(([a, b]) => setAnzahl((a.count ?? 0) + (b.count ?? 0)));
    laden();
    const timer = window.setInterval(laden, 120_000);
    window.addEventListener(TELEFON_GEAENDERT, laden);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener(TELEFON_GEAENDERT, laden);
    };
  }, []);
  return anzahl;
};

const Verlauf = ({ anruf }: { anruf: Anruf }) => {
  const [offen, setOffen] = useState(false);
  if (!anruf.transkript?.length) return null;
  return (
    <>
      <Button size="small" onClick={() => setOffen(!offen)} sx={{ px: 0 }}>
        {offen ? "Gesprächsverlauf ausblenden" : "Gesprächsverlauf anzeigen"}
      </Button>
      <Collapse in={offen} unmountOnExit>
        <Stack
          gap={0.5}
          sx={{ mt: 1, p: 1.5, bgcolor: "action.hover", borderRadius: 1 }}
        >
          {anruf.transkript.map((n, i) => (
            <Typography key={i} variant="body2">
              <b>{n.role === "agent" ? "Assistent" : "Anrufer"}:</b> {n.message}
            </Typography>
          ))}
        </Stack>
      </Collapse>
    </>
  );
};

const AnrufKarte = ({
  anruf,
  geaendert,
}: {
  anruf: Anruf;
  geaendert: () => void;
}) => {
  const notify = useNotify();
  const ergebnis = ERGEBNIS[anruf.ergebnis ?? ""] ?? {
    name: "Läuft / ohne Auswertung",
    farbe: "default" as const,
  };
  const offen = anruf.rueckruf_erbeten && !anruf.erledigt_am;
  const nummer = anruf.rueckruf_nummer ?? anruf.anrufer_nummer;

  const erledigen = async () => {
    const { data: sitzung } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("telefon_anruf")
      .update({
        erledigt_am: new Date().toISOString(),
        erledigt_von: sitzung.user?.email ?? null,
      })
      .eq("id", anruf.id);
    if (error) return notify(error.message, { type: "error" });
    notify("Rückruf erledigt.", { type: "success" });
    geaendert();
  };

  return (
    <Card
      variant="outlined"
      sx={offen && anruf.dringend ? { borderColor: "error.main" } : undefined}
    >
      <CardContent>
        <Stack
          direction={{ xs: "column", md: "row" }}
          gap={2}
          justifyContent="space-between"
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
              <Typography fontWeight={700}>
                {anruf.rueckruf_name ||
                  kundeName(anruf) ||
                  anruf.anrufer_nummer ||
                  "Unbekannter Anrufer"}
              </Typography>
              <Chip size="small" label={ergebnis.name} color={ergebnis.farbe} />
              {anruf.dringend && (
                <Chip size="small" label="dringend" color="error" />
              )}
              {anruf.auftrag_auskunft && (
                <Chip
                  size="small"
                  label="Auftragsstatus genannt"
                  variant="outlined"
                />
              )}
              <Typography variant="body2" color="text.secondary">
                {zeitpunkt(anruf.created_at)}
                {anruf.dauer_sek != null && ` · ${dauer(anruf.dauer_sek)}`}
              </Typography>
            </Stack>
            {anruf.rueckruf_erbeten && (
              <Typography sx={{ mt: 1, whiteSpace: "pre-wrap" }}>
                <b>Rückruf:</b> {anruf.rueckruf_anliegen || "ohne Angabe"}
              </Typography>
            )}
            {anruf.zusammenfassung && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 1, whiteSpace: "pre-wrap" }}
              >
                {anruf.zusammenfassung}
              </Typography>
            )}
            <Stack direction="row" gap={2} sx={{ mt: 1 }} flexWrap="wrap">
              {anruf.kunde_id && (
                <Link to={`/kunde/${anruf.kunde_id}/show`}>
                  Kunde {kundeName(anruf) || anruf.kunde_id}
                </Link>
              )}
              {anruf.buchung_anfrage_id && (
                <Link to="/online-anfragen">Terminanfrage ansehen</Link>
              )}
            </Stack>
            <Verlauf anruf={anruf} />
          </Box>
          <Stack gap={1} sx={{ minWidth: 180 }}>
            {nummer && (
              <Button variant="outlined" href={`tel:${nummer}`}>
                {nummer}
              </Button>
            )}
            {offen && (
              <Button variant="contained" onClick={erledigen}>
                Erledigt
              </Button>
            )}
            {anruf.erledigt_am && (
              <Typography variant="caption" color="text.secondary">
                erledigt {zeitpunkt(anruf.erledigt_am)}
                {anruf.erledigt_von && ` von ${anruf.erledigt_von}`}
              </Typography>
            )}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
};

const LueckeKarte = ({
  luecke,
  geaendert,
}: {
  luecke: Luecke;
  geaendert: () => void;
}) => {
  const notify = useNotify();
  const [frage, setFrage] = useState(luecke.frage);
  const [antwort, setAntwort] = useState("");
  const [laeuft, setLaeuft] = useState(false);

  const abschliessen = async (status: "beantwortet" | "verworfen") => {
    setLaeuft(true);
    let wissenId: number | null = null;
    if (status === "beantwortet") {
      const { data, error } = await supabase
        .from("telefon_wissen")
        .insert({ frage: frage.trim(), antwort: antwort.trim() })
        .select("id")
        .single();
      if (error) {
        setLaeuft(false);
        return notify(error.message, { type: "error" });
      }
      wissenId = data.id;
    }
    const { error } = await supabase
      .from("telefon_wissensluecke")
      .update({
        status,
        wissen_id: wissenId,
        bearbeitet_am: new Date().toISOString(),
      })
      .eq("id", luecke.id);
    setLaeuft(false);
    if (error) return notify(error.message, { type: "error" });
    notify(
      status === "beantwortet"
        ? "Gespeichert. Der Assistent kennt die Antwort ab dem nächsten Anruf."
        : "Verworfen.",
      { type: "success" },
    );
    geaendert();
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="body2" color="text.secondary">
          {zeitpunkt(luecke.created_at)}
        </Typography>
        <Stack gap={1.5} sx={{ mt: 1 }}>
          <TextField
            label="Frage des Anrufers"
            value={frage}
            onChange={(e) => setFrage(e.target.value)}
            size="small"
            fullWidth
          />
          <TextField
            label="Antwort für den Assistenten"
            value={antwort}
            onChange={(e) => setAntwort(e.target.value)}
            size="small"
            fullWidth
            multiline
            minRows={2}
            placeholder="So würden Sie es einem Kunden am Telefon sagen"
          />
          <Stack direction="row" gap={1}>
            <Button
              variant="contained"
              disabled={laeuft || frage.trim().length < 3 || !antwort.trim()}
              onClick={() => abschliessen("beantwortet")}
            >
              Antwort speichern
            </Button>
            <Button disabled={laeuft} onClick={() => abschliessen("verworfen")}>
              Verwerfen
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
};

const WissenListe = () => {
  const notify = useNotify();
  const [eintraege, setEintraege] = useState<Wissen[]>([]);
  const [frage, setFrage] = useState("");
  const [antwort, setAntwort] = useState("");

  const laden = useCallback(() => {
    supabase
      .from("telefon_wissen")
      .select("id, frage, antwort, aktiv")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) return notify(error.message, { type: "error" });
        setEintraege((data ?? []) as Wissen[]);
      });
  }, [notify]);
  useEffect(laden, [laden]);

  const hinzufuegen = async () => {
    const { error } = await supabase
      .from("telefon_wissen")
      .insert({ frage: frage.trim(), antwort: antwort.trim() });
    if (error) return notify(error.message, { type: "error" });
    setFrage("");
    setAntwort("");
    laden();
  };
  const umschalten = async (w: Wissen) => {
    const { error } = await supabase
      .from("telefon_wissen")
      .update({ aktiv: !w.aktiv })
      .eq("id", w.id);
    if (error) return notify(error.message, { type: "error" });
    laden();
  };
  const loeschen = async (w: Wissen) => {
    if (!window.confirm(`„${w.frage}“ löschen?`)) return;
    const { error } = await supabase
      .from("telefon_wissen")
      .delete()
      .eq("id", w.id);
    if (error) return notify(error.message, { type: "error" });
    laden();
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6">Wissen des Assistenten</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Häufige Fragen mit Antwort (z. B. Parken, Zahlungsarten,
          Kassenzuschuss, Reparaturen). Öffnungszeiten und Terminarten kommen
          automatisch aus „Online-Anfragen“.
        </Typography>
        <Stack gap={1.5}>
          {eintraege.map((w) => (
            <Stack
              key={w.id}
              direction="row"
              gap={1}
              alignItems="flex-start"
              sx={{ opacity: w.aktiv ? 1 : 0.5 }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography fontWeight={600}>{w.frage}</Typography>
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                  {w.antwort}
                </Typography>
              </Box>
              <Tooltip title={w.aktiv ? "Aktiv" : "Ausgeschaltet"}>
                <Switch checked={w.aktiv} onChange={() => umschalten(w)} />
              </Tooltip>
              <Tooltip title="Löschen">
                <IconButton onClick={() => loeschen(w)}>
                  <DeleteOutlineIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          ))}
          <TextField
            label="Neue Frage"
            value={frage}
            onChange={(e) => setFrage(e.target.value)}
            size="small"
          />
          <TextField
            label="Antwort"
            value={antwort}
            onChange={(e) => setAntwort(e.target.value)}
            size="small"
            multiline
            minRows={2}
          />
          <Box>
            <Button
              variant="outlined"
              disabled={frage.trim().length < 3 || !antwort.trim()}
              onClick={hinzufuegen}
            >
              Hinzufügen
            </Button>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};

export const TelefonAssistentSeite = () => {
  const [anrufe, setAnrufe] = useState<Anruf[] | null>(null);
  const [luecken, setLuecken] = useState<Luecke[]>([]);
  const [fehler, setFehler] = useState("");

  const laden = useCallback(() => {
    supabase
      .from("telefon_anruf")
      .select("*, kunde:kunde_id(Vorname, Nachname)")
      .order("created_at", { ascending: false })
      .limit(80)
      .then(({ data, error }) => {
        if (error) return setFehler(error.message);
        setAnrufe((data ?? []) as Anruf[]);
      });
    supabase
      .from("telefon_wissensluecke")
      .select("id, created_at, frage, conversation_id")
      .eq("status", "offen")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) return setFehler(error.message);
        setLuecken((data ?? []) as Luecke[]);
      });
    window.dispatchEvent(new Event(TELEFON_GEAENDERT));
  }, []);
  useEffect(laden, [laden]);

  const offene = (anrufe ?? []).filter(
    (a) => a.rueckruf_erbeten && !a.erledigt_am,
  );
  const uebrige = (anrufe ?? []).filter((a) => !offene.includes(a));

  return (
    <Box sx={{ p: 2, maxWidth: 1100 }}>
      <Title title="Telefon-Assistent" />
      <Stack gap={2}>
        {fehler && <Alert severity="error">{fehler}</Alert>}

        <Typography variant="h5">Rückrufbitten</Typography>
        {anrufe && offene.length === 0 && (
          <Alert severity="info">Keine offenen Rückrufbitten.</Alert>
        )}
        {offene.map((a) => (
          <AnrufKarte key={a.id} anruf={a} geaendert={laden} />
        ))}

        {luecken.length > 0 && (
          <>
            <Typography variant="h5" sx={{ mt: 2 }}>
              Fragen ohne Antwort ({luecken.length})
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Diese Fragen konnte der Assistent nicht beantworten. Eine Antwort
              hier kennt er ab dem nächsten Anruf.
            </Typography>
            {luecken.map((l) => (
              <LueckeKarte key={l.id} luecke={l} geaendert={laden} />
            ))}
          </>
        )}

        <Typography variant="h5" sx={{ mt: 2 }}>
          Alle Anrufe
        </Typography>
        {anrufe && uebrige.length === 0 && (
          <Alert severity="info">
            Noch keine Anrufe. Sobald der Assistent eingerichtet ist, erscheinen
            hier alle Gespräche mit Zusammenfassung.
          </Alert>
        )}
        {uebrige.map((a) => (
          <AnrufKarte key={a.id} anruf={a} geaendert={laden} />
        ))}

        <WissenListe />
      </Stack>
    </Box>
  );
};
