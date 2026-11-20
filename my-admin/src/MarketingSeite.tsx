// Marketing (Gehe zu → Marketing), angelehnt an das Prisma-Marketingmodul:
// 1. Kunden auswählen (Bedingungen mit UND/ODER, speicherbar),
// 2. Ergebnis ansehen und weiterverarbeiten (Serienbrief, E-Mail-Liste,
//    Adressliste), als Aktion festhalten,
// 3. Erfolgsanalyse: wer hat nach einer Aktion gekauft?
import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { Title, useNotify } from "react-admin";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  ListSubheader,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DownloadIcon from "@mui/icons-material/Download";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import dayjs from "dayjs";
import { supabase } from "./utils";
import {
  KANAELE,
  Kanal,
  Kriterium,
  MERKMALE,
  MerkmalId,
  SERIENBRIEF_AUSWAHL,
  Selektion,
  Verknuepfung,
  adresslisteCsv,
  merkmalVon,
  quote,
  selektionText,
} from "./marketing";
import { ladeAuswahl, zaehleAuswahl } from "./marketingAbfrage";
import { emailListeCsv, type Empfaenger } from "./serienbrief";
import { formatCurrency } from "./CurrencyField";

type Datensatz = Record<string, unknown> & { id: number };

type GespeicherteSelektion = {
  id: number;
  Name: string;
  Verknuepfung: Verknuepfung;
  Kriterien: Kriterium[];
  Kanal: Kanal;
  NurEinwilligung: boolean;
};

type Aktion = {
  id: number;
  Name: string;
  Datum: string;
  Kanal: string | null;
  KundenIds: number[];
  Kosten: number | null;
  Notizen: string | null;
};

type Erfolg = {
  angeschrieben: number;
  kaeufer: number;
  auftraege: number;
  umsatz: number;
};

const ANZEIGE_MAX = 300;
const zahl = new Intl.NumberFormat("de-DE");
const neueId = () => Math.random().toString(36).slice(2, 10);

const LEER: Selektion = {
  verknuepfung: "und",
  kriterien: [],
  kanal: "post",
  nurEinwilligung: true,
};

