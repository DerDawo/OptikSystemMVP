import { ReactNode, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Link,
  useGetList,
  useGetMany,
  useGetOne,
  useRecordContext,
} from "react-admin";
import {
  Box,
  Card,
  Divider,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CheckIcon from "@mui/icons-material/Check";
import { formatCurrency } from "./CurrencyField";
import { BrilleStatusChip } from "./orderStatus";
import { mitarbeiterAnzeige } from "./mitarbeiterNamen";
import { kundeAuswahlText } from "./KundeInput";

/*
 * Brillenauftrag als kompakte Karteikarte wie in Prisma: Kopf mit Kunde und
 * "Auftrag x von y", Auftragsdaten, Werte-Tabelle R/L mit Preis je Glas,
 * Glas/Fassung/Zusatzleistungen mit Beträgen und rechts unten die Summen.
 */

type Datensatz = Record<string, unknown> & { id: number };

const zahl = (wert: unknown) => {
  if (wert === null || wert === undefined || wert === "") return null;
  const n = Number(wert);
  return Number.isFinite(n) ? n : null;
};

const text = (wert: unknown) =>
  wert === null || wert === undefined ? "" : String(wert).trim();

const datum = (wert: unknown) =>
  wert ? new Date(String(wert)).toLocaleDateString("de-DE") : "";

const dioptrie = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: "exceptZero",
});
const dezimal = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 });

const WERTE: { feld: string; titel: string; vorzeichen?: boolean }[] = [
  { feld: "Sph", titel: "Sph", vorzeichen: true },
  { feld: "Cyl", titel: "Cyl", vorzeichen: true },
  { feld: "A", titel: "A" },
  { feld: "PD", titel: "PD" },
  { feld: "Add", titel: "Add", vorzeichen: true },
  { feld: "y_h", titel: "y/h" },
  { feld: "Pr", titel: "Pr" },
  { feld: "B", titel: "B" },
  { feld: "HSA", titel: "HSA" },
  { feld: "Vis", titel: "Vis" },
  { feld: "iod", titel: "iod" },
];

const wertText = (glas: Datensatz | undefined, feld: string, vz?: boolean) => {
  const n = zahl(glas?.[feld]);
  if (n === null) return "";
  return vz ? dioptrie.format(n) : dezimal.format(n);
};

