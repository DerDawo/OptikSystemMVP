import { useCallback, useEffect, useState } from "react";
import { Title, useNotify } from "react-admin";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  Switch,
  FormControlLabel,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AddIcon from "@mui/icons-material/Add";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import EmailIcon from "@mui/icons-material/Email";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import { supabase } from "./utils";
import { RECHNUNG_ABSENDER } from "./rechnungTemplate";
import {
  buildExternalMessageUrl,
  choosePhoneNumberForMessaging,
  openExternalMessage,
} from "./messaging";
import {
  absageText,
  bestaetigungText,
  einbauCode,
  terminText,
  type Anfrage,
} from "./buchung/buchungLogik";

/*
 * Menü "Online-Anfragen": Terminanfragen von der Buchungsseite der Website
 * bestätigen (Kunde zuordnen oder neu anlegen, Termin in den Kalender) oder
 * ablehnen, danach Bestätigung/Absage per E-Mail oder WhatsApp schicken.
 * Darunter die Einstellungen der Buchung (an/aus, Öffnungszeiten,
 * Terminarten) und der Einbau-Code für die Website.
 */

type AnfrageZeile = Anfrage & {
  created_at: string;
  nachricht?: string | null;
  status: "offen" | "bestaetigt" | "abgelehnt";
  kunde_id?: number | null;
};
type Kunde = {
  id: number;
  Vorname?: string;
  Nachname?: string;
  Geburtsdatum?: string;
  Email?: string;
};
type Einstellung = {
  aktiv: boolean;
  vorlauf_stunden: number;
  tage_im_voraus: number;
  raster_min: number;
  hinweis: string | null;
};
type Oeffnungszeit = {
  id?: number;
  wochentag: number;
  von: string;
  bis: string;
};
type TerminartZeile = {
  id?: number;
  name: string;
  dauer_min: number;
  aktiv: boolean;
  reihenfolge: number;
};

const WOCHENTAGE = [
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
  "Sonntag",
];

export const BUCHUNG_SEITE_URL = `${window.location.origin}/buchen`;

// Anzahl offener Anfragen fürs Menü
export const useOffeneAnfragen = () => {
  const [anzahl, setAnzahl] = useState(0);
  useEffect(() => {
    const laden = () =>
      supabase
        .from("buchung_anfrage")
        .select("id", { count: "exact", head: true })
        .eq("status", "offen")
        .then(({ count }) => setAnzahl(count ?? 0));
    laden();
    const timer = window.setInterval(laden, 120_000);
    window.addEventListener(ANFRAGEN_GEAENDERT, laden);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener(ANFRAGEN_GEAENDERT, laden);
    };
  }, []);
  return anzahl;
};
const ANFRAGEN_GEAENDERT = "online-anfragen-geaendert";

const datumZeit = (iso: string) =>
  new Date(iso).toLocaleString("de-DE", {
    timeZone: "Europe/Berlin",
    dateStyle: "short",
    timeStyle: "short",
  });

// Bestätigung/Absage an den Kunden: E-Mail oder WhatsApp mit fertigem Text
const NachrichtDialog = ({
  anfrage,
  text,
  titel,
  onClose,
}: {
  anfrage: AnfrageZeile;
  text: string;
  titel: string;
  onClose: () => void;
}) => {
  const [inhalt, setInhalt] = useState(text);
  const handy = choosePhoneNumberForMessaging([anfrage.telefon]);
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{titel}</DialogTitle>
      <DialogContent>
        <TextField
          value={inhalt}
          onChange={(e) => setInhalt(e.target.value)}
          multiline
          minRows={7}
          fullWidth
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions sx={{ flexWrap: "wrap", gap: 1 }}>
        <Button
          startIcon={<EmailIcon />}
          disabled={!anfrage.email}
          onClick={() =>
            openExternalMessage(
              buildExternalMessageUrl("email", {
                to: anfrage.email ?? "",
                subject: `Ihr Termin bei ${RECHNUNG_ABSENDER.firma}`,
                message: inhalt,
              }),
            )
          }
        >
          Per E-Mail
        </Button>
        <Button
          startIcon={<WhatsAppIcon />}
          disabled={!handy}
          sx={{ color: "#1da851" }}
          onClick={() =>
            openExternalMessage(
              buildExternalMessageUrl("whatsapp", {
                to: handy,
                message: inhalt,
              }),
            )
          }
        >
          Per WhatsApp
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose}>Fertig</Button>
      </DialogActions>
    </Dialog>
  );
};

