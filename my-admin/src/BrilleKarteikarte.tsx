import { ReactNode, useMemo, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  Link,
  useDataProvider,
  useGetList,
  useGetMany,
  useGetOne,
  useNotify,
  useRecordContext,
  useRefresh,
} from "react-admin";
import {
  Box,
  Button,
  Card,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import { Theme } from "@mui/material/styles";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import EditIcon from "@mui/icons-material/Edit";
import { formatCurrency } from "./CurrencyField";
import {
  MITARBEITER,
  REFRAKTION,
  mitarbeiterAnzeige,
} from "./mitarbeiterNamen";
import {
  Auswahl,
  Eingabe,
  Haken,
  Speichern,
  useKarteiSpeichern,
} from "./KarteiEingabe";
import { brillenartOptionen } from "./brillenarten";
import {
  leistungsText,
  weitereLeistungenPositionen,
} from "./leistungenAusNotizen";
import { rabattDaten, rabattOptionen } from "./rabatte";
import { ZAHLUNGSSTATUS } from "./zahlungsstatus";
import { KassenanteilRechner } from "./KassenanteilRechner";

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

// Bestellstatus eines Glases (Spalte glass."Auftragsstatus")
const GLAS_BESTELLSTATUS = [
  "zu bestellen",
  "bestellt",
  "eingetroffen",
  "abgeholt",
].map((s) => ({ id: s, name: s }));

// Dunkelblaue Knöpfe wie in Prisma (Glasassistent, Bestelloptionen)
const prismaKnopf = {
  bgcolor: "#1d4e8f",
  "&:hover": { bgcolor: "#173f74" },
  color: "#fff",
  fontWeight: 700,
  textTransform: "none",
  borderRadius: "3px",
  minHeight: 24,
  py: 0.25,
  px: 3,
  width: 210,
} as const;

const MITARBEITER_AUSWAHL = MITARBEITER.map((m) => ({ id: m, name: m }));
const REFRAKTION_AUSWAHL = REFRAKTION.map((r) => ({ id: r, name: r }));

const WERTE_RECHTS = WERTE.slice(8);

const wertText = (glas: Datensatz | undefined, feld: string, vz?: boolean) => {
  const n = zahl(glas?.[feld]);
  if (n === null) return "";
  return vz ? dioptrie.format(n) : dezimal.format(n);
};

// Visus als Ausklappliste (Werte des Betriebs), alle anderen Werte zum
// Eintippen
const VIS_WERTE = [
  0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.2, 1.5,
];
const VIS_OPTIONEN = VIS_WERTE.map((v) => ({
  id: String(v),
  name: betrag.format(v),
}));

const WertEingabe = ({
  w,
  seite,
  glas,
  speichere,
}: {
  w: (typeof WERTE)[number];
  seite: string;
  glas: Datensatz | undefined;
  speichere: Speichern;
}) => {
  if (w.feld === "Vis") {
    const vis = zahl(glas?.Vis);
    return (
      <Auswahl
        rechts
        name={`Vis ${seite}`}
        wert={vis === null ? null : String(vis)}
        optionen={VIS_OPTIONEN}
        speichere={(neu) => speichere(neu == null ? null : Number(neu))}
      />
    );
  }
  return (
    <Eingabe
      typ="zahl"
      rechts
      name={`${w.titel} ${seite}`}
      wert={glas?.[w.feld]}
      anzeige={wertText(glas, w.feld, w.vorzeichen)}
      speichere={speichere}
    />
  );
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

// Rahmen um das Feld, in dem gerade getippt wird
const aktivesFeld = (theme: Theme) => ({
  boxShadow: `inset 0 0 0 2px ${theme.palette.primary.main}`,
});

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
      fontSize: "0.72rem",
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
      minHeight: 24,
      minWidth: 0,
      px: "6px",
      py: mehrzeilig ? "4px" : 0,
      display: "flex",
      alignItems: mehrzeilig ? "flex-start" : "center",
      justifyContent: rechts ? "flex-end" : "flex-start",
      fontSize: "0.9rem",
      lineHeight: 1.35,
      fontWeight: summe ? 600 : 400,
      color: "text.primary",
      whiteSpace: mehrzeilig ? "pre-wrap" : "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
      wordBreak: mehrzeilig ? "break-word" : "normal",
      "&:focus-within": aktivesFeld(theme),
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
      minHeight: 24,
      px: "6px",
      display: "flex",
      alignItems: "center",
      justifyContent: rechts ? "flex-end" : links ? "flex-start" : "center",
      fontSize: "0.9rem",
      whiteSpace: "nowrap",
      overflow: "hidden",
      "&:focus-within": aktivesFeld(theme),
    })}
  >
    {children}
  </Box>
);

