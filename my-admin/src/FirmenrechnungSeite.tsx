// Seite "Firmenrechnung" (Route /firmenrechnung): Honorarrechnungen an Firmen
// (z. B. Gesundheitstag, Netzhautscreening) ohne Kunden oder Auftrag.
// Links eintragen, rechts die Vorschau im Rechnungsdesign. "Rechnung
// stellen" vergibt die nächste fortlaufende Rechnungsnummer und speichert
// die Rechnung (Tabelle firmenrechnung); danach Drucken oder als PDF
// speichern. Gestellte Rechnungen lassen sich unten erneut öffnen.
import { useCallback, useEffect, useMemo, useState } from "react";
import { Title, useNotify } from "react-admin";
import {
  Alert,
  Box,
  Button,
  Card,
  CircularProgress,
  IconButton,
  MenuItem,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import PrintIcon from "@mui/icons-material/Print";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import dayjs from "dayjs";
import { supabase } from "./utils";
import { formatEuro } from "./rechnungTemplate";
import { belegAlsPdf, herunterladen } from "./belegPdf";
import { druckeDirekt } from "./direktDruck";
import {
  alsDatensatz,
  ausDatensatz,
  buildFirmenrechnungHtml,
  fehlendeAngaben,
  leereFirmenrechnung,
  summen,
  type Firmenrechnung,
} from "./firmenrechnungTemplate";

type Gespeichert = Parameters<typeof ausDatensatz>[0] & {
  id: number;
  created_at: string;
};

const heute = () => dayjs().format("YYYY-MM-DD");

export const FirmenrechnungSeite = () => {
  const notify = useNotify();
  const [r, setR] = useState<Firmenrechnung>(() =>
    leereFirmenrechnung(heute()),
  );
  const [arbeitet, setArbeitet] = useState(false);
  const [liste, setListe] = useState<Gespeichert[] | null>(null);

  const laden = useCallback(async () => {
    const { data, error } = await supabase
      .from("firmenrechnung")
      .select("*")
      .order("Rechnungsdatum", { ascending: false })
      .order("id", { ascending: false })
      .limit(200);
    if (error) {
      notify("Firmenrechnungen konnten nicht geladen werden.", {
        type: "error",
      });
      setListe([]);
      return;
    }
    setListe((data ?? []) as Gespeichert[]);
  }, [notify]);

  useEffect(() => {
    void laden();
  }, [laden]);

  const gestellt = Boolean(r.rechnungsnummer);
  const s = summen(r);
  const fehlt = fehlendeAngaben(r);
  const vorschau = useMemo(() => buildFirmenrechnungHtml(r, true), [r]);

  const setze = <K extends keyof Firmenrechnung>(
    feld: K,
    wert: Firmenrechnung[K],
  ) => setR((alt) => ({ ...alt, [feld]: wert }));
  const setzePosition = (
    i: number,
    feld: keyof Firmenrechnung["positionen"][number],
    wert: string,
  ) =>
    setR((alt) => ({
      ...alt,
      positionen: alt.positionen.map((p, j) =>
        j === i ? { ...p, [feld]: wert } : p,
      ),
    }));

  const stellen = async () => {
    setArbeitet(true);
    const { data, error } = await supabase.rpc("firmenrechnung_anlegen", {
      p: alsDatensatz(r),
    });
    setArbeitet(false);
    if (error || !data) {
      notify(
        `Rechnung konnte nicht gestellt werden: ${error?.message ?? "unbekannt"}`,
        { type: "error" },
      );
      return;
    }
    const zeile = data as Gespeichert;
    setR(ausDatensatz(zeile));
    notify(`Rechnung ${zeile.Rechnungsnummer} gestellt.`, { type: "success" });
    void laden();
  };

  const dateiname = () =>
    `Rechnung-${r.rechnungsnummer}-${
      r.empfaenger
        .split("\n")[0]
        ?.trim()
        .replace(/[^\wÄÖÜäöüß-]+/g, "-") || "Firma"
    }.pdf`;

  const pdf = async () => {
    setArbeitet(true);
    try {
      herunterladen(
        await belegAlsPdf(buildFirmenrechnungHtml(r, false), dateiname()),
      );
    } catch {
      notify("PDF konnte nicht erstellt werden.", { type: "error" });
    }
    setArbeitet(false);
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        p: { xs: 1, md: 2 },
      }}
    >
      <Title title="Firmenrechnung" />
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "minmax(360px, 1fr) 1.15fr" },
          gap: 2,
          alignItems: "start",
        }}
      >
        <Card
          variant="outlined"
          sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography sx={{ fontWeight: 600, flex: 1 }}>
              {gestellt
                ? `Rechnung ${r.rechnungsnummer}`
                : "Neue Honorarrechnung"}
            </Typography>
            {gestellt && (
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={() => setR(leereFirmenrechnung(heute()))}
              >
                Neue Rechnung
              </Button>
            )}
          </Box>
          {gestellt && (
            <Alert severity="info">
              Gestellte Rechnungen werden nicht mehr geändert. Für eine
              Korrektur bitte eine neue Rechnung stellen.
            </Alert>
          )}
          <TextField
            label="Empfänger (Firma, Straße, PLZ Ort)"
            multiline
            minRows={3}
            size="small"
            required
            disabled={gestellt}
            value={r.empfaenger}
            onChange={(e) => setze("empfaenger", e.target.value)}
          />
          <Box
            sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}
          >
            <TextField
              label="Rechnungsdatum"
              type="date"
              size="small"
              disabled={gestellt}
              value={r.rechnungsdatum}
              onChange={(e) => setze("rechnungsdatum", e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="Leistungsdatum"
              type="date"
              size="small"
              disabled={gestellt}
              value={r.leistungsdatum}
              onChange={(e) => setze("leistungsdatum", e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="Auftrag Nr. (der Firma)"
              size="small"
              disabled={gestellt}
              value={r.auftragsnummer}
              onChange={(e) => setze("auftragsnummer", e.target.value)}
            />
            <TextField
              label="Zeit (von – bis)"
              size="small"
              disabled={gestellt}
              value={r.zeit}
              onChange={(e) => setze("zeit", e.target.value)}
            />
            <TextField
              label="Ort"
              size="small"
              disabled={gestellt}
              value={r.ort}
              onChange={(e) => setze("ort", e.target.value)}
            />
            <TextField
              label="Ansprechpartner"
              size="small"
              disabled={gestellt}
              value={r.ansprechpartner}
              onChange={(e) => setze("ansprechpartner", e.target.value)}
            />
          </Box>
          <TextField
            label="Aktivität (Veranstaltung, Vortrag, Seminar …)"
            size="small"
            disabled={gestellt}
            value={r.aktivitaet}
            onChange={(e) => setze("aktivitaet", e.target.value)}
          />
          <TextField
            label="Beschreibung des Auftrags"
            multiline
            minRows={2}
            size="small"
            disabled={gestellt}
            value={r.beschreibung}
            onChange={(e) => setze("beschreibung", e.target.value)}
          />

          <Typography variant="subtitle2" sx={{ mt: 1 }}>
            Positionen (netto)
          </Typography>
          {r.positionen.map((p, i) => (
            <Box
              key={i}
              sx={{
                display: "grid",
                gridTemplateColumns: "0.8fr 1.6fr 0.8fr auto",
                gap: 1,
                alignItems: "center",
              }}
            >
              <TextField
                label="Zeitaufwand"
                size="small"
                disabled={gestellt}
                value={p.zeitaufwand}
                onChange={(e) =>
                  setzePosition(i, "zeitaufwand", e.target.value)
                }
              />
              <TextField
                label="Aktivität"
                size="small"
                disabled={gestellt}
                value={p.aktivitaet}
                onChange={(e) => setzePosition(i, "aktivitaet", e.target.value)}
              />
              <TextField
                label="Betrag €"
                size="small"
                inputMode="decimal"
                disabled={gestellt}
                value={p.betrag}
                onChange={(e) => setzePosition(i, "betrag", e.target.value)}
              />
              <Tooltip title="Position entfernen">
                <span>
                  <IconButton
                    size="small"
                    aria-label="Position entfernen"
                    disabled={gestellt || r.positionen.length === 1}
                    onClick={() =>
                      setze(
                        "positionen",
                        r.positionen.filter((_, j) => j !== i),
                      )
                    }
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
          ))}
          {!gestellt && (
            <Button
              size="small"
              startIcon={<AddIcon />}
              sx={{ alignSelf: "flex-start" }}
              onClick={() =>
                setze("positionen", [
                  ...r.positionen,
                  { zeitaufwand: "", aktivitaet: "", betrag: "" },
                ])
              }
            >
              Position
            </Button>
          )}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 1.5,
            }}
          >
            <TextField
              label="Gefahrene km"
              size="small"
              inputMode="decimal"
              disabled={gestellt}
              value={r.kilometer}
              onChange={(e) => setze("kilometer", e.target.value)}
            />
            <TextField
              label="€ je km"
              size="small"
              inputMode="decimal"
              disabled={gestellt}
              value={r.kmSatz}
              onChange={(e) => setze("kmSatz", e.target.value)}
            />
            <TextField
              select
              label="MwSt"
              size="small"
              disabled={gestellt}
              value={r.mwstSatz}
              onChange={(e) => setze("mwstSatz", Number(e.target.value))}
            >
              <MenuItem value={19}>19 %</MenuItem>
              <MenuItem value={7}>7 %</MenuItem>
              <MenuItem value={0}>0 %</MenuItem>
            </TextField>
          </Box>
          <TextField
            label="Bemerkung (erscheint unter der Bankverbindung)"
            multiline
            size="small"
            disabled={gestellt}
            value={r.bemerkung}
            onChange={(e) => setze("bemerkung", e.target.value)}
          />
          <Typography variant="body2" color="text.secondary">
            Netto {formatEuro(s.netto)} · MwSt {formatEuro(s.mwst)} · Gesamt{" "}
            <strong>{formatEuro(s.brutto)}</strong>
          </Typography>
          {!gestellt && fehlt.length > 0 && (
            <Alert severity="info">Noch offen: {fehlt.join(", ")}</Alert>
          )}
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {!gestellt ? (
              <Button
                variant="contained"
                disabled={arbeitet || fehlt.length > 0}
                onClick={() => void stellen()}
                startIcon={
                  arbeitet ? <CircularProgress size={16} /> : undefined
                }
              >
                Rechnung stellen
              </Button>
            ) : (
              <>
                <Button
                  variant="contained"
                  startIcon={<PrintIcon />}
                  onClick={() =>
                    druckeDirekt(buildFirmenrechnungHtml(r, false))
                  }
                >
                  Drucken
                </Button>
                <Button
                  variant="outlined"
                  disabled={arbeitet}
                  startIcon={<PictureAsPdfIcon />}
                  onClick={() => void pdf()}
                >
                  PDF speichern
                </Button>
              </>
            )}
          </Box>
        </Card>

        <Card variant="outlined" sx={{ p: 1, minWidth: 0 }}>
          <Box
            component="iframe"
            title="Vorschau Firmenrechnung"
            srcDoc={vorschau}
            sx={{ width: "100%", height: 1150, border: 0 }}
          />
        </Card>
      </Box>

      <Card variant="outlined" sx={{ p: 2 }}>
        <Typography sx={{ fontWeight: 600, mb: 1 }}>
          Gestellte Firmenrechnungen
        </Typography>
        {liste === null ? (
          <CircularProgress size={22} />
        ) : liste.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Noch keine Firmenrechnung gestellt.
          </Typography>
        ) : (
          liste.map((z) => (
            <Box
              key={z.id}
              sx={{
                display: "flex",
                gap: 2,
                alignItems: "center",
                flexWrap: "wrap",
                py: 0.5,
                borderBottom: 1,
                borderColor: "divider",
              }}
            >
              <Typography variant="body2" sx={{ width: 90 }}>
                {dayjs(z.Rechnungsdatum).format("DD.MM.YYYY")}
              </Typography>
              <Typography variant="body2" sx={{ width: 80 }}>
                {z.Rechnungsnummer}
              </Typography>
              <Typography variant="body2" sx={{ flex: "1 1 200px" }}>
                {(z.Empfaenger ?? "").split("\n")[0]}
              </Typography>
              <Typography
                variant="body2"
                sx={{ width: 100, textAlign: "right" }}
              >
                {formatEuro(Number(z.Brutto) || 0)}
              </Typography>
              <Button size="small" onClick={() => setR(ausDatensatz(z))}>
                Öffnen
              </Button>
            </Box>
          ))
        )}
      </Card>
    </Box>
  );
};
