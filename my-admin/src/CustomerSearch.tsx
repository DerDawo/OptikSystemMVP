import {
  Box,
  Button,
  Divider,
  FormControl,
  TextField,
  Theme,
  useMediaQuery,
} from "@mui/material";
import { Title, useDataProvider, ListBase } from "react-admin";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { Dayjs } from "dayjs";
import { KundenDataTable } from "./kunden";

const buildFilter = (filters: Record<string, string>) => {
  const result: Record<string, unknown> = {};

  Object.entries(filters).forEach(([key, value]) => {
    const trimmed = value.trim();
    if (!trimmed) return;

    // For date fields, use exact match (avoid ilike on timestamp columns)
    if (key === "Geburtsdatum" || key.toLowerCase().includes("datum")) {
      result[key] = trimmed;
    } else {
      result[`${key}@ilike`] = `*${trimmed}*`;
    }
  });

  return result;
};

type SearchFields = {
  nachname: string;
  vorname: string;
  geburtsdatum: Dayjs | null;
  kundennummer: string;
};

const CustomerSearch = () => {
  const resource = "kunde";

  const [nachname, setNachname] = useState("");
  const [vorname, setVorname] = useState("");
  const [geburtsdatum, setGeburtsdatum] = useState<Dayjs | null>(null);
  const [kundennummer, setKundennummer] = useState("");

  const [submittedFilter, setSubmittedFilter] = useState<
    Record<string, unknown>
  >({});
  const [hasSearched, setHasSearched] = useState(false);
  const [hasSearchResults, setHasSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const dataProvider = useDataProvider();

  useEffect(() => {
    dataProvider
      .getList(resource, {
        pagination: { page: 1, perPage: 1 },
        sort: { field: "id", order: "ASC" },
        filter: {},
      })
      .catch((error) => {
        console.error("Fehler getList", error);
      });
  }, [dataProvider, resource]);

  const navigate = useNavigate();
  const location = useLocation();

  const runSearch = async (fields: SearchFields) => {
    const filter = buildFilter({
      Nachname: fields.nachname,
      Vorname: fields.vorname,
      Geburtsdatum: fields.geburtsdatum
        ? fields.geburtsdatum.format("YYYY-MM-DD")
        : "",
      KundenNummer: fields.kundennummer,
    });

    setIsSearching(true);
    setSubmittedFilter(filter);

    try {
      const { total, data } = await dataProvider.getList(resource, {
        pagination: { page: 1, perPage: 1 },
        sort: { field: "id", order: "ASC" },
        filter,
      });

      setHasSearchResults((total ?? data.length) > 0);
    } catch (error) {
      console.error("Fehler bei der Kundensuche", error);
      setHasSearchResults(false);
    } finally {
      setHasSearched(true);
      setIsSearching(false);
    }
  };

  const handleSearch = () =>
    runSearch({ nachname, vorname, geburtsdatum, kundennummer });

  // Suchbegriff aus der globalen Suche in der Toolbar (MyAppBar.tsx), per
  // Router-State übergeben: Zahl = Kundennummer, "Vorname Nachname" wird
  // aufgeteilt, sonst Nachname.
  const globalSearch = location.state as { q?: string; ts?: number } | null;
  useEffect(() => {
    const q = globalSearch?.q?.trim();
    if (!q) return;
    const words = q.split(/\s+/);
    const fields: SearchFields = /^\d+$/.test(q)
      ? { nachname: "", vorname: "", geburtsdatum: null, kundennummer: q }
      : words.length > 1
        ? {
            nachname: words.slice(1).join(" "),
            vorname: words[0],
            geburtsdatum: null,
            kundennummer: "",
          }
        : { nachname: q, vorname: "", geburtsdatum: null, kundennummer: "" };
    setNachname(fields.nachname);
    setVorname(fields.vorname);
    setGeburtsdatum(null);
    setKundennummer(fields.kundennummer);
    runSearch(fields);
    // runSearch nur bei einer neuen globalen Suche auslösen
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalSearch?.q, globalSearch?.ts]);

  const handleCreate = () => {
    navigate(`/${resource}/create`, {
      state: {
        Nachname: nachname,
        Vorname: vorname,
        Geburtsdatum: geburtsdatum ? geburtsdatum.format("YYYY-MM-DD") : "",
        KundenNummer: kundennummer,
      },
    });
  };

  const handleReset = () => {
    setNachname("");
    setVorname("");
    setGeburtsdatum(null);
    setKundennummer("");
    setSubmittedFilter({});
    setHasSearched(false);
    setHasSearchResults(false);
    setIsSearching(false);
  };

  const isMobile = useMediaQuery((theme: Theme) =>
    theme.breakpoints.down("sm"),
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "1em" }}>
      <Title title="Kunden suchen" />

      <Box>
        Hier können Sie gezielt nach Kunden suchen oder wenn ein Kunde nicht
        existiert, diesen anlegen.
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr 1fr",
          gap: isMobile ? ".25em" : "1em",
          alignItems: "baseline",
        }}
      >
        <FormControl>
          <TextField
            label="Nachname"
            value={nachname}
            onChange={(e) => setNachname(e.target.value)}
          />
        </FormControl>

        <FormControl>
          <TextField
            label="Vorname"
            value={vorname}
            onChange={(e) => setVorname(e.target.value)}
          />
        </FormControl>

        <FormControl>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label="Geburtsdatum"
              value={geburtsdatum}
              onChange={(value) => setGeburtsdatum(value)}
              format="YYYY-MM-DD"
              slotProps={{
                textField: {
                  variant: "filled",
                  fullWidth: true,
                },
              }}
              sx={{
                ".MuiPickersInputBase-root": {
                  height: "48px",
                },
              }}
            />
          </LocalizationProvider>
        </FormControl>

        <FormControl>
          <TextField
            label="Kundennummer"
            value={kundennummer}
            onChange={(e) => setKundennummer(e.target.value)}
          />
        </FormControl>
      </Box>

      <Box
        sx={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          gap: "1em",
          justifyContent: isMobile ? "stretch" : "flex-end",
        }}
      >
        <Button variant="outlined" onClick={handleReset}>
          Zurücksetzen
        </Button>

        <Button
          variant="contained"
          onClick={handleCreate}
          disabled={!hasSearched || hasSearchResults || isSearching}
        >
          neuen Kunden anlegen
        </Button>

        <Button variant="contained" onClick={handleSearch}>
          Suchen
        </Button>
      </Box>

      <Divider />

      <Box>Hier werden die Suchergebnisse angezeigt.</Box>

      <Box sx={{ minHeight: 300 }}>
        {hasSearched ? (
          <ListBase
            key={`${resource}-${JSON.stringify(submittedFilter)}-${hasSearched ? "searched" : "idle"}`}
            resource={resource}
            filter={submittedFilter}
            perPage={10}
            sort={{ field: "id", order: "ASC" }}
            disableSyncWithLocation
            storeKey={false}
            queryOptions={{ enabled: hasSearched }}
          >
            <KundenDataTable />
          </ListBase>
        ) : null}
      </Box>
    </Box>
  );
};

export default CustomerSearch;
