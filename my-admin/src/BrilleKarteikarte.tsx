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
  Button,
  Card,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { Theme } from "@mui/material/styles";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CheckIcon from "@mui/icons-material/Check";
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
import { formatCurrency } from "./CurrencyField";
import { mitarbeiterAnzeige } from "./mitarbeiterNamen";

/*
 * Brillenauftrag als Karteikarte im Aufbau der Prisma-Brillenkartei: links
 * der Kundenname, rechts ein festes Raster aus kursiven Beschriftungen und
 * hellen Feldern - Auftragsdaten, Werte R/L, Glas, Fassung,
 * Zusatzleistungen, Rabatt, Notizen und Zahlungen mit den Summen rechts
 * unten.
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
const betrag = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

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
const WERTE_LINKS = WERTE.slice(0, 8);
const WERTE_RECHTS = WERTE.slice(8);

const wertText = (glas: Datensatz | undefined, feld: string, vz?: boolean) => {
  const n = zahl(glas?.[feld]);
  if (n === null) return "";
  return vz ? dioptrie.format(n) : dezimal.format(n);
};

const betragText = (wert: unknown) => {
  const n = zahl(wert);
  return n === null ? "" : betrag.format(n);
};

/*
 * Raster wie in Prisma (Breiten aus dem Original, Felder wachsen mit):
 * 1 Beschriftung | 2 Lagernr. | 3 Rest links | 4 Abstand |
 * 5 Beschriftung rechts | 6 Feld rechts | 7 Summen-Beschriftung | 8 Betrag
 */
const SPALTEN = "95px 145fr 415fr 24px 80px 145fr 120fr 115fr";
const LINKS = "2 / 4";
const RECHTS = "6 / 9";
const BREIT = "2 / 7";

const feldFarbe = (theme: Theme) =>
  theme.palette.mode === "dark" ? "rgba(255,255,255,0.08)" : "#e8eef6";
const summenFarbe = (theme: Theme) =>
  theme.palette.mode === "dark" ? "rgba(255,255,255,0.14)" : "#e2e3e5";

type Platz = { z: number; s: string; h?: number };

// Kursive, graue Beschriftung wie in Prisma
const Beschriftung = ({
  z,
  s,
  children,
  rechts,
}: Platz & { children: ReactNode; rechts?: boolean }) => (
  <Box
    sx={{
      gridRow: z,
      gridColumn: s,
      alignSelf: "center",
      fontStyle: "italic",
      fontSize: "0.78rem",
      color: "text.secondary",
      textAlign: rechts ? "right" : "left",
      pr: rechts ? 1 : 0,
      whiteSpace: "nowrap",
      overflow: "hidden",
    }}
  >
    {children}
  </Box>
);

// Helles Feld mit Wert
const Feld = ({
  z,
  s,
  h = 1,
  children,
  rechts,
  summe,
  mehrzeilig,
}: Platz & {
  children?: ReactNode;
  rechts?: boolean;
  summe?: boolean;
  mehrzeilig?: boolean;
}) => (
  <Box
    sx={(theme) => ({
      gridRow: `${z} / span ${h}`,
      gridColumn: s,
      bgcolor: summe ? summenFarbe(theme) : feldFarbe(theme),
      minHeight: 28,
      minWidth: 0,
      px: "6px",
      py: mehrzeilig ? "4px" : 0,
      display: "flex",
      alignItems: mehrzeilig ? "flex-start" : "center",
      justifyContent: rechts ? "flex-end" : "flex-start",
      fontSize: "0.95rem",
      lineHeight: 1.35,
      fontWeight: summe ? 600 : 400,
      color: "text.primary",
      whiteSpace: mehrzeilig ? "pre-wrap" : "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
      wordBreak: mehrzeilig ? "break-word" : "normal",
    })}
  >
    {children}
  </Box>
);

