// Glasbestellungen je Monat (Statistiken): Balken für das gewählte Jahr und
// blasser für das Vorjahr, umschaltbar zwischen Gläsern, Aufträgen und
// Glasumsatz. Darunter die Summe im Vergleich zum Vorjahr (laufendes Jahr:
// nur bis zum aktuellen Monat).
import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  CircularProgress,
  MenuItem,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { supabase } from "./utils";
import {
  GlasMonatZeile,
  KENNZAHLEN,
  Kennzahl,
  MONATE_KURZ,
  achsenMax,
  monatsreihe,
  vergleich,
} from "./glasStatistik";

const zahl = new Intl.NumberFormat("de-DE");
const euro = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const B = 720;
const H = 260;
const LINKS = 56;
const UNTEN = 26;
const OBEN = 10;

export const GlasStatistik = () => {
  const theme = useTheme();
  const heute = new Date();
  const [jahr, setJahr] = useState(heute.getFullYear());
  const [kennzahl, setKennzahl] = useState<Kennzahl>("glaeser");
  const [zeilen, setZeilen] = useState<GlasMonatZeile[] | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);

  useEffect(() => {
    let aktiv = true;
    setZeilen(null);
    setFehler(null);
    void supabase
      .rpc("glas_statistik_monat", { p_jahr: jahr })
      .then(({ data, error }) => {
        if (!aktiv) return;
        if (error) setFehler(error.message);
        else setZeilen((data ?? []) as GlasMonatZeile[]);
      });
    return () => {
      aktiv = false;
    };
  }, [jahr]);

  const format = (n: number) =>
    kennzahl === "umsatz" ? euro.format(n) : zahl.format(n);
  const jahre = Array.from({ length: 8 }, (_, i) => heute.getFullYear() - i);

  const reihe = zeilen ? monatsreihe(zeilen, jahr, kennzahl) : [];
  const laufend = jahr === heute.getFullYear();
  const bis = laufend ? heute.getMonth() + 1 : 12;
  const v = vergleich(reihe, bis);
  const max = zeilen ? achsenMax(reihe) : 1;
  const breite = (B - LINKS) / 12;
  const hoehe = H - UNTEN - OBEN;
  const y = (n: number) => OBEN + hoehe - (n / max) * hoehe;
  const farbe = theme.palette.primary.main;
  const linie = theme.palette.divider;
  const schrift = theme.palette.text.secondary;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      <Box
        sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}
      >
        <TextField
          select
          size="small"
          label="Jahr"
          value={jahr}
          onChange={(e) => setJahr(Number(e.target.value))}
          sx={{ width: 110 }}
        >
          {jahre.map((j) => (
            <MenuItem key={j} value={j}>
              {j}
            </MenuItem>
          ))}
        </TextField>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={kennzahl}
          onChange={(_, k) => k && setKennzahl(k)}
        >
          {KENNZAHLEN.map((k) => (
            <ToggleButton
              key={k.id}
              value={k.id}
              sx={{ textTransform: "none" }}
            >
              {k.name}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      {fehler && <Alert severity="error">{fehler}</Alert>}
      {!zeilen && !fehler && <CircularProgress size={22} />}
      {zeilen && (
        <>
          <Box
            component="svg"
            viewBox={`0 0 ${B} ${H}`}
            role="img"
            aria-label={`${KENNZAHLEN.find((k) => k.id === kennzahl)?.name} je Monat ${jahr} und ${jahr - 1}`}
            sx={{ width: "100%", height: "auto", display: "block" }}
          >
            {[0, 0.2, 0.4, 0.6, 0.8, 1].map((t) => (
              <g key={t}>
                <line
                  x1={LINKS}
                  x2={B}
                  y1={y(max * t)}
                  y2={y(max * t)}
                  stroke={linie}
                  strokeWidth={1}
                />
                <text
                  x={LINKS - 6}
                  y={y(max * t) + 4}
                  textAnchor="end"
                  fontSize={11}
                  fill={schrift}
                >
                  {kennzahl === "umsatz"
                    ? `${zahl.format(Math.round((max * t) / 1000))} T€`
                    : zahl.format(Math.round(max * t))}
                </text>
              </g>
            ))}
            {reihe.map((m, i) => {
              const x = LINKS + i * breite;
              const w = breite * 0.34;
              return (
                <g key={m.monat}>
                  <title>
                    {`${MONATE_KURZ[i]}: ${jahr} ${format(m.jahr)} · ${jahr - 1} ${format(m.vorjahr)}`}
                  </title>
                  <rect
                    x={x + breite * 0.14}
                    y={y(m.vorjahr)}
                    width={w}
                    height={Math.max(0, y(0) - y(m.vorjahr))}
                    fill={farbe}
                    opacity={0.3}
                    rx={2}
                  />
                  <rect
                    x={x + breite * 0.14 + w + 2}
                    y={y(m.jahr)}
                    width={w}
                    height={Math.max(0, y(0) - y(m.jahr))}
                    fill={farbe}
                    rx={2}
                  />
                  <text
                    x={x + breite / 2}
                    y={H - 8}
                    textAnchor="middle"
                    fontSize={11}
                    fill={schrift}
                  >
                    {MONATE_KURZ[i]}
                  </text>
                </g>
              );
            })}
          </Box>
          <Box
            sx={{
              display: "flex",
              gap: 2,
              flexWrap: "wrap",
              alignItems: "baseline",
            }}
          >
            <Typography sx={{ fontWeight: 700 }}>
              {jahr}: {format(v.jahr)}
            </Typography>
            <Typography color="text.secondary">
              {jahr - 1}: {format(v.vorjahr)}
              {laufend && ` (jeweils Jan–${MONATE_KURZ[bis - 1]})`}
            </Typography>
            {v.prozent != null && (
              <Typography
                sx={{
                  fontWeight: 700,
                  color: v.prozent >= 0 ? "success.main" : "error.main",
                }}
              >
                {v.prozent >= 0 ? "+" : ""}
                {v.prozent.toLocaleString("de-DE")} %
              </Typography>
            )}
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ ml: "auto" }}
            >
              hell = {jahr - 1}, kräftig = {jahr}
            </Typography>
          </Box>
        </>
      )}
    </Box>
  );
};
