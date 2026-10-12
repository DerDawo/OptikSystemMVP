import { ReactNode, useMemo, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  Link,
  useDataProvider,
  useGetList,
  useGetOne,
  useNotify,
  useRecordContext,
  useRefresh,
} from "react-admin";
import {
  Box,
  Button,
  Card,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Radio,
  RadioGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { Auswahl, Eingabe, Haken, Speichern } from "./KarteiEingabe";
import {
  Beschriftung,
  Feld,
  SPALTEN,
  Spaltentitel,
  Wert,
  Zellen,
} from "./BrilleKarteikarte";
import { MITARBEITER, mitarbeiterAnzeige } from "./mitarbeiterNamen";
import { rabattDaten, rabattOptionen } from "./rabatte";
import { ZAHLUNGSSTATUS } from "./zahlungsstatus";

/*
 * CL-Kartei wie in Prisma: alle Felder direkt eintippen (speichert beim
 * Verlassen des Felds), links der Baum der CL-Karteien des Kunden
 * (Hauptkartei mit ihren Anpassungen).
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
  wert
    ? new Date(String(wert)).toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "";
// Zahlen wie in Prisma: Punkt, feste Nachkommastellen, kein Plus
const prismaZahl = (wert: unknown, stellen: number) => {
  const n = zahl(wert);
  return n === null
    ? ""
    : new Intl.NumberFormat("en-US", {
        minimumFractionDigits: stellen,
        maximumFractionDigits: Math.max(stellen, 2),
        useGrouping: false,
      }).format(n);
};
const rund = (n: number) => Math.round(n * 100) / 100;

export const LINSENARTEN = [
  "Weichlinsen",
  "Formstabile Linsen",
  "Orthokeratologie",
  "Sklerallinsen",
  "Hybridlinsen",
];
export const ANPASSGRUENDE = [
  "Erstanpassung",
  "Nachanpassung",
  "Folgelinse",
  "Ersatzlinse",
  "Kontrolle",
];
// Kurztexte der Zusatzleistung wie in Prisma
export const CL_ZUSATZLEISTUNGEN = ["Anpasslinsen", "Anpassung", "Refraktion"];

const MITARBEITER_AUSWAHL = MITARBEITER.map((m) => ({ id: m, name: m }));

// Linsenparameter je Auge (Spalte "<Feld><Rechts|Links>")
const PARAMETER: { feld: string; titel: string; stellen: number }[] = [
  { feld: "Sph", titel: "Sph", stellen: 2 },
  { feld: "Cyl", titel: "Cyl", stellen: 2 },
  { feld: "Achse", titel: "A", stellen: 0 },
  { feld: "Add", titel: "Add", stellen: 2 },
  { feld: "Vis", titel: "Vis", stellen: 2 },
  { feld: "Radius", titel: "BC", stellen: 2 },
  { feld: "Durchmesser", titel: "DM", stellen: 1 },
];
const LIEFERDATEN: { feld: string; titel: string; datum?: boolean }[] = [
  { feld: "Lagernummer", titel: "Lagernr." },
  { feld: "LieferscheinNr", titel: "Liefersch.-Nr" },
  { feld: "LieferscheinDatum", titel: "Lieferschein-Datum", datum: true },
  { feld: "LotNr", titel: "LOT-Nr." },
  { feld: "Status", titel: "Status" },
];
const AUGEN = [
  { seite: "R", endung: "Rechts" },
  { seite: "L", endung: "Links" },
] as const;

// Felder, aus denen sich die Summe ergibt
const PREISFELDER = [
  "PreisRechts",
  "PreisLinks",
  "Zusatzbetrag1",
  "Zusatzbetrag2",
  "Zusatzbetrag3",
];

// Summe = Preise + Zusatzleistungen abzüglich Rabatt; null, solange keine
// Preise eingetragen sind (ältere Aufträge behalten ihre Summe)
export const clSumme = (cl: Record<string, unknown>): number | null => {
  const teile = PREISFELDER.map((f) => zahl(cl[f])).filter(
    (n): n is number => n !== null,
  );
  if (teile.length === 0) return null;
  const brutto = teile.reduce((s, n) => s + n, 0);
  const prozent = zahl(cl.RabattProzent) ?? 0;
  return rund(brutto - (brutto * prozent) / 100);
};

// Baum links: Hauptkarteien mit ihren Anpassungen (neueste oben)
const KarteiBaum = ({ cl }: { cl: Datensatz }) => {
  const navigate = useNavigate();
  const { data } = useGetList<Datensatz>(
    "kontaktlinse",
    {
      filter: { kunde_id: cl.kunde_id },
      sort: { field: "Datum", order: "DESC" },
      pagination: { page: 1, perPage: 200 },
    },
    { enabled: cl.kunde_id != null },
  );
  const alle = data ?? [];
  const ids = new Set(alle.map((k) => k.id));
  const haupt = alle.filter(
    (k) => k.Hauptkartei_id == null || !ids.has(k.Hauptkartei_id as number),
  );
  const eintrag = (k: Datensatz, anpassung: boolean) => (
    <Box
      key={k.id}
      onClick={() => navigate(`/kontaktlinse/${k.id}/show`)}
      sx={{
        pl: anpassung ? 2 : 0,
        py: "1px",
        cursor: "pointer",
        fontSize: "0.8rem",
        whiteSpace: "nowrap",
        borderRadius: "3px",
        bgcolor: k.id === cl.id ? "action.selected" : undefined,
        "&:hover": { bgcolor: "action.hover" },
      }}
    >
      {anpassung ? "Anpassung" : "CL-Kartei"} {datum(k.Datum) || `#${k.id}`}
    </Box>
  );
  return (
    <Box sx={{ mt: 1.5 }}>
      {haupt.map((h) => (
        <Box key={h.id}>
          {eintrag(h, false)}
          {alle
            .filter((k) => k.Hauptkartei_id === h.id)
            .map((k) => eintrag(k, true))}
        </Box>
      ))}
    </Box>
  );
};

// "Karteiwerte kopieren" wie in Prisma
const GRUPPEN: { id: string; name: string; felder: string[] }[] = [
  {
    id: "staerken",
    name: "Stärken",
    felder: AUGEN.flatMap(({ endung }) =>
      PARAMETER.map((p) => `${p.feld}${endung}`),
    ),
  },
  {
    id: "typ",
    name: "CL-Typ",
    felder: [
      "Linsenart",
      ...AUGEN.flatMap(({ endung }) =>
        ["Linsentyp", "Hersteller", "Material", "Tragemodus", "Preis"].map(
          (f) => `${f}${endung}`,
        ),
      ),
    ],
  },
  {
    id: "lieferdaten",
    name: "Lieferdaten (Liefersch., LOT)",
    felder: AUGEN.flatMap(({ endung }) =>
      LIEFERDATEN.map((l) => `${l.feld}${endung}`),
    ),
  },
  { id: "notizen", name: "Wichtige Notizen", felder: ["Notizen"] },
];
const WEITERE_FELDER = [
  "Berater",
  "Anpassgrund",
  "AboLieferung",
  "Pflegemittel",
  "Zusatzleistung1",
  "Zusatzleistung2",
  "Zusatzleistung3",
  "Zusatzbetrag1",
  "Zusatzbetrag2",
  "Zusatzbetrag3",
  "RabattBezeichnung",
  "RabattProzent",
];

type Ziel = "haupt" | "anpassung" | "anpassungNeu";

export const KarteiwerteKopieren = ({ cl }: { cl: Datensatz }) => {
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const navigate = useNavigate();
  const [offen, setOffen] = useState(false);
  const [ziel, setZiel] = useState<Ziel>("haupt");
  const [alle, setAlle] = useState(true);
  const [gruppen, setGruppen] = useState<Set<string>>(new Set());
  const [laeuft, setLaeuft] = useState(false);

  const kopieren = async () => {
    setLaeuft(true);
    try {
      const felder = alle
        ? [...GRUPPEN.flatMap((g) => g.felder), ...WEITERE_FELDER]
        : GRUPPEN.filter((g) => gruppen.has(g.id)).flatMap((g) => g.felder);
      const werte: Record<string, unknown> = {
        kunde_id: cl.kunde_id,
        Datum: new Date().toLocaleDateString("sv-SE"),
        Berater: cl.Berater,
      };
      for (const f of felder) werte[f] = cl[f] ?? null;
      werte.Summe = clSumme(werte);
      const hauptVon = (k: Datensatz) =>
        (k.Hauptkartei_id as number | null) ?? k.id;
      let neu: Datensatz;
      if (ziel === "anpassung") {
        ({ data: neu } = await dataProvider.create("kontaktlinse", {
          data: { ...werte, Hauptkartei_id: hauptVon(cl) },
        }));
      } else if (ziel === "anpassungNeu") {
        const { data: haupt } = await dataProvider.create("kontaktlinse", {
          data: { ...werte, Hauptkartei_id: null },
        });
        ({ data: neu } = await dataProvider.create("kontaktlinse", {
          data: { ...werte, Hauptkartei_id: haupt.id },
        }));
      } else {
        ({ data: neu } = await dataProvider.create("kontaktlinse", {
          data: { ...werte, Hauptkartei_id: null },
        }));
      }
      setOffen(false);
      notify("Karteiwerte kopiert.", { type: "success" });
      navigate(`/kontaktlinse/${neu.id}/show`);
    } catch {
      notify("Karteiwerte konnten nicht kopiert werden.", { type: "error" });
    } finally {
      setLaeuft(false);
    }
  };

  return (
    <>
      <Button startIcon={<ContentCopyIcon />} onClick={() => setOffen(true)}>
        Karteiwerte kopieren
      </Button>
      <Dialog open={offen} onClose={() => setOffen(false)} maxWidth="xs">
        <DialogTitle>Karteiwerte kopieren</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ fontStyle: "italic", mb: 0.5 }}>
            Wohin sollen die Daten kopiert werden?
          </Typography>
          <RadioGroup
            value={ziel}
            onChange={(e) => setZiel(e.target.value as Ziel)}
          >
            <FormControlLabel
              value="haupt"
              control={<Radio size="small" />}
              label="Neue Hauptkartei"
            />
            <FormControlLabel
              value="anpassung"
              control={<Radio size="small" />}
              label="Neue Anpassung"
            />
            <FormControlLabel
              value="anpassungNeu"
              control={<Radio size="small" />}
              label="Neue Anpassung in neuer Hauptkartei"
            />
          </RadioGroup>
          <Typography
            variant="body2"
            sx={{ fontStyle: "italic", mt: 1.5, mb: 0.5 }}
          >
            Welche Daten sollen kopiert werden?
          </Typography>
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={alle}
                onChange={(e) => setAlle(e.target.checked)}
              />
            }
            label="Alle Einträge"
          />
          {GRUPPEN.map((g) => (
            <Box key={g.id}>
              <FormControlLabel
                disabled={alle}
                control={
                  <Checkbox
                    size="small"
                    checked={alle || gruppen.has(g.id)}
                    onChange={(e) =>
                      setGruppen((alt) => {
                        const neu = new Set(alt);
                        if (e.target.checked) neu.add(g.id);
                        else neu.delete(g.id);
                        return neu;
                      })
                    }
                  />
                }
                label={g.name}
              />
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOffen(false)}>Abbrechen</Button>
          <Button
            variant="contained"
            onClick={kopieren}
            disabled={laeuft || (!alle && gruppen.size === 0)}
          >
            Kopieren
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export const KontaktlinseKarteikarte = () => {
  const cl = useRecordContext<Datensatz>();
  const dataProvider = useDataProvider();
  const refresh = useRefresh();
  const { data: kunde } = useGetOne<Datensatz>(
    "kunde",
    { id: cl?.kunde_id as number },
    { enabled: cl?.kunde_id != null },
  );
  const zahlungsAuswahl = useMemo(() => ZAHLUNGSSTATUS, []);

  if (!cl) return null;

  // mehrere Felder auf einmal speichern; die Summe wird mitgeführt, sobald
  // Preise eingetragen sind
  const sichere = async (daten: Record<string, unknown>) => {
    const neu = { ...cl, ...daten };
    const betroffen = Object.keys(daten).some(
      (f) => PREISFELDER.includes(f) || f === "RabattProzent",
    );
    const summe = betroffen ? clSumme(neu) : null;
    await dataProvider.update("kontaktlinse", {
      id: cl.id,
      data: summe === null ? daten : { ...daten, Summe: summe },
      previousData: cl,
    });
    refresh();
  };
  const speichere =
    (feld: string): Speichern =>
    (neu) =>
      sichere({ [feld]: neu });

  const eingabe = (
    feld: string,
    name: string,
    weiteres: Partial<Parameters<typeof Eingabe>[0]> = {},
  ) => (
    <Eingabe
      key={feld}
      name={name}
      wert={cl[feld]}
      speichere={speichere(feld)}
      {...weiteres}
    />
  );
  const zahlFeld = (feld: string, name: string, stellen: number) =>
    eingabe(feld, name, {
      typ: "zahl",
      rechts: true,
      anzeige: prismaZahl(cl[feld], stellen),
    });
  const datumFeld = (feld: string, name: string) =>
    eingabe(feld, name, { typ: "datum", anzeige: datum(cl[feld]) });

  const summe = zahl(cl.Summe);
  const kkAnteil = zahl(cl.KKAnteil);
  const anzahlung = zahl(cl.Anzahlung);
  const zuzahlung = summe === null ? null : summe - (kkAnteil ?? 0);
  const rest =
    summe === null ? null : summe - (kkAnteil ?? 0) - (anzahlung ?? 0);

  const kundeName = kunde
    ? [text(kunde.Nachname), text(kunde.Vorname)].filter(Boolean).join(", ")
    : "";

  const summenzeile = (
    z: number,
    titel: string,
    inhalt: ReactNode,
    summeFeld?: boolean,
  ) => (
    <>
      <Beschriftung z={z} s="7 / 8" rechts>
        {titel}
      </Beschriftung>
      <Feld z={z} s="8 / 9" rechts summe={summeFeld}>
        {inhalt}
      </Feld>
    </>
  );

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
          gridTemplateColumns: { xs: "1fr", md: "150px minmax(0, 1fr)" },
          gap: { xs: 1, md: 1.5 },
        }}
      >
        {/* Kundenname und Baum der CL-Karteien */}
        <Box>
          <Typography
            component="div"
            sx={{
              fontSize: "1.15rem",
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
                  sx={{ ml: 0.5, color: "text.secondary" }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Typography>
          <KarteiBaum cl={cl} />
        </Box>

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
            {/* Kopf */}
            <Beschriftung z={1} s="1 / 2">
              Linsenart
            </Beschriftung>
            <Feld z={1} s="2 / 4">
              {eingabe("Linsenart", "Linsenart", { vorschlaege: LINSENARTEN })}
            </Feld>
            <Beschriftung z={1} s="5 / 6">
              Auftrag
            </Beschriftung>
            <Feld z={1} s="6 / 7" rechts>
              {cl.id}
            </Feld>
            <Beschriftung z={1} s="7 / 8" rechts>
              Datum
            </Beschriftung>
            <Feld z={1} s="8 / 9">
              {datumFeld("Datum", "Datum")}
            </Feld>

            <Beschriftung z={2} s="1 / 2">
              Anpasser
            </Beschriftung>
            <Feld z={2} s="2 / 4">
              <Auswahl
                name="Anpasser"
                wert={mitarbeiterAnzeige(cl.Berater) || null}
                optionen={MITARBEITER_AUSWAHL}
                speichere={speichere("Berater")}
              />
            </Feld>
            <Beschriftung z={2} s="5 / 6">
              Rech. Nr.
            </Beschriftung>
            <Feld z={2} s="6 / 7" rechts>
              {eingabe("Rechnungsnummer", "Rechnungsnummer", { rechts: true })}
            </Feld>
            <Beschriftung z={2} s="7 / 8" rechts>
              Abholdatum
            </Beschriftung>
            <Feld z={2} s="8 / 9">
              {datumFeld("Abholung", "Abholdatum")}
            </Feld>

            <Beschriftung z={3} s="1 / 2">
              Anpassgrund
            </Beschriftung>
            <Feld z={3} s="2 / 4">
              {eingabe("Anpassgrund", "Anpassgrund", {
                vorschlaege: ANPASSGRUENDE,
              })}
            </Feld>
            <Beschriftung z={3} s="5 / 6">
              Nachkontrolle
            </Beschriftung>
            <Feld z={3} s="6 / 7">
              {datumFeld("Nachkontrolltermin", "Nachkontrolle")}
            </Feld>
            <Box
              sx={{
                gridRow: 3,
                gridColumn: "7 / 9",
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: 0.5,
                fontStyle: "italic",
                fontSize: "0.72rem",
                color: "text.secondary",
              }}
            >
              <Haken
                an={Boolean(cl.AboLieferung)}
                name="Abo Lieferung"
                speichere={speichere("AboLieferung")}
              />
              Abo Lieferung
            </Box>

            {/* Linsenparameter */}
            <Box sx={{ gridRow: 4, gridColumn: "1 / -1", height: 6 }} />
            <Beschriftung z={5} s="1 / 2">
              Linsenparameter
            </Beschriftung>
            <Zellen z={5} s="2 / 4" spalten="repeat(7, 1fr)">
              {PARAMETER.map((p) => (
                <Spaltentitel key={p.feld}>{p.titel}</Spaltentitel>
              ))}
            </Zellen>
            <Box sx={{ gridRow: 5, gridColumn: "5 / 7" }}>
              <Spaltentitel>Typ</Spaltentitel>
            </Box>
            <Box sx={{ gridRow: 5, gridColumn: "7 / 8" }}>
              <Spaltentitel>Lieferant</Spaltentitel>
            </Box>
            <Box sx={{ gridRow: 5, gridColumn: "8 / 9" }}>
              <Spaltentitel>Betrag</Spaltentitel>
            </Box>
            {AUGEN.map(({ seite, endung }, i) => {
              const z = 6 + i;
              return [
                <Beschriftung key={`${seite}-b`} z={z} s="1 / 2" rechts>
                  {seite}
                </Beschriftung>,
                <Zellen
                  key={`${seite}-p`}
                  z={z}
                  s="2 / 4"
                  spalten="repeat(7, 1fr)"
                >
                  {PARAMETER.map((p) => (
                    <Wert key={p.feld} rechts>
                      {zahlFeld(
                        `${p.feld}${endung}`,
                        `${p.titel} ${seite}`,
                        p.stellen,
                      )}
                    </Wert>
                  ))}
                </Zellen>,
                <Feld key={`${seite}-t`} z={z} s="5 / 7">
                  {eingabe(`Linsentyp${endung}`, `Typ ${seite}`)}
                </Feld>,
                <Feld key={`${seite}-l`} z={z} s="7 / 8">
                  {eingabe(`Hersteller${endung}`, `Lieferant ${seite}`)}
                </Feld>,
                <Feld key={`${seite}-e`} z={z} s="8 / 9" rechts>
                  {zahlFeld(`Preis${endung}`, `Betrag ${seite}`, 2)}
                </Feld>,
              ];
            })}

            {/* Lieferdaten */}
            <Box sx={{ gridRow: 8, gridColumn: "1 / -1", height: 6 }} />
            <Zellen z={9} s="2 / 7" spalten="repeat(5, 1fr)">
              {LIEFERDATEN.map((l) => (
                <Spaltentitel key={l.feld}>{l.titel}</Spaltentitel>
              ))}
            </Zellen>
            {AUGEN.map(({ seite, endung }, i) => {
              const z = 10 + i;
              return [
                <Beschriftung key={`${seite}-lb`} z={z} s="1 / 2" rechts>
                  {seite}
                </Beschriftung>,
                <Zellen
                  key={`${seite}-ld`}
                  z={z}
                  s="2 / 7"
                  spalten="repeat(5, 1fr)"
                >
                  {LIEFERDATEN.map((l) => (
                    <Wert key={l.feld} links>
                      {l.datum
                        ? datumFeld(`${l.feld}${endung}`, `${l.titel} ${seite}`)
                        : eingabe(`${l.feld}${endung}`, `${l.titel} ${seite}`)}
                    </Wert>
                  ))}
                </Zellen>,
              ];
            })}

            {/* Zusatzleistungen */}
            <Box sx={{ gridRow: 12, gridColumn: "1 / -1", height: 6 }} />
            <Beschriftung z={13} s="1 / 2">
              Zusatzleistung
            </Beschriftung>
            {[1, 2, 3].map((n) => [
              <Feld key={`zl-${n}`} z={12 + n} s="2 / 7">
                {eingabe(`Zusatzleistung${n}`, `Zusatzleistung ${n}`, {
                  vorschlaege: CL_ZUSATZLEISTUNGEN,
                })}
              </Feld>,
              <Feld key={`zb-${n}`} z={12 + n} s="8 / 9" rechts>
                {zahlFeld(`Zusatzbetrag${n}`, `Betrag Zusatzleistung ${n}`, 2)}
              </Feld>,
            ])}

            {/* Rabatt, Zahlungen, Pflegemittel, Notizen; rechts Summen */}
            <Beschriftung z={16} s="1 / 2">
              Rabatt
            </Beschriftung>
            <Feld z={16} s="2 / 6">
              <Auswahl
                schlicht
                name="Rabatt"
                wert={cl.RabattBezeichnung}
                optionen={rabattOptionen(cl.RabattBezeichnung)}
                speichere={(neu) =>
                  sichere(rabattDaten(neu == null ? null : String(neu)))
                }
              />
            </Feld>
            <Feld z={16} s="6 / 7" rechts>
              {eingabe("RabattProzent", "Rabatt in %", {
                typ: "zahl",
                rechts: true,
                anzeige: zahl(cl.RabattProzent)
                  ? `${prismaZahl(cl.RabattProzent, 0)} %`
                  : "",
              })}
            </Feld>
            {summenzeile(
              16,
              "Summe",
              summe === null ? "" : prismaZahl(summe, 2),
              true,
            )}

            <Beschriftung z={17} s="1 / 2">
              Zahlungen
            </Beschriftung>
            <Feld z={17} s="2 / 4">
              <Auswahl
                name="Zahlungen"
                wert={cl.Zahlungsstatus}
                optionen={zahlungsAuswahl}
                speichere={speichere("Zahlungsstatus")}
              />
            </Feld>
            <Beschriftung z={17} s="5 / 6" rechts>
              am
            </Beschriftung>
            <Feld z={17} s="6 / 7">
              {datumFeld("Zahlungsdatum", "Zahlung am")}
            </Feld>
            {summenzeile(
              17,
              "- KK-Anteil",
              zahlFeld("KKAnteil", "KK-Anteil", 2),
            )}

            <Beschriftung z={18} s="1 / 2">
              Pflegemittel
            </Beschriftung>
            <Feld z={18} s="2 / 7">
              {eingabe("Pflegemittel", "Pflegemittel")}
            </Feld>
            {summenzeile(
              18,
              "Zuzahlung",
              zuzahlung === null ? "" : prismaZahl(zuzahlung, 2),
            )}

            <Beschriftung z={19} s="1 / 2">
              Wichtige Notizen
            </Beschriftung>
            <Feld z={19} s="2 / 7" h={3} mehrzeilig>
              {eingabe("Notizen", "Wichtige Notizen", { mehrzeilig: true })}
            </Feld>
            {summenzeile(
              19,
              "Anzahlung",
              zahlFeld("Anzahlung", "Anzahlung", 2),
            )}
            {summenzeile(
              20,
              "Restbetrag",
              rest === null ? "" : prismaZahl(rest, 2),
              true,
            )}
            <Box sx={{ gridRow: 21, gridColumn: "1 / -1", minHeight: 40 }} />
          </Box>
        </Box>
      </Box>
    </Card>
  );
};
