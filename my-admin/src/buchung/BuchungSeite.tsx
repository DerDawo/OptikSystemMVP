import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  FormControlLabel,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { supabase } from "../utils";
import {
  HOEHE_NACHRICHT,
  nachTagen,
  tagKurz,
  tagLang,
  terminText,
  uhrzeit,
  type BuchungKonfiguration,
  type Terminart,
} from "./buchungLogik";

/*
 * Öffentliche Buchungsseite (buchen.html, ohne Anmeldung, auf der Website
 * eingebettet): Terminart -> Tag -> Uhrzeit -> Kontaktdaten -> Anfrage.
 * Sie spricht nur die Funktionen buchung_konfiguration, buchung_freie_zeiten
 * und buchung_anfragen an; Termine oder Kundendaten sieht sie nicht.
 */

const fehlerText = (fehler: unknown) =>
  (fehler as { message?: string })?.message ||
  "Das hat leider nicht geklappt. Bitte versuchen Sie es später noch einmal.";

// Höhe an die Website melden, damit das eingebettete Fenster mitwächst
const useHoeheMelden = () => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current || window.parent === window) return;
    const melden = () =>
      window.parent.postMessage(
        {
          typ: HOEHE_NACHRICHT,
          hoehe: Math.ceil(document.documentElement.scrollHeight) + 8,
        },
        "*",
      );
    const beobachter = new ResizeObserver(melden);
    beobachter.observe(ref.current);
    return () => beobachter.disconnect();
  }, []);
  return ref;
};

