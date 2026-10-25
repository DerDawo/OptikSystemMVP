import { useCallback, useEffect, useState } from "react";
import { useDataProvider, useNotify, useRecordContext } from "react-admin";
import { useNavigate } from "react-router-dom";
import {
  Autocomplete,
  Box,
  Button,
  ButtonBase,
  Card,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import dayjs from "dayjs";
import { tokensFor } from "./designTokens";
import {
  ERINNERUNG_VORSCHLAEGE,
  Erinnerung,
  anzahlFaellig,
  faelligkeit,
  sortiereErinnerungen,
} from "./erinnerungen";

/*
 * Erinnerungen ("Bruchrezept anfertigen" u. ä.): eigene Karte in
 * "Heute zu tun" mit Schnelleingabe und Abhaken, dazu ein Knopf in der
 * Kundenkartei, der eine Erinnerung zum Kunden anlegt.
 */

const RESOURCE = "erinnerung";
// Sichtbare Zeilen; weitere Erinnerungen erreicht man durch Scrollen in der
// Karte (Zeilenhöhe ca. 52 px).
const ZEILEN_HOEHE = 52;

type Kunde = {
  id: number | string;
  Vorname?: string | null;
  Nachname?: string | null;
};

const kundeName = (kunde?: Kunde) =>
  kunde
    ? [kunde.Nachname, kunde.Vorname].filter(Boolean).join(", ") ||
      `Kunde ${kunde.id}`
    : "";

// Eingabe: Text mit Vorschlägen und optionales Datum.
const ErinnerungEingabe = ({
  text,
  setText,
  faellig,
  setFaellig,
  onEnter,
  autoFocus,
}: {
  text: string;
  setText: (wert: string) => void;
  faellig: string;
  setFaellig: (wert: string) => void;
  onEnter?: () => void;
  autoFocus?: boolean;
}) => (
  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
    <Autocomplete
      freeSolo
      options={[...ERINNERUNG_VORSCHLAEGE]}
      inputValue={text}
      onInputChange={(_, wert) => setText(wert)}
      sx={{ flex: "1 1 180px", minWidth: 0 }}
      renderInput={(params) => (
        <TextField
          {...params}
          size="small"
          placeholder="z. B. Bruchrezept anfertigen"
          aria-label="Erinnerung"
          autoFocus={autoFocus}
          onKeyDown={(event) => {
            if (event.key === "Enter" && onEnter && text.trim()) {
              event.preventDefault();
              onEnter();
            }
          }}
        />
      )}
    />
    <TextField
      type="date"
      size="small"
      value={faellig}
      onChange={(event) => setFaellig(event.target.value)}
      aria-label="Fällig am (optional)"
      title="Fällig am (optional)"
      sx={{ width: 150 }}
      slotProps={{ inputLabel: { shrink: true } }}
    />
  </Box>
);

export const ErinnerungenKarte = ({ stand }: { stand: Date | null }) => {
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const navigate = useNavigate();
  const [liste, setListe] = useState<Erinnerung[] | null>(null);
  const [kunden, setKunden] = useState<Map<string, Kunde>>(new Map());
  const [text, setText] = useState("");
  const [faellig, setFaellig] = useState("");
  const [speichert, setSpeichert] = useState(false);
  const [fehler, setFehler] = useState(false);

  const laden = useCallback(async () => {
    const { data } = await dataProvider.getList(RESOURCE, {
      pagination: { page: 1, perPage: 200 },
      sort: { field: "id", order: "ASC" },
      filter: { "Erledigt@is": "null" },
    });
    const offen = data as Erinnerung[];
    const ids = [
      ...new Set(offen.map((e) => e.kunde_id).filter((id) => id != null)),
    ] as (number | string)[];
    const gefunden =
      ids.length > 0
        ? ((await dataProvider.getMany("kunde", { ids })).data as Kunde[])
        : [];
    setKunden(new Map(gefunden.map((k) => [String(k.id), k])));
    setListe(sortiereErinnerungen(offen));
    setFehler(false);
  }, [dataProvider]);

  useEffect(() => {
    laden().catch((err) => {
      console.error("Erinnerungen konnten nicht geladen werden", err);
      setFehler(true);
    });
  }, [laden, stand]);

  const anlegen = async () => {
    const wert = text.trim();
    if (!wert || speichert) return;
    setSpeichert(true);
    try {
      await dataProvider.create(RESOURCE, {
        data: { Text: wert, Faellig: faellig || null },
      });
      setText("");
      setFaellig("");
      await laden();
    } catch (err) {
      console.error(err);
      notify("Erinnerung konnte nicht gespeichert werden.", { type: "error" });
    } finally {
      setSpeichert(false);
    }
  };

  const erledigen = async (erinnerung: Erinnerung) => {
    // sofort ausblenden, bei Fehler wieder laden
    setListe((alt) => alt?.filter((e) => e.id !== erinnerung.id) ?? null);
    try {
      await dataProvider.update(RESOURCE, {
        id: erinnerung.id,
        data: { Erledigt: new Date().toISOString() },
        previousData: erinnerung,
      });
      notify(`Erledigt: ${erinnerung.Text}`, {
        type: "success",
        undoable: false,
      });
    } catch (err) {
      console.error(err);
      notify("Erinnerung konnte nicht abgehakt werden.", { type: "error" });
      await laden().catch(() => setFehler(true));
    }
  };

  const zahl = liste ? anzahlFaellig(liste) : 0;

  return (
    <Card
      component="section"
      sx={{
        p: "16px 18px",
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
          Erinnerungen
        </Typography>
        <Typography
          sx={(theme) => ({
            fontSize: 13,
            fontWeight: 700,
            fontVariantNumeric: "tabular-nums",
            color: zahl > 0 ? "warning.dark" : tokensFor(theme).text3,
          })}
        >
          {zahl}
        </Typography>
      </Box>
      <Typography
        sx={{
          fontSize: 12,
          color: (theme) => tokensFor(theme).text3,
          mt: -0.5,
        }}
      >
        z. B. Bruchrezept anfertigen – abhaken, wenn erledigt
      </Typography>

      <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start", mt: 0.5 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <ErinnerungEingabe
            text={text}
            setText={setText}
            faellig={faellig}
            setFaellig={setFaellig}
            onEnter={() => void anlegen()}
          />
        </Box>
        <Tooltip title="Erinnerung hinzufügen">
          <span>
            <IconButton
              aria-label="Erinnerung hinzufügen"
              onClick={() => void anlegen()}
              disabled={!text.trim() || speichert}
              color="primary"
            >
              <AddIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      {fehler ? (
        <Typography variant="body2" color="error" sx={{ px: 1.5, py: 1 }}>
          Erinnerungen konnten nicht geladen werden.
        </Typography>
      ) : !liste ? null : liste.length === 0 ? (
        <Typography
          sx={{ fontSize: 13.5, color: "text.secondary", px: 1.5, py: 1 }}
        >
          Keine offenen Erinnerungen.
        </Typography>
      ) : (
        <Box
          tabIndex={0}
          aria-label="Erinnerungen, scrollbar"
          sx={{
            display: "flex",
            flexDirection: "column",
            maxHeight: 10 * ZEILEN_HOEHE,
            overflowY: "auto",
            overscrollBehavior: "contain",
            scrollbarGutter: "stable",
            "&::-webkit-scrollbar": { width: 8 },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: "rgba(120,130,145,0.55)",
              borderRadius: 4,
            },
            "&::-webkit-scrollbar-track": {
              backgroundColor: "rgba(120,130,145,0.12)",
              borderRadius: 4,
            },
          }}
        >
          {liste.map((erinnerung) => {
            const kunde =
              erinnerung.kunde_id != null
                ? kunden.get(String(erinnerung.kunde_id))
                : undefined;
            const frist = faelligkeit(erinnerung.Faellig);
            const detail = [kundeName(kunde), frist?.text]
              .filter(Boolean)
              .join(" · ");
            const inhalt = (
              <>
                <Typography sx={{ fontWeight: 600, fontSize: 14 }}>
                  {erinnerung.Text}
                </Typography>
                {detail && (
                  <Typography
                    noWrap
                    sx={{
                      fontSize: 12.5,
                      color: (theme) =>
                        frist?.ueberfaellig
                          ? theme.palette.warning.dark
                          : tokensFor(theme).text3,
                    }}
                  >
                    {detail}
                  </Typography>
                )}
              </>
            );
            return (
              <Box
                key={erinnerung.id}
                sx={{ display: "flex", alignItems: "center", gap: 0.25 }}
              >
                <Tooltip title="Erledigt">
                  <Checkbox
                    size="small"
                    checked={false}
                    onChange={() => void erledigen(erinnerung)}
                    slotProps={{
                      input: {
                        "aria-label": `Erledigt: ${erinnerung.Text}`,
                      },
                    }}
                  />
                </Tooltip>
                {kunde ? (
                  <ButtonBase
                    onClick={() => navigate(`/kunde/${kunde.id}/show`)}
                    sx={(theme) => ({
                      flex: 1,
                      minWidth: 0,
                      display: "block",
                      textAlign: "left",
                      px: 1,
                      py: 0.75,
                      borderRadius: "10px",
                      "&:hover": { backgroundColor: tokensFor(theme).hover },
                    })}
                  >
                    {inhalt}
                  </ButtonBase>
                ) : (
                  <Box sx={{ flex: 1, minWidth: 0, px: 1, py: 0.75 }}>
                    {inhalt}
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
      )}
    </Card>
  );
};

// Knopf für die Kundenkartei: legt eine Erinnerung zu diesem Kunden an,
// die dann im Dashboard erscheint.
export const ErinnerungButton = () => {
  const record = useRecordContext();
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const [offen, setOffen] = useState(false);
  const [text, setText] = useState("");
  const [faellig, setFaellig] = useState("");
  const [speichert, setSpeichert] = useState(false);

  if (!record) return null;

  const schliessen = () => {
    setOffen(false);
    setText("");
    setFaellig("");
  };

  const speichern = async () => {
    const wert = text.trim();
    if (!wert || speichert) return;
    setSpeichert(true);
    try {
      await dataProvider.create(RESOURCE, {
        data: { Text: wert, Faellig: faellig || null, kunde_id: record.id },
      });
      notify(
        faellig
          ? `Erinnerung für ${dayjs(faellig).format("DD.MM.YYYY")} gespeichert.`
          : "Erinnerung gespeichert. Sie steht im Dashboard.",
        { type: "success" },
      );
      schliessen();
    } catch (err) {
      console.error(err);
      notify("Erinnerung konnte nicht gespeichert werden.", { type: "error" });
    } finally {
      setSpeichert(false);
    }
  };

  return (
    <>
      <Button
        startIcon={<NotificationsActiveIcon />}
        onClick={() => setOffen(true)}
      >
        Erinnerung
      </Button>
      <Dialog open={offen} onClose={schliessen} fullWidth maxWidth="sm">
        <DialogTitle>
          Erinnerung zu {kundeName(record as Kunde) || "diesem Kunden"}
        </DialogTitle>
        <DialogContent sx={{ pt: "8px !important" }}>
          <ErinnerungEingabe
            text={text}
            setText={setText}
            faellig={faellig}
            setFaellig={setFaellig}
            onEnter={() => void speichern()}
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={schliessen}>Abbrechen</Button>
          <Button
            variant="contained"
            onClick={() => void speichern()}
            disabled={!text.trim() || speichert}
          >
            Speichern
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
