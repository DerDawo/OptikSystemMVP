// Dashboard-Startseite (#85): fasst den aktuellen Geschäftsstand (offene
// Aufträge, Termine, neue Kunden, ...) in Widget-Karten
// zusammen. Wird über die `dashboard`-Prop von <Admin> in App.tsx als
// Startseite eingehängt.
//
// Die Widgets basieren auf echten, mit dataProvider.getList/getMany geladenen
// Daten (kein Platzhalter). Da einige Kennzahlen (z. B. der Auftragsstatus)
// nur clientseitig aus vorhandenen Feldern abgeleitet werden können (siehe
// orderStatus.tsx), werden die zugrunde liegenden Listen serverseitig auf
// einen sinnvollen Zeitraum eingegrenzt (z. B. letzte 6 Monate für
// "offene Aufträge"), damit die Ladezeit auch bei wachsender Datenmenge
// akzeptabel bleibt.
import {
  useCallback,
  useEffect,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { useDataProvider, RecordContextProvider, Title } from "react-admin";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Card,
  CircularProgress,
  IconButton,
  Typography,
} from "@mui/material";
import { alpha, type Theme } from "@mui/material/styles";
import RefreshIcon from "@mui/icons-material/Refresh";
import dayjs from "dayjs";
import { CurrencyField } from "./CurrencyField";
import { BrilleStatusChip, getBrilleOrderStatus } from "./orderStatus";
import { tokensFor } from "./designTokens";
import { CalendarIcon, CheckIcon, GlassesIcon, UserPlusIcon } from "./icons";

type BrilleRow = {
  id: number | string;
  kunde_id?: number | string | null;
  Datum?: string | null;
  Abholung?: string | null;
  Summe?: number | null;
  Restbetrag?: number | null;
  Mahnstufe?: number | null;
  Zahlungsstatus?: string | null;
};

// Zahlungsstatus, bei denen noch Geld vom Kunden aussteht (ohne
// "Versicherung" - dort zahlt die Versicherung)
const UNBEZAHLT = ["offen", "teilweise offen", "Ratenzahlung"];

const euro = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});

type KontaktlinseRow = {
  id: number | string;
  kunde_id?: number | string | null;
  Abholung?: string | null;
};

type TerminRow = {
  id: number | string;
  kunde_id?: number | string | null;
  Start: string;
  Terminart?: string | null;
  Titel?: string | null;
};

type KundeRow = {
  id: number | string;
  Anrede?: string | null;
  Vorname?: string | null;
  Nachname?: string | null;
};

type ZusatzleistungRow = { id: number | string; Bezeichnung?: string | null };

interface DashboardStats {
  offeneAuftraege: { inBearbeitung: number; bereit: number };
  termine: {
    heute: (TerminRow & { kundeName: string })[];
    anzahlHeute: number;
    anzahlWoche: number;
  };
  abholbereit: {
    rows: (BrilleRow & { kundeName: string })[];
    total: number;
  };
  neueKunden: number;
  schuldner: {
    rows: (BrilleRow & { kundeName: string })[];
    total: number;
    summe: number;
  };
  topZusatzleistungen: {
    id: number | string;
    bezeichnung: string;
    anzahl: number;
  }[];
}

const kundeDisplayName = (kunde?: KundeRow) => {
  if (!kunde) return undefined;
  return (
    [kunde.Anrede, kunde.Vorname, kunde.Nachname]
      .filter(Boolean)
      .join(" ")
      .trim() || undefined
  );
};

type Tone = "primary" | "success" | "warning" | "info" | "error";

// Statusfarbe als dezente Tönung (Hintergrund) plus gut lesbarer Vordergrund
const toneColors = (theme: Theme, tone: Tone) => {
  const c = theme.palette[tone];
  const dark = theme.palette.mode === "dark";
  return {
    bg: alpha(c.main, dark ? 0.18 : 0.13),
    fg: dark ? c.light : c.dark,
  };
};

const WOCHENTAGE = [
  "Sonntag",
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
];
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

const begruessung = (date: dayjs.Dayjs) => {
  const h = date.hour();
  if (h < 11) return "Guten Morgen";
  if (h < 18) return "Guten Tag";
  return "Guten Abend";
};

const initialen = (name: string) => {
  const words = name
    .split(/\s+/)
    .filter((w) => w && !/^(Frau|Herr|Dr\.|Prof\.|Keine|Angabe)$/i.test(w));
  if (words.length === 0) return "?";
  const first = words[0][0] ?? "";
  const last = words.length > 1 ? (words[words.length - 1][0] ?? "") : "";
  return (first + last).toUpperCase();
};

