import { useEffect, useMemo, useState } from "react";
import { useDataProvider, Title } from "react-admin";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  ButtonGroup,
  Card,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import dayjs, { Dayjs } from "dayjs";

type TerminRecord = {
  id: string | number;
  kunde_id?: string | number;
  Start: string;
  Ende: string;
  Terminart?: string | null;
  Notiz?: string | null;
};

type KundeRecord = {
  id: string | number;
  Anrede?: string;
  Vorname?: string;
  Nachname?: string;
};

type CalendarView = "Tag" | "Woche";

const START_HOUR = 7;
const END_HOUR = 19;
const HOUR_HEIGHT = 48;
const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60;

const startOfWeek = (date: Dayjs) => {
  const offset = (date.day() + 6) % 7; // Woche beginnt Montag
  return date.subtract(offset, "day").startOf("day");
};

const kundeName = (kunde: KundeRecord | undefined) => {
  if (!kunde) return "Unbekannter Kunde";
  return (
    [kunde.Anrede, kunde.Vorname, kunde.Nachname]
      .filter(Boolean)
      .join(" ")
      .trim() || `Kunde ${kunde.id}`
  );
};

const minutesSinceRangeStart = (date: Dayjs) => {
  const minutes = date.diff(date.startOf("day"), "minute") - START_HOUR * 60;
  return Math.min(Math.max(minutes, 0), TOTAL_MINUTES);
};

const AppointmentBlock = ({
  termin,
  kunde,
}: {
  termin: TerminRecord;
  kunde: KundeRecord | undefined;
}) => {
  const navigate = useNavigate();
  const start = dayjs(termin.Start);
  const end = dayjs(termin.Ende);
  const top = (minutesSinceRangeStart(start) / TOTAL_MINUTES) * 100;
  const bottom = (minutesSinceRangeStart(end) / TOTAL_MINUTES) * 100;
  const height = Math.max(bottom - top, 3);

  return (
    <Box
      onClick={() => navigate(`/termin/${termin.id}/show`)}
      sx={{
        position: "absolute",
        top: `${top}%`,
        height: `${height}%`,
        left: 2,
        right: 2,
        overflow: "hidden",
        borderRadius: 1,
        padding: "2px 4px",
        fontSize: "0.75rem",
        lineHeight: 1.2,
        cursor: "pointer",
        color: "primary.contrastText",
        backgroundColor: "primary.main",
        "&:hover": { backgroundColor: "primary.dark" },
      }}
    >
      <Typography
        variant="caption"
        component="div"
        sx={{ fontWeight: "bold", color: "inherit" }}
        noWrap
      >
        {start.format("HH:mm")} {kundeName(kunde)}
      </Typography>
      {termin.Terminart ? (
        <Typography
          variant="caption"
          component="div"
          sx={{ color: "inherit" }}
          noWrap
        >
          {termin.Terminart}
        </Typography>
      ) : null}
    </Box>
  );
};

const DayColumn = ({
  day,
  termine,
  kundenById,
}: {
  day: Dayjs;
  termine: TerminRecord[];
  kundenById: Map<string, KundeRecord>;
}) => {
  const dayTermine = termine.filter((termin) =>
    dayjs(termin.Start).isSame(day, "day"),
  );

  return (
    <Box
      sx={{
        position: "relative",
        flex: 1,
        minWidth: 0,
        height: (END_HOUR - START_HOUR) * HOUR_HEIGHT,
        borderLeft: "1px solid",
        borderColor: "divider",
        backgroundImage: `repeating-linear-gradient(to bottom, transparent, transparent ${HOUR_HEIGHT - 1}px, var(--mui-palette-divider, #e0e0e0) ${HOUR_HEIGHT - 1}px, var(--mui-palette-divider, #e0e0e0) ${HOUR_HEIGHT}px)`,
      }}
    >
      {dayTermine.map((termin) => (
        <AppointmentBlock
          key={termin.id}
          termin={termin}
          kunde={kundenById.get(String(termin.kunde_id))}
        />
      ))}
    </Box>
  );
};

