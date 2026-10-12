import { useEffect, useMemo, useRef, useState } from "react";
import { Title, useDataProvider, useNotify } from "react-admin";
import {
  Alert,
  Box,
  Button,
  Card,
  Checkbox,
  Chip,
  FormControlLabel,
  MenuItem,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import DownloadIcon from "@mui/icons-material/Download";
import { RECHNUNG_ABSENDER } from "./rechnungTemplate";
import {
  Auswahl,
  Empfaenger,
  GRUPPEN,
  Gruppe,
  PLATZHALTER,
  auswahlFilter,
  buildSerienbriefHtml,
  emailListeCsv,
  fuelleText,
} from "./serienbrief";

/*
 * Gehe zu -> Serienbrief: 1. Empfänger auswählen, 2. Text mit Platzhaltern
 * schreiben, 3. Briefe drucken (in Teilen zu je 300 Seiten) oder die
 * E-Mail-Liste für einen Newsletter-Dienst herunterladen. Der Entwurf bleibt
 * in diesem Browser gespeichert.
 */

const ANSICHT = "kunde_serienbrief";
const TEIL = 300;
const ENTWURF = "serienbrief-entwurf";

const MONATE = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];

const STANDARD_TEXT = `{Briefanrede},

Ihre letzte Brille haben Sie am {LetzteBrille} bei uns gekauft. Seitdem können sich Ihre Sehwerte verändert haben.

Wir laden Sie herzlich zu einer kostenlosen Überprüfung Ihrer Sehstärke ein – rufen Sie uns einfach an oder kommen Sie vorbei.

Mit freundlichen Grüßen
Ihr Team von Augenoptik Ulm`;

type Entwurf = { auswahl: Auswahl; betreff: string; text: string };

const leseEntwurf = (): Partial<Entwurf> => {
  try {
    return JSON.parse(localStorage.getItem(ENTWURF) ?? "{}");
  } catch {
    return {};
  }
};

const Abschnitt = ({
  nummer,
  titel,
  children,
}: {
  nummer: number;
  titel: string;
  children: React.ReactNode;
}) => (
  <Card sx={{ p: 2.25, display: "flex", flexDirection: "column", gap: 1.5 }}>
    <Typography component="h2" sx={{ fontSize: 16, fontWeight: 700 }}>
      {nummer}. {titel}
    </Typography>
    {children}
  </Card>
);

const zahl = new Intl.NumberFormat("de-DE");