// Widget-Karte: feste, kontrastreiche Fläche (kein Glas), Titel ohne Trennlinie
const DashboardCard = ({
  title,
  action,
  span,
  children,
}: {
  title: string;
  action?: ReactNode;
  span?: boolean;
  children: ReactNode;
}) => (
  <Card
    component="section"
    sx={{
      padding: "18px",
      width: "100%",
      minWidth: 0,
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      gap: 1.25,
      gridColumn: span ? { xs: "auto", xl: "span 2" } : "auto",
    }}
  >
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 1,
        minHeight: 32,
      }}
    >
      <Typography component="h2" sx={{ fontSize: 15, fontWeight: 700 }}>
        {title}
      </Typography>
      {action}
    </Box>
    <Box sx={{ flex: 1, minWidth: 0 }}>{children}</Box>
  </Card>
);

const KpiTile = ({
  label,
  value,
  hint,
  icon,
  tone,
  onClick,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon: ReactElement;
  tone: Tone;
  onClick?: () => void;
}) => (
  <Card
    sx={(theme) => ({
      minWidth: 0,
      display: "flex",
      transition: "box-shadow .2s ease",
      "&:hover": onClick ? { boxShadow: tokensFor(theme).shadowFloat } : {},
    })}
  >
    <ButtonBase
      onClick={onClick}
      disabled={!onClick}
      sx={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        // ButtonBase zentriert sonst senkrecht: Kacheln ohne hint rutschen ab
        justifyContent: "flex-start",
        gap: 1.25,
        padding: "16px 18px",
        textAlign: "left",
        borderRadius: "18px",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
        }}
      >
        <Typography
          sx={{ fontSize: 13, fontWeight: 600, color: "text.secondary" }}
        >
          {label}
        </Typography>
        <Box
          aria-hidden="true"
          sx={(theme) => ({
            flex: "none",
            width: 30,
            height: 30,
            borderRadius: "9px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: toneColors(theme, tone).bg,
            color: toneColors(theme, tone).fg,
            "& svg": { fontSize: 16 },
          })}
        >
          {icon}
        </Box>
      </Box>
      <Typography
        sx={{
          fontSize: 28,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </Typography>
      {hint && (
        <Typography
          sx={{ fontSize: 12.5, color: (theme) => tokensFor(theme).text3 }}
        >
          {hint}
        </Typography>
      )}
    </ButtonBase>
  </Card>
);

const listRowSx = (theme: Theme) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
  gap: 1.5,
  width: "100%",
  minHeight: 52,
  px: 1.5,
  py: 0.75,
  borderRadius: "12px",
  textAlign: "left" as const,
  transition: "background-color .15s ease",
  "&:hover": { backgroundColor: tokensFor(theme).hover },
});