// Beschriftetes Feld im Karteikarten-Raster
const Angabe = ({
  titel,
  children,
  breit,
}: {
  titel: string;
  children: ReactNode;
  breit?: boolean;
}) => (
  <Box sx={{ minWidth: 0, gridColumn: breit ? "1 / -1" : undefined }}>
    <Typography variant="caption" color="text.secondary" component="div">
      {titel}
    </Typography>
    <Typography
      variant="body2"
      component="div"
      sx={{
        minHeight: "1.4em",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}
    >
      {children}
    </Typography>
  </Box>
);

const Raster = ({ children }: { children: ReactNode }) => (
  <Box
    sx={{
      display: "grid",
      gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(3, 1fr)" },
      gap: "0.5em 1.5em",
    }}
  >
    {children}
  </Box>
);

const Abschnitt = ({ titel }: { titel: string }) => (
  <Typography
    variant="overline"
    color="text.secondary"
    sx={{ display: "block", mt: 2, mb: 0.5, lineHeight: 1.5 }}
  >
    {titel}
  </Typography>
);

// Zeile "Bezeichnung ...... Betrag" für Glas, Fassung, Zusatzleistungen
const Posten = ({
  bezeichnung,
  zusatz,
  betrag,
}: {
  bezeichnung: ReactNode;
  zusatz?: ReactNode;
  betrag: unknown;
}) => (
  <Box
    sx={{
      display: "flex",
      gap: 2,
      py: 0.5,
      borderBottom: 1,
      borderColor: "divider",
      alignItems: "baseline",
    }}
  >
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography variant="body2" component="div">
        {bezeichnung}
      </Typography>
      {zusatz && (
        <Typography variant="caption" color="text.secondary" component="div">
          {zusatz}
        </Typography>
      )}
    </Box>
    <Typography variant="body2" sx={{ whiteSpace: "nowrap" }}>
      {formatCurrency(betrag)}
    </Typography>
  </Box>
);

// Werte-Tabelle R/L aus den Glas-Datensätzen eines Auftrags, mit Liefern
// und Betrag je Glas. Wird in Ansicht und Bearbeiten verwendet.
export const WerteTabelle = ({
  rechtsId,
  linksId,
}: {
  rechtsId: unknown;
  linksId: unknown;
}) => {
  const glasIds = [rechtsId, linksId].filter(
    (id) => id !== null && id !== undefined && id !== "",
  );
  const { data: glaeser } = useGetMany<Datensatz>(
    "glass",
    { ids: glasIds },
    { enabled: glasIds.length > 0 },
  );
  const glasNach = (id: unknown) => glaeser?.find((g) => g.id === id);
  const augen: { seite: string; glas?: Datensatz }[] = [
    { seite: "R", glas: glasNach(rechtsId) },
    { seite: "L", glas: glasNach(linksId) },
  ];
  return (
    <Box sx={{ overflowX: "auto" }}>
      <Table
        size="small"
        sx={{
          "& td, & th": { px: 0.75, py: 0.5, whiteSpace: "nowrap" },
          "& th": { color: "text.secondary", fontWeight: 400 },
        }}
      >
        <TableHead>
          <TableRow>
            <TableCell />
            {WERTE.map((w) => (
              <TableCell key={w.feld} align="right">
                {w.titel}
              </TableCell>
            ))}
            <TableCell align="center">Liefern</TableCell>
            <TableCell align="right">Betrag</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {augen.map(({ seite, glas }) => (
            <TableRow key={seite}>
              <TableCell sx={{ fontWeight: 600 }}>
                {glas ? (
                  <Link to={`/glass/${glas.id}/show`} underline="hover">
                    {seite}
                  </Link>
                ) : (
                  seite
                )}
              </TableCell>
              {WERTE.map((w) => (
                <TableCell key={w.feld} align="right">
                  {wertText(glas, w.feld, w.vorzeichen)}
                </TableCell>
              ))}
              <TableCell align="center">
                {glas?.Liefern ? <CheckIcon fontSize="small" /> : ""}
              </TableCell>
              <TableCell align="right">
                {formatCurrency(glas?.Betrag)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
};

const AuftragBlaettern = ({ brille }: { brille: Datensatz }) => {
  const navigate = useNavigate();
  const { data } = useGetList<Datensatz>(
    "brille",
    {
      filter: { kunde_id: brille.kunde_id },
      sort: { field: "Datum", order: "ASC" },
      pagination: { page: 1, perPage: 1000 },
    },
    { enabled: brille.kunde_id != null },
  );
  const ids = (data ?? []).map((b) => b.id);
  const pos = ids.indexOf(brille.id);
  if (pos < 0) return null;
  const gehe = (id: number) => navigate(`/brille/${id}/show`);
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
      <Tooltip title="Vorheriger Auftrag">
        <span>
          <IconButton
            size="small"
            disabled={pos === 0}
            onClick={() => gehe(ids[pos - 1])}
          >
            <ChevronLeftIcon />
          </IconButton>
        </span>
      </Tooltip>
      <Typography variant="body2" sx={{ whiteSpace: "nowrap" }}>
        Auftrag {pos + 1} von {ids.length}
      </Typography>
      <Tooltip title="Nächster Auftrag">
        <span>
          <IconButton
            size="small"
            disabled={pos === ids.length - 1}
            onClick={() => gehe(ids[pos + 1])}
          >
            <ChevronRightIcon />
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
};

export const BrilleKarteikarte = () => {
  const brille = useRecordContext<Datensatz>();

  const { data: kunde } = useGetOne<Datensatz>(
    "kunde",
    { id: brille?.kunde_id as number },
    { enabled: brille?.kunde_id != null },
  );
  const { data: glastyp } = useGetOne<Datensatz>(
    "glastyp",
    { id: brille?.Glastyp as number },
    { enabled: brille?.Glastyp != null },
  );
  const { data: fassung } = useGetOne<Datensatz>(
    "fassung",
    { id: brille?.Fassung as number },
    { enabled: brille?.Fassung != null },
  );
  const { data: zuordnungen } = useGetList<Datensatz>(
    "brille_hat_zusatzleistungen",
    {
      filter: { BrillenID: brille?.id },
      pagination: { page: 1, perPage: 100 },
      sort: { field: "id", order: "ASC" },
    },
    { enabled: brille?.id != null },
  );
  const leistungIds = useMemo(
    () => (zuordnungen ?? []).map((z) => z.ZusatzleistungID),
    [zuordnungen],
  );
  const { data: leistungen } = useGetMany<Datensatz>(
    "zusatzleistung",
    { ids: leistungIds },
    { enabled: leistungIds.length > 0 },
  );

  if (!brille) return null;

  const leistungNach = (id: unknown) => leistungen?.find((l) => l.id === id);

  const summe = zahl(brille.Summe) ?? 0;
  const anzahlung = zahl(brille.Anzahlung) ?? 0;
  const kkAnteil = zahl(brille.KKAnteil) ?? 0;
  const rest = zahl(brille.Restbetrag) ?? summe - anzahlung - kkAnteil;
  const rabatt = zahl(brille.RabattProzent);
  const weitere = zahl(brille.WeitereLeistungen);

  return (
    <Card variant="outlined" sx={{ p: { xs: "0.75em", md: "1.25em" } }}>
      {/* Kopf */}
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 1,
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6" sx={{ lineHeight: 1.2 }}>
            {kunde ? (
              <Link to={`/kunde/${kunde.id}/show`} underline="hover">
                {kundeAuswahlText(kunde)}
              </Link>
            ) : (
              " "
            )}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {text(brille.BrillenArt) || "Brille"} · Auftrag-Nr. {brille.id}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <BrilleStatusChip record={brille} />
          <AuftragBlaettern brille={brille} />
        </Box>
      </Box>
      <Divider sx={{ my: 1.5 }} />

      {/* Auftragsdaten */}
      <Raster>
        <Angabe titel="Bedient von">
          {mitarbeiterAnzeige(brille.Berater)}
        </Angabe>
        <Angabe titel="Refraktion durch">
          {mitarbeiterAnzeige(brille.Refraktion)}
        </Angabe>
        <Angabe titel="Datum">{datum(brille.Datum)}</Angabe>
        <Angabe titel="Brillenart">{text(brille.BrillenArt)}</Angabe>
        <Angabe titel="Werkstatt">{text(brille.Werkstatt)}</Angabe>
        <Angabe titel="Abholung">{datum(brille.Abholung)}</Angabe>
      </Raster>

      {/* Werte */}
      <Abschnitt titel="Werte" />
      <WerteTabelle rechtsId={brille.GlasRechts} linksId={brille.GlasLinks} />

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            md: "minmax(0, 1.7fr) minmax(14em, 1fr)",
          },
          gap: { xs: 1, md: 3 },
          alignItems: "start",
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          {/* Glas */}
          <Abschnitt titel="Glas" />
          <Raster>
            <Angabe titel="Glastyp">{text(glastyp?.Bezeichnung)}</Angabe>
            <Angabe titel="Hersteller">{text(glastyp?.Hersteller)}</Angabe>
            <Angabe titel="Vergütung">{text(glastyp?.Verguetung)}</Angabe>
            <Angabe titel="Farbe">{text(glastyp?.Farbe)}</Angabe>
            <Angabe titel="Größe">{text(glastyp?.GlasGroesse)}</Angabe>
            <Angabe titel="Status">{text(glastyp?.Bestellstatus)}</Angabe>
          </Raster>

          {/* Fassung und Leistungen */}
          <Abschnitt titel="Fassung und Leistungen" />
          {fassung ? (
            <Posten
              bezeichnung={
                <Link to={`/fassung/${fassung.id}/show`} underline="hover">
                  {[text(fassung.Hersteller), text(fassung.Bezeichnung)]
                    .filter(Boolean)
                    .join(" ") || `Fassung Nr. ${fassung.id}`}
                </Link>
              }
              zusatz={[
                fassung.Lagernummer
                  ? `Lager-Nr. ${text(fassung.Lagernummer)}`
                  : "",
                text(fassung.Farbe) ? `Farbe ${text(fassung.Farbe)}` : "",
                text(fassung.Groesse) ? `Größe ${text(fassung.Groesse)}` : "",
              ]
                .filter(Boolean)
                .join(" · ")}
              betrag={fassung.Betrag}
            />
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ py: 0.5 }}>
              Keine Fassung
            </Typography>
          )}
          {(zuordnungen ?? []).map((z) => {
            const l = leistungNach(z.ZusatzleistungID);
            return (
              <Posten
                key={z.id}
                bezeichnung={text(l?.Bezeichnung) || "Zusatzleistung"}
                betrag={l?.Betrag}
              />
            );
          })}
          {weitere !== null && weitere !== 0 && (
            <Posten
              bezeichnung={
                weitere < 0
                  ? "Nachlass (siehe Notizen)"
                  : "Weitere Leistungen (siehe Notizen)"
              }
              betrag={weitere}
            />
          )}
          {rabatt !== null && rabatt !== 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ py: 0.5 }}>
              {text(brille.RabattBezeichnung) || "Rabatt"}: −
              {dezimal.format(rabatt)} % auf Gläser und Fassung
            </Typography>
          )}
        </Box>

        {/* Summen */}
        <Box
          sx={{
            mt: { xs: 1, md: 4.5 },
            p: 1.5,
            borderRadius: 1,
            bgcolor: "action.hover",
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: "0.25em 1em",
            alignSelf: "end",
          }}
        >
          <Typography variant="body2">Summe</Typography>
          <Typography
            variant="body2"
            sx={{ fontWeight: 600, textAlign: "right" }}
          >
            {formatCurrency(summe)}
          </Typography>
          <Typography variant="body2">KK-Anteil</Typography>
          <Typography variant="body2" sx={{ textAlign: "right" }}>
            {formatCurrency(kkAnteil)}
          </Typography>
          <Typography variant="body2">Anzahlung</Typography>
          <Typography variant="body2" sx={{ textAlign: "right" }}>
            {formatCurrency(anzahlung)}
          </Typography>
          <Divider sx={{ gridColumn: "1 / -1", my: 0.5 }} />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Restbetrag
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              textAlign: "right",
              color: rest > 0.005 ? "error.main" : undefined,
            }}
          >
            {formatCurrency(rest)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Zahlung
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ textAlign: "right" }}
          >
            {text(brille.Zahlungsstatus)}
          </Typography>
          {text(brille.Rechnungsnummer) && (
            <>
              <Typography variant="caption" color="text.secondary">
                Rechnungsnr.
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ textAlign: "right" }}
              >
                {text(brille.Rechnungsnummer)}
              </Typography>
            </>
          )}
        </Box>
      </Box>

      {/* Verordnung, Kasse, Notizen */}
      <Abschnitt titel="Verordnung und Notizen" />
      <Raster>
        <Angabe titel="Verordnender Arzt">
          {text(brille.VerordnenderArzt)}
        </Angabe>
        <Angabe titel="Verordnungsdatum">
          {datum(brille.Verordnungsdatum)}
        </Angabe>
        <Angabe titel="Muster 8 vorhanden">
          {brille.ErstverordnungMuster8Vorhanden
            ? `ja${brille.ErstverordnungMuster8Datum ? `, vom ${datum(brille.ErstverordnungMuster8Datum)}` : ""}`
            : "nein"}
        </Angabe>
        <Angabe titel="Diagnose" breit>
          {text(brille.Diagnose)}
        </Angabe>
        <Angabe titel="Notizen" breit>
          {text(brille.Notizen)}
        </Angabe>
      </Raster>
    </Card>
  );
};