const Spaltentitel = ({ children }: { children: ReactNode }) => (
  <Box
    sx={{
      fontStyle: "italic",
      fontSize: "0.72rem",
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
        minHeight: 24,
        fontSize: "0.9rem",
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
// und Betrag je Glas. Wird im Bearbeiten-Formular verwendet; mit `brille`
// (gespeicherter Auftrag) lassen sich die Werte direkt eintippen.
export const WerteTabelle = ({
  rechtsId,
  linksId,
  brille,
  beiNeuemGlas,
}: {
  rechtsId: unknown;
  linksId: unknown;
  brille?: Datensatz;
  // ein Glas wurde angelegt oder kopiert (Formularfeld nachziehen)
  beiNeuemGlas?: (verweis: string, id: number) => void;
}) => {
  const glasIds = [rechtsId, linksId].filter(
    (id) => id !== null && id !== undefined && id !== "",
  );
  const { data: glaeser, refetch } = useGetMany<Datensatz>(
    "glass",
    { ids: glasIds },
    { enabled: glasIds.length > 0 },
  );
  const { komponente } = useKarteiSpeichern(
    brille
      ? { ...brille, GlasRechts: rechtsId, GlasLinks: linksId }
      : undefined,
    refetch,
    beiNeuemGlas,
  );
  const bearbeitbar = brille?.id != null;
  const glasNach = (id: unknown) => glaeser?.find((g) => g.id === id);
  const augen = [
    {
      seite: "R",
      verweis: "GlasRechts",
      Seite: "Rechts",
      glas: glasNach(rechtsId),
    },
    {
      seite: "L",
      verweis: "GlasLinks",
      Seite: "Links",
      glas: glasNach(linksId),
    },
  ];
  return (
    <Box sx={{ overflowX: "auto" }}>
      <Table
        size="small"
        sx={{
          "& td, & th": { px: 0.75, py: 0.5, whiteSpace: "nowrap" },
          "& th": { color: "text.secondary", fontWeight: 400 },
          "& td:focus-within": (theme) => aktivesFeld(theme),
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
          {augen.map(({ seite, verweis, Seite, glas }) => {
            const speichere = komponente("glass", verweis, glas, { Seite });
            return (
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
                  <TableCell key={w.feld} align="right" sx={{ minWidth: 48 }}>
                    {bearbeitbar ? (
                      <Box sx={{ display: "flex", minHeight: 24 }}>
                        <WertEingabe
                          w={w}
                          seite={seite}
                          glas={glas}
                          speichere={speichere(w.feld)}
                        />
                      </Box>
                    ) : (
                      wertText(glas, w.feld, w.vorzeichen)
                    )}
                  </TableCell>
                ))}
                <TableCell align="center">
                  {bearbeitbar ? (
                    <Haken
                      an={Boolean(glas?.Liefern)}
                      name={`Liefern ${seite}`}
                      speichere={speichere("Liefern")}
                    />
                  ) : glas?.Liefern ? (
                    <CheckIcon fontSize="small" />
                  ) : (
                    ""
                  )}
                </TableCell>
                <TableCell align="right" sx={{ minWidth: 80 }}>
                  {bearbeitbar ? (
                    <Box sx={{ display: "flex", minHeight: 24 }}>
                      <Eingabe
                        typ="zahl"
                        rechts
                        name={`Betrag ${seite}`}
                        wert={glas?.Betrag}
                        anzeige={formatCurrency(glas?.Betrag)}
                        speichere={speichere("Betrag")}
                      />
                    </Box>
                  ) : (
                    formatCurrency(glas?.Betrag)
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Box>
  );
};

// Ausklappliste "Zusatzleistung hinzufügen" in der Karteikarte: bucht die
// gewählte Leistung direkt auf den Auftrag (brille_hat_zusatzleistungen);
// die Summe rechnet ein Datenbank-Trigger neu.
const ZusatzleistungAuswahl = ({
  z,
  s,
  brilleId,
  vorhanden,
}: Platz & { brilleId: number; vorhanden: unknown[] }) => {
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const refresh = useRefresh();
  const [speichert, setSpeichert] = useState(false);
  const { data: katalog } = useGetList<Datensatz>("zusatzleistung", {
    filter: { Aktiv: true },
    sort: { field: "Reihenfolge", order: "ASC" },
    pagination: { page: 1, perPage: 100 },
  });
  const angebot = (katalog ?? []).filter((l) => !vorhanden.includes(l.id));

  const hinzufuegen = async (id: number) => {
    setSpeichert(true);
    try {
      await dataProvider.create("brille_hat_zusatzleistungen", {
        data: { BrillenID: brilleId, ZusatzleistungID: id },
      });
      refresh();
    } catch {
      notify("Zusatzleistung konnte nicht gespeichert werden.", {
        type: "error",
      });
    } finally {
      setSpeichert(false);
    }
  };

  return (
    <Box
      sx={(theme) => ({
        gridRow: z,
        gridColumn: s,
        bgcolor: feldFarbe(theme),
        minHeight: 24,
        minWidth: 0,
        display: "flex",
        alignItems: "center",
      })}
    >
      <Select
        variant="standard"
        disableUnderline
        displayEmpty
        fullWidth
        value=""
        disabled={speichert || angebot.length === 0}
        onChange={(e) => hinzufuegen(Number(e.target.value))}
        renderValue={() => (
          <Box
            component="span"
            sx={{ color: "text.secondary", fontStyle: "italic" }}
          >
            {speichert ? "Wird gespeichert …" : "Zusatzleistung hinzufügen …"}
          </Box>
        )}
        sx={{
          px: "6px",
          fontSize: "0.9rem",
          "& .MuiSelect-select": { py: 0 },
        }}
        inputProps={{ "aria-label": "Zusatzleistung hinzufügen" }}
      >
        {angebot.map((l) => (
          <MenuItem key={l.id} value={l.id} sx={{ gap: 3 }}>
            <Box component="span" sx={{ flex: 1 }}>
              {text(l.Bezeichnung)}
            </Box>
            <Box component="span" sx={{ color: "text.secondary" }}>
              {betragText(l.Betrag)} €
            </Box>
          </MenuItem>
        ))}
      </Select>
    </Box>
  );
};

const ZusatzleistungEntfernen = ({ zuordnung }: { zuordnung: Datensatz }) => {
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const refresh = useRefresh();
  return (
    <IconButton
      size="small"
      aria-label="Zusatzleistung entfernen"
      sx={{ p: 0.25, ml: 0.5, opacity: 0.6, "&:hover": { opacity: 1 } }}
      onClick={async () => {
        try {
          await dataProvider.delete("brille_hat_zusatzleistungen", {
            id: zuordnung.id,
            previousData: zuordnung,
          });
          refresh();
        } catch {
          notify("Zusatzleistung konnte nicht entfernt werden.", {
            type: "error",
          });
        }
      }}
    >
      <CloseIcon sx={{ fontSize: 16 }} />
    </IconButton>
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

  const refresh = useRefresh();
  const { auftrag, komponente } = useKarteiSpeichern(brille, refresh);
  const [bestellOffen, setBestellOffen] = useState(false);

  if (!brille) return null;

  const glasFeld = komponente("glastyp", "Glastyp", glastyp);
  const fassungFeld = komponente("fassung", "Fassung", fassung);
  const textFeld = (
    feld: string,
    name: string,
    speichere: ReturnType<typeof auftrag>,
    wert: unknown,
    weiteres: Partial<Parameters<typeof Eingabe>[0]> = {},
  ) => (
    <Eingabe
      name={name}
      wert={wert}
      speichere={speichere}
      key={feld}
      {...weiteres}
    />
  );

  const glasNach = (id: unknown) => glaeser?.find((g) => g.id === id);
  const augen = [
    { seite: "R", glas: glasNach(brille.GlasRechts) },
    { seite: "L", glas: glasNach(brille.GlasLinks) },
  ];

  // Zusatzleistungen plus "Weitere Leistungen" (Freitext aus Prisma),
  // mindestens drei Zeilen wie in Prisma
  const weitere = zahl(brille.WeitereLeistungen);
  const posten: {
    bezeichnung: string;
    betrag: unknown;
    zuordnung?: Datensatz;
    auswahl?: boolean;
  }[] = [
    ...(zuordnungen ?? []).map((z) => {
      const l = leistungen?.find((x) => x.id === z.ZusatzleistungID);
      return {
        bezeichnung: text(l?.Bezeichnung),
        betrag: l?.Betrag,
        zuordnung: z,
      };
    }),
    ...weitereLeistungenPositionen(
      weitere ?? 0,
      leistungsText(brille),
      "(aus Prisma)",
    ).map((l) => ({ bezeichnung: l.bezeichnung, betrag: l.betrag })),
  ];
  // eine Zeile mit der Auswahl zum Hinzufügen, wie die leeren Zeilen in Prisma
  posten.push({ bezeichnung: "", betrag: null, auswahl: true });
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
        p: { xs: 1, md: 1.5 },
        background:
          theme.palette.mode === "dark"
            ? undefined
            : "linear-gradient(180deg, #ffffff 0%, #f3f4f6 100%)",
      })}
    >
      <Box
        sx={{
          display: "grid",
          // Kundenname schmal links wie in Prisma, die Karteikarte nutzt die
          // übrige Breite
          gridTemplateColumns: { xs: "1fr", md: "120px minmax(0, 1fr)" },
          gap: { xs: 1, md: 1.5 },
        }}
      >
        <Typography
          component="div"
          sx={{
            fontSize: "1.15rem",
            fontWeight: 400,
            color: "text.secondary",
            lineHeight: 1.25,
            overflowWrap: "anywhere",
          }}
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
          {kunde && (
            <Tooltip title="Kundendaten bearbeiten">
              <IconButton
                component={RouterLink}
                to={`/kunde/${kunde.id}`}
                size="small"
                aria-label="Kundendaten bearbeiten"
                sx={{
                  ml: 0.5,
                  verticalAlign: "middle",
                  color: "text.secondary",
                }}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Typography>

        <Box sx={{ overflowX: "auto", minWidth: 0 }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: SPALTEN,
              columnGap: "6px",
              rowGap: "3px",
              minWidth: 820,
            }}
          >
            {/* Auftragsdaten */}
            <Beschriftung z={1} s="1 / 2">
              Brillenart
            </Beschriftung>
            <Feld z={1} s={LINKS}>
              <Auswahl
                name="Brillenart"
                wert={brille.BrillenArt}
                optionen={brillenartOptionen(brille.BrillenArt)}
                speichere={auftrag("BrillenArt")}
              />
            </Feld>
            <Beschriftung z={1} s="5 / 6">
              Datum
            </Beschriftung>
            <Feld z={1} s="6 / 7">
              {textFeld("Datum", "Datum", auftrag("Datum"), brille.Datum, {
                typ: "datum",
                anzeige: datum(brille.Datum),
              })}
            </Feld>
            <Box
              sx={{
                gridRow: 1,
                gridColumn: "7 / 8",
                alignSelf: "center",
                textAlign: "right",
                pr: 1,
                fontSize: "0.9rem",
              }}
            >
              {brille.id}
            </Box>
            <AuftragPosition brille={brille} z={1} s="8 / 9" />

            <Beschriftung z={2} s="1 / 2">
              Berater
            </Beschriftung>
            <Feld z={2} s={LINKS}>
              <Auswahl
                name="Berater"
                wert={mitarbeiterAnzeige(brille.Berater) || null}
                optionen={MITARBEITER_AUSWAHL}
                speichere={auftrag("Berater")}
              />
            </Feld>
            <Beschriftung z={2} s="5 / 6">
              Werkstatt
            </Beschriftung>
            <Feld z={2} s={RECHTS}>
              <Auswahl
                name="Werkstatt"
                wert={mitarbeiterAnzeige(brille.Werkstatt) || null}
                optionen={MITARBEITER_AUSWAHL}
                speichere={auftrag("Werkstatt")}
              />
            </Feld>

            <Beschriftung z={3} s="1 / 2">
              Refraktion
            </Beschriftung>
            <Feld z={3} s={LINKS}>
              <Auswahl
                name="Refraktion"
                wert={mitarbeiterAnzeige(brille.Refraktion) || null}
                optionen={REFRAKTION_AUSWAHL}
                speichere={auftrag("Refraktion")}
              />
            </Feld>
            <Beschriftung z={3} s="5 / 6">
              Abholung
            </Beschriftung>
            <Feld z={3} s="6 / 7">
              {textFeld(
                "Abholung",
                "Abholung",
                auftrag("Abholung"),
                brille.Abholung,
                {
                  typ: "datum",
                  anzeige: datum(brille.Abholung),
                },
              )}
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
              const speichere = komponente(
                "glass",
                i === 0 ? "GlasRechts" : "GlasLinks",
                glas,
                { Seite: i === 0 ? "Rechts" : "Links" },
              );
              const wertFeld = (w: (typeof WERTE)[number]) => (
                <Wert key={w.feld} rechts>
                  <WertEingabe
                    w={w}
                    seite={seite}
                    glas={glas}
                    speichere={speichere(w.feld)}
                  />
                </Wert>
              );
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
                  {WERTE_LINKS.map(wertFeld)}
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
                  {WERTE_RECHTS.map(wertFeld)}
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Haken
                      an={Boolean(glas?.Liefern)}
                      name={`Liefern ${seite}`}
                      speichere={speichere("Liefern")}
                    />
                  </Box>
                </Zellen>,
                <Feld key={`${seite}-b`} z={z} s="8 / 9" rechts>
                  <Eingabe
                    typ="zahl"
                    rechts
                    name={`Betrag ${seite}`}
                    wert={glas?.Betrag}
                    anzeige={betragText(glas?.Betrag)}
                    speichere={speichere("Betrag")}
                  />
                </Feld>,
              ];
            })}

            {/* Glasassistent (im Bearbeiten-Formular) und Bestelloptionen */}
            <Box
              sx={{
                gridRow: 7,
                gridColumn: LINKS,
                py: "2px",
                display: "flex",
                gap: 2,
              }}
            >
              <Button
                variant="contained"
                disableElevation
                onClick={() => navigate(`/brille/${brille.id}`)}
                sx={prismaKnopf}
              >
                Glasassistent
              </Button>
              <Button
                variant="contained"
                disableElevation
                onClick={() => setBestellOffen(true)}
                sx={prismaKnopf}
              >
                Bestelloptionen
              </Button>
            </Box>

            {/* Glas */}
            <Beschriftung z={8} s="1 / 2">
              Glastyp
            </Beschriftung>
            <Feld z={8} s={LINKS}>
              {textFeld(
                "glastyp.Bezeichnung",
                "Glastyp",
                glasFeld("Bezeichnung"),
                glastyp?.Bezeichnung,
              )}
            </Feld>
            <Beschriftung z={8} s="5 / 6">
              Größe
            </Beschriftung>
            <Feld z={8} s="6 / 7">
              {textFeld(
                "glastyp.GlasGroesse",
                "Größe",
                glasFeld("GlasGroesse"),
                glastyp?.GlasGroesse,
              )}
            </Feld>
            <Beschriftung z={9} s="1 / 2">
              Hersteller
            </Beschriftung>
            <Feld z={9} s={LINKS}>
              {textFeld(
                "glastyp.Hersteller",
                "Hersteller",
                glasFeld("Hersteller"),
                glastyp?.Hersteller,
              )}
            </Feld>
            <Beschriftung z={9} s="5 / 6">
              Sonstiges
            </Beschriftung>
            <Feld z={9} s={RECHTS}>
              {textFeld(
                "glastyp.Sonstiges",
                "Sonstiges",
                glasFeld("Sonstiges"),
                glastyp?.Sonstiges,
              )}
            </Feld>
            <Beschriftung z={10} s="1 / 2">
              Vergütung
            </Beschriftung>
            <Feld z={10} s={LINKS}>
              {textFeld(
                "glastyp.Verguetung",
                "Vergütung",
                glasFeld("Verguetung"),
                glastyp?.Verguetung,
              )}
            </Feld>
            <Beschriftung z={10} s="5 / 6">
              Sonstiges
            </Beschriftung>
            <Feld z={10} s={RECHTS} />
            <Beschriftung z={11} s="1 / 2">
              Farbe
            </Beschriftung>
            <Feld z={11} s={LINKS}>
              {textFeld(
                "glastyp.Farbe",
                "Farbe",
                glasFeld("Farbe"),
                glastyp?.Farbe,
              )}
            </Feld>
            <Beschriftung z={11} s="5 / 6">
              Status
            </Beschriftung>
            <Feld z={11} s={RECHTS}>
              {textFeld(
                "glastyp.Bestellstatus",
                "Status",
                glasFeld("Bestellstatus"),
                glastyp?.Bestellstatus,
              )}
            </Feld>

            <Box sx={{ gridRow: 12, gridColumn: "1 / -1", height: 10 }} />

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
              {textFeld(
                "fassung.Lagernummer",
                "Lagernummer",
                fassungFeld("Lagernummer"),
                fassung?.Lagernummer,
              )}
            </Feld>
            <Feld z={14} s="3 / 4">
              {textFeld(
                "fassung.Bezeichnung",
                "Fassung",
                fassungFeld("Bezeichnung"),
                fassung?.Bezeichnung,
              )}
              {fassung && (
                <Link
                  to={`/fassung/${fassung.id}/show`}
                  aria-label="Fassung öffnen"
                  sx={{ display: "flex", ml: 0.5, color: "text.secondary" }}
                >
                  <OpenInNewIcon sx={{ fontSize: 16 }} />
                </Link>
              )}
            </Feld>
            <Zellen z={14} s="6 / 8" spalten="100fr 165fr">
              <Wert links>
                {textFeld(
                  "fassung.Farbe",
                  "Farbe Fassung",
                  fassungFeld("Farbe"),
                  fassung?.Farbe,
                )}
              </Wert>
              <Wert links>
                {textFeld(
                  "fassung.Groesse",
                  "Größe Fassung",
                  fassungFeld("Groesse"),
                  fassung?.Groesse,
                )}
              </Wert>
            </Zellen>
            <Feld z={14} s="8 / 9" rechts>
              {textFeld(
                "fassung.Betrag",
                "Betrag Fassung",
                fassungFeld("Betrag"),
                fassung?.Betrag,
                {
                  typ: "zahl",
                  rechts: true,
                  anzeige: betragText(fassung?.Betrag),
                },
              )}
            </Feld>
            <Beschriftung z={15} s="2 / 3" rechts>
              Linie
            </Beschriftung>
            <Feld z={15} s="3 / 4">
              {textFeld(
                "fassung.Linie",
                "Linie",
                fassungFeld("Linie"),
                fassung?.Linie,
              )}
            </Feld>
            <Beschriftung z={15} s="5 / 6">
              Hersteller
            </Beschriftung>
            <Feld z={15} s={RECHTS}>
              {textFeld(
                "fassung.Hersteller",
                "Hersteller Fassung",
                fassungFeld("Hersteller"),
                fassung?.Hersteller,
              )}
            </Feld>

            {/* Zusatzleistungen */}
            <Box sx={{ gridRow: 16, gridColumn: "2 / 3", pt: 0.75 }}>
              <Spaltentitel>Lagernr.</Spaltentitel>
            </Box>
            <Box sx={{ gridRow: 16, gridColumn: "3 / 7", pt: 0.75 }}>
              <Spaltentitel>Zusatzleistungen</Spaltentitel>
            </Box>
            {posten.map((p, i) => [
              <Feld key={`zl-n-${i}`} z={zZusatz + i} s="2 / 3" />,
              p.auswahl ? (
                <ZusatzleistungAuswahl
                  key={`zl-b-${i}`}
                  z={zZusatz + i}
                  s="3 / 7"
                  brilleId={brille.id}
                  vorhanden={leistungIds}
                />
              ) : (
                <Feld key={`zl-b-${i}`} z={zZusatz + i} s="3 / 7">
                  <Box component="span" sx={{ flex: 1, minWidth: 0 }}>
                    {p.bezeichnung}
                  </Box>
                  {p.zuordnung && (
                    <ZusatzleistungEntfernen zuordnung={p.zuordnung} />
                  )}
                </Feld>
              ),
              <Feld key={`zl-e-${i}`} z={zZusatz + i} s="8 / 9" rechts>
                {betragText(p.betrag)}
              </Feld>,
            ])}

            <Beschriftung z={zRabatt} s="1 / 2">
              Rabatt
            </Beschriftung>
            <Zellen z={zRabatt} s={BREIT} spalten="1fr 110px">
              <Wert links>
                <Auswahl
                  name="Rabatt"
                  wert={brille.RabattBezeichnung}
                  optionen={rabattOptionen(brille.RabattBezeichnung)}
                  speichere={auftrag("RabattBezeichnung", (neu) =>
                    rabattDaten(neu == null ? null : String(neu)),
                  )}
                />
              </Wert>
              <Wert rechts>
                {textFeld(
                  "RabattProzent",
                  "Rabatt in %",
                  auftrag("RabattProzent"),
                  brille.RabattProzent,
                  {
                    typ: "zahl",
                    rechts: true,
                    anzeige: rabattProzent
                      ? `${dezimal.format(rabattProzent)} %`
                      : "",
                  },
                )}
              </Wert>
            </Zellen>
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
              {textFeld(
                "Notizen",
                "Notizen",
                auftrag("Notizen"),
                brille.Notizen,
                {
                  mehrzeilig: true,
                },
              )}
            </Feld>
            <Beschriftung z={zNotizen} s="7 / 8">
              <Box
                component="span"
                sx={{ pl: 2, display: "inline-flex", alignItems: "center" }}
              >
                KK-Anteil
                <KassenanteilRechner
                  augen={[
                    { seite: "R", glas: augen[0].glas },
                    { seite: "L", glas: augen[1].glas },
                  ]}
                  speichere={(brutto, positionen) =>
                    auftrag("KKAnteil", () => ({
                      KKAnteil: brutto,
                      KassenPositionen: positionen,
                    }))(brutto)
                  }
                  augenaerztlicheVerordnung={Boolean(
                    text(brille.VerordnenderArzt) || brille.Verordnungsdatum,
                  )}
                />
              </Box>
            </Beschriftung>
            <Feld z={zNotizen} s="8 / 9" rechts>
              {textFeld(
                "KKAnteil",
                "KK-Anteil",
                // von Hand eingetragen: gespeicherte Rechner-Positionen passen nicht mehr
                auftrag("KKAnteil", (neu) => ({
                  KKAnteil: neu,
                  KassenPositionen: null,
                })),
                brille.KKAnteil,
                {
                  typ: "zahl",
                  rechts: true,
                  anzeige: betragText(kkAnteil),
                },
              )}
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
              <Auswahl
                name="Zahlungsstatus"
                wert={brille.Zahlungsstatus}
                optionen={ZAHLUNGSSTATUS}
                speichere={auftrag("Zahlungsstatus")}
              />
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
              {textFeld(
                "Anzahlung",
                "Anzahlung",
                auftrag("Anzahlung"),
                brille.Anzahlung,
                {
                  typ: "zahl",
                  rechts: true,
                  anzeige: betragText(anzahlung),
                },
              )}
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
            <Box sx={{ gridRow: zRest + 1, gridColumn: "1 / -1", height: 8 }} />
            <Beschriftung z={zArzt} s="1 / 2">
              Arzt
            </Beschriftung>
            <Feld z={zArzt} s={LINKS}>
              {textFeld(
                "VerordnenderArzt",
                "Arzt",
                auftrag("VerordnenderArzt"),
                brille.VerordnenderArzt,
              )}
            </Feld>
            <Beschriftung z={zArzt} s="5 / 6">
              Verordnung
            </Beschriftung>
            <Feld z={zArzt} s="6 / 7">
              {textFeld(
                "Verordnungsdatum",
                "Verordnung",
                auftrag("Verordnungsdatum"),
                brille.Verordnungsdatum,
                {
                  typ: "datum",
                  anzeige: datum(brille.Verordnungsdatum),
                },
              )}
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
              {textFeld(
                "Diagnose",
                "Diagnose",
                auftrag("Diagnose"),
                brille.Diagnose,
              )}
            </Feld>

            {/* Übernommene Prisma-Angaben (Leistungen, Kasse, Merkmale,
                Rechnungsdatum) klein am Ende statt in den Notizen */}
            {text(brille.PrismaAngaben) && (
              <Box
                sx={{
                  gridRow: zArzt + 2,
                  gridColumn: "1 / -1",
                  mt: 2,
                  fontSize: "0.72rem",
                  color: "text.secondary",
                  whiteSpace: "normal",
                }}
              >
                <Box component="span" sx={{ fontStyle: "italic" }}>
                  Angaben aus Prisma:{" "}
                </Box>
                {text(brille.PrismaAngaben)
                  .split(/\r?\n/)
                  .map((z) => z.trim().replace(/^-\s*/, ""))
                  .filter((z) => z && z !== "Leistungen:")
                  .join(" · ")}
              </Box>
            )}
          </Box>
        </Box>
      </Box>
      <Dialog
        open={bestellOffen}
        onClose={() => setBestellOffen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Bestelloptionen</DialogTitle>
        <DialogContent>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "60px minmax(0, 1fr) 80px",
              columnGap: "12px",
              rowGap: "8px",
              alignItems: "center",
            }}
          >
            <span />
            <Box
              sx={{
                fontStyle: "italic",
                fontSize: "0.8rem",
                color: "text.secondary",
              }}
            >
              Bestellstatus Glas
            </Box>
            <Box
              sx={{
                fontStyle: "italic",
                fontSize: "0.8rem",
                color: "text.secondary",
              }}
            >
              Liefern
            </Box>
            {augen.map(({ seite, glas }, i) => {
              const speichere = komponente(
                "glass",
                i === 0 ? "GlasRechts" : "GlasLinks",
                glas,
                { Seite: i === 0 ? "Rechts" : "Links" },
              );
              return [
                <Box key={`${seite}-s`} sx={{ fontWeight: 600 }}>
                  {seite === "R" ? "Rechts" : "Links"}
                </Box>,
                <Feld key={`${seite}-a`} z={0} s="auto">
                  <Auswahl
                    name={`Bestellstatus ${seite}`}
                    wert={glas?.Auftragsstatus}
                    optionen={GLAS_BESTELLSTATUS}
                    speichere={speichere("Auftragsstatus")}
                  />
                </Feld>,
                <Box key={`${seite}-l`}>
                  <Haken
                    an={Boolean(glas?.Liefern)}
                    name={`Liefern ${seite}`}
                    speichere={speichere("Liefern")}
                  />
                </Box>,
              ];
            })}
            <Box
              sx={{
                gridColumn: "1 / -1",
                mt: 1,
                fontStyle: "italic",
                fontSize: "0.8rem",
                color: "text.secondary",
              }}
            >
              Glastyp – Status beim Hersteller
            </Box>
            <span />
            <Feld z={0} s="auto">
              {textFeld(
                "glastyp.Bestellstatus.dialog",
                "Status Glastyp",
                glasFeld("Bestellstatus"),
                glastyp?.Bestellstatus,
              )}
            </Feld>
            <span />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBestellOffen(false)}>Schließen</Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};