const BarRow = ({
  label,
  value,
  max,
  tone,
  suffix,
}: {
  label: string;
  value: number;
  max: number;
  tone: Tone;
  suffix?: string;
}) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minHeight: 32 }}>
    <Typography
      variant="body2"
      noWrap
      sx={{
        width: { xs: 110, sm: 150 },
        flex: "none",
        color: "text.secondary",
      }}
    >
      {label}
    </Typography>
    <Box
      aria-hidden="true"
      sx={(theme) => ({
        flex: 1,
        height: 8,
        borderRadius: 8,
        backgroundColor: tokensFor(theme).surface2,
        overflow: "hidden",
      })}
    >
      <Box
        sx={(theme) => ({
          height: "100%",
          width: `${max > 0 ? Math.max((value / max) * 100, value > 0 ? 4 : 0) : 0}%`,
          borderRadius: 8,
          backgroundColor: theme.palette[tone].main,
          transition: "width .4s ease",
        })}
      />
    </Box>
    <Typography
      variant="body2"
      sx={{
        width: 72,
        flex: "none",
        textAlign: "right",
        fontWeight: 600,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {value}
      {suffix}
    </Typography>
  </Box>
);

const EmptyHint = ({ children }: { children: ReactNode }) => (
  <Typography variant="body2" color="text.secondary" sx={{ px: 1.5, py: 1 }}>
    {children}
  </Typography>
);

// Startseite; mit `statistik` die Seite "Statistiken" (Gehe zu): Schuldner
// und Top-Zusatzleistungen erscheinen nur dort, nicht auf der Startseite
const DashboardInhalt = ({ statistik }: { statistik: boolean }) => {
  const dataProvider = useDataProvider();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const now = dayjs();
      const startOfMonth = now.startOf("month").toISOString();
      const startOfNextMonth = now
        .add(1, "month")
        .startOf("month")
        .toISOString();
      const startOfToday = now.startOf("day");
      const startOfTomorrow = now.add(1, "day").startOf("day");
      const endOfWeek = now.add(7, "day").startOf("day").toISOString();
      const sixMonthsAgo = now
        .subtract(6, "month")
        .startOf("day")
        .toISOString();

      const [
        brilleRecentRes,
        kontaktlinseRecentRes,
        termineRes,
        neueKundenRes,
        schuldnerRes,
        zusatzleistungLinksRes,
      ] = await Promise.all([
        dataProvider.getList("brille", {
          pagination: { page: 1, perPage: 500 },
          sort: { field: "Datum", order: "DESC" },
          filter: { "Datum@gte": sixMonthsAgo },
        }),
        dataProvider.getList("kontaktlinse", {
          pagination: { page: 1, perPage: 300 },
          sort: { field: "Datum", order: "DESC" },
          filter: { "Datum@gte": sixMonthsAgo },
        }),
        dataProvider.getList("termin", {
          pagination: { page: 1, perPage: 200 },
          sort: { field: "Start", order: "ASC" },
          filter: {
            "Start@gte": startOfToday.toISOString(),
            "Start@lt": endOfWeek,
          },
        }),
        dataProvider.getList("kunde", {
          pagination: { page: 1, perPage: 1 },
          sort: { field: "id", order: "ASC" },
          filter: {
            "created_at@gte": startOfMonth,
            "created_at@lt": startOfNextMonth,
          },
        }),
        // Unbezahlte Aufträge mit offenem Restbetrag (Restbetrag wird in der
        // Datenbank aus Summe - Anzahlung - KK-Anteil berechnet)
        dataProvider.getList("brille", {
          pagination: { page: 1, perPage: 500 },
          sort: { field: "Datum", order: "ASC" },
          filter: {
            "Zahlungsstatus@in": `(${UNBEZAHLT.map((s) => `"${s}"`).join(",")})`,
            "Restbetrag@gt": 0,
          },
        }),
        dataProvider.getList("brille_hat_zusatzleistungen", {
          pagination: { page: 1, perPage: 1000 },
          sort: { field: "id", order: "ASC" },
          filter: {},
        }),
      ]);

      const brilleRows = brilleRecentRes.data as BrilleRow[];
      const kontaktlinseRows = kontaktlinseRecentRes.data as KontaktlinseRow[];

      let inBearbeitung = 0;
      let bereit = 0;
      [...brilleRows, ...kontaktlinseRows].forEach((row) => {
        const status = getBrilleOrderStatus(row);
        if (status.key === "offen") inBearbeitung += 1;
        else if (status.key === "bereit") bereit += 1;
      });

      const termineRows = termineRes.data as TerminRow[];
      const termineHeuteRows = termineRows.filter((t) =>
        dayjs(t.Start).isBefore(startOfTomorrow),
      );

      const abholbereitAll = brilleRows.filter(
        (row) => getBrilleOrderStatus(row).key === "bereit",
      );
      const abholbereitRows = [...abholbereitAll]
        .sort((a, b) => (a.Abholung ?? "").localeCompare(b.Abholung ?? ""))
        .slice(0, 8);

      const neueKunden = neueKundenRes.total ?? neueKundenRes.data.length;

      const schuldnerAll = schuldnerRes.data as BrilleRow[];
      const schuldnerRows = schuldnerAll.slice(0, 8);
      const schuldnerSumme =
        Math.round(
          schuldnerAll.reduce((s, r) => s + (Number(r.Restbetrag) || 0), 0) *
            100,
        ) / 100;

      const linkRows = zusatzleistungLinksRes.data as {
        ZusatzleistungID: number | string;
      }[];
      const zlCounts = new Map<number | string, number>();
      linkRows.forEach((row) => {
        zlCounts.set(
          row.ZusatzleistungID,
          (zlCounts.get(row.ZusatzleistungID) ?? 0) + 1,
        );
      });
      const topZlIds = Array.from(zlCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id]) => id);

      const kundeIds = Array.from(
        new Set(
          [...abholbereitRows, ...termineHeuteRows, ...schuldnerRows]
            .map((r) => r.kunde_id)
            .filter((v): v is number | string => v !== undefined && v !== null),
        ),
      );

      const [kundenRes, zusatzleistungenRes] = await Promise.all([
        kundeIds.length > 0
          ? dataProvider.getMany("kunde", { ids: kundeIds })
          : Promise.resolve({ data: [] as KundeRow[] }),
        topZlIds.length > 0
          ? dataProvider.getMany("zusatzleistung", { ids: topZlIds })
          : Promise.resolve({ data: [] as ZusatzleistungRow[] }),
      ]);

      const kundenById = new Map<string, KundeRow>(
        (kundenRes.data as KundeRow[]).map((k) => [String(k.id), k]),
      );
      const kundeName = (id?: number | string | null) => {
        if (id === undefined || id === null) return "Unbekannter Kunde";
        const kunde = kundenById.get(String(id));
        return kundeDisplayName(kunde) ?? `Kunde ${id}`;
      };

      const zlNameById = new Map<string, string>(
        (zusatzleistungenRes.data as ZusatzleistungRow[]).map((z) => [
          String(z.id),
          z.Bezeichnung ?? String(z.id),
        ]),
      );
      const topZusatzleistungen = topZlIds.map((id) => ({
        id,
        bezeichnung: zlNameById.get(String(id)) ?? `Zusatzleistung ${id}`,
        anzahl: zlCounts.get(id) ?? 0,
      }));

      setStats({
        offeneAuftraege: { inBearbeitung, bereit },
        termine: {
          heute: termineHeuteRows.map((t) => ({
            ...t,
            // Google-Termine ohne erkannten Kunden: Titel statt "Unbekannt"
            kundeName:
              t.kunde_id == null
                ? t.Titel || "Kunde offen"
                : kundeName(t.kunde_id),
          })),
          anzahlHeute: termineHeuteRows.length,
          anzahlWoche: termineRows.length,
        },
        abholbereit: {
          rows: abholbereitRows.map((r) => ({
            ...r,
            kundeName: kundeName(r.kunde_id),
          })),
          total: abholbereitAll.length,
        },
        neueKunden,
        schuldner: {
          rows: schuldnerRows.map((r) => ({
            ...r,
            kundeName: kundeName(r.kunde_id),
          })),
          total: schuldnerRes.total ?? schuldnerAll.length,
          summe: schuldnerSumme,
        },
        topZusatzleistungen,
      });
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Fehler beim Laden des Dashboards", err);
      setError("Die Dashboard-Daten konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }, [dataProvider]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const now = dayjs();
  const maxZusatzleistung = stats
    ? Math.max(0, ...stats.topZusatzleistungen.map((z) => z.anzahl))
    : 0;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        width: "100%",
        minWidth: 0,
        boxSizing: "border-box",
        padding: { xs: 1, md: 2 },
      }}
    >
      <Title title={statistik ? "Statistiken" : "Dashboard"} />
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 1,
          px: 0.5,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography
            component="p"
            sx={{
              fontSize: { xs: 22, md: 26 },
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            {statistik ? "Statistiken" : begruessung(now)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {`${WOCHENTAGE[now.day()]}, ${now.date()}. ${MONATE[now.month()]}`}
            {lastUpdated
              ? ` · Stand ${dayjs(lastUpdated).format("HH:mm")} Uhr`
              : " · lädt aktuelle Daten …"}
          </Typography>
        </Box>
        <IconButton
          onClick={loadDashboard}
          disabled={loading}
          aria-label="Aktualisieren"
        >
          <RefreshIcon />
        </IconButton>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      {loading && !stats ? (
        <Box sx={{ display: "flex", justifyContent: "center", padding: "3em" }}>
          <CircularProgress />
        </Box>
      ) : stats ? (
        <>
          {!statistik && (
            <Box
              sx={{
                display: "grid",
                // 4 Kacheln: 1, 2 oder 4 pro Zeile, damit keine allein umbricht
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, minmax(0, 1fr))",
                  lg: "repeat(4, minmax(0, 1fr))",
                },
                gap: 1.75,
              }}
            >
              <KpiTile
                label="Termine heute"
                value={stats.termine.anzahlHeute}
                hint={`${stats.termine.anzahlWoche} in den nächsten 7 Tagen`}
                icon={<CalendarIcon />}
                tone="primary"
                onClick={() => navigate("/kalender")}
              />
              <KpiTile
                label="Offene Aufträge"
                value={stats.offeneAuftraege.inBearbeitung}
                hint="in Bearbeitung"
                icon={<GlassesIcon />}
                tone="warning"
                onClick={() => navigate("/brille")}
              />
              <KpiTile
                label="Abholbereit"
                value={stats.offeneAuftraege.bereit}
                hint="Brillen und Kontaktlinsen"
                icon={<CheckIcon />}
                tone="success"
              />
              <KpiTile
                label="Neue Kunden"
                value={stats.neueKunden}
                hint="diesen Monat"
                icon={<UserPlusIcon />}
                tone="primary"
                onClick={() => navigate("/kunde")}
              />
            </Box>
          )}

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md: "repeat(2, minmax(0, 1fr))",
                xl: "repeat(3, minmax(0, 1fr))",
              },
              gap: 1.75,
              width: "100%",
              minWidth: 0,
            }}
          >
            {!statistik && (
              <>
                <DashboardCard
                  title="Heutige Termine"
                  action={
                    <Button size="small" onClick={() => navigate("/kalender")}>
                      Kalender
                    </Button>
                  }
                >
                  {stats.termine.heute.length === 0 ? (
                    <EmptyHint>Keine Termine heute.</EmptyHint>
                  ) : (
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 0.25,
                      }}
                    >
                      {stats.termine.heute.slice(0, 6).map((termin) => (
                        <ButtonBase
                          key={termin.id}
                          onClick={() => navigate(`/termin/${termin.id}/show`)}
                          sx={listRowSx}
                        >
                          <Typography
                            sx={{
                              width: 44,
                              flex: "none",
                              fontSize: 13,
                              fontWeight: 600,
                              color: "text.secondary",
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {dayjs(termin.Start).format("HH:mm")}
                          </Typography>
                          <Box
                            aria-hidden="true"
                            sx={{
                              width: 3,
                              alignSelf: "stretch",
                              borderRadius: 3,
                              bgcolor: "primary.main",
                              flex: "none",
                            }}
                          />
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography
                              noWrap
                              sx={{ fontWeight: 600, fontSize: 14 }}
                            >
                              {termin.kundeName}
                            </Typography>
                            <Typography
                              noWrap
                              sx={{
                                fontSize: 12.5,
                                color: (theme) => tokensFor(theme).text3,
                              }}
                            >
                              {termin.Terminart || "Termin"}
                            </Typography>
                          </Box>
                        </ButtonBase>
                      ))}
                    </Box>
                  )}
                </DashboardCard>

                <DashboardCard
                  title="Abholbereite Brillen"
                  span
                  action={
                    <Typography
                      variant="body2"
                      sx={{
                        color: (theme) => tokensFor(theme).text3,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {stats.abholbereit.total} gesamt
                    </Typography>
                  }
                >
                  {stats.abholbereit.rows.length === 0 ? (
                    <EmptyHint>Aktuell keine abholbereiten Brillen.</EmptyHint>
                  ) : (
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 0.25,
                      }}
                    >
                      {stats.abholbereit.rows.map((row) => (
                        <RecordContextProvider key={row.id} value={row}>
                          <ButtonBase
                            onClick={() => navigate(`/brille/${row.id}/show`)}
                            sx={(theme) => ({
                              ...listRowSx(theme),
                              flexWrap: "wrap",
                            })}
                          >
                            <Box
                              aria-hidden="true"
                              sx={(theme) => ({
                                flex: "none",
                                width: 34,
                                height: 34,
                                borderRadius: "50%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 12,
                                fontWeight: 700,
                                backgroundColor: toneColors(theme, "success")
                                  .bg,
                                color: toneColors(theme, "success").fg,
                              })}
                            >
                              {initialen(row.kundeName)}
                            </Box>
                            <Box sx={{ flex: "1 1 160px", minWidth: 0 }}>
                              <Typography
                                noWrap
                                sx={{ fontWeight: 600, fontSize: 14 }}
                              >
                                {row.kundeName}
                              </Typography>
                              <Typography
                                noWrap
                                sx={{
                                  fontSize: 12.5,
                                  color: (theme) => tokensFor(theme).text3,
                                }}
                              >
                                Abholung:{" "}
                                {row.Abholung
                                  ? dayjs(row.Abholung).format("DD.MM.YYYY")
                                  : "—"}
                              </Typography>
                            </Box>
                            <BrilleStatusChip record={row} />
                            <Box
                              sx={{
                                minWidth: 90,
                                textAlign: "right",
                                fontVariantNumeric: "tabular-nums",
                              }}
                            >
                              <CurrencyField source="Restbetrag" />
                            </Box>
                          </ButtonBase>
                        </RecordContextProvider>
                      ))}
                      {stats.abholbereit.total >
                        stats.abholbereit.rows.length && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ px: 1.5, pt: 0.5 }}
                        >
                          +
                          {stats.abholbereit.total -
                            stats.abholbereit.rows.length}{" "}
                          weitere
                        </Typography>
                      )}
                    </Box>
                  )}
                </DashboardCard>
              </>
            )}

            {statistik && (
              <>
                <DashboardCard
                  title="Schuldner – unbezahlt"
                  action={
                    <Button size="small" onClick={() => navigate("/mahnungen")}>
                      Mahnungen
                    </Button>
                  }
                >
                  {stats.schuldner.rows.length === 0 ? (
                    <EmptyHint>Keine unbezahlten Aufträge.</EmptyHint>
                  ) : (
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 0.25,
                      }}
                    >
                      {stats.schuldner.rows.map((row) => (
                        <ButtonBase
                          key={row.id}
                          onClick={() => navigate(`/brille/${row.id}/show`)}
                          sx={(theme) => ({
                            ...listRowSx(theme),
                            flexWrap: "wrap",
                          })}
                        >
                          <Box
                            aria-hidden="true"
                            sx={(theme) => ({
                              flex: "none",
                              width: 34,
                              height: 34,
                              borderRadius: "50%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 12,
                              fontWeight: 700,
                              backgroundColor: toneColors(theme, "error").bg,
                              color: toneColors(theme, "error").fg,
                            })}
                          >
                            {initialen(row.kundeName)}
                          </Box>
                          <Box sx={{ flex: "1 1 160px", minWidth: 0 }}>
                            <Typography
                              noWrap
                              sx={{ fontWeight: 600, fontSize: 14 }}
                            >
                              {row.kundeName}
                            </Typography>
                            <Typography
                              noWrap
                              sx={{
                                fontSize: 12.5,
                                color: (theme) => tokensFor(theme).text3,
                              }}
                            >
                              Auftrag {row.id}
                              {row.Datum
                                ? ` · seit ${dayjs(row.Datum).format("DD.MM.YYYY")}`
                                : ""}
                              {row.Zahlungsstatus
                                ? ` · ${row.Zahlungsstatus}`
                                : ""}
                            </Typography>
                          </Box>
                          <Typography
                            sx={(theme) => ({
                              minWidth: 90,
                              textAlign: "right",
                              fontWeight: 600,
                              fontVariantNumeric: "tabular-nums",
                              color: toneColors(theme, "error").fg,
                            })}
                          >
                            {euro.format(Number(row.Restbetrag) || 0)}
                          </Typography>
                        </ButtonBase>
                      ))}
                      <Typography
                        variant="body2"
                        sx={{
                          px: 1.5,
                          pt: 0.75,
                          display: "flex",
                          justifyContent: "space-between",
                          color: (theme) => tokensFor(theme).text3,
                        }}
                      >
                        <span>
                          {stats.schuldner.total} unbezahlte
                          {stats.schuldner.total === 1
                            ? "r Auftrag"
                            : " Aufträge"}
                          {stats.schuldner.total > stats.schuldner.rows.length
                            ? ` (${stats.schuldner.total - stats.schuldner.rows.length} weitere)`
                            : ""}
                        </span>
                        <strong>
                          {euro.format(stats.schuldner.summe)} offen
                        </strong>
                      </Typography>
                    </Box>
                  )}
                </DashboardCard>

                <DashboardCard title="Top Zusatzleistungen" span>
                  {stats.topZusatzleistungen.length === 0 ? (
                    <EmptyHint>Noch keine Zusatzleistungen verkauft.</EmptyHint>
                  ) : (
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 0.5,
                      }}
                    >
                      {stats.topZusatzleistungen.map((zl) => (
                        <BarRow
                          key={zl.id}
                          label={zl.bezeichnung}
                          value={zl.anzahl}
                          max={maxZusatzleistung}
                          tone="primary"
                          suffix="×"
                        />
                      ))}
                    </Box>
                  )}
                </DashboardCard>
              </>
            )}
          </Box>
        </>
      ) : null}
    </Box>
  );
};

export const Dashboard = () => <DashboardInhalt statistik={false} />;

// Gehe zu -> Statistiken
export const StatistikSeite = () => <DashboardInhalt statistik />;