const AnfrageKarte = ({
  anfrage,
  geaendert,
}: {
  anfrage: AnfrageZeile;
  geaendert: () => void;
}) => {
  const notify = useNotify();
  const [treffer, setTreffer] = useState<Kunde[]>([]);
  const [kundeWahl, setKundeWahl] = useState<string>("neu");
  const [laeuft, setLaeuft] = useState(false);
  const [nachricht, setNachricht] = useState<"bestaetigt" | "abgelehnt" | null>(
    null,
  );
  const offen = anfrage.status === "offen";

  // vorhandene Kunden mit gleichem Namen vorschlagen
  useEffect(() => {
    if (!offen) return;
    supabase
      .from("kunde")
      .select("id, Vorname, Nachname, Geburtsdatum, Email")
      .ilike("Nachname", anfrage.nachname)
      .ilike("Vorname", anfrage.vorname)
      .limit(5)
      .then(({ data }) => {
        const liste = (data ?? []) as Kunde[];
        setTreffer(liste);
        const gleicheMail = liste.find(
          (k) =>
            anfrage.email &&
            k.Email?.toLowerCase() === anfrage.email.toLowerCase(),
        );
        if (gleicheMail) setKundeWahl(String(gleicheMail.id));
        else if (liste.length === 1) setKundeWahl(String(liste[0].id));
      });
  }, [offen, anfrage.nachname, anfrage.vorname, anfrage.email]);

  const bestaetigen = async () => {
    setLaeuft(true);
    const { error } = await supabase.rpc("buchung_bestaetigen", {
      p_anfrage_id: anfrage.id,
      p_kunde_id: kundeWahl === "neu" ? null : Number(kundeWahl),
    });
    setLaeuft(false);
    if (error) return notify(error.message, { type: "error" });
    notify("Termin steht im Kalender.", { type: "success" });
    setNachricht("bestaetigt");
  };

  const ablehnen = async () => {
    setLaeuft(true);
    const { error } = await supabase
      .from("buchung_anfrage")
      .update({ status: "abgelehnt", bearbeitet_am: new Date().toISOString() })
      .eq("id", anfrage.id);
    setLaeuft(false);
    if (error) return notify(error.message, { type: "error" });
    setNachricht("abgelehnt");
  };

  return (
    <Card variant="outlined" sx={{ opacity: offen ? 1 : 0.7 }}>
      <CardContent>
        <Stack
          direction={{ xs: "column", md: "row" }}
          gap={2}
          justifyContent="space-between"
        >
          <Box>
            <Typography fontWeight={700}>
              {anfrage.terminart} · {terminText(anfrage)}
            </Typography>
            <Typography>
              {anfrage.vorname} {anfrage.nachname}
              {anfrage.email ? ` · ${anfrage.email}` : ""}
              {anfrage.telefon ? ` · ${anfrage.telefon}` : ""}
            </Typography>
            {anfrage.nachricht && (
              <Typography
                variant="body2"
                sx={{ whiteSpace: "pre-wrap", mt: 0.5 }}
              >
                „{anfrage.nachricht}“
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary">
              angefragt am {datumZeit(anfrage.created_at)}
            </Typography>
          </Box>
          {offen ? (
            <Stack gap={1} sx={{ minWidth: 280 }}>
              <TextField
                select
                size="small"
                label="Kunde"
                value={kundeWahl}
                onChange={(e) => setKundeWahl(e.target.value)}
              >
                <MenuItem value="neu">Neuen Kunden anlegen</MenuItem>
                {treffer.map((k) => (
                  <MenuItem key={k.id} value={String(k.id)}>
                    {k.Vorname} {k.Nachname}
                    {k.Geburtsdatum
                      ? ` (${new Date(k.Geburtsdatum).toLocaleDateString("de-DE")})`
                      : ""}{" "}
                    · Nr. {k.id}
                  </MenuItem>
                ))}
              </TextField>
              <Stack direction="row" gap={1}>
                <Button
                  variant="contained"
                  disabled={laeuft}
                  onClick={bestaetigen}
                >
                  Bestätigen
                </Button>
                <Button color="error" disabled={laeuft} onClick={ablehnen}>
                  Ablehnen
                </Button>
              </Stack>
            </Stack>
          ) : (
            <Chip
              label={
                anfrage.status === "bestaetigt" ? "bestätigt" : "abgelehnt"
              }
              color={anfrage.status === "bestaetigt" ? "success" : "default"}
            />
          )}
        </Stack>
      </CardContent>
      {nachricht && (
        <NachrichtDialog
          anfrage={anfrage}
          titel={
            nachricht === "bestaetigt"
              ? "Bestätigung an den Kunden"
              : "Absage an den Kunden"
          }
          text={(nachricht === "bestaetigt" ? bestaetigungText : absageText)(
            anfrage,
            RECHNUNG_ABSENDER.firma,
          )}
          onClose={() => {
            setNachricht(null);
            geaendert();
          }}
        />
      )}
    </Card>
  );
};

const Einstellungen = () => {
  const notify = useNotify();
  const [e, setE] = useState<Einstellung | null>(null);
  const [zeiten, setZeiten] = useState<Oeffnungszeit[]>([]);
  const [arten, setArten] = useState<TerminartZeile[]>([]);
  const [speichert, setSpeichert] = useState(false);

  useEffect(() => {
    supabase
      .from("buchung_einstellung")
      .select("aktiv, vorlauf_stunden, tage_im_voraus, raster_min, hinweis")
      .eq("id", 1)
      .single()
      .then(({ data }) => setE(data as Einstellung));
    supabase
      .from("buchung_oeffnungszeit")
      .select("id, wochentag, von, bis")
      .order("wochentag")
      .order("von")
      .then(({ data }) =>
        setZeiten(
          ((data ?? []) as Oeffnungszeit[]).map((z) => ({
            ...z,
            von: z.von.slice(0, 5),
            bis: z.bis.slice(0, 5),
          })),
        ),
      );
    supabase
      .from("buchung_terminart")
      .select("id, name, dauer_min, aktiv, reihenfolge")
      .order("reihenfolge")
      .then(({ data }) => setArten((data ?? []) as TerminartZeile[]));
  }, []);

  const speichern = async () => {
    if (!e) return;
    const fehlerhaft = zeiten.find((z) => !z.von || !z.bis || z.von >= z.bis);
    if (fehlerhaft)
      return notify(
        `Öffnungszeit am ${WOCHENTAGE[fehlerhaft.wochentag - 1]}: „von“ muss vor „bis“ liegen.`,
        { type: "error" },
      );
    setSpeichert(true);
    const fehler = [
      (await supabase.from("buchung_einstellung").update(e).eq("id", 1)).error,
      // Öffnungszeiten komplett ersetzen
      (await supabase.from("buchung_oeffnungszeit").delete().gt("id", 0)).error,
      zeiten.length
        ? (
            await supabase.from("buchung_oeffnungszeit").insert(
              zeiten.map(({ wochentag, von, bis }) => ({
                wochentag,
                von,
                bis,
              })),
            )
          ).error
        : null,
      ...(await Promise.all(
        arten.map(async (a, i) => {
          const zeile = {
            name: a.name.trim(),
            dauer_min: a.dauer_min,
            aktiv: a.aktiv,
            reihenfolge: i + 1,
          };
          return a.id
            ? (
                await supabase
                  .from("buchung_terminart")
                  .update(zeile)
                  .eq("id", a.id)
              ).error
            : (await supabase.from("buchung_terminart").insert(zeile)).error;
        }),
      )),
    ].find(Boolean);
    setSpeichert(false);
    if (fehler) return notify(fehler.message, { type: "error" });
    notify("Einstellungen der Online-Buchung gespeichert.", {
      type: "success",
    });
  };

  if (!e) return null;
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack gap={2}>
          <Typography variant="h6">Einstellungen</Typography>
          <FormControlLabel
            control={
              <Switch
                checked={e.aktiv}
                onChange={(ev) => setE({ ...e, aktiv: ev.target.checked })}
              />
            }
            label={
              e.aktiv
                ? "Online-Buchung ist eingeschaltet"
                : "Online-Buchung ist ausgeschaltet (die Website zeigt „gerade nicht verfügbar“)"
            }
          />
          <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
            <TextField
              label="Frühestens in … Stunden"
              type="number"
              size="small"
              value={e.vorlauf_stunden}
              onChange={(ev) =>
                setE({ ...e, vorlauf_stunden: Number(ev.target.value) })
              }
            />
            <TextField
              label="Höchstens … Tage im Voraus"
              type="number"
              size="small"
              value={e.tage_im_voraus}
              onChange={(ev) =>
                setE({ ...e, tage_im_voraus: Number(ev.target.value) })
              }
            />
            <TextField
              select
              label="Startzeiten alle"
              size="small"
              value={e.raster_min}
              onChange={(ev) =>
                setE({ ...e, raster_min: Number(ev.target.value) })
              }
              sx={{ minWidth: 160 }}
            >
              {[10, 15, 20, 30, 60].map((m) => (
                <MenuItem key={m} value={m}>
                  {m} Minuten
                </MenuItem>
              ))}
            </TextField>
          </Stack>
          <TextField
            label="Hinweis oben auf der Buchungsseite (optional)"
            size="small"
            value={e.hinweis ?? ""}
            onChange={(ev) => setE({ ...e, hinweis: ev.target.value || null })}
          />

          <Typography fontWeight={700}>Öffnungszeiten für Termine</Typography>
          <Typography variant="body2" color="text.secondary">
            Nur in diesen Zeiten werden Termine angeboten. Für die Mittagspause
            einen Tag zweimal eintragen. Feiertage und Urlaub: im Terminkalender
            einen Termin über den Zeitraum eintragen, dann ist er belegt.
          </Typography>
          {WOCHENTAGE.map((name, i) => {
            const tag = i + 1;
            return (
              <Stack
                key={name}
                direction="row"
                gap={1}
                alignItems="center"
                flexWrap="wrap"
              >
                <Typography sx={{ width: 100 }}>{name}</Typography>
                {zeiten.map((z, j) =>
                  z.wochentag !== tag ? null : (
                    <Stack
                      key={j}
                      direction="row"
                      gap={0.5}
                      alignItems="center"
                    >
                      {(["von", "bis"] as const).map((feld) => (
                        <TextField
                          key={feld}
                          type="time"
                          size="small"
                          value={z[feld]}
                          onChange={(ev) =>
                            setZeiten(
                              zeiten.map((x, k) =>
                                k === j ? { ...x, [feld]: ev.target.value } : x,
                              ),
                            )
                          }
                          slotProps={{ htmlInput: { step: 300 } }}
                        />
                      ))}
                      <IconButton
                        size="small"
                        aria-label="Zeit entfernen"
                        onClick={() =>
                          setZeiten(zeiten.filter((_, k) => k !== j))
                        }
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  ),
                )}
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() =>
                    setZeiten([
                      ...zeiten,
                      { wochentag: tag, von: "09:00", bis: "12:00" },
                    ])
                  }
                >
                  Zeit
                </Button>
              </Stack>
            );
          })}

          <Typography fontWeight={700}>Terminarten</Typography>
          {arten.map((a, i) => (
            <Stack
              key={a.id ?? `neu-${i}`}
              direction="row"
              gap={1}
              alignItems="center"
            >
              <TextField
                size="small"
                label="Name"
                value={a.name}
                onChange={(ev) =>
                  setArten(
                    arten.map((x, k) =>
                      k === i ? { ...x, name: ev.target.value } : x,
                    ),
                  )
                }
                sx={{ flex: 1 }}
              />
              <TextField
                size="small"
                label="Minuten"
                type="number"
                value={a.dauer_min}
                onChange={(ev) =>
                  setArten(
                    arten.map((x, k) =>
                      k === i
                        ? { ...x, dauer_min: Number(ev.target.value) }
                        : x,
                    ),
                  )
                }
                sx={{ width: 110 }}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={a.aktiv}
                    onChange={(ev) =>
                      setArten(
                        arten.map((x, k) =>
                          k === i ? { ...x, aktiv: ev.target.checked } : x,
                        ),
                      )
                    }
                  />
                }
                label="online"
              />
            </Stack>
          ))}
          <Box>
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={() =>
                setArten([
                  ...arten,
                  {
                    name: "",
                    dauer_min: 30,
                    aktiv: true,
                    reihenfolge: arten.length + 1,
                  },
                ])
              }
            >
              Terminart
            </Button>
          </Box>
          <Box>
            <Button
              variant="contained"
              disabled={speichert}
              onClick={speichern}
            >
              {speichert ? "Wird gespeichert …" : "Einstellungen speichern"}
            </Button>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};