export const SerienbriefSeite = () => {
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const entwurf = useMemo(leseEntwurf, []);
  const [auswahl, setAuswahl] = useState<Auswahl>({
    kanal: "post",
    gruppe: "alle",
    jahre: 2,
    monat: new Date().getMonth() + 2 > 12 ? 1 : new Date().getMonth() + 2,
    plz: "",
    nurEinwilligung: true,
    ...entwurf.auswahl,
  });
  const [betreff, setBetreff] = useState(
    entwurf.betreff ?? "Zeit für einen Sehtest",
  );
  const [text, setText] = useState(entwurf.text ?? STANDARD_TEXT);
  const [anzahl, setAnzahl] = useState<number | null>(null);
  const [beispiel, setBeispiel] = useState<Empfaenger | null>(null);
  const [laedt, setLaedt] = useState<string | null>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const filter = useMemo(() => auswahlFilter(auswahl), [auswahl]);

  useEffect(() => {
    try {
      localStorage.setItem(ENTWURF, JSON.stringify({ auswahl, betreff, text }));
    } catch {
      // ohne Speicher (privates Fenster) geht nur der Entwurf verloren
    }
  }, [auswahl, betreff, text]);

  // Anzahl und ein Beispielkunde für die Vorschau
  useEffect(() => {
    let abgebrochen = false;
    setAnzahl(null);
    const zeit = window.setTimeout(() => {
      dataProvider
        .getList(ANSICHT, {
          pagination: { page: 1, perPage: 1 },
          sort: { field: "Nachname", order: "ASC" },
          filter,
        })
        .then((r) => {
          if (abgebrochen) return;
          setAnzahl(r.total ?? r.data.length);
          setBeispiel((r.data[0] as Empfaenger) ?? null);
        })
        .catch(() => !abgebrochen && setAnzahl(-1));
    }, 300);
    return () => {
      abgebrochen = true;
      window.clearTimeout(zeit);
    };
  }, [dataProvider, filter]);

  const alleLaden = async () => {
    const alle: Empfaenger[] = [];
    for (let seite = 1; ; seite += 1) {
      const r = await dataProvider.getList(ANSICHT, {
        pagination: { page: seite, perPage: 1000 },
        sort: { field: "Nachname", order: "ASC" },
        filter,
      });
      alle.push(...(r.data as Empfaenger[]));
      if (r.data.length < 1000) break;
    }
    return alle;
  };

  const platzhalterEinfuegen = (name: string) => {
    const feld = textRef.current;
    const marke = `{${name}}`;
    if (!feld) return setText((t) => t + marke);
    const von = feld.selectionStart ?? text.length;
    const bis = feld.selectionEnd ?? text.length;
    setText(text.slice(0, von) + marke + text.slice(bis));
    window.setTimeout(() => {
      feld.focus();
      feld.setSelectionRange(von + marke.length, von + marke.length);
    });
  };

  const drucken = async (teil: number) => {
    setLaedt(`teil${teil}`);
    try {
      const alle = await alleLaden();
      const briefe = alle.slice(teil * TEIL, (teil + 1) * TEIL);
      const fenster = window.open("", "_blank", "width=850,height=1100");
      if (!fenster) {
        notify("Fenster konnte nicht geöffnet werden (Pop-up blockiert?).", {
          type: "warning",
        });
        return;
      }
      fenster.document.open();
      fenster.document.write(
        buildSerienbriefHtml(briefe, betreff, text, RECHNUNG_ABSENDER),
      );
      fenster.document.close();
      fenster.focus();
      window.setTimeout(() => fenster.print(), 500);
    } catch {
      notify("Empfänger konnten nicht geladen werden.", { type: "error" });
    } finally {
      setLaedt(null);
    }
  };

  const csvHerunterladen = async () => {
    setLaedt("csv");
    try {
      const alle = await alleLaden();
      const blob = new Blob([emailListeCsv(alle)], {
        type: "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `E-Mail-Liste-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      notify("Empfänger konnten nicht geladen werden.", { type: "error" });
    } finally {
      setLaedt(null);
    }
  };

  const setze = <K extends keyof Auswahl>(feld: K, wert: Auswahl[K]) =>
    setAuswahl((a) => ({ ...a, [feld]: wert }));

  const teile = anzahl && anzahl > 0 ? Math.ceil(anzahl / TEIL) : 0;
  const vorschauHtml = beispiel
    ? buildSerienbriefHtml([beispiel], betreff, text, RECHNUNG_ABSENDER, true)
    : "";

  return (
    <Box
      sx={{
        p: { xs: 1, md: 2 },
        display: "grid",
        gap: 2,
        gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) minmax(0, 1fr)" },
        alignItems: "start",
      }}
    >
      <Title title="Serienbrief" />
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Abschnitt nummer={1} titel="Empfänger">
          <ToggleButtonGroup
            exclusive
            size="small"
            value={auswahl.kanal}
            onChange={(_, kanal) => kanal && setze("kanal", kanal)}
          >
            <ToggleButton value="post">Brief per Post</ToggleButton>
            <ToggleButton value="email">E-Mail-Liste</ToggleButton>
          </ToggleButtonGroup>
          <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
            <TextField
              select
              size="small"
              label="Kunden"
              value={auswahl.gruppe}
              onChange={(ev) => setze("gruppe", ev.target.value as Gruppe)}
              sx={{ minWidth: 260 }}
            >
              {GRUPPEN.map((g) => (
                <MenuItem key={g.id} value={g.id}>
                  {g.name}
                </MenuItem>
              ))}
            </TextField>
            {auswahl.gruppe === "sehtest" && (
              <TextField
                size="small"
                type="number"
                label="Jahre"
                value={auswahl.jahre}
                onChange={(ev) =>
                  setze("jahre", Math.max(1, Number(ev.target.value) || 1))
                }
                sx={{ width: 100 }}
              />
            )}
            {auswahl.gruppe === "geburtstag" && (
              <TextField
                select
                size="small"
                label="Monat"
                value={auswahl.monat}
                onChange={(ev) => setze("monat", Number(ev.target.value))}
                sx={{ width: 150 }}
              >
                {MONATE.map((m, i) => (
                  <MenuItem key={m} value={i + 1}>
                    {m}
                  </MenuItem>
                ))}
              </TextField>
            )}
            <TextField
              size="small"
              label="PLZ beginnt mit"
              value={auswahl.plz}
              onChange={(ev) => setze("plz", ev.target.value)}
              sx={{ width: 150 }}
            />
          </Box>
          <FormControlLabel
            control={
              <Checkbox
                checked={auswahl.nurEinwilligung}
                onChange={(ev) => setze("nurEinwilligung", ev.target.checked)}
              />
            }
            label="nur Kunden mit Werbeeinwilligung"
          />
          {!auswahl.nurEinwilligung && (
            <Alert severity="warning">
              Werbung nur an Kunden mit Einwilligung schicken. Ohne Haken nur
              für reine Mitteilungen (z. B. geänderte Öffnungszeiten).
            </Alert>
          )}
          <Typography sx={{ fontSize: 15 }}>
            {anzahl === null
              ? "Zähle Empfänger …"
              : anzahl < 0
                ? "Empfänger konnten nicht gezählt werden."
                : `${zahl.format(anzahl)} Empfänger ${
                    auswahl.kanal === "post"
                      ? "mit vollständiger Anschrift"
                      : "mit E-Mail-Adresse"
                  }`}
          </Typography>
        </Abschnitt>

        <Abschnitt nummer={2} titel="Text">
          <TextField
            size="small"
            label={auswahl.kanal === "post" ? "Betreff" : "Betreff der E-Mail"}
            value={betreff}
            onChange={(ev) => setBetreff(ev.target.value)}
          />
          <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
            <Typography sx={{ fontSize: 13, color: "text.secondary", mr: 0.5 }}>
              Platzhalter einfügen:
            </Typography>
            {PLATZHALTER.map((p) => (
              <Chip
                key={p.name}
                size="small"
                label={p.name}
                onClick={() => platzhalterEinfuegen(p.name)}
              />
            ))}
          </Box>
          <TextField
            multiline
            minRows={10}
            label="Brieftext"
            value={text}
            inputRef={textRef}
            onChange={(ev) => setText(ev.target.value)}
            helperText="Leerzeile = neuer Absatz. Platzhalter wie {Briefanrede} werden je Kunde ersetzt."
          />
        </Abschnitt>

        <Abschnitt nummer={3} titel="Ausgabe">
          {auswahl.kanal === "post" ? (
            <>
              <Typography sx={{ fontSize: 13.5, color: "text.secondary" }}>
                Eine Seite je Kunde im Briefpapier, passend für
                Fensterumschläge. Bei vielen Empfängern in Teilen zu je {TEIL}{" "}
                Briefen drucken.
              </Typography>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                {Array.from({ length: teile }, (_, i) => (
                  <Button
                    key={i}
                    variant={i === 0 ? "contained" : "outlined"}
                    startIcon={<PrintIcon />}
                    disabled={laedt !== null}
                    onClick={() => drucken(i)}
                  >
                    {laedt === `teil${i}`
                      ? "Wird vorbereitet …"
                      : teile === 1
                        ? `${zahl.format(anzahl ?? 0)} Briefe drucken`
                        : `Briefe ${zahl.format(i * TEIL + 1)}–${zahl.format(
                            Math.min((i + 1) * TEIL, anzahl ?? 0),
                          )} drucken`}
                  </Button>
                ))}
                {teile === 0 && (
                  <Typography sx={{ fontSize: 13.5 }}>
                    Keine Empfänger ausgewählt.
                  </Typography>
                )}
              </Box>
            </>
          ) : (
            <>
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                disabled={laedt !== null || !anzahl || anzahl < 1}
                onClick={csvHerunterladen}
                sx={{ alignSelf: "flex-start" }}
              >
                {laedt === "csv"
                  ? "Wird vorbereitet …"
                  : "E-Mail-Liste herunterladen (CSV)"}
              </Button>
              <Typography sx={{ fontSize: 13.5, color: "text.secondary" }}>
                Die Liste (E-Mail, Anrede, Vorname, Nachname, Briefanrede) im
                Newsletter-Dienst (z. B. Brevo oder CleverReach) unter „Kontakte
                importieren“ hochladen, dort die Mail gestalten und versenden –
                der Dienst fügt den vorgeschriebenen Abmeldelink ein. Den Text
                links können Sie dort einfügen; statt {"{Briefanrede}"} nehmen
                Sie dort das Feld „Briefanrede“ aus der Liste.
              </Typography>
            </>
          )}
        </Abschnitt>
      </Box>

      <Card sx={{ p: 2.25, position: { lg: "sticky" }, top: { lg: 72 } }}>
        <Typography component="h2" sx={{ fontSize: 16, fontWeight: 700 }}>
          Vorschau{beispiel ? " (erster Empfänger)" : ""}
        </Typography>
        {!beispiel ? (
          <Typography sx={{ fontSize: 13.5, mt: 1 }}>
            Keine Empfänger für die Vorschau.
          </Typography>
        ) : auswahl.kanal === "post" ? (
          <Box
            component="iframe"
            title="Vorschau Serienbrief"
            srcDoc={vorschauHtml}
            sx={{
              mt: 1,
              width: "100%",
              height: 720,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1,
            }}
          />
        ) : (
          <Box
            sx={{
              mt: 1,
              p: 1.5,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1,
              whiteSpace: "pre-wrap",
              fontSize: 14,
            }}
          >
            <strong>{fuelleText(betreff, beispiel)}</strong>
            {"\n\n"}
            {fuelleText(text, beispiel)}
          </Box>
        )}
      </Card>
    </Box>
  );
};
