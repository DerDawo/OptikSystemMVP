// Dashboard-Startseite (#85): fasst den aktuellen Geschäftsstand (offene
// Aufträge, Umsatz, offene Forderungen, Termine, ...) in Widget-Karten
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
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useDataProvider, RecordContextProvider, Title } from "react-admin";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Card,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import dayjs from "dayjs";
import { CurrencyField, formatCurrency } from "./CurrencyField";
import { BrilleStatusChip, getBrilleOrderStatus } from "./orderStatus";

type BrilleRow = {
  id: number | string;
  kunde_id?: number | string | null;
  Datum?: string | null;
  Abholung?: string | null;
  Summe?: number | null;
  Restbetrag?: number | null;
  Mahnstufe?: number | null;
};

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
  umsatzMonat: number;
  offeneForderungen: { summe: number; anzahl: number };
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
  mahnstufen: { stufe: number; anzahl: number }[];
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

// Visueller Rahmen für Widget-Karten, angelehnt an ShowSection (EntityLayout.tsx):
// selber Card-/Titel-/Divider-Stil, aber ohne das dortige 2-Spalten-Feldraster,
// da Widgets Kennzahlen/Listen statt Datensatzfeldern zeigen.
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
    variant="outlined"
    sx={{
      padding: "1em",
      width: "100%",
      minWidth: 0,
      display: "flex",
      flexDirection: "column",
      gap: "0.75em",
      gridColumn: span ? { xs: "auto", lg: "span 2" } : "auto",
    }}
  >
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
        {title}
      </Typography>
      {action}
    </Box>
    <Divider />
    <Box sx={{ flex: 1, minWidth: 0 }}>{children}</Box>
  </Card>
);

const StatNumber = ({
  value,
  label,
  color,
}: {
  value: ReactNode;
  label?: string;
  color?: string;
}) => (
  <Box>
    <Typography variant="h4" sx={{ fontWeight: 700, color }}>
      {value}
    </Typography>
    {label && (
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
    )}
  </Box>
);

const EmptyHint = ({ children }: { children: ReactNode }) => (
  <Typography variant="body2" color="text.secondary">
    {children}
  </Typography>
);

