// Übersicht "Abgerechnete Rezepte" (Route /rezepte): alle über den
// Abrechnungsdienstleister abgerechneten Kassenrezepte mit Gesamtüberblick
// (Kennzahlen, Summen je Abrechnungsmonat und Krankenkasse), Suche und
// CSV-Export für Excel. Grundlage ist die Tabelle kassenrezept
// (my-admin/src/kassenrezept.ts). Die Kundenkartei zeigt dieselben Rezepte
// je Kunde (KundeKassenrezepte.tsx).
import { useCallback, useEffect, useMemo, useState } from "react";
import { Title } from "react-admin";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  FormControlLabel,
  InputAdornment,
  Link,
  MenuItem,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/FileDownloadOutlined";
import SearchIcon from "@mui/icons-material/Search";
import dayjs from "dayjs";
import { supabase } from "./utils";
import { formatCurrency } from "./CurrencyField";
import { tokensFor } from "./designTokens";
import {
  Kassenrezept,
  RezeptFilter,
  csvAus,
  doppelteIds,
  fehlendeMonate,
  filtereRezepte,
  kassenanteil,
  leererFilter,
  leistungenText,
  monatKurz,
  monatName,
  nachKasse,
  nachMonat,
  personText,
  rezeptSummen,
  sortiereRezepte,
  zahl,
} from "./kassenrezept";

const TABELLE = "kassenrezept";
const SEITE = 1000; // PostgREST liefert höchstens 1000 Zeilen je Abruf
const MAX_ZEILEN = 1000;

const datum = (w: string | null) => (w ? dayjs(w).format("DD.MM.YYYY") : "");

const ladeAlle = async (): Promise<Kassenrezept[]> => {
  const alle: Kassenrezept[] = [];
  for (let von = 0; ; von += SEITE) {
    const { data, error } = await supabase
      .from(TABELLE)
      .select("*")
      .order("id", { ascending: true })
      .range(von, von + SEITE - 1);
    if (error) throw error;
    alle.push(...((data ?? []) as Kassenrezept[]));
    if (!data || data.length < SEITE) break;
  }
  return alle;
};

const tabelleSx = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "0.9rem",
  "& th": {
    textAlign: "left",
    fontWeight: 600,
    color: "text.secondary",
    p: "6px 10px",
    borderBottom: "1px solid",
    borderColor: "divider",
    whiteSpace: "nowrap",
    position: "sticky",
    top: 0,
    zIndex: 1,
    backgroundColor: "background.paper",
  },
  "& td": {
    p: "6px 10px",
    borderBottom: "1px solid",
    borderColor: "divider",
    verticalAlign: "middle",
  },
  "& .zahl": { textAlign: "right", whiteSpace: "nowrap" },
} as const;