// Mehrere gleich breite Zellen in einem Rasterbereich (Werte, Farbe/Größe)
const Zellen = ({
  z,
  s,
  spalten,
  children,
}: Platz & { spalten: string; children: ReactNode }) => (
  <Box
    sx={{
      gridRow: z,
      gridColumn: s,
      display: "grid",
      gridTemplateColumns: spalten,
      gap: "4px",
      minWidth: 0,
    }}
  >
    {children}
  </Box>
);

const Wert = ({
  children,
  rechts,
  links,
}: {
  children?: ReactNode;
  rechts?: boolean;
  links?: boolean;
}) => (
  <Box
    sx={(theme) => ({
      bgcolor: feldFarbe(theme),
      minHeight: 28,
      px: "6px",
      display: "flex",
      alignItems: "center",
      justifyContent: rechts ? "flex-end" : links ? "flex-start" : "center",
      fontSize: "0.95rem",
      whiteSpace: "nowrap",
      overflow: "hidden",
    })}
  >
    {children}
  </Box>
);

const Spaltentitel = ({ children }: { children: ReactNode }) => (
  <Box
    sx={{
      fontStyle: "italic",
      fontSize: "0.78rem",
      color: "text.secondary",
      alignSelf: "end",
      whiteSpace: "nowrap",
      overflow: "hidden",
    }}
  >
    {children}
  </Box>
);

// "4-4" wie in Prisma (Auftrag 4 von 4), mit Blättern zu den anderen
// Brillenaufträgen des Kunden
const AuftragPosition = ({ brille, z, s }: Platz & { brille: Datensatz }) => {
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
  const gehe = (id: number) => navigate(`/brille/${id}/show`);
  return (
    <Box
      sx={{
        gridRow: z,
        gridColumn: s,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        minHeight: 28,
        fontSize: "0.95rem",
      }}
    >
      <IconButton
        size="small"
        aria-label="Vorheriger Auftrag"
        disabled={pos <= 0}
        onClick={() => gehe(ids[pos - 1])}
        sx={{ p: 0.25 }}
      >
        <ChevronLeftIcon fontSize="small" />
      </IconButton>
      <span>{pos >= 0 ? `${pos + 1}-${ids.length}` : ""}</span>
      <IconButton
        size="small"
        aria-label="Nächster Auftrag"
        disabled={pos < 0 || pos >= ids.length - 1}
        onClick={() => gehe(ids[pos + 1])}
        sx={{ p: 0.25 }}
      >
        <ChevronRightIcon fontSize="small" />
      </IconButton>
    </Box>
  );
};

// Werte-Tabelle R/L aus den Glas-Datensätzen eines Auftrags, mit Liefern
// und Betrag je Glas. Wird im Bearbeiten-Formular verwendet.
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