export const TerminKalender = () => {
  const dataProvider = useDataProvider();
  const navigate = useNavigate();
  const [view, setView] = useState<CalendarView>("Woche");
  const [anchorDate, setAnchorDate] = useState<Dayjs>(dayjs());
  const [termine, setTermine] = useState<TerminRecord[]>([]);
  const [kundenById, setKundenById] = useState<Map<string, KundeRecord>>(
    new Map(),
  );

  const rangeStart = useMemo(
    () =>
      view === "Woche" ? startOfWeek(anchorDate) : anchorDate.startOf("day"),
    [view, anchorDate],
  );
  const rangeEnd = useMemo(
    () =>
      view === "Woche" ? rangeStart.add(7, "day") : rangeStart.add(1, "day"),
    [view, rangeStart],
  );
  const days = useMemo(() => {
    const count = view === "Woche" ? 7 : 1;
    return Array.from({ length: count }, (_, index) =>
      rangeStart.add(index, "day"),
    );
  }, [view, rangeStart]);
  const hours = useMemo(
    () =>
      Array.from(
        { length: END_HOUR - START_HOUR },
        (_, index) => START_HOUR + index,
      ),
    [],
  );

  useEffect(() => {
    let isActive = true;

    const loadTermine = async () => {
      const { data } = await dataProvider.getList("termin", {
        pagination: { page: 1, perPage: 200 },
        sort: { field: "Start", order: "ASC" },
        filter: {
          "Start@gte": rangeStart.toISOString(),
          "Start@lt": rangeEnd.toISOString(),
        },
      });

      if (!isActive) return;

      const loadedTermine = data as TerminRecord[];
      setTermine(loadedTermine);

      const kundeIds = Array.from(
        new Set(loadedTermine.map((termin) => termin.kunde_id).filter(Boolean)),
      );

      if (kundeIds.length === 0) {
        setKundenById(new Map());
        return;
      }

      const { data: kunden } = await dataProvider.getMany("kunde", {
        ids: kundeIds,
      });

      if (!isActive) return;

      setKundenById(
        new Map(
          (kunden as KundeRecord[]).map((kunde) => [String(kunde.id), kunde]),
        ),
      );
    };

    void loadTermine();

    return () => {
      isActive = false;
    };
  }, [dataProvider, rangeStart, rangeEnd]);

  const goToPrevious = () =>
    setAnchorDate((current) =>
      current.subtract(view === "Woche" ? 7 : 1, "day"),
    );
  const goToNext = () =>
    setAnchorDate((current) => current.add(view === "Woche" ? 7 : 1, "day"));
  const goToToday = () => setAnchorDate(dayjs());

  const rangeLabel =
    view === "Woche"
      ? `${rangeStart.format("DD.MM.YYYY")} - ${rangeStart.add(6, "day").format("DD.MM.YYYY")}`
      : rangeStart.format("dddd, DD.MM.YYYY");

  return (
    <Box className="list-page">
      <Title title="Terminkalender" />
      <Card sx={{ padding: "1em", marginBottom: "1em" }}>
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1em",
            marginBottom: "1em",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: "1em" }}>
            <ButtonGroup variant="outlined" size="small">
              <Button onClick={goToPrevious}>&lt;</Button>
              <Button onClick={goToToday}>Heute</Button>
              <Button onClick={goToNext}>&gt;</Button>
            </ButtonGroup>
            <Typography variant="h6">{rangeLabel}</Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: "1em" }}>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={view}
              onChange={(_event, nextView) => nextView && setView(nextView)}
            >
              <ToggleButton value="Tag">Tag</ToggleButton>
              <ToggleButton value="Woche">Woche</ToggleButton>
            </ToggleButtonGroup>
            <Button
              variant="contained"
              onClick={() => navigate("/termin/create")}
            >
              Termin anlegen
            </Button>
          </Box>
        </Box>
        <Box sx={{ display: "flex", overflowX: "auto" }}>
          <Box sx={{ width: 48, flexShrink: 0 }}>
            <Box sx={{ height: 32 }} />
            {hours.map((hour) => (
              <Box
                key={hour}
                sx={{
                  height: HOUR_HEIGHT,
                  textAlign: "right",
                  paddingRight: "4px",
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  {String(hour).padStart(2, "0")}:00
                </Typography>
              </Box>
            ))}
          </Box>
          <Box
            sx={{
              display: "flex",
              flex: 1,
              minWidth: view === "Woche" ? 700 : 200,
            }}
          >
            {days.map((day) => (
              <Box key={day.toISOString()} sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ height: 32, textAlign: "center" }}>
                  <Typography variant="subtitle2">
                    {day.format("ddd DD.MM.")}
                  </Typography>
                </Box>
                <DayColumn
                  day={day}
                  termine={termine}
                  kundenById={kundenById}
                />
              </Box>
            ))}
          </Box>
        </Box>
      </Card>
    </Box>
  );
};