const herunterladen = (inhalt: string, name: string) => {
  const url = URL.createObjectURL(
    new Blob([inhalt], { type: "text/csv;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

const Abschnitt = ({
  nummer,
  titel,
  children,
}: {
  nummer: number;
  titel: string;
  children: ReactNode;
}) => (
  <Card sx={{ p: 2.25, display: "flex", flexDirection: "column", gap: 1.5 }}>
    <Typography component="h2" sx={{ fontSize: 16, fontWeight: 700 }}>
      {nummer}. {titel}
    </Typography>
    {children}
  </Card>
);

const KriteriumZeile = ({
  k,
  aendern,
  entfernen,
}: {
  k: Kriterium;
  aendern: (k: Kriterium) => void;
  entfernen: () => void;
}) => {
  const m = merkmalVon(k.merkmal);
  const e = m.eingabe;
  const gruppen = [...new Set(MERKMALE.map((x) => x.gruppe))];
  return (
    <Box
      sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}
    >
      <TextField
        select
        size="small"
        label="Bedingung"
        value={k.merkmal}
        onChange={(ev) =>
          aendern({ id: k.id, merkmal: ev.target.value as MerkmalId })
        }
        sx={{ minWidth: 300 }}
      >
        {gruppen.flatMap((g) => [
          <ListSubheader key={`g-${g}`}>{g}</ListSubheader>,
          ...MERKMALE.filter((x) => x.gruppe === g).map((x) => (
            <MenuItem key={x.id} value={x.id}>
              {x.name}
            </MenuItem>
          )),
        ])}
      </TextField>
      {e.art === "bereich" && (
        <>
          <TextField
            size="small"
            label="von"
            value={k.a ?? ""}
            onChange={(ev) => aendern({ ...k, a: ev.target.value })}
            sx={{ width: 90 }}
          />
          <TextField
            size="small"
            label="bis"
            value={k.b ?? ""}
            onChange={(ev) => aendern({ ...k, b: ev.target.value })}
            sx={{ width: 90 }}
          />
          <Typography variant="body2">{e.einheit}</Typography>
        </>
      )}
      {e.art === "zahl" && (
        <>
          <TextField
            size="small"
            value={k.a ?? ""}
            onChange={(ev) => aendern({ ...k, a: ev.target.value })}
            sx={{ width: 90 }}
            slotProps={{ htmlInput: { inputMode: "numeric" } }}
          />
          <Typography variant="body2">{e.einheit}</Typography>
        </>
      )}
      {e.art === "text" && (
        <TextField
          size="small"
          placeholder={e.platzhalter}
          value={k.a ?? ""}
          onChange={(ev) => aendern({ ...k, a: ev.target.value })}
          sx={{ minWidth: 200 }}
        />
      )}
      {e.art === "auswahl" && (
        <TextField
          select
          size="small"
          value={k.a ?? ""}
          onChange={(ev) => aendern({ ...k, a: ev.target.value })}
          sx={{ minWidth: 160 }}
        >
          {e.werte.map((w) => (
            <MenuItem key={w.wert} value={w.wert}>
              {w.name}
            </MenuItem>
          ))}
        </TextField>
      )}
      <Tooltip title="Bedingung entfernen">
        <IconButton size="small" onClick={entfernen} aria-label="Entfernen">
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );
};

const AktionDialog = ({
  offen,
  schliessen,
  speichern,
  anzahl,
}: {
  offen: boolean;
  schliessen: () => void;
  speichern: (d: { name: string; datum: string; kosten: string }) => void;
  anzahl: number;
}) => {
  const [name, setName] = useState("");
  const [datum, setDatum] = useState(dayjs().format("YYYY-MM-DD"));
  const [kosten, setKosten] = useState("");
  return (
    <Dialog open={offen} onClose={schliessen} maxWidth="xs" fullWidth>
      <DialogTitle>Als Aktion festhalten</DialogTitle>
      <DialogContent sx={{ display: "grid", gap: 2, pt: "8px !important" }}>
        <Typography variant="body2" color="text.secondary">
          Die {zahl.format(anzahl)} Kunden werden mit der Aktion gespeichert.
          Später zeigt die Erfolgsanalyse, wer danach gekauft hat.
        </Typography>
        <TextField
          autoFocus
          size="small"
          label="Name der Aktion"
          placeholder="z. B. Sehtest-Einladung Herbst"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <TextField
          size="small"
          type="date"
          label="Datum (Versand)"
          value={datum}
          onChange={(e) => setDatum(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          size="small"
          label="Kosten in € (optional)"
          value={kosten}
          onChange={(e) => setKosten(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={schliessen}>Abbrechen</Button>
        <Button
          variant="contained"
          disabled={!name.trim() || !datum}
          onClick={() => speichern({ name: name.trim(), datum, kosten })}
        >
          Speichern
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const ErfolgZeile = ({
  aktion,
  wochen,
  loeschen,
}: {
  aktion: Aktion;
  wochen: number;
  loeschen: () => void;
}) => {
  const [erfolg, setErfolg] = useState<Erfolg | null>(null);
  const [fehler, setFehler] = useState(false);
  useEffect(() => {
    let abgebrochen = false;
    setErfolg(null);
    void supabase
      .rpc("marketing_erfolg", { p_aktion: aktion.id, p_wochen: wochen })
      .then(({ data, error }) => {
        if (abgebrochen) return;
        if (error) setFehler(true);
        else setErfolg(((data ?? []) as Erfolg[])[0] ?? null);
      });
    return () => {
      abgebrochen = true;
    };
  }, [aktion.id, wochen]);
  const laeuftNoch = dayjs().isBefore(dayjs(aktion.Datum).add(wochen, "week"));
  return (
    <TableRow>
      <TableCell>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {aktion.Name}
        </Typography>
        {laeuftNoch && (
          <Typography variant="caption" color="text.secondary">
            Zeitraum läuft noch
          </Typography>
        )}
      </TableCell>
      <TableCell>{dayjs(aktion.Datum).format("DD.MM.YYYY")}</TableCell>
      <TableCell align="right">
        {zahl.format(erfolg?.angeschrieben ?? aktion.KundenIds.length)}
      </TableCell>
      {fehler ? (
        <TableCell colSpan={4}>
          <Typography variant="body2" color="error">
            Auswertung nicht möglich
          </Typography>
        </TableCell>
      ) : !erfolg ? (
        <TableCell colSpan={4}>
          <CircularProgress size={16} />
        </TableCell>
      ) : (
        <>
          <TableCell align="right">{zahl.format(erfolg.kaeufer)}</TableCell>
          <TableCell align="right" sx={{ fontWeight: 700 }}>
            {quote(erfolg.kaeufer, erfolg.angeschrieben).toLocaleString(
              "de-DE",
            )}{" "}
            %
          </TableCell>
          <TableCell align="right">{formatCurrency(erfolg.umsatz)}</TableCell>
          <TableCell align="right">
            {aktion.Kosten != null ? formatCurrency(aktion.Kosten) : ""}
          </TableCell>
        </>
      )}
      <TableCell align="right">
        <Tooltip title="Aktion löschen">
          <IconButton size="small" onClick={loeschen} aria-label="Löschen">
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
};

export const MarketingSeite = () => {
  const notify = useNotify();
  const navigate = useNavigate();
  const [auswahl, setAuswahl] = useState<Selektion>(LEER);
  const [gespeichert, setGespeichert] = useState<GespeicherteSelektion[]>([]);
  const [aktuelleId, setAktuelleId] = useState<number | "">("");
  const [name, setName] = useState("");
  const [anzahl, setAnzahl] = useState<number | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [liste, setListe] = useState<Datensatz[] | null>(null);
  const [laedt, setLaedt] = useState<string | null>(null);
  const [aktionOffen, setAktionOffen] = useState(false);
  const [aktionen, setAktionen] = useState<Aktion[] | null>(null);
  const [wochen, setWochen] = useState(8);

  const ladeGespeicherte = useCallback(() => {
    void supabase
      .from("marketing_selektion")
      .select("*")
      .order("Name")
      .then(({ data }) =>
        setGespeichert((data ?? []) as GespeicherteSelektion[]),
      );
  }, []);
  const ladeAktionen = useCallback(() => {
    void supabase
      .from("marketing_aktion")
      .select("id,Name,Datum,Kanal,KundenIds,Kosten,Notizen")
      .order("Datum", { ascending: false })
      .then(({ data, error }) =>
        setAktionen(error ? [] : ((data ?? []) as Aktion[])),
      );
  }, []);
  useEffect(ladeGespeicherte, [ladeGespeicherte]);
  useEffect(ladeAktionen, [ladeAktionen]);

  // Anzahl live (kurz verzögert, damit nicht jeder Tastendruck abfragt)
  const schluessel = useMemo(() => JSON.stringify(auswahl), [auswahl]);
  useEffect(() => {
    let abgebrochen = false;
    setAnzahl(null);
    setFehler(null);
    setListe(null);
    const zeit = window.setTimeout(() => {
      zaehleAuswahl(auswahl)
        .then((n) => !abgebrochen && setAnzahl(n))
        .catch((e: unknown) => {
          if (!abgebrochen)
            setFehler(e instanceof Error ? e.message : String(e));
        });
    }, 400);
    return () => {
      abgebrochen = true;
      window.clearTimeout(zeit);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schluessel]);

  const setze = <K extends keyof Selektion>(feld: K, wert: Selektion[K]) =>
    setAuswahl((a) => ({ ...a, [feld]: wert }));

  const kriteriumAendern = (k: Kriterium) =>
    setze(
      "kriterien",
      auswahl.kriterien.map((x) => (x.id === k.id ? k : x)),
    );

  const laden = (id: number | "") => {
    setAktuelleId(id);
    const s = gespeichert.find((g) => g.id === id);
    if (!s) {
      setAuswahl(LEER);
      setName("");
      return;
    }
    setName(s.Name);
    setAuswahl({
      verknuepfung: s.Verknuepfung,
      kriterien: (s.Kriterien ?? []).map((k) => ({ ...k, id: neueId() })),
      kanal: s.Kanal,
      nurEinwilligung: s.NurEinwilligung,
    });
  };

  const speichern = async () => {
    const daten = {
      Name: name.trim(),
      Verknuepfung: auswahl.verknuepfung,
      Kriterien: auswahl.kriterien.map(({ merkmal, a, b }) => ({
        merkmal,
        a,
        b,
      })),
      Kanal: auswahl.kanal,
      NurEinwilligung: auswahl.nurEinwilligung,
    };
    const vorhanden = gespeichert.find(
      (g) => g.id === aktuelleId && g.Name === daten.Name,
    );
    const { data, error } = vorhanden
      ? await supabase
          .from("marketing_selektion")
          .update(daten)
          .eq("id", vorhanden.id)
          .select("id")
          .single()
      : await supabase
          .from("marketing_selektion")
          .insert(daten)
          .select("id")
          .single();
    if (error) {
      notify(`Nicht gespeichert: ${error.message}`, { type: "error" });
      return;
    }
    setAktuelleId((data as { id: number }).id);
    notify(`Auswahl „${daten.Name}“ gespeichert.`, { type: "success" });
    ladeGespeicherte();
  };

  const auswahlLoeschen = async () => {
    if (aktuelleId === "") return;
    const { error } = await supabase
      .from("marketing_selektion")
      .delete()
      .eq("id", aktuelleId);
    if (error) {
      notify(`Nicht gelöscht: ${error.message}`, { type: "error" });
      return;
    }
    laden("");
    ladeGespeicherte();
  };

  const mitAllen = async (
    schritt: string,
    tun: (kunden: Datensatz[]) => void | Promise<void>,
  ) => {
    setLaedt(schritt);
    try {
      await tun(liste ?? (await ladeAuswahl<Datensatz>(auswahl)));
    } catch (e) {
      notify(
        `Kunden konnten nicht geladen werden: ${e instanceof Error ? e.message : String(e)}`,
        { type: "error" },
      );
    } finally {
      setLaedt(null);
    }
  };

  const aktionSpeichern = async (d: {
    name: string;
    datum: string;
    kosten: string;
  }) => {
    setAktionOffen(false);
    await mitAllen("aktion", async (kunden) => {
      const kosten = Number(d.kosten.replace(",", "."));
      const { error } = await supabase.from("marketing_aktion").insert({
        Name: d.name,
        Datum: d.datum,
        Kanal: auswahl.kanal,
        selektion_id: aktuelleId === "" ? null : aktuelleId,
        Kriterien: { ...auswahl, text: selektionText(auswahl) },
        KundenIds: kunden.map((k) => k.id),
        Kosten: d.kosten.trim() && Number.isFinite(kosten) ? kosten : null,
      });
      if (error) throw new Error(error.message);
      notify(`Aktion „${d.name}“ mit ${kunden.length} Kunden gespeichert.`, {
        type: "success",
      });
      ladeAktionen();
    });
  };

  const aktionLoeschen = async (a: Aktion) => {
    if (!window.confirm(`Aktion „${a.Name}“ löschen?`)) return;
    const { error } = await supabase
      .from("marketing_aktion")
      .delete()
      .eq("id", a.id);
    if (error) notify(`Nicht gelöscht: ${error.message}`, { type: "error" });
    ladeAktionen();
  };

  const zumSerienbrief = () => {
    try {
      localStorage.setItem(
        SERIENBRIEF_AUSWAHL,
        JSON.stringify({ name: name.trim() || "Marketing-Auswahl", auswahl }),
      );
    } catch {
      notify("Übergabe an den Serienbrief nicht möglich.", { type: "error" });
      return;
    }
    navigate("/serienbrief");
  };

  const heute = dayjs().format("YYYY-MM-DD");
  const keine = anzahl === 0;

  return (
    <Box
      sx={{
        p: { xs: 1, md: 2 },
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      <Title title="Marketing" />

      <Abschnitt nummer={1} titel="Kunden auswählen">
        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
          <TextField
            select
            size="small"
            label="Gespeicherte Auswahl"
            value={aktuelleId}
            onChange={(e) =>
              laden(e.target.value === "" ? "" : Number(e.target.value))
            }
            sx={{ minWidth: 260 }}
          >
            <MenuItem value="">– neue Auswahl –</MenuItem>
            {gespeichert.map((g) => (
              <MenuItem key={g.id} value={g.id}>
                {g.Name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            sx={{ minWidth: 220 }}
          />
          <Button
            variant="outlined"
            disabled={!name.trim()}
            onClick={() => void speichern()}
          >
            Speichern
          </Button>
          {aktuelleId !== "" && (
            <Button color="error" onClick={() => void auswahlLoeschen()}>
              Löschen
            </Button>
          )}
        </Box>

        <ToggleButtonGroup
          exclusive
          size="small"
          value={auswahl.verknuepfung}
          onChange={(_, v) => v && setze("verknuepfung", v)}
        >
          <ToggleButton value="und">Alle Bedingungen (UND)</ToggleButton>
          <ToggleButton value="oder">Mindestens eine (ODER)</ToggleButton>
        </ToggleButtonGroup>

        {auswahl.kriterien.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            Noch keine Bedingung: Die Auswahl umfasst alle Kunden.
          </Typography>
        )}
        {auswahl.kriterien.map((k, i) => (
          <Box key={k.id}>
            {i > 0 && (
              <Typography
                variant="caption"
                sx={{ fontWeight: 700, color: "primary.main", ml: 1 }}
              >
                {auswahl.verknuepfung === "und" ? "UND" : "ODER"}
              </Typography>
            )}
            <KriteriumZeile
              k={k}
              aendern={kriteriumAendern}
              entfernen={() =>
                setze(
                  "kriterien",
                  auswahl.kriterien.filter((x) => x.id !== k.id),
                )
              }
            />
          </Box>
        ))}
        <Box>
          <Button
            startIcon={<AddIcon />}
            onClick={() =>
              setze("kriterien", [
                ...auswahl.kriterien,
                { id: neueId(), merkmal: "letzteBrilleAelter", a: "24" },
              ])
            }
          >
            Bedingung hinzufügen
          </Button>
        </Box>

        <Box
          sx={{
            display: "flex",
            gap: 2,
            flexWrap: "wrap",
            alignItems: "center",
            pt: 1,
            borderTop: 1,
            borderColor: "divider",
          }}
        >
          <TextField
            select
            size="small"
            label="Erreichbar per"
            value={auswahl.kanal}
            onChange={(e) => setze("kanal", e.target.value as Kanal)}
            sx={{ minWidth: 220 }}
          >
            {KANAELE.map((k) => (
              <MenuItem key={k.id} value={k.id}>
                {k.name}
              </MenuItem>
            ))}
          </TextField>
          <FormControlLabel
            control={
              <Checkbox
                checked={auswahl.nurEinwilligung}
                onChange={(e) => setze("nurEinwilligung", e.target.checked)}
              />
            }
            label="nur Kunden mit Werbeeinwilligung"
          />
        </Box>
        {!auswahl.nurEinwilligung && (
          <Alert severity="warning">
            Ohne Werbeeinwilligung dürfen Sie Kunden in der Regel keine Werbung
            schicken (DSGVO/UWG). Ausnahme sind z. B. reine Serviceinformationen
            wie „Ihre Brille ist fertig“.
          </Alert>
        )}
      </Abschnitt>

      <Abschnitt nummer={2} titel="Ergebnis und Weiterverarbeitung">
        <Typography variant="body2" color="text.secondary">
          {selektionText(auswahl)}
        </Typography>
        {fehler ? (
          <Alert severity="error">{fehler}</Alert>
        ) : (
          <Typography sx={{ fontSize: 22, fontWeight: 700 }}>
            {anzahl == null ? (
              <CircularProgress size={20} />
            ) : (
              `${zahl.format(anzahl)} Kunden`
            )}
          </Typography>
        )}
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Button
            variant="outlined"
            disabled={!anzahl || laedt != null}
            onClick={() => void mitAllen("liste", (kunden) => setListe(kunden))}
          >
            Kunden anzeigen
          </Button>
          <Button
            variant="contained"
            startIcon={<MailOutlineIcon />}
            disabled={!anzahl}
            onClick={zumSerienbrief}
          >
            Serienbrief schreiben
          </Button>
          <Button
            startIcon={<DownloadIcon />}
            disabled={!anzahl || laedt != null}
            onClick={() =>
              void mitAllen("email", (kunden) =>
                herunterladen(
                  emailListeCsv(kunden as unknown as Empfaenger[]),
                  `E-Mail-Liste-${heute}.csv`,
                ),
              )
            }
          >
            E-Mail-Liste
          </Button>
          <Button
            startIcon={<DownloadIcon />}
            disabled={!anzahl || laedt != null}
            onClick={() =>
              void mitAllen("adressen", (kunden) =>
                herunterladen(
                  adresslisteCsv(kunden),
                  `Adressliste-${heute}.csv`,
                ),
              )
            }
          >
            Adressliste (Etiketten)
          </Button>
          <Button
            disabled={!anzahl || laedt != null}
            onClick={() => setAktionOffen(true)}
          >
            Als Aktion festhalten
          </Button>
          {laedt && <CircularProgress size={20} sx={{ alignSelf: "center" }} />}
        </Box>
        {keine && (
          <Typography variant="body2" color="text.secondary">
            Keine Kunden gefunden. Bedingungen lockern oder ODER wählen.
          </Typography>
        )}
        {liste && (
          <Box sx={{ overflowX: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Kunde</TableCell>
                  <TableCell>Ort</TableCell>
                  <TableCell align="right">Alter</TableCell>
                  <TableCell>Letzte Brille</TableCell>
                  <TableCell>Letzter Kauf</TableCell>
                  <TableCell align="right">Umsatz</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {liste.slice(0, ANZEIGE_MAX).map((k) => (
                  <TableRow
                    key={k.id}
                    hover
                    sx={{ cursor: "pointer" }}
                    onClick={() => navigate(`/kunde/${k.id}/show`)}
                  >
                    <TableCell>
                      {[k.Nachname, k.Vorname].filter(Boolean).join(", ")}
                    </TableCell>
                    <TableCell>
                      {[k.Postleitzahl, k.Stadt].filter(Boolean).join(" ")}
                    </TableCell>
                    <TableCell align="right">
                      {k.Alter != null ? String(k.Alter) : ""}
                    </TableCell>
                    <TableCell>
                      {k.LetzteBrille
                        ? dayjs(String(k.LetzteBrille)).format("DD.MM.YYYY")
                        : ""}
                    </TableCell>
                    <TableCell>
                      {k.LetzterKauf
                        ? dayjs(String(k.LetzterKauf)).format("DD.MM.YYYY")
                        : ""}
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(k.Umsatz)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {liste.length > ANZEIGE_MAX && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Angezeigt: die ersten {ANZEIGE_MAX} von{" "}
                {zahl.format(liste.length)}. Listen und Serienbrief enthalten
                alle.
              </Typography>
            )}
          </Box>
        )}
      </Abschnitt>

      <Abschnitt nummer={3} titel="Aktionen und Erfolgsanalyse">
        <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
          <Typography variant="body2" color="text.secondary">
            Als Erfolg zählt jeder Auftrag (Brille, Kontaktlinsen, Sehtest)
            innerhalb von
          </Typography>
          <TextField
            size="small"
            type="number"
            value={wochen}
            onChange={(e) =>
              setWochen(Math.max(1, Math.min(104, Number(e.target.value) || 1)))
            }
            sx={{ width: 80 }}
          />
          <Typography variant="body2" color="text.secondary">
            Wochen nach der Aktion.
          </Typography>
        </Box>
        {!aktionen ? (
          <CircularProgress size={20} />
        ) : aktionen.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Noch keine Aktionen. Wählen Sie Kunden aus, verschicken Sie Ihren
            Brief oder Ihre E-Mail und klicken Sie dann auf „Als Aktion
            festhalten“.
          </Typography>
        ) : (
          <Box sx={{ overflowX: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Aktion</TableCell>
                  <TableCell>Datum</TableCell>
                  <TableCell align="right">Angeschrieben</TableCell>
                  <TableCell align="right">Gekauft</TableCell>
                  <TableCell align="right">Quote</TableCell>
                  <TableCell align="right">Umsatz</TableCell>
                  <TableCell align="right">Kosten</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {aktionen.map((a) => (
                  <ErfolgZeile
                    key={a.id}
                    aktion={a}
                    wochen={wochen}
                    loeschen={() => void aktionLoeschen(a)}
                  />
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </Abschnitt>

      <AktionDialog
        key={String(aktionOffen)}
        offen={aktionOffen}
        schliessen={() => setAktionOffen(false)}
        speichern={(d) => void aktionSpeichern(d)}
        anzahl={anzahl ?? 0}
      />
    </Box>
  );
};