export const BuchungSeite = () => {
  const rahmen = useHoeheMelden();
  const [konf, setKonf] = useState<BuchungKonfiguration | null>(null);
  const [ladeFehler, setLadeFehler] = useState("");
  const [art, setArt] = useState<Terminart | null>(null);
  const [zeiten, setZeiten] = useState<string[] | null>(null);
  const [tag, setTag] = useState("");
  const [start, setStart] = useState("");
  const [daten, setDaten] = useState({
    vorname: "",
    nachname: "",
    email: "",
    telefon: "",
    nachricht: "",
  });
  const [einwilligung, setEinwilligung] = useState(false);
  const [sendet, setSendet] = useState(false);
  const [fehler, setFehler] = useState("");
  const [fertig, setFertig] = useState(false);

  useEffect(() => {
    supabase
      .rpc("buchung_konfiguration")
      .then(({ data, error }) =>
        error ? setLadeFehler(fehlerText(error)) : setKonf(data),
      );
  }, []);

  const ladeZeiten = (terminart: Terminart) => {
    setZeiten(null);
    supabase
      .rpc("buchung_freie_zeiten", { p_terminart_id: terminart.id })
      .then(({ data, error }) => {
        if (error) return setLadeFehler(fehlerText(error));
        setZeiten(((data ?? []) as { start: string }[]).map((z) => z.start));
      });
  };

  const tage = useMemo(() => nachTagen(zeiten ?? []), [zeiten]);
  const zeitenDesTags = tage.find((t) => t.tag === tag)?.zeiten ?? [];

  const waehleArt = (terminart: Terminart) => {
    setArt(terminart);
    setTag("");
    setStart("");
    setFehler("");
    ladeZeiten(terminart);
  };

  const absenden = async () => {
    if (!art || !start) return;
    setSendet(true);
    setFehler("");
    const { error } = await supabase.rpc("buchung_anfragen", {
      p_terminart_id: art.id,
      p_start: start,
      p_vorname: daten.vorname,
      p_nachname: daten.nachname,
      p_email: daten.email,
      p_telefon: daten.telefon,
      p_nachricht: daten.nachricht,
      p_einwilligung: einwilligung,
    });
    setSendet(false);
    if (error) {
      setFehler(fehlerText(error));
      // Termin inzwischen vergeben: Zeiten neu laden
      if (/nicht mehr frei/.test(error.message)) {
        setStart("");
        ladeZeiten(art);
      }
      return;
    }
    setFertig(true);
  };

  const feld = (name: keyof typeof daten, label: string, extra = {}) => (
    <TextField
      label={label}
      value={daten[name]}
      onChange={(e) => setDaten((d) => ({ ...d, [name]: e.target.value }))}
      size="small"
      fullWidth
      {...extra}
    />
  );

  const kontaktOk =
    daten.vorname.trim() &&
    daten.nachname.trim() &&
    (daten.email.trim() || daten.telefon.trim()) &&
    einwilligung;

  let inhalt;
  if (ladeFehler) inhalt = <Alert severity="error">{ladeFehler}</Alert>;
  else if (!konf) inhalt = <CircularProgress size={28} />;
  else if (!konf.aktiv || konf.terminarten.length === 0)
    inhalt = (
      <Alert severity="info">
        Die Online-Terminbuchung ist gerade nicht verfügbar.
        {konf.telefon ? ` Bitte rufen Sie uns an: ${konf.telefon}` : ""}
      </Alert>
    );
  else if (fertig && art)
    inhalt = (
      <Alert severity="success">
        <b>Vielen Dank, Ihre Anfrage ist bei uns eingegangen.</b>
        <br />
        {art.name} am {terminText({ Start: start })}.
        <br />
        Wir bestätigen Ihnen den Termin in Kürze per E-Mail oder Telefon. Erst
        mit unserer Bestätigung ist der Termin fest.
      </Alert>
    );
  else
    inhalt = (
      <Stack spacing={2.5}>
        {konf.hinweis && <Alert severity="info">{konf.hinweis}</Alert>}
        <Box>
          <Typography fontWeight={700} gutterBottom>
            1. Worum geht es?
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={1}>
            {konf.terminarten.map((t) => (
              <Chip
                key={t.id}
                label={`${t.name} (${t.dauer_min} Min.)`}
                color={art?.id === t.id ? "primary" : "default"}
                variant={art?.id === t.id ? "filled" : "outlined"}
                onClick={() => waehleArt(t)}
              />
            ))}
          </Stack>
        </Box>

        {art && (
          <Box>
            <Typography fontWeight={700} gutterBottom>
              2. Tag wählen
            </Typography>
            {zeiten === null ? (
              <CircularProgress size={24} />
            ) : tage.length === 0 ? (
              <Alert severity="info">
                Für diese Terminart ist online gerade kein Termin frei.
                {konf.telefon ? ` Bitte rufen Sie uns an: ${konf.telefon}` : ""}
              </Alert>
            ) : (
              <Stack direction="row" flexWrap="wrap" gap={1}>
                {tage.map((t) => (
                  <Chip
                    key={t.tag}
                    label={tagKurz(t.tag)}
                    color={tag === t.tag ? "primary" : "default"}
                    variant={tag === t.tag ? "filled" : "outlined"}
                    onClick={() => {
                      setTag(t.tag);
                      setStart("");
                    }}
                  />
                ))}
              </Stack>
            )}
          </Box>
        )}

        {tag && (
          <Box>
            <Typography fontWeight={700} gutterBottom>
              3. Uhrzeit am {tagLang(tag)}
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={1}>
              {zeitenDesTags.map((z) => (
                <Chip
                  key={z}
                  label={uhrzeit(z)}
                  color={start === z ? "primary" : "default"}
                  variant={start === z ? "filled" : "outlined"}
                  onClick={() => setStart(z)}
                />
              ))}
            </Stack>
          </Box>
        )}

        {start && (
          <Box>
            <Typography fontWeight={700} gutterBottom>
              4. Ihre Angaben
            </Typography>
            <Stack spacing={1.5}>
              <Stack direction={{ xs: "column", sm: "row" }} gap={1.5}>
                {feld("vorname", "Vorname *", { autoComplete: "given-name" })}
                {feld("nachname", "Nachname *", {
                  autoComplete: "family-name",
                })}
              </Stack>
              <Stack direction={{ xs: "column", sm: "row" }} gap={1.5}>
                {feld("email", "E-Mail", {
                  type: "email",
                  autoComplete: "email",
                })}
                {feld("telefon", "Telefon", {
                  type: "tel",
                  autoComplete: "tel",
                })}
              </Stack>
              <Typography variant="caption" color="text.secondary">
                * Pflichtfeld. Bitte E-Mail oder Telefon angeben, damit wir
                Ihnen den Termin bestätigen können.
              </Typography>
              {feld("nachricht", "Nachricht (optional)", {
                multiline: true,
                minRows: 2,
              })}
              <FormControlLabel
                control={
                  <Checkbox
                    checked={einwilligung}
                    onChange={(e) => setEinwilligung(e.target.checked)}
                  />
                }
                label={
                  <Typography variant="body2">
                    Ich bin einverstanden, dass meine Angaben zur Bearbeitung
                    der Terminanfrage gespeichert und verwendet werden. *
                  </Typography>
                }
              />
              {fehler && <Alert severity="error">{fehler}</Alert>}
              <Box>
                <Button
                  variant="contained"
                  disabled={!kontaktOk || sendet}
                  onClick={absenden}
                >
                  {sendet ? "Wird gesendet …" : "Termin anfragen"}
                </Button>
              </Box>
              <Typography variant="caption" color="text.secondary">
                {art?.name} am {terminText({ Start: start })}. Der Termin ist
                erst nach unserer Bestätigung fest.
              </Typography>
            </Stack>
          </Box>
        )}
      </Stack>
    );

  return (
    <Box ref={rahmen} sx={{ maxWidth: 720, mx: "auto", p: 2 }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Termin online anfragen
      </Typography>
      {konf?.firma && (
        <Typography color="text.secondary" gutterBottom>
          {konf.firma}
        </Typography>
      )}
      <Box sx={{ mt: 2 }}>{inhalt}</Box>
    </Box>
  );
};
