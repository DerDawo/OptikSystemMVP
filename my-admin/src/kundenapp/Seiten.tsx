import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  MenuItem,
  Radio,
  RadioGroup,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import PhoneIcon from "@mui/icons-material/Phone";
import { aufrufen, fehlerText } from "./api";
import {
  KONTAKTWEGE,
  STATUS_SCHRITTE,
  WERBE_KANAELE,
  euro,
  kanaeleAusText,
  kommendeTermine,
  kundenRechnungen,
  laufendeAuftraege,
  vergangeneTermine,
  type Glas,
  type PortalBrille,
  type PortalDaten,
  type PortalTermin,
} from "./kundenAppLogik";
import {
  nachTagen,
  tagKurz,
  terminText,
  uhrzeit,
  type BuchungKonfiguration,
  type Terminart,
} from "../buchung/buchungLogik";

export type Seite = "start" | "termine" | "pass" | "rechnungen" | "nachrichten";

type Props = {
  daten: PortalDaten;
  aktion: (
    name: string,
    argumente: Record<string, unknown>,
  ) => Promise<unknown>;
  wechseln: (s: Seite) => void;
  firma: string;
};

// --- kleine Bausteine ---------------------------------------------------------

const datum = (iso?: string | null) =>
  iso
    ? new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString(
        "de-DE",
        {
          timeZone: "Europe/Berlin",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        },
      )
    : "";

const zeitpunkt = (iso: string) =>
  new Date(iso).toLocaleString("de-DE", {
    timeZone: "Europe/Berlin",
    dateStyle: "short",
    timeStyle: "short",
  });

const Karte = ({
  titel,
  children,
  aktion,
}: {
  titel?: string;
  children: ReactNode;
  aktion?: ReactNode;
}) => (
  <Card variant="outlined" sx={{ mb: 2, borderRadius: 3 }}>
    <CardContent>
      {(titel || aktion) && (
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 1 }}
        >
          {titel && (
            <Typography fontWeight={700} fontSize="1.05rem">
              {titel}
            </Typography>
          )}
          {aktion}
        </Stack>
      )}
      {children}
    </CardContent>
  </Card>
);

const Ueberschrift = ({ children }: { children: ReactNode }) => (
  <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
    {children}
  </Typography>
);

const dioptrien = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: "exceptZero",
});
const zwei = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
});

const zahl = (w: unknown) => {
  if (w === null || w === undefined || w === "") return null;
  const n = Number(w);
  return Number.isFinite(n) ? n : null;
};
const dpt = (w: unknown) => {
  const n = zahl(w);
  return n === null ? "" : dioptrien.format(n);
};
const achse = (w: unknown) => {
  const n = zahl(w);
  return n === null ? "" : `${Math.round(n)}°`;
};
const dez = (w: unknown) => {
  const n = zahl(w);
  return n === null ? "" : zwei.format(n);
};