const Kennzahl = ({
  titel,
  wert,
  unter,
}: {
  titel: string;
  wert: string;
  unter?: string;
}) => (
  <Card variant="outlined" sx={{ p: 1.5, minWidth: 0 }}>
    <Typography
      sx={{ fontSize: 12.5, color: (theme) => tokensFor(theme).text3 }}
    >
      {titel}
    </Typography>
    <Typography
      sx={{
        fontSize: 22,
        fontWeight: 700,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {wert}
    </Typography>
    {unter && (
      <Typography
        sx={{ fontSize: 12, color: (theme) => tokensFor(theme).text3 }}
      >
        {unter}
      </Typography>
    )}
  </Card>
);

export const KassenrezepteSeite = () => {
  const navigate = useNavigate();
  const [rezepte, setRezepte] = useState<Kassenrezept[] | null>(null);
  const [fehler, setFehler] = useState(false);
  const [filter, setFilter] = useState<RezeptFilter>(leererFilter);

  const laden = useCallback(async () => {
    try {
      setRezepte(await ladeAlle());
      setFehler(false);
    } catch (err) {
      console.error("Abgerechnete Rezepte konnten nicht geladen werden", err);
      setFehler(true);
      setRezepte([]);
    }
  }, []);

  useEffect(() => {
    void laden();
  }, [laden]);

  const alle = useMemo(() => rezepte ?? [], [rezepte]);
  const doppelt = useMemo(() => doppelteIds(alle), [alle]);
  const monate = useMemo(() => nachMonat(alle), [alle]);
  const fehlend = useMemo(
    () => fehlendeMonate(monate.map((m) => m.monat)),
    [monate],
  );
  const gefiltert = useMemo(
    () => sortiereRezepte(filtereRezepte(alle, filter, doppelt)),
    [alle, filter, doppelt],
  );
  const summen = useMemo(() => rezeptSummen(gefiltert), [gefiltert]);
  // Krankenkassen-Übersicht folgt dem gewählten Monat, nicht der Kassenwahl
  const kassen = useMemo(
    () =>
      nachKasse(
        filtereRezepte(alle, { ...leererFilter, monat: filter.monat }, doppelt),
      ),
    [alle, filter.monat, doppelt],
  );
  const kassenNamen = useMemo(
    () => nachKasse(alle).map((k) => k.kasse),
    [alle],
  );

  const setze = <K extends keyof RezeptFilter>(
    feld: K,
    wert: RezeptFilter[K],
  ) => setFilter((f) => ({ ...f, [feld]: wert }));
  const filterAktiv =
    filter.monat !== "" ||
    filter.kasse !== "" ||
    filter.suche !== "" ||
    filter.nurAuffaellig;

  const exportieren = () => {
    const blob = new Blob([csvAus(gefiltert)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `abgerechnete-rezepte-${dayjs().format("YYYY-MM-DD")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Monatstabelle inkl. Monaten ohne Abrechnung (Lücken)
  const monatsZeilen = useMemo(() => {
    const zeilen: {
      monat: string;
      luecke: boolean;
      anzahl: number;
      brutto: number;
      zuzahlung: number;
      kassenanteil: number;
    }[] = monate.map((m) => ({ ...m, luecke: false }));
    for (const monat of fehlend) {
      zeilen.push({
        monat,
        luecke: true,
        anzahl: 0,
        brutto: 0,
        zuzahlung: 0,
        kassenanteil: 0,
      });
    }
    return zeilen.sort((a, b) => (a.monat < b.monat ? -1 : 1));
  }, [monate, fehlend]);

  const gesamt = useMemo(() => rezeptSummen(alle), [alle]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Title title="Abgerechnete Rezepte" />

      {rezepte === null ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      ) : fehler ? (
        <Alert severity="error">
          Die abgerechneten Rezepte konnten nicht geladen werden.
        </Alert>
      ) : alle.length === 0 ? (
        <Alert severity="info">
          Noch keine abgerechneten Rezepte vorhanden. Sobald die
          Rezeptübersichten (Sammelrechnungen) importiert sind, erscheinen sie
          hier.
        </Alert>
      ) : (
        <>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr 1fr",
                md: "repeat(4, minmax(0, 1fr))",
              },
              gap: 1.5,
            }}
          >
            <Kennzahl
              titel={filterAktiv ? "Rezepte (gefiltert)" : "Rezepte"}
              wert={String(summen.anzahl)}
              unter={filterAktiv ? `von ${gesamt.anzahl} gesamt` : undefined}
            />
            <Kennzahl
              titel="Brutto"
              wert={formatCurrency(summen.brutto)}
              unter={`Netto ${formatCurrency(summen.netto)}`}
            />
            <Kennzahl
              titel="Zuzahlungen"
              wert={formatCurrency(summen.zuzahlung)}
              unter="vom Versicherten"
            />
            <Kennzahl
              titel="Kassenanteil"
              wert={formatCurrency(summen.kassenanteil)}
              unter="Brutto minus Zuzahlung"
            />
          </Box>

          {(fehlend.length > 0 || doppelt.size > 0) && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {fehlend.length > 0 && (
                <Alert severity="warning">
                  Für {fehlend.map(monatName).join(", ")} liegt keine Abrechnung
                  vor.
                </Alert>
              )}
              {doppelt.size > 0 && (
                <Alert
                  severity="warning"
                  action={
                    <Button
                      color="inherit"
                      size="small"
                      onClick={() => setze("nurAuffaellig", true)}
                    >
                      Anzeigen
                    </Button>
                  }
                >
                  {doppelt.size} Rezepte wurden für dieselbe Person mit
                  demselben Rezeptdatum mehrfach abgerechnet. Das kann eine
                  Neuabrechnung nach Absetzung sein, aber auch eine
                  Doppelabrechnung.
                </Alert>
              )}
            </Box>
          )}

          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 1.5,
              alignItems: "flex-start",
            }}
          >
            <Card
              variant="outlined"
              sx={{ p: 1.5, flex: "1 1 460px", minWidth: 0 }}
            >
              <Typography sx={{ fontWeight: 600, mb: 0.5 }}>
                Nach Abrechnungsmonat
              </Typography>
              <Box sx={{ overflowX: "auto" }}>
                <Box component="table" sx={tabelleSx}>
                  <thead>
                    <tr>
                      <th>Monat</th>
                      <th className="zahl">Rezepte</th>
                      <th className="zahl">Brutto</th>
                      <th className="zahl">Zuzahlung</th>
                      <th className="zahl">Kassenanteil</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monatsZeilen.map((m) => {
                      const aktiv = filter.monat === m.monat;
                      return (
                        <Box
                          component="tr"
                          key={m.monat}
                          onClick={
                            m.luecke
                              ? undefined
                              : () => setze("monat", aktiv ? "" : m.monat)
                          }
                          sx={(theme) => ({
                            cursor: m.luecke ? "default" : "pointer",
                            backgroundColor: aktiv
                              ? tokensFor(theme).primarySoft
                              : undefined,
                            "&:hover": m.luecke
                              ? undefined
                              : { backgroundColor: tokensFor(theme).hover },
                          })}
                        >
                          <td>
                            {monatName(m.monat)}
                            {m.luecke && (
                              <Chip
                                size="small"
                                color="warning"
                                variant="outlined"
                                label="fehlt"
                                sx={{ ml: 1 }}
                              />
                            )}
                          </td>
                          <td className="zahl">{m.luecke ? "–" : m.anzahl}</td>
                          <td className="zahl">
                            {m.luecke ? "–" : formatCurrency(m.brutto)}
                          </td>
                          <td className="zahl">
                            {m.luecke ? "–" : formatCurrency(m.zuzahlung)}
                          </td>
                          <td className="zahl">
                            {m.luecke ? "–" : formatCurrency(m.kassenanteil)}
                          </td>
                        </Box>
                      );
                    })}
                    <Box component="tr" sx={{ fontWeight: 700 }}>
                      <td>Gesamt</td>
                      <td className="zahl">{gesamt.anzahl}</td>
                      <td className="zahl">{formatCurrency(gesamt.brutto)}</td>
                      <td className="zahl">
                        {formatCurrency(gesamt.zuzahlung)}
                      </td>
                      <td className="zahl">
                        {formatCurrency(gesamt.kassenanteil)}
                      </td>
                    </Box>
                  </tbody>
                </Box>
              </Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mt: 0.5 }}
              >
                Ein Klick auf einen Monat filtert die Rezepte unten.
              </Typography>
            </Card>

            <Card
              variant="outlined"
              sx={{ p: 1.5, flex: "1 1 360px", minWidth: 0 }}
            >
              <Typography sx={{ fontWeight: 600, mb: 0.5 }}>
                Nach Krankenkasse
                {filter.monat ? ` (${monatName(filter.monat)})` : ""}
              </Typography>
              <Box sx={{ maxHeight: 340, overflowY: "auto" }} tabIndex={0}>
                <Box component="table" sx={tabelleSx}>
                  <thead>
                    <tr>
                      <th>Krankenkasse</th>
                      <th className="zahl">Rezepte</th>
                      <th className="zahl">Brutto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kassen.map((k) => {
                      const aktiv = filter.kasse === k.kasse;
                      return (
                        <Box
                          component="tr"
                          key={k.kasse}
                          onClick={() => setze("kasse", aktiv ? "" : k.kasse)}
                          sx={(theme) => ({
                            cursor: "pointer",
                            backgroundColor: aktiv
                              ? tokensFor(theme).primarySoft
                              : undefined,
                            "&:hover": {
                              backgroundColor: tokensFor(theme).hover,
                            },
                          })}
                        >
                          <td>{k.kasse}</td>
                          <td className="zahl">{k.anzahl}</td>
                          <td className="zahl">{formatCurrency(k.brutto)}</td>
                        </Box>
                      );
                    })}
                  </tbody>
                </Box>
              </Box>
            </Card>
          </Box>

          <Card variant="outlined" sx={{ p: 1.5 }}>
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 1.5,
                mb: 1,
              }}
            >
              <Typography sx={{ fontWeight: 600, flex: "1 1 auto" }}>
                Rezepte ({gefiltert.length})
              </Typography>
              <TextField
                size="small"
                placeholder="Name, Beleg- oder Versichertennr."
                value={filter.suche}
                onChange={(e) => setze("suche", e.target.value)}
                sx={{ minWidth: 260 }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <TextField
                select
                size="small"
                label="Monat"
                value={filter.monat}
                onChange={(e) => setze("monat", e.target.value)}
                sx={{ minWidth: 140 }}
              >
                <MenuItem value="">Alle</MenuItem>
                {monate.map((m) => (
                  <MenuItem key={m.monat} value={m.monat}>
                    {monatKurz(m.monat)}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                size="small"
                label="Krankenkasse"
                value={filter.kasse}
                onChange={(e) => setze("kasse", e.target.value)}
                sx={{ minWidth: 200 }}
              >
                <MenuItem value="">Alle</MenuItem>
                {kassenNamen.map((k) => (
                  <MenuItem key={k} value={k}>
                    {k}
                  </MenuItem>
                ))}
              </TextField>
              <FormControlLabel
                control={
                  <Switch
                    checked={filter.nurAuffaellig}
                    onChange={(e) => setze("nurAuffaellig", e.target.checked)}
                  />
                }
                label="Nur zu prüfende"
              />
              {filterAktiv && (
                <Button size="small" onClick={() => setFilter(leererFilter)}>
                  Filter zurücksetzen
                </Button>
              )}
              <Button
                size="small"
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={exportieren}
                disabled={gefiltert.length === 0}
              >
                Für Excel exportieren
              </Button>
            </Box>

            {gefiltert.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                Keine Rezepte für diese Auswahl.
              </Typography>
            ) : (
              <Box
                tabIndex={0}
                aria-label="Abgerechnete Rezepte, scrollbar"
                sx={{ maxHeight: 560, overflow: "auto" }}
              >
                <Box component="table" sx={tabelleSx}>
                  <thead>
                    <tr>
                      <th>Abrechnung</th>
                      <th>Kunde</th>
                      <th>Krankenkasse</th>
                      <th>Rezept vom</th>
                      <th>Leistungen</th>
                      <th className="zahl">Brutto</th>
                      <th className="zahl">Zuzahlung</th>
                      <th className="zahl">Kassenanteil</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gefiltert.slice(0, MAX_ZEILEN).map((r) => (
                      <tr key={r.id}>
                        <td style={{ whiteSpace: "nowrap" }}>
                          {monatKurz(r.Abrechnungsmonat)}
                        </td>
                        <td>
                          {r.kunde_id != null ? (
                            <Link
                              component="button"
                              type="button"
                              underline="hover"
                              onClick={() =>
                                navigate(`/kunde/${r.kunde_id}/show`)
                              }
                              sx={{ textAlign: "left" }}
                            >
                              {personText(r)}
                            </Link>
                          ) : (
                            <>
                              {personText(r)}
                              <Tooltip title="Noch keinem Kunden in der Kartei zugeordnet">
                                <Chip
                                  size="small"
                                  variant="outlined"
                                  label="nicht zugeordnet"
                                  sx={{ ml: 1 }}
                                />
                              </Tooltip>
                            </>
                          )}
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: "block" }}
                          >
                            Beleg {r.Belegnummer}
                          </Typography>
                        </td>
                        <td>{r.Krankenkasse}</td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          {datum(r.Rezeptdatum)}
                        </td>
                        <td>
                          {leistungenText(r)}
                          {doppelt.has(r.id) && (
                            <Tooltip title="Gleiche Person und gleiches Rezeptdatum wurden mehrfach abgerechnet">
                              <Chip
                                size="small"
                                color="warning"
                                label="prüfen"
                                sx={{ ml: 1 }}
                              />
                            </Tooltip>
                          )}
                        </td>
                        <td className="zahl">
                          {formatCurrency(zahl(r.Brutto))}
                        </td>
                        <td className="zahl">
                          {formatCurrency(zahl(r.Zuzahlung))}
                        </td>
                        <td className="zahl">
                          {formatCurrency(kassenanteil(r))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Box>
              </Box>
            )}
            {gefiltert.length > MAX_ZEILEN && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mt: 0.5 }}
              >
                Angezeigt werden die ersten {MAX_ZEILEN} Rezepte; mit den
                Filtern oben grenzt du ein. Der Export enthält alle.
              </Typography>
            )}
          </Card>
        </>
      )}
    </Box>
  );
};