export const BrilleKarteikarte = () => {
  const brille = useRecordContext<Datensatz>();
  const navigate = useNavigate();

  const { data: kunde } = useGetOne<Datensatz>(
    "kunde",
    { id: brille?.kunde_id as number },
    { enabled: brille?.kunde_id != null },
  );
  const glasIds = [brille?.GlasRechts, brille?.GlasLinks].filter(
    (id) => id !== null && id !== undefined,
  );
  const { data: glaeser } = useGetMany<Datensatz>(
    "glass",
    { ids: glasIds },
    { enabled: glasIds.length > 0 },
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

  const glasNach = (id: unknown) => glaeser?.find((g) => g.id === id);
  const augen = [
    { seite: "R", glas: glasNach(brille.GlasRechts) },
    { seite: "L", glas: glasNach(brille.GlasLinks) },
  ];

  // Zusatzleistungen plus "Weitere Leistungen" (Freitext aus Prisma),
  // mindestens drei Zeilen wie in Prisma
  const weitere = zahl(brille.WeitereLeistungen);
  const posten: { bezeichnung: string; betrag: unknown }[] = [
    ...(zuordnungen ?? []).map((z) => {
      const l = leistungen?.find((x) => x.id === z.ZusatzleistungID);
      return { bezeichnung: text(l?.Bezeichnung), betrag: l?.Betrag };
    }),
    ...(weitere
      ? [
          {
            bezeichnung:
              weitere < 0
                ? "Nachlass (siehe Notizen)"
                : "Weitere Leistungen (siehe Notizen)",
            betrag: weitere,
          },
        ]
      : []),
  ];
  while (posten.length < 3) posten.push({ bezeichnung: "", betrag: null });

  const rabattProzent = zahl(brille.RabattProzent);
  const rabattBasis =
    (zahl(augen[0].glas?.Betrag) ?? 0) +
    (zahl(augen[1].glas?.Betrag) ?? 0) +
    (zahl(fassung?.Betrag) ?? 0);
  const rabattBetrag =
    rabattProzent && rabattBasis ? -(rabattBasis * rabattProzent) / 100 : null;

  const summe = zahl(brille.Summe);
  const kkAnteil = zahl(brille.KKAnteil);
  const zuzahlung = summe === null ? null : summe - (kkAnteil ?? 0);
  const anzahlung = zahl(brille.Anzahlung);
  const rest =
    zahl(brille.Restbetrag) ??
    (summe === null ? null : summe - (anzahlung ?? 0) - (kkAnteil ?? 0));

  const kundeName = kunde
    ? [text(kunde.Nachname), text(kunde.Vorname)].filter(Boolean).join(", ")
    : "";

  // Zeilen des Rasters
  const zZusatz = 17;
  const zRabatt = zZusatz + posten.length;
  const zSumme = zRabatt + 1;
  const zNotizen = zSumme + 1;
  const zZahlungen = zNotizen + 2;
  const zRest = zZahlungen + 1;
  const zArzt = zRest + 2;

  return (
    <Card
      variant="outlined"
      sx={(theme) => ({
        p: { xs: 1.5, md: 2.5 },
        background:
          theme.palette.mode === "dark"
            ? undefined
            : "linear-gradient(180deg, #ffffff 0%, #f3f4f6 100%)",
      })}
    >
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", xl: "minmax(160px, 230px) 1fr" },
          gap: { xs: 1.5, xl: 3 },
        }}
      >
        <Typography
          variant="h5"
          component="div"
          sx={{ fontWeight: 400, color: "text.secondary", lineHeight: 1.2 }}
        >
          {kunde ? (
            <Link
              to={`/kunde/${kunde.id}/show`}
              underline="hover"
              color="inherit"
            >
              {kundeName || `Kunde Nr. ${kunde.id}`}
            </Link>
          ) : null}
        </Typography>

        <Box sx={{ overflowX: "auto", minWidth: 0 }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: SPALTEN,
              columnGap: "6px",
              rowGap: "4px",
              minWidth: 820,
            }}
          >
            {/* Auftragsdaten */}
            <Beschriftung z={1} s="1 / 2">
              Brillenart
            </Beschriftung>
            <Feld z={1} s={LINKS}>
              {text(brille.BrillenArt)}
            </Feld>
            <Beschriftung z={1} s="5 / 6">
              Datum
            </Beschriftung>
            <Feld z={1} s="6 / 7">
              {datum(brille.Datum)}
            </Feld>
            <Box
              sx={{
                gridRow: 1,
                gridColumn: "7 / 8",
                alignSelf: "center",
                textAlign: "right",
                pr: 1,
                fontSize: "0.95rem",
              }}
            >
              {brille.id}
            </Box>
            <AuftragPosition brille={brille} z={1} s="8 / 9" />

            <Beschriftung z={2} s="1 / 2">
              Berater
            </Beschriftung>
            <Feld z={2} s={LINKS}>
              {mitarbeiterAnzeige(brille.Berater)}
            </Feld>
            <Beschriftung z={2} s="5 / 6">
              Werkstatt
            </Beschriftung>
            <Feld z={2} s={RECHTS}>
              {mitarbeiterAnzeige(brille.Werkstatt)}
            </Feld>

            <Beschriftung z={3} s="1 / 2">
              Refraktion
            </Beschriftung>
            <Feld z={3} s={LINKS}>
              {mitarbeiterAnzeige(brille.Refraktion)}
            </Feld>
            <Beschriftung z={3} s="5 / 6">
              Abholung
            </Beschriftung>
            <Feld z={3} s="6 / 7">
              {datum(brille.Abholung)}
            </Feld>
            <Beschriftung z={3} s="7 / 8" rechts>
              Rechnungsnr.
            </Beschriftung>
            <Feld z={3} s="8 / 9" summe>
              <Box component="span" sx={{ fontWeight: 400 }}>
                {text(brille.Rechnungsnummer)}
              </Box>
            </Feld>

            {/* Werte R/L */}
            <Zellen z={4} s={LINKS} spalten="repeat(8, 1fr)">
              {WERTE_LINKS.map((w) => (
                <Spaltentitel key={w.feld}>{w.titel}</Spaltentitel>
              ))}
            </Zellen>
            <Zellen z={4} s="6 / 8" spalten="repeat(3, 1fr) 0.8fr">
              {WERTE_RECHTS.map((w) => (
                <Spaltentitel key={w.feld}>{w.titel}</Spaltentitel>
              ))}
              <Spaltentitel>Liefern</Spaltentitel>
            </Zellen>
            <Box sx={{ gridRow: 4, gridColumn: "8 / 9" }}>
              <Spaltentitel>Betrag</Spaltentitel>
            </Box>
            {augen.map(({ seite, glas }, i) => {
              const z = 5 + i;
              const marke = glas ? (
                <Link
                  to={`/glass/${glas.id}/show`}
                  underline="hover"
                  color="inherit"
                >
                  {seite}
                </Link>
              ) : (
                seite
              );
              return [
                <Beschriftung key={`${seite}-l`} z={z} s="1 / 2">
                  <Box component="span" sx={{ pl: 3 }}>
                    {marke}
                  </Box>
                </Beschriftung>,
                <Zellen
                  key={`${seite}-w`}
                  z={z}
                  s={LINKS}
                  spalten="repeat(8, 1fr)"
                >
                  {WERTE_LINKS.map((w) => (
                    <Wert key={w.feld} rechts>
                      {wertText(glas, w.feld, w.vorzeichen)}
                    </Wert>
                  ))}
                </Zellen>,
                <Beschriftung key={`${seite}-r`} z={z} s="5 / 6">
                  {seite}
                </Beschriftung>,
                <Zellen
                  key={`${seite}-h`}
                  z={z}
                  s="6 / 8"
                  spalten="repeat(3, 1fr) 0.8fr"
                >
                  {WERTE_RECHTS.map((w) => (
                    <Wert key={w.feld} rechts>
                      {wertText(glas, w.feld, w.vorzeichen)}
                    </Wert>
                  ))}
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {glas?.Liefern ? (
                      <CheckBoxIcon fontSize="small" />
                    ) : (
                      <CheckBoxOutlineBlankIcon
                        fontSize="small"
                        sx={{ color: "text.disabled" }}
                      />
                    )}
                  </Box>
                </Zellen>,
                <Feld key={`${seite}-b`} z={z} s="8 / 9" rechts>
                  {betragText(glas?.Betrag)}
                </Feld>,
              ];
            })}

            {/* Glasassistent (im Bearbeiten-Formular) */}
            <Box sx={{ gridRow: 7, gridColumn: LINKS, py: "4px" }}>
              <Button
                variant="contained"
                disableElevation
                onClick={() => navigate(`/brille/${brille.id}`)}
                sx={{
                  bgcolor: "#1d4e8f",
                  "&:hover": { bgcolor: "#173f74" },
                  color: "#fff",
                  fontWeight: 700,
                  textTransform: "none",
                  borderRadius: "3px",
                  minHeight: 30,
                  py: 0.25,
                  px: 3,
                  width: 210,
                }}
              >
                Glasassistent
              </Button>
            </Box>

            {/* Glas */}
            <Beschriftung z={8} s="1 / 2">
              Glastyp
            </Beschriftung>
            <Feld z={8} s={LINKS}>
              {text(glastyp?.Bezeichnung)}
            </Feld>
            <Beschriftung z={8} s="5 / 6">
              Größe
            </Beschriftung>
            <Feld z={8} s="6 / 7">
              {text(glastyp?.GlasGroesse)}
            </Feld>
            <Beschriftung z={9} s="1 / 2">
              Hersteller
            </Beschriftung>
            <Feld z={9} s={LINKS}>
              {text(glastyp?.Hersteller)}
            </Feld>
            <Beschriftung z={9} s="5 / 6">
              Sonstiges
            </Beschriftung>
            <Feld z={9} s={RECHTS}>
              {text(glastyp?.Sonstiges)}
            </Feld>
            <Beschriftung z={10} s="1 / 2">
              Vergütung
            </Beschriftung>
            <Feld z={10} s={LINKS}>
              {text(glastyp?.Verguetung)}
            </Feld>
            <Beschriftung z={10} s="5 / 6">
              Sonstiges
            </Beschriftung>
            <Feld z={10} s={RECHTS} />
            <Beschriftung z={11} s="1 / 2">
              Farbe
            </Beschriftung>
            <Feld z={11} s={LINKS}>
              {text(glastyp?.Farbe)}
            </Feld>
            <Beschriftung z={11} s="5 / 6">
              Status
            </Beschriftung>
            <Feld z={11} s={RECHTS}>
              {text(glastyp?.Bestellstatus)}
            </Feld>

            <Box sx={{ gridRow: 12, gridColumn: "1 / -1", height: 24 }} />

            {/* Fassung */}
            <Box sx={{ gridRow: 13, gridColumn: "2 / 3" }}>
              <Spaltentitel>Lagernr.</Spaltentitel>
            </Box>
            <Box sx={{ gridRow: 13, gridColumn: "3 / 4" }}>
              <Spaltentitel>Fassung</Spaltentitel>
            </Box>
            <Zellen z={13} s="6 / 8" spalten="100fr 165fr">
              <Spaltentitel>Farbe</Spaltentitel>
              <Spaltentitel>Größe</Spaltentitel>
            </Zellen>
            <Box sx={{ gridRow: 13, gridColumn: "8 / 9" }}>
              <Spaltentitel>Betrag</Spaltentitel>
            </Box>
            <Feld z={14} s="2 / 3">
              {text(fassung?.Lagernummer)}
            </Feld>
            <Feld z={14} s="3 / 4">
              {fassung ? (
                <Link
                  to={`/fassung/${fassung.id}/show`}
                  underline="hover"
                  color="inherit"
                >
                  {text(fassung.Bezeichnung) || `Fassung Nr. ${fassung.id}`}
                </Link>
              ) : null}
            </Feld>
            <Zellen z={14} s="6 / 8" spalten="100fr 165fr">
              <Wert links>{text(fassung?.Farbe)}</Wert>
              <Wert links>{text(fassung?.Groesse)}</Wert>
            </Zellen>
            <Feld z={14} s="8 / 9" rechts>
              {betragText(fassung?.Betrag)}
            </Feld>
            <Beschriftung z={15} s="2 / 3" rechts>
              Linie
            </Beschriftung>
            <Feld z={15} s="3 / 4">
              {text(fassung?.Linie)}
            </Feld>
            <Beschriftung z={15} s="5 / 6">
              Hersteller
            </Beschriftung>
            <Feld z={15} s={RECHTS}>
              {text(fassung?.Hersteller)}
            </Feld>

            {/* Zusatzleistungen */}
            <Box sx={{ gridRow: 16, gridColumn: "2 / 3", pt: 1.5 }}>
              <Spaltentitel>Lagernr.</Spaltentitel>
            </Box>
            <Box sx={{ gridRow: 16, gridColumn: "3 / 7", pt: 1.5 }}>
              <Spaltentitel>Zusatzleistungen</Spaltentitel>
            </Box>
            {posten.map((p, i) => [
              <Feld key={`zl-n-${i}`} z={zZusatz + i} s="2 / 3" />,
              <Feld key={`zl-b-${i}`} z={zZusatz + i} s="3 / 7">
                {p.bezeichnung}
              </Feld>,
              <Feld key={`zl-e-${i}`} z={zZusatz + i} s="8 / 9" rechts>
                {betragText(p.betrag)}
              </Feld>,
            ])}

            <Beschriftung z={zRabatt} s="1 / 2">
              Rabatt
            </Beschriftung>
            <Feld z={zRabatt} s={BREIT}>
              {rabattProzent
                ? `${text(brille.RabattBezeichnung) || "Rabatt"} ${dezimal.format(rabattProzent)} %`
                : text(brille.RabattBezeichnung)}
            </Feld>
            <Feld z={zRabatt} s="8 / 9" rechts>
              {rabattBetrag === null ? "" : betrag.format(rabattBetrag)}
            </Feld>

            {/* Summen */}
            <Beschriftung z={zSumme} s="7 / 8">
              <Box component="span" sx={{ pl: 2 }}>
                Summe
              </Box>
            </Beschriftung>
            <Feld z={zSumme} s="8 / 9" rechts summe>
              {betragText(summe)}
            </Feld>

            <Beschriftung z={zNotizen} s="1 / 2">
              Notizen
            </Beschriftung>
            <Feld z={zNotizen} s={BREIT} h={2} mehrzeilig>
              {text(brille.Notizen)}
            </Feld>
            <Beschriftung z={zNotizen} s="7 / 8">
              <Box component="span" sx={{ pl: 2 }}>
                KK-Anteil
              </Box>
            </Beschriftung>
            <Feld z={zNotizen} s="8 / 9" rechts>
              {betragText(kkAnteil)}
            </Feld>
            <Beschriftung z={zNotizen + 1} s="7 / 8">
              <Box component="span" sx={{ pl: 2 }}>
                Zuzahlung
              </Box>
            </Beschriftung>
            <Feld z={zNotizen + 1} s="8 / 9" rechts>
              {betragText(zuzahlung)}
            </Feld>

            <Beschriftung z={zZahlungen} s="1 / 2">
              Zahlungen
            </Beschriftung>
            <Feld z={zZahlungen} s={LINKS}>
              {text(brille.Zahlungsstatus)}
            </Feld>
            <Beschriftung z={zZahlungen} s="5 / 6">
              Datum
            </Beschriftung>
            <Feld z={zZahlungen} s="6 / 7" />
            <Beschriftung z={zZahlungen} s="7 / 8">
              <Box component="span" sx={{ pl: 2 }}>
                Anzahlung
              </Box>
            </Beschriftung>
            <Feld z={zZahlungen} s="8 / 9" rechts>
              {betragText(anzahlung)}
            </Feld>
            <Beschriftung z={zRest} s="7 / 8">
              <Box component="span" sx={{ pl: 2 }}>
                Restbetrag
              </Box>
            </Beschriftung>
            <Feld z={zRest} s="8 / 9" rechts summe>
              {betragText(rest)}
            </Feld>

            {/* Verordnung (für Kassenanträge) */}
            <Box
              sx={{ gridRow: zRest + 1, gridColumn: "1 / -1", height: 16 }}
            />
            <Beschriftung z={zArzt} s="1 / 2">
              Arzt
            </Beschriftung>
            <Feld z={zArzt} s={LINKS}>
              {text(brille.VerordnenderArzt)}
            </Feld>
            <Beschriftung z={zArzt} s="5 / 6">
              Verordnung
            </Beschriftung>
            <Feld z={zArzt} s="6 / 7">
              {datum(brille.Verordnungsdatum)}
            </Feld>
            <Beschriftung z={zArzt} s="7 / 8" rechts>
              Muster 8
            </Beschriftung>
            <Feld z={zArzt} s="8 / 9">
              {brille.ErstverordnungMuster8Vorhanden
                ? datum(brille.ErstverordnungMuster8Datum) || "ja"
                : ""}
            </Feld>
            <Beschriftung z={zArzt + 1} s="1 / 2">
              Diagnose
            </Beschriftung>
            <Feld z={zArzt + 1} s={BREIT}>
              {text(brille.Diagnose)}
            </Feld>
          </Box>
        </Box>
      </Box>
    </Card>
  );
};