export const Dashboard = () => {
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
        umsatzRes,
        forderungenRes,
        termineRes,
        neueKundenRes,
        mahnstufenRes,
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
        dataProvider.getList("brille", {
          pagination: { page: 1, perPage: 1000 },
          sort: { field: "id", order: "ASC" },
          filter: { "Datum@gte": startOfMonth, "Datum@lt": startOfNextMonth },
        }),
        dataProvider.getList("brille", {
          pagination: { page: 1, perPage: 500 },
          sort: { field: "Abholung", order: "ASC" },
          filter: {
            Zahlungsstatus: "offen",
            "Rechnungsnummer@not": "is.null",
            "Restbetrag@gt": 0,
          },
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
        dataProvider.getList("brille", {
          pagination: { page: 1, perPage: 500 },
          sort: { field: "Mahnstufe", order: "DESC" },
          filter: { "Mahnstufe@gt": 0 },
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

      const umsatzMonat = (umsatzRes.data as BrilleRow[]).reduce(
        (sum, row) => sum + (Number(row.Summe) || 0),
        0,
      );

      const forderungenRows = forderungenRes.data as BrilleRow[];
      const offeneForderungen = {
        summe: forderungenRows.reduce(
          (sum, row) => sum + (Number(row.Restbetrag) || 0),
          0,
        ),
        anzahl: forderungenRows.length,
      };

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

      const mahnstufenCounts = new Map<number, number>();
      (mahnstufenRes.data as BrilleRow[]).forEach((row) => {
        const stufe = row.Mahnstufe ?? 0;
        mahnstufenCounts.set(stufe, (mahnstufenCounts.get(stufe) ?? 0) + 1);
      });
      const mahnstufen = [1, 2, 3].map((stufe) => ({
        stufe,
        anzahl: mahnstufenCounts.get(stufe) ?? 0,
      }));

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
          [...abholbereitRows, ...termineHeuteRows]
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
        umsatzMonat,
        offeneForderungen,
        termine: {
          heute: termineHeuteRows.map((t) => ({
            ...t,
            kundeName: kundeName(t.kunde_id),
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
        mahnstufen,
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

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: "1em",
        width: "100%",
        minWidth: 0,
        padding: { xs: "0.5em", md: "1em" },
      }}
    >
      <Title title="Dashboard" />
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box>
          <Typography variant="h5">Dashboard</Typography>
          <Typography variant="body2" color="text.secondary">
            {lastUpdated
              ? `Stand: ${dayjs(lastUpdated).format("DD.MM.YYYY HH:mm")} Uhr`
              : "Lädt aktuelle Daten..."}
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
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, 1fr)",
              lg: "repeat(3, 1fr)",
            },
            gap: "1em",
            width: "100%",
            minWidth: 0,
          }}
        >
          <DashboardCard title="Offene Aufträge">
            <Stack direction="row" spacing={3}>
              <StatNumber
                value={stats.offeneAuftraege.inBearbeitung}
                label="In Bearbeitung"
              />
              <StatNumber
                value={stats.offeneAuftraege.bereit}
                label="Bereit zur Abholung"
                color="info.main"
              />
            </Stack>
          </DashboardCard>

          <DashboardCard title="Umsatz diesen Monat">
            <StatNumber value={formatCurrency(stats.umsatzMonat) || "0,00 €"} />
          </DashboardCard>

          <DashboardCard
            title="Offene Forderungen"
            action={
              <IconButton size="small" onClick={() => navigate("/mahnungen")}>
                <Typography variant="caption">Alle</Typography>
              </IconButton>
            }
          >
            <StatNumber
              value={formatCurrency(stats.offeneForderungen.summe) || "0,00 €"}
              label={`${stats.offeneForderungen.anzahl} offene Auftrag(e)`}
              color={
                stats.offeneForderungen.anzahl > 0 ? "warning.main" : undefined
              }
            />
          </DashboardCard>

          <DashboardCard title="Neue Kunden diesen Monat">
            <StatNumber value={stats.neueKunden} />
          </DashboardCard>

          <DashboardCard title="Mahnstufen-Übersicht">
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {stats.mahnstufen.map(({ stufe, anzahl }) => (
                <Chip
                  key={stufe}
                  label={`Stufe ${stufe}: ${anzahl}`}
                  color={
                    anzahl === 0 ? "default" : stufe >= 3 ? "error" : "warning"
                  }
                  variant={anzahl === 0 ? "outlined" : "filled"}
                />
              ))}
            </Stack>
          </DashboardCard>

          <DashboardCard title="Anstehende Termine">
            <Stack direction="row" spacing={3} sx={{ mb: 1 }}>
              <StatNumber value={stats.termine.anzahlHeute} label="Heute" />
              <StatNumber
                value={stats.termine.anzahlWoche}
                label="Diese Woche"
              />
            </Stack>
            {stats.termine.heute.length === 0 ? (
              <EmptyHint>Keine Termine heute.</EmptyHint>
            ) : (
              <Stack divider={<Divider />} spacing={0.75}>
                {stats.termine.heute.slice(0, 5).map((termin) => (
                  <Box
                    key={termin.id}
                    onClick={() => navigate(`/termin/${termin.id}/show`)}
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      cursor: "pointer",
                    }}
                  >
                    <Typography variant="body2">
                      {dayjs(termin.Start).format("HH:mm")} · {termin.kundeName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {termin.Terminart}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </DashboardCard>

          <DashboardCard title="Abholbereite Brillen" span>
            {stats.abholbereit.rows.length === 0 ? (
              <EmptyHint>Aktuell keine abholbereiten Brillen.</EmptyHint>
            ) : (
              <Stack divider={<Divider />} spacing={0.75}>
                {stats.abholbereit.rows.map((row) => (
                  <RecordContextProvider key={row.id} value={row}>
                    <Box
                      onClick={() => navigate(`/brille/${row.id}/show`)}
                      sx={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "0.5em 1em",
                        alignItems: "center",
                        justifyContent: "space-between",
                        cursor: "pointer",
                      }}
                    >
                      <Typography variant="body2">{row.kundeName}</Typography>
                      <BrilleStatusChip record={row} />
                      <Typography variant="body2" color="text.secondary">
                        Abholung:{" "}
                        {row.Abholung
                          ? dayjs(row.Abholung).format("DD.MM.YYYY")
                          : "—"}
                      </Typography>
                      <CurrencyField source="Restbetrag" />
                    </Box>
                  </RecordContextProvider>
                ))}
                {stats.abholbereit.total > stats.abholbereit.rows.length && (
                  <Typography variant="caption" color="text.secondary">
                    +{stats.abholbereit.total - stats.abholbereit.rows.length}{" "}
                    weitere
                  </Typography>
                )}
              </Stack>
            )}
          </DashboardCard>

          <DashboardCard title="Top Zusatzleistungen" span>
            {stats.topZusatzleistungen.length === 0 ? (
              <EmptyHint>Noch keine Zusatzleistungen verkauft.</EmptyHint>
            ) : (
              <Stack divider={<Divider />} spacing={0.75}>
                {stats.topZusatzleistungen.map((zl) => (
                  <Box
                    key={zl.id}
                    sx={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <Typography variant="body2">{zl.bezeichnung}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {zl.anzahl}×
                    </Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </DashboardCard>
        </Box>
      ) : null}
    </Box>
  );
};
