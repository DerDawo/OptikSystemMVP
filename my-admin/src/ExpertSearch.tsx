import {
  Alert,
  Autocomplete,
  Box,
  Button,
  IconButton,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import {
  ListBase,
  Pagination,
  Title,
  useDataProvider,
  useListContext,
} from "react-admin";
import { useEffect, useMemo, useState } from "react";
import { KundenDataTable } from "./kunden";
import {
  Bedingung,
  Feld,
  SpaltenTyp,
  TABELLEN,
  VERGLEICHE,
  expertenAbfrage,
  istVollstaendig,
  spaltenTyp,
} from "./expertensuche";

// Expertensuche wie in Prisma: Feld (kunden.*, brillen.*, kontaktlinsen.*),
// Vergleich und Wert; mehrere Bedingungen gelten zusammen. Ergebnis sind
// Kunden (bei Auftragsfeldern: Kunden mit mindestens einem passenden
// Auftrag).

// Vom dataProvider ergänzte bzw. rein technische Felder
const AUSGEBLENDET = new Set(["ZusatzleistungIDs", "KassenPositionen"]);

const praefix = (feld: Feld) =>
  TABELLEN.find((t) => t.id === feld.tabelle)?.praefix ?? feld.tabelle;
const feldName = (feld: Feld) => `${praefix(feld)}.${feld.spalte}`;

const platzhalter: Record<SpaltenTyp, string> = {
  text: "Wert",
  zahl: "Zahl, z. B. 120,50",
  datum: "TT.MM.JJJJ",
  zeitpunkt: "TT.MM.JJJJ",
  bool: "ja / nein",
};

const leereBedingung = (): Bedingung => ({
  feld: null,
  vergleich: "gleich",
  wert: "",
});

const Treffer = () => {
  const { total, error, isPending } = useListContext();
  if (error)
    return (
      <Alert severity="error" sx={{ mb: 1 }}>
        Die Suche ist mit diesen Angaben nicht möglich (
        {error instanceof Error ? error.message : String(error)}).
      </Alert>
    );
  if (isPending) return null;
  return (
    <Typography color="text.secondary" sx={{ mb: 1 }}>
      {total === 1 ? "1 Kunde gefunden" : `${total ?? 0} Kunden gefunden`}
    </Typography>
  );
};

const ExpertSearch = () => {
  const dataProvider = useDataProvider();
  const [felder, setFelder] = useState<Feld[]>([]);
  const [bedingungen, setBedingungen] = useState<Bedingung[]>([
    leereBedingung(),
  ]);
  const [abfrage, setAbfrage] = useState<ReturnType<
    typeof expertenAbfrage
  > | null>(null);
  const [suchNr, setSuchNr] = useState(0);

  // Felder je Tabelle aus Beispieldatensätzen (Spaltenname und Typ)
  useEffect(() => {
    let aktiv = true;
    Promise.all(
      TABELLEN.map(async ({ id }) => {
        const { data } = await dataProvider.getList(id, {
          pagination: { page: 1, perPage: 100 },
          sort: { field: "id", order: "DESC" },
          filter: {},
        });
        const spalten = new Set<string>();
        data.forEach((zeile) =>
          Object.keys(zeile).forEach((k) => spalten.add(k)),
        );
        return [...spalten]
          .filter(
            (spalte) =>
              !AUSGEBLENDET.has(spalte) &&
              !data.some(
                (zeile) =>
                  zeile[spalte] !== null && typeof zeile[spalte] === "object",
              ),
          )
          .sort((a, b) => a.localeCompare(b, "de"))
          .map((spalte) => ({
            tabelle: id,
            spalte,
            typ: spaltenTyp(data.map((zeile) => zeile[spalte])),
          }));
      }),
    )
      .then((listen) => aktiv && setFelder(listen.flat()))
      .catch((error) => console.error("Felder der Expertensuche", error));
    return () => {
      aktiv = false;
    };
  }, [dataProvider]);

  const aendern = (index: number, teil: Partial<Bedingung>) =>
    setBedingungen((alt) =>
      alt.map((b, i) => {
        if (i !== index) return b;
        const neu = { ...b, ...teil };
        const erlaubt = VERGLEICHE.filter(
          (v) => !neu.feld || v.typen.includes(neu.feld.typ),
        );
        if (!erlaubt.some((v) => v.id === neu.vergleich))
          neu.vergleich = "gleich";
        return neu;
      }),
    );

  const startbereit = bedingungen.some(istVollstaendig);

  const suchen = () => {
    if (!startbereit) return;
    setAbfrage(expertenAbfrage(bedingungen));
    setSuchNr((n) => n + 1);
  };

  const zuruecksetzen = () => {
    setBedingungen([leereBedingung()]);
    setAbfrage(null);
  };

  const optionen = useMemo(() => felder, [felder]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "1em" }}>
      <Title title="Expertensuche" />
      <Typography color="text.secondary">
        Feld, Vergleich und Wert wählen; mehrere Bedingungen gelten zusammen.
        Gefunden werden Kunden – bei brillen.* und kontaktlinsen.* Kunden mit
        einem passenden Auftrag.
      </Typography>

      <Box
        component="form"
        onSubmit={(e) => {
          e.preventDefault();
          suchen();
        }}
        sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}
      >
        {bedingungen.map((b, index) => {
          const vergleiche = VERGLEICHE.filter(
            (v) => !b.feld || v.typen.includes(b.feld.typ),
          );
          const ohneWert =
            b.vergleich === "leer" || b.vergleich === "nichtLeer";
          return (
            <Box
              key={index}
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "minmax(220px, 1.3fr) minmax(150px, 0.7fr) minmax(160px, 1fr) auto",
                },
                gap: 1,
                alignItems: "center",
              }}
            >
              <Autocomplete
                options={optionen}
                groupBy={praefix}
                getOptionLabel={feldName}
                isOptionEqualToValue={(a, v) =>
                  a.tabelle === v.tabelle && a.spalte === v.spalte
                }
                value={b.feld}
                onChange={(_, feld) => aendern(index, { feld })}
                loading={felder.length === 0}
                loadingText="Felder werden geladen …"
                noOptionsText="Kein Feld gefunden"
                renderInput={(params) => (
                  <TextField {...params} label="Feld" size="small" />
                )}
              />
              <TextField
                select
                size="small"
                label="Vergleich"
                value={b.vergleich}
                onChange={(e) =>
                  aendern(index, {
                    vergleich: e.target.value as Bedingung["vergleich"],
                  })
                }
              >
                {vergleiche.map((v) => (
                  <MenuItem key={v.id} value={v.id}>
                    {v.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                size="small"
                label="Wert"
                placeholder={b.feld ? platzhalter[b.feld.typ] : "Wert"}
                value={ohneWert ? "" : b.wert}
                disabled={ohneWert}
                onChange={(e) => aendern(index, { wert: e.target.value })}
              />
              <IconButton
                aria-label="Bedingung entfernen"
                size="small"
                disabled={bedingungen.length === 1}
                onClick={() =>
                  setBedingungen((alt) => alt.filter((_, i) => i !== index))
                }
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          );
        })}

        <Box
          sx={{
            display: "flex",
            gap: 1,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <Button
            startIcon={<AddIcon />}
            onClick={() => setBedingungen((alt) => [...alt, leereBedingung()])}
          >
            weitere Bedingung
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button variant="outlined" onClick={zuruecksetzen}>
            Zurücksetzen
          </Button>
          <Button
            type="submit"
            variant="contained"
            disableElevation
            disabled={!startbereit}
            sx={{
              bgcolor: "#1d4e8f",
              "&:hover": { bgcolor: "#173f74" },
              fontWeight: 700,
              textTransform: "none",
              px: 4,
            }}
          >
            Suche starten
          </Button>
        </Box>
      </Box>

      {abfrage && (
        <ListBase
          key={suchNr}
          resource="kunde"
          filter={abfrage.filter}
          perPage={25}
          sort={{ field: "Nachname", order: "ASC" }}
          disableSyncWithLocation
          storeKey={false}
          queryOptions={{ meta: { columns: abfrage.spalten } }}
        >
          <Treffer />
          <KundenDataTable bulkActionButtons={false} />
          <Pagination rowsPerPageOptions={[25, 50, 100]} />
        </ListBase>
      )}
    </Box>
  );
};

export default ExpertSearch;