const EinbauCode = () => {
  const notify = useNotify();
  const code = einbauCode(BUCHUNG_SEITE_URL);
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack gap={1.5}>
          <Typography variant="h6">Auf der Website einbauen</Typography>
          <Typography variant="body2">
            In WordPress die Seite (z. B. „Termin“) bearbeiten, einen Block{" "}
            <b>„Individuelles HTML“</b> einfügen und diesen Code hineinkopieren.
            Direkter Link zum Teilen (Google-Profil, WhatsApp):{" "}
            <a href={BUCHUNG_SEITE_URL} target="_blank" rel="noreferrer">
              {BUCHUNG_SEITE_URL}
            </a>
          </Typography>
          <Box
            component="pre"
            sx={{
              m: 0,
              p: 1.5,
              bgcolor: "action.hover",
              borderRadius: 1,
              fontSize: 12,
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
            }}
          >
            {code}
          </Box>
          <Box>
            <Tooltip title="In die Zwischenablage">
              <Button
                startIcon={<ContentCopyIcon />}
                onClick={() =>
                  navigator.clipboard
                    .writeText(code)
                    .then(() => notify("Code kopiert.", { type: "info" }))
                }
              >
                Code kopieren
              </Button>
            </Tooltip>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};

export const OnlineAnfragenSeite = () => {
  const [anfragen, setAnfragen] = useState<AnfrageZeile[] | null>(null);
  const [fehler, setFehler] = useState("");

  const laden = useCallback(() => {
    supabase
      .from("buchung_anfrage")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(60)
      .then(({ data, error }) => {
        if (error) return setFehler(error.message);
        setAnfragen((data ?? []) as AnfrageZeile[]);
        window.dispatchEvent(new Event(ANFRAGEN_GEAENDERT));
      });
  }, []);
  useEffect(laden, [laden]);

  const offene = (anfragen ?? [])
    .filter((a) => a.status === "offen")
    .sort((a, b) => a.Start.localeCompare(b.Start));
  const erledigt = (anfragen ?? []).filter((a) => a.status !== "offen");

  return (
    <Box sx={{ p: 2, maxWidth: 1100 }}>
      <Title title="Online-Anfragen" />
      <Stack gap={2}>
        <Typography variant="h5">Online-Terminanfragen</Typography>
        {fehler && <Alert severity="error">{fehler}</Alert>}
        {anfragen && offene.length === 0 && (
          <Alert severity="info">Keine offenen Anfragen.</Alert>
        )}
        {offene.map((a) => (
          <AnfrageKarte key={a.id} anfrage={a} geaendert={laden} />
        ))}
        {erledigt.length > 0 && (
          <>
            <Typography fontWeight={700} sx={{ mt: 1 }}>
              Zuletzt bearbeitet
            </Typography>
            {erledigt.slice(0, 15).map((a) => (
              <AnfrageKarte key={a.id} anfrage={a} geaendert={laden} />
            ))}
          </>
        )}
        <Einstellungen />
        <EinbauCode />
      </Stack>
    </Box>
  );
};