// Anfrage mit kurzem Dialog (Absage, Rechnungskopie)
const BestaetigenDialog = ({
  offen,
  titel,
  text,
  feld,
  knopf,
  schliessen,
  senden,
}: {
  offen: boolean;
  titel: string;
  text: string;
  feld?: string;
  knopf: string;
  schliessen: () => void;
  senden: (zusatz: string) => Promise<unknown>;
}) => {
  const [zusatz, setZusatz] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");
  useEffect(() => {
    if (offen) {
      setZusatz("");
      setFehler("");
    }
  }, [offen]);
  return (
    <Dialog open={offen} onClose={schliessen} fullWidth maxWidth="xs">
      <DialogTitle>{titel}</DialogTitle>
      <DialogContent>
        <Typography sx={{ mb: feld ? 2 : 0 }}>{text}</Typography>
        {feld && (
          <TextField
            label={feld}
            value={zusatz}
            onChange={(e) => setZusatz(e.target.value)}
            multiline
            minRows={2}
            fullWidth
          />
        )}
        {fehler && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {fehler}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={schliessen}>Abbrechen</Button>
        <Button
          variant="contained"
          disabled={laeuft}
          onClick={async () => {
            setLaeuft(true);
            try {
              await senden(zusatz.trim());
              schliessen();
            } catch (e) {
              setFehler(fehlerText(e));
            } finally {
              setLaeuft(false);
            }
          }}
        >
          {knopf}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// --- Start ----------------------------------------------------------------------

export const StartSeite = ({ daten, wechseln }: Props) => {
  const k = daten.kunde;
  const naechster = kommendeTermine(daten)[0];
  const auftraege = laufendeAuftraege(daten);
  const offen = kundenRechnungen(daten).reduce((s, r) => s + r.offen, 0);
  const b = daten.betrieb;
  const gruss =
    k?.Anrede === "Frau"
      ? `Hallo Frau ${k.Nachname}`
      : k?.Anrede === "Herr"
        ? `Hallo Herr ${k.Nachname}`
        : `Hallo ${k?.Vorname ?? ""}`;

  return (
    <>
      <Ueberschrift>{gruss.trim()}</Ueberschrift>

      <Karte titel="Ihre Aufträge">
        {auftraege.length === 0 ? (
          <Typography color="text.secondary">
            Zurzeit ist kein Auftrag in Arbeit.
          </Typography>
        ) : (
          <Stack gap={2.5}>
            {auftraege.map((a) => (
              <Box key={`${a.art}${a.id}`}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  gap={1}
                >
                  <Box>
                    <Typography fontWeight={600}>{a.titel}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Auftrag {a.id}
                      {a.datum ? ` vom ${datum(a.datum)}` : ""}
                    </Typography>
                  </Box>
                  <Chip
                    label={a.status.text}
                    color={a.status.farbe}
                    size="small"
                  />
                </Stack>
                <Stepper
                  activeStep={a.status.schritt}
                  alternativeLabel
                  sx={{
                    mt: 1.5,
                    "& .MuiStepLabel-label": {
                      fontSize: "0.72rem",
                      mt: "4px !important",
                    },
                  }}
                >
                  {STATUS_SCHRITTE.map((s) => (
                    <Step
                      key={s}
                      completed={
                        a.status.schritt > STATUS_SCHRITTE.indexOf(s) ||
                        a.status.schritt === 3
                      }
                    >
                      <StepLabel>{s}</StepLabel>
                    </Step>
                  ))}
                </Stepper>
                {a.status.schritt === 2 && (
                  <Alert severity="info" sx={{ mt: 1.5 }}>
                    Ihr Auftrag liegt zur Abholung bereit. Wir freuen uns auf
                    Ihren Besuch!
                  </Alert>
                )}
              </Box>
            ))}
          </Stack>
        )}
      </Karte>

      <Karte
        titel="Nächster Termin"
        aktion={
          <Button size="small" onClick={() => wechseln("termine")}>
            Alle Termine
          </Button>
        }
      >
        {naechster ? (
          <>
            <Typography fontWeight={600}>{terminText(naechster)}</Typography>
            <Typography color="text.secondary">
              {naechster.Terminart}
            </Typography>
          </>
        ) : daten.anfragen.length > 0 ? (
          <Typography>
            Angefragt: {terminText(daten.anfragen[0])}. Wir bestätigen den
            Termin so bald wie möglich.
          </Typography>
        ) : (
          <Stack gap={1} alignItems="flex-start">
            <Typography color="text.secondary">Kein Termin geplant.</Typography>
            <Button variant="outlined" onClick={() => wechseln("termine")}>
              Termin anfragen
            </Button>
          </Stack>
        )}
      </Karte>

      {offen > 0 && (
        <Karte
          titel="Offene Beträge"
          aktion={
            <Button size="small" onClick={() => wechseln("rechnungen")}>
              Rechnungen
            </Button>
          }
        >
          <Typography fontSize="1.4rem" fontWeight={700}>
            {euro(offen)}
          </Typography>
        </Karte>
      )}

      <Karte titel="So erreichen Sie uns">
        <Stack gap={0.5}>
          <Typography fontWeight={600}>{b?.Firmenname || b?.Name}</Typography>
          {b?.Strasse && <Typography>{b.Strasse}</Typography>}
          {(b?.PLZ || b?.Ort) && (
            <Typography>
              {[b?.PLZ, b?.Ort].filter(Boolean).join(" ")}
            </Typography>
          )}
          <Stack direction="row" gap={1} sx={{ mt: 1 }} flexWrap="wrap">
            {b?.Telefon && (
              <Button
                variant="contained"
                startIcon={<PhoneIcon />}
                href={`tel:${b.Telefon.replace(/[^\d+]/g, "")}`}
              >
                Anrufen
              </Button>
            )}
            <Button variant="outlined" onClick={() => wechseln("nachrichten")}>
              Nachricht schreiben
            </Button>
          </Stack>
        </Stack>
      </Karte>
    </>
  );
};

// --- Termine ----------------------------------------------------------------------

const TerminAnfragen = ({
  aktion,
  fertig,
}: {
  aktion: Props["aktion"];
  fertig: () => void;
}) => {
  const [konf, setKonf] = useState<BuchungKonfiguration | null>(null);
  const [art, setArt] = useState<Terminart | null>(null);
  const [zeiten, setZeiten] = useState<string[] | null>(null);
  const [tag, setTag] = useState("");
  const [start, setStart] = useState("");
  const [nachricht, setNachricht] = useState("");
  const [fehler, setFehler] = useState("");
  const [laeuft, setLaeuft] = useState(false);

  useEffect(() => {
    aufrufen<BuchungKonfiguration>("buchung_konfiguration")
      .then(setKonf)
      .catch((e) => setFehler(fehlerText(e)));
  }, []);

  const tage = useMemo(() => nachTagen(zeiten ?? []), [zeiten]);
  const zeitenDesTags = tage.find((t) => t.tag === tag)?.zeiten ?? [];

  const waehleArt = (t: Terminart) => {
    setArt(t);
    setTag("");
    setStart("");
    setZeiten(null);
    aufrufen<{ start: string }[]>("buchung_freie_zeiten", {
      p_terminart_id: t.id,
    })
      .then((z) => {
        const liste = (z ?? []).map((x) => x.start);
        setZeiten(liste);
        if (liste.length) setTag(nachTagen(liste)[0].tag);
      })
      .catch((e) => setFehler(fehlerText(e)));
  };

  if (!konf)
    return fehler ? (
      <Alert severity="error">{fehler}</Alert>
    ) : (
      <CircularProgress size={24} />
    );
  if (!konf.aktiv) {
    return (
      <Alert severity="info">
        Termine können gerade nicht online angefragt werden. Schreiben Sie uns
        einfach eine Nachricht oder rufen Sie an.
      </Alert>
    );
  }

  return (
    <Stack gap={2}>
      {konf.hinweis && <Alert severity="info">{konf.hinweis}</Alert>}
      <Box>
        <Typography fontWeight={600} sx={{ mb: 1 }}>
          Worum geht es?
        </Typography>
        <Stack direction="row" gap={1} flexWrap="wrap">
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
      {art && zeiten === null && <CircularProgress size={24} />}
      {art && zeiten && tage.length === 0 && (
        <Alert severity="warning">
          Für diese Terminart ist gerade nichts frei. Bitte rufen Sie uns an.
        </Alert>
      )}
      {art && tage.length > 0 && (
        <>
          <Box>
            <Typography fontWeight={600} sx={{ mb: 1 }}>
              Tag
            </Typography>
            <Box sx={{ display: "flex", gap: 1, overflowX: "auto", pb: 1 }}>
              {tage.map((t) => (
                <Chip
                  key={t.tag}
                  label={tagKurz(t.tag)}
                  color={t.tag === tag ? "primary" : "default"}
                  variant={t.tag === tag ? "filled" : "outlined"}
                  onClick={() => {
                    setTag(t.tag);
                    setStart("");
                  }}
                />
              ))}
            </Box>
          </Box>
          <Box>
            <Typography fontWeight={600} sx={{ mb: 1 }}>
              Uhrzeit
            </Typography>
            <Stack direction="row" gap={1} flexWrap="wrap">
              {zeitenDesTags.map((z) => (
                <Chip
                  key={z}
                  label={uhrzeit(z)}
                  color={z === start ? "primary" : "default"}
                  variant={z === start ? "filled" : "outlined"}
                  onClick={() => setStart(z)}
                />
              ))}
            </Stack>
          </Box>
        </>
      )}
      {start && (
        <>
          <TextField
            label="Nachricht an uns (freiwillig)"
            value={nachricht}
            onChange={(e) => setNachricht(e.target.value)}
            multiline
            minRows={2}
          />
          {fehler && <Alert severity="error">{fehler}</Alert>}
          <Button
            variant="contained"
            size="large"
            disabled={laeuft}
            onClick={async () => {
              setLaeuft(true);
              setFehler("");
              try {
                await aktion("portal_termin_anfragen", {
                  p_terminart_id: art!.id,
                  p_start: start,
                  p_nachricht: nachricht,
                });
                fertig();
              } catch (e) {
                setFehler(fehlerText(e));
              } finally {
                setLaeuft(false);
              }
            }}
          >
            {`Anfragen: ${terminText({ Start: start })}`}
          </Button>
        </>
      )}
    </Stack>
  );
};

export const TermineSeite = ({ daten, aktion }: Props) => {
  const [neu, setNeu] = useState(false);
  const [gesendet, setGesendet] = useState(false);
  const [absage, setAbsage] = useState<PortalTermin | null>(null);
  const kommend = kommendeTermine(daten);
  const vergangen = vergangeneTermine(daten).slice(0, 5);

  return (
    <>
      <Ueberschrift>Termine</Ueberschrift>
      {gesendet && (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          onClose={() => setGesendet(false)}
        >
          Danke! Ihre Anfrage ist bei uns. Wir bestätigen den Termin so bald wie
          möglich.
        </Alert>
      )}
      <Karte titel="Neuer Termin">
        {neu ? (
          <TerminAnfragen
            aktion={aktion}
            fertig={() => {
              setNeu(false);
              setGesendet(true);
            }}
          />
        ) : (
          <Button variant="contained" onClick={() => setNeu(true)}>
            Termin anfragen
          </Button>
        )}
      </Karte>

      {daten.anfragen.length > 0 && (
        <Karte titel="Angefragt">
          <Stack gap={1.5}>
            {daten.anfragen.map((a) => (
              <Box key={a.id}>
                <Typography fontWeight={600}>{terminText(a)}</Typography>
                <Stack direction="row" gap={1} alignItems="center">
                  <Typography color="text.secondary">{a.terminart}</Typography>
                  <Chip
                    size="small"
                    label="wartet auf Bestätigung"
                    color="warning"
                    variant="outlined"
                  />
                </Stack>
              </Box>
            ))}
          </Stack>
        </Karte>
      )}

      <Karte titel="Ihre nächsten Termine">
        {kommend.length === 0 ? (
          <Typography color="text.secondary">Kein Termin geplant.</Typography>
        ) : (
          <Stack divider={<Divider />} gap={1.5}>
            {kommend.map((t) => (
              <Stack
                key={t.id}
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                gap={1}
              >
                <Box>
                  <Typography fontWeight={600}>{terminText(t)}</Typography>
                  <Typography color="text.secondary">{t.Terminart}</Typography>
                </Box>
                {t.absage_angefragt ? (
                  <Chip size="small" label="Absage gemeldet" />
                ) : (
                  <Button
                    size="small"
                    color="error"
                    onClick={() => setAbsage(t)}
                  >
                    Absagen
                  </Button>
                )}
              </Stack>
            ))}
          </Stack>
        )}
      </Karte>

      {vergangen.length > 0 && (
        <Karte titel="Frühere Termine">
          <Stack gap={1}>
            {vergangen.map((t) => (
              <Typography key={t.id} color="text.secondary">
                {datum(t.Start)} · {t.Terminart}
              </Typography>
            ))}
          </Stack>
        </Karte>
      )}

      <BestaetigenDialog
        offen={!!absage}
        titel="Termin absagen"
        text={
          absage
            ? `Möchten Sie den Termin am ${terminText(absage)} absagen? Wir bekommen Ihre Nachricht sofort.`
            : ""
        }
        feld="Grund oder Wunschtermin (freiwillig)"
        knopf="Absage senden"
        schliessen={() => setAbsage(null)}
        senden={(zusatz) =>
          aktion("portal_nachricht_senden", {
            p_text: [
              `Ich möchte meinen Termin am ${terminText(absage!)} (${absage!.Terminart ?? "Termin"}) absagen.`,
              zusatz,
            ]
              .filter(Boolean)
              .join("\n"),
            p_art: "absage",
            p_termin_id: absage!.id,
            p_bezug: terminText(absage!),
          })
        }
      />
    </>
  );
};

// --- Brillenpass --------------------------------------------------------------

const WerteTabelle = ({
  spalten,
  zeilen,
}: {
  spalten: string[];
  zeilen: [string, string[]][];
}) => (
  <Box sx={{ overflowX: "auto" }}>
    <Table
      size="small"
      sx={{
        "& td, & th": {
          textAlign: "center",
          px: { xs: 0.4, sm: 0.75 },
          whiteSpace: "nowrap",
        },
      }}
    >
      <TableHead>
        <TableRow
          sx={{
            "& th": {
              bgcolor: "#eef3fa",
              fontWeight: 700,
              fontSize: { xs: "0.7rem", sm: "0.78rem" },
            },
          }}
        >
          <TableCell />
          {spalten.map((s) => (
            <TableCell key={s}>{s}</TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {zeilen.map(([seite, werte]) => (
          <TableRow key={seite}>
            <TableCell
              component="th"
              sx={{ fontWeight: 700, bgcolor: "#eef3fa" }}
            >
              {seite}
            </TableCell>
            {werte.map((w, i) => (
              <TableCell
                key={i}
                sx={{ fontSize: { xs: "0.9rem", sm: "1rem" } }}
              >
                {w || "–"}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </Box>
);

const glasWerte = (b: PortalBrille) => {
  const g = [b.glasRechts, b.glasLinks];
  const hat = (f: keyof NonNullable<Glas>) =>
    g.some((x) => zahl(x?.[f]) !== null && zahl(x?.[f]) !== 0);
  const spalten: [string, (x: Glas) => string][] = [
    ["Sph", (x) => dpt(x?.Sph)],
    ["Cyl", (x) => dpt(x?.Cyl)],
    ["Achse", (x) => achse(x?.A)],
  ];
  if (hat("Add")) spalten.push(["Add", (x) => dpt(x?.Add)]);
  if (hat("Pr"))
    spalten.push(["Prisma", (x) => dez(x?.Pr)], ["Basis", (x) => achse(x?.B)]);
  return {
    spalten: spalten.map(([s]) => s),
    zeilen: [
      ["R", spalten.map(([, f]) => f(b.glasRechts ?? null))],
      ["L", spalten.map(([, f]) => f(b.glasLinks ?? null))],
    ] as [string, string[]][],
  };
};

export const BrillenpassSeite = ({ daten }: Props) => {
  const brillen = daten.brillen.filter((b) => b.glasRechts || b.glasLinks);
  const [id, setId] = useState<number | null>(brillen[0]?.id ?? null);
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");
  const brille = brillen.find((b) => b.id === id) ?? brillen[0];
  const linse = daten.kontaktlinsen[0];

  const speichern = async () => {
    if (!brille) return;
    setLaeuft(true);
    setFehler("");
    try {
      // erst bei Bedarf laden: Bild-Erzeugung ist groß
      const [
        { brillenpassHtml, BRILLENPASS_BREITE },
        { htmlAlsBild, herunterladen },
        { absenderAusBetrieb },
      ] = await Promise.all([
        import("../brillenpass"),
        import("../belegPdf"),
        import("../rechnungTemplate"),
      ]);
      const html = brillenpassHtml(
        {
          brille: brille as unknown as Record<string, unknown>,
          kunde: (daten.kunde ?? {}) as Record<string, unknown>,
          glasRechts: (brille.glasRechts ?? undefined) as
            | Record<string, unknown>
            | undefined,
          glasLinks: (brille.glasLinks ?? undefined) as
            | Record<string, unknown>
            | undefined,
        },
        absenderAusBetrieb(daten.betrieb),
      );
      const datei = await htmlAlsBild(
        html,
        BRILLENPASS_BREITE,
        "Brillenpass.png",
      );
      if (navigator.canShare?.({ files: [datei] })) {
        await navigator
          .share({ files: [datei], title: "Brillenpass" })
          .catch(() => undefined);
      } else {
        herunterladen(datei);
      }
    } catch (e) {
      setFehler(fehlerText(e));
    } finally {
      setLaeuft(false);
    }
  };

  return (
    <>
      <Ueberschrift>Brillenpass</Ueberschrift>
      {!brille && !linse && (
        <Alert severity="info">
          Hier erscheinen die Werte Ihrer Brille, sobald wir eine Brille für Sie
          angelegt haben.
        </Alert>
      )}
      {brille && (
        <Karte titel={brille.BrillenArt || "Brille"}>
          {brillen.length > 1 ? (
            <TextField
              select
              size="small"
              label="Brille vom"
              value={brille.id}
              onChange={(e) => setId(Number(e.target.value))}
              sx={{ mb: 2, minWidth: 200 }}
            >
              {brillen.map((b) => (
                <MenuItem key={b.id} value={b.id}>
                  {datum(b.Datum)} · {b.BrillenArt || "Brille"}
                </MenuItem>
              ))}
            </TextField>
          ) : (
            <Typography color="text.secondary" sx={{ mb: 1.5 }}>
              Brille vom {datum(brille.Datum)}
            </Typography>
          )}
          <WerteTabelle {...glasWerte(brille)} />
          {(zahl(brille.glasRechts?.PD) !== null ||
            zahl(brille.glasLinks?.PD) !== null) && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Pupillenabstand: R {dez(brille.glasRechts?.PD) || "–"} mm · L{" "}
              {dez(brille.glasLinks?.PD) || "–"} mm
            </Typography>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
            Bei Verlust oder Bruch einfach diesen Pass vorzeigen. Die Werte
            gehören zu dieser Brille und ersetzen keinen aktuellen Sehtest.
          </Typography>
          {fehler && (
            <Alert severity="error" sx={{ mt: 1.5 }}>
              {fehler}
            </Alert>
          )}
          <Button
            variant="outlined"
            sx={{ mt: 2 }}
            onClick={speichern}
            disabled={laeuft}
          >
            {laeuft ? <CircularProgress size={20} /> : "Als Bild speichern"}
          </Button>
        </Karte>
      )}
      {linse && (
        <Karte
          titel={
            linse.Linsenart
              ? `Kontaktlinsen · ${linse.Linsenart}`
              : "Kontaktlinsen"
          }
        >
          <Typography color="text.secondary" sx={{ mb: 1.5 }}>
            Anpassung vom {datum(linse.Datum)}
          </Typography>
          <WerteTabelle
            spalten={["Radius", "Ø", "Sph", "Cyl", "Achse", "Add"]}
            zeilen={(["Rechts", "Links"] as const).map((s) => [
              s[0],
              [
                dez(linse[`Radius${s}`]),
                dez(linse[`Durchmesser${s}`]),
                dpt(linse[`Sph${s}`]),
                dpt(linse[`Cyl${s}`]),
                achse(linse[`Achse${s}`]),
                dpt(linse[`Add${s}`]),
              ],
            ])}
          />
          {Boolean(linse.LinsentypRechts || linse.LinsentypLinks) && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              R: {String(linse.LinsentypRechts ?? "–")} · L:{" "}
              {String(linse.LinsentypLinks ?? "–")}
            </Typography>
          )}
          {linse.Nachkontrolltermin && (
            <Alert severity="info" sx={{ mt: 1.5 }}>
              Nächste Kontrolle empfohlen am {datum(linse.Nachkontrolltermin)}.
            </Alert>
          )}
        </Karte>
      )}
    </>
  );
};

// --- Rechnungen ---------------------------------------------------------------

export const RechnungenSeite = ({ daten, aktion }: Props) => {
  const rechnungen = kundenRechnungen(daten);
  const [kopie, setKopie] = useState<string | null>(null);
  const angefordert = (nr: string) =>
    daten.nachrichten.some(
      (n) => n.art === "rechnung" && n.von_kunde && n.text.includes(nr),
    );
  const offen = rechnungen.reduce((s, r) => s + r.offen, 0);

  return (
    <>
      <Ueberschrift>Rechnungen</Ueberschrift>
      {rechnungen.length === 0 && (
        <Alert severity="info">Noch keine Rechnungen vorhanden.</Alert>
      )}
      {offen > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Offen: <b>{euro(offen)}</b>. Sie können im Laden oder per Überweisung
          bezahlen. Die Bankverbindung steht auf Ihrer Rechnung.
        </Alert>
      )}
      {rechnungen.map((r) => (
        <Karte key={r.schluessel}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="flex-start"
            gap={1}
          >
            <Box>
              <Typography fontWeight={700}>Rechnung {r.nummer}</Typography>
              <Typography color="text.secondary">
                {r.art}
                {r.datum ? ` · ${datum(r.datum)}` : ""}
              </Typography>
            </Box>
            <Box textAlign="right">
              <Typography fontWeight={700} fontSize="1.1rem">
                {euro(r.betrag)}
              </Typography>
              <Chip
                size="small"
                label={r.statusText}
                color={
                  r.status === "bezahlt"
                    ? "success"
                    : r.status === "kasse"
                      ? "info"
                      : "warning"
                }
                variant="outlined"
              />
            </Box>
          </Stack>
          {r.offen > 0 && r.status !== "bezahlt" && (
            <Typography sx={{ mt: 1 }}>
              Noch offen: <b>{euro(r.offen)}</b>
            </Typography>
          )}
          <Box sx={{ mt: 1.5 }}>
            {angefordert(r.nummer) ? (
              <Chip size="small" label="Kopie angefordert" />
            ) : (
              <Button size="small" onClick={() => setKopie(r.nummer)}>
                Rechnungskopie anfordern
              </Button>
            )}
          </Box>
        </Karte>
      ))}
      <BestaetigenDialog
        offen={!!kopie}
        titel="Rechnungskopie"
        text={`Wir schicken Ihnen eine Kopie der Rechnung ${kopie ?? ""} zu.`}
        feld="Wohin? (z. B. per E-Mail, freiwillig)"
        knopf="Anfordern"
        schliessen={() => setKopie(null)}
        senden={(zusatz) =>
          aktion("portal_nachricht_senden", {
            p_text: [
              `Bitte senden Sie mir eine Kopie der Rechnung ${kopie}.`,
              zusatz,
            ]
              .filter(Boolean)
              .join("\n"),
            p_art: "rechnung",
            p_bezug: kopie,
          })
        }
      />
    </>
  );
};

// --- Nachrichten --------------------------------------------------------------

export const NachrichtenSeite = ({ daten, aktion, firma }: Props) => {
  const [text, setText] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");
  const ende = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ende.current?.scrollIntoView({ block: "end" });
  }, [daten.nachrichten.length]);

  const senden = async () => {
    if (!text.trim()) return;
    setLaeuft(true);
    setFehler("");
    try {
      await aktion("portal_nachricht_senden", {
        p_text: text,
        p_art: "nachricht",
      });
      setText("");
    } catch (e) {
      setFehler(fehlerText(e));
    } finally {
      setLaeuft(false);
    }
  };

  return (
    <>
      <Ueberschrift>Nachrichten</Ueberschrift>
      <Stack gap={1.25} sx={{ mb: 2 }}>
        {daten.nachrichten.length === 0 && (
          <Typography color="text.secondary">
            Schreiben Sie uns, zum Beispiel bei Fragen zu Ihrer Brille. Wir
            antworten in der Regel am nächsten Werktag.
          </Typography>
        )}
        {daten.nachrichten.map((n) =>
          n.art === "einwilligung" ? (
            <Typography
              key={n.id}
              variant="caption"
              color="text.secondary"
              textAlign="center"
            >
              {zeitpunkt(n.created_at)} · {n.text}
            </Typography>
          ) : (
            <Box
              key={n.id}
              sx={{
                alignSelf: n.von_kunde ? "flex-end" : "flex-start",
                maxWidth: "85%",
                bgcolor: n.von_kunde ? "#d6e6fb" : "#fff",
                border: n.von_kunde ? "none" : "1px solid #d6dde8",
                borderRadius: 3,
                px: 1.5,
                py: 1,
              }}
            >
              {!n.von_kunde && (
                <Typography variant="caption" fontWeight={700} color="primary">
                  {firma}
                </Typography>
              )}
              <Typography
                sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
              >
                {n.text}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {zeitpunkt(n.created_at)}
                {n.von_kunde && n.erledigt ? " · erledigt" : ""}
              </Typography>
            </Box>
          ),
        )}
        <div ref={ende} />
      </Stack>
      {fehler && (
        <Alert severity="error" sx={{ mb: 1 }}>
          {fehler}
        </Alert>
      )}
      <Stack direction="row" gap={1} alignItems="flex-end">
        <TextField
          placeholder="Ihre Nachricht"
          value={text}
          onChange={(e) => setText(e.target.value)}
          multiline
          maxRows={5}
          fullWidth
          sx={{ bgcolor: "#fff" }}
        />
        <IconButton
          color="primary"
          onClick={senden}
          disabled={laeuft || !text.trim()}
          aria-label="Senden"
          size="large"
        >
          {laeuft ? <CircularProgress size={22} /> : <SendIcon />}
        </IconButton>
      </Stack>
    </>
  );
};

// --- Einstellungen und Einwilligung -------------------------------------------

export const EinstellungenDialog = ({
  offen,
  schliessen,
  daten,
  aktion,
  firma,
  abmelden,
}: Props & {
  offen: boolean;
  schliessen: () => void;
  abmelden: () => void;
}) => {
  const k = daten.kunde;
  const [werbung, setWerbung] = useState(false);
  const [kanaele, setKanaele] = useState<string[]>([]);
  const [weg, setWeg] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  const [meldung, setMeldung] = useState<{
    art: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (!offen) return;
    setWerbung(!!k?.Werbeeinwilligung);
    setKanaele(
      k?.Werbeeinwilligung ? kanaeleAusText(k?.WerbeeinwilligungFuer) : [],
    );
    setWeg(k?.Kontaktweg === "Handy" ? "SMS" : (k?.Kontaktweg ?? ""));
  }, [offen, k]);

  // Meldung nur beim Öffnen leeren, nicht nach dem Neuladen durchs Speichern
  useEffect(() => {
    if (offen) setMeldung(null);
  }, [offen]);

  const speichern = async () => {
    if (werbung && kanaele.length === 0) {
      setMeldung({
        art: "error",
        text: "Bitte wählen Sie mindestens einen Weg für Angebote.",
      });
      return;
    }
    setLaeuft(true);
    try {
      await aktion("portal_einwilligung_setzen", {
        p_werbung: werbung,
        p_kanaele: werbung ? kanaele : [],
        p_kontaktweg: weg || null,
      });
      setMeldung({ art: "success", text: "Gespeichert." });
    } catch (e) {
      setMeldung({ art: "error", text: fehlerText(e) });
    } finally {
      setLaeuft(false);
    }
  };

  return (
    <Dialog open={offen} onClose={schliessen} fullWidth maxWidth="sm">
      <DialogTitle>Einstellungen</DialogTitle>
      <DialogContent dividers>
        <Typography fontWeight={700}>Ihre Kontaktdaten</Typography>
        <Typography>
          {[k?.Vorname, k?.Nachname].filter(Boolean).join(" ")}
        </Typography>
        <Typography color="text.secondary">
          E-Mail: {k?.Email || "–"}
        </Typography>
        <Typography color="text.secondary">Handy: {k?.Handy || "–"}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Etwas hat sich geändert? Schreiben Sie uns eine Nachricht.
        </Typography>

        <Divider sx={{ my: 2 }} />
        <Typography fontWeight={700} sx={{ mb: 0.5 }}>
          Wie sollen wir Sie über Ihren Auftrag informieren?
        </Typography>
        <RadioGroup value={weg} onChange={(e) => setWeg(e.target.value)}>
          {KONTAKTWEGE.map((w) => (
            <FormControlLabel
              key={w.wert}
              value={w.wert}
              control={<Radio />}
              label={w.name}
            />
          ))}
          <FormControlLabel value="" control={<Radio />} label="Egal" />
        </RadioGroup>

        <Divider sx={{ my: 2 }} />
        <FormControlLabel
          control={
            <Switch
              checked={werbung}
              onChange={(e) => setWerbung(e.target.checked)}
            />
          }
          label={
            <Typography fontWeight={700}>
              Angebote und Neuigkeiten erhalten
            </Typography>
          }
        />
        <Typography variant="body2" color="text.secondary">
          Ich bin einverstanden, dass {firma} mich über Angebote, Aktionen und
          Neuigkeiten informiert. Ich kann das jederzeit hier wieder abschalten.
        </Typography>
        {werbung && (
          <Stack direction="row" flexWrap="wrap" sx={{ mt: 1 }}>
            {WERBE_KANAELE.map((kanal) => (
              <FormControlLabel
                key={kanal}
                label={kanal}
                control={
                  <Checkbox
                    checked={kanaele.includes(kanal)}
                    onChange={(e) =>
                      setKanaele((alt) =>
                        e.target.checked
                          ? [...alt, kanal]
                          : alt.filter((x) => x !== kanal),
                      )
                    }
                  />
                }
              />
            ))}
          </Stack>
        )}
        {meldung && (
          <Alert severity={meldung.art} sx={{ mt: 2 }}>
            {meldung.text}
          </Alert>
        )}
        <Button
          variant="contained"
          sx={{ mt: 2 }}
          onClick={speichern}
          disabled={laeuft}
        >
          Speichern
        </Button>

        <Divider sx={{ my: 2 }} />
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Auf einem fremden oder geteilten Gerät melden Sie sich bitte nach der
          Nutzung ab.
        </Typography>
        <Button color="error" variant="outlined" onClick={abmelden}>
          Abmelden
        </Button>
      </DialogContent>
      <DialogActions>
        <Button onClick={schliessen}>Schließen</Button>
      </DialogActions>
    </Dialog>
  );
};
