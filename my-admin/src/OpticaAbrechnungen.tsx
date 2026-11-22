// Seite "OPTICA-Abrechnungen" (Route /optica): alle Abrechnungsläufe des
// Abrechnungszentrums OPTICA mit Auszahlung, Gebühren und Absetzungen,
// Abgleich mit den abgerechneten Rezepten, Kostenvoranschläge (eKV), die
// abgelegten Original-PDFs und Statistiken. Neue Unterlagen werden über
// "Unterlagen einlesen" übernommen (OpticaImportDialog).
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Title, useNotify } from "react-admin";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  Checkbox,
  Chip,
  CircularProgress,
  Collapse,
  FormControlLabel,
  IconButton,
  Link,
  MenuItem,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import UploadIcon from "@mui/icons-material/UploadFileOutlined";
import PdfIcon from "@mui/icons-material/PictureAsPdfOutlined";
import AufIcon from "@mui/icons-material/KeyboardArrowDown";
import ZuIcon from "@mui/icons-material/KeyboardArrowUp";
import dayjs from "dayjs";
import { supabase } from "./utils";
import { formatCurrency } from "./CurrencyField";
import { tokensFor } from "./designTokens";
import { type Kassenrezept, monatName, zahl } from "./kassenrezept";
import {
  type OpticaAbrechnung,
  type OpticaAbsetzung,
  type OpticaEkv,
  absetzungenNachGrund,
  absetzungenNachKasse,
  grundKategorie,
  jahreDerLaeufe,
  jahresSummen,
  leistungenNachPosition,
  rezeptAbgleich,
} from "./optica";
import { DOKUMENT_NAME, type UmsatzBlock } from "./opticaParser";
import { ladeSeitenweise, pdfLink } from "./opticaImport";
import { OpticaImportDialog } from "./OpticaImportDialog";
import { tabelleSx } from "./opticaStil";

const datum = (w: string | null) => (w ? dayjs(w).format("DD.MM.YYYY") : "–");
const eur = (w: number | string | null) => formatCurrency(zahl(w));
const prozent = (n: number) => `${n.toFixed(1).replace(".", ",")} %`;

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
    <Typography sx={{ fontSize: 12.5, color: (t) => tokensFor(t).text3 }}>
      {titel}
    </Typography>
    <Typography
      sx={{ fontSize: 22, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}
    >
      {wert}
    </Typography>
    {unter && (
      <Typography sx={{ fontSize: 12, color: (t) => tokensFor(t).text3 }}>
        {unter}
      </Typography>
    )}
  </Card>
);

const Abschnitt = ({
  titel,
  children,
  rechts,
}: {
  titel: string;
  children: React.ReactNode;
  rechts?: React.ReactNode;
}) => (
  <Card variant="outlined" sx={{ p: 1.5, minWidth: 0 }}>
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        mb: 1,
        flexWrap: "wrap",
      }}
    >
      <Typography sx={{ fontWeight: 600, flex: "1 1 auto" }}>
        {titel}
      </Typography>
      {rechts}
    </Box>
    {children}
  </Card>
);

/** Waagerechter Balken für einfache Diagramme ohne Bibliothek. */
const Balken = ({ anteil, farbe }: { anteil: number; farbe: string }) => (
  <Box
    sx={{
      height: 10,
      borderRadius: 1,
      backgroundColor: "action.hover",
      minWidth: 60,
    }}
  >
    <Box
      sx={{
        height: "100%",
        width: `${Math.max(0, Math.min(100, anteil * 100))}%`,
        borderRadius: 1,
        backgroundColor: farbe,
      }}
    />
  </Box>
);

const PdfKnopf = ({ pfad, name }: { pfad: string; name: string }) => {
  const notify = useNotify();
  return (
    <Button
      size="small"
      variant="outlined"
      startIcon={<PdfIcon />}
      onClick={async () => {
        // Fenster sofort öffnen, sonst blockiert der Browser das Pop-up
        const fenster = window.open("", "_blank");
        try {
          const url = await pdfLink(pfad);
          if (fenster) fenster.location.href = url;
          else window.location.href = url;
        } catch (err) {
          fenster?.close();
          console.error(err);
          notify("PDF konnte nicht geöffnet werden", { type: "error" });
        }
      }}
      sx={{ textTransform: "none" }}
    >
      {name}
    </Button>
  );
};

const KundeLink = ({ id, text }: { id: number | null; text: string }) => {
  const navigate = useNavigate();
  if (id == null) return <>{text}</>;
  return (
    <Link
      component="button"
      type="button"
      underline="hover"
      onClick={() => navigate(`/kunde/${id}/show`)}
      sx={{ textAlign: "left" }}
    >
      {text}
    </Link>
  );
};

const imJahr = <T extends { Abrechnungsmonat: string }>(l: T[], jahr: string) =>
  l.filter((x) => x.Abrechnungsmonat.startsWith(jahr));

const personName = (n: string | null, v: string | null) =>
  [n, v].filter(Boolean).join(", ") || "–";

type Daten = {
  laeufe: OpticaAbrechnung[];
  absetzungen: OpticaAbsetzung[];
  ekv: OpticaEkv[];
  rezepte: Kassenrezept[];
};

const ladeDaten = async (): Promise<Daten> => {
  const [laeufe, absetzungen, ekv, rezepte] = await Promise.all([
    ladeSeitenweise<OpticaAbrechnung>((von, bis) =>
      supabase
        .from("optica_abrechnung")
        .select("*")
        .order("Abrechnungsmonat")
        .range(von, bis),
    ),
    ladeSeitenweise<OpticaAbsetzung>((von, bis) =>
      supabase.from("optica_absetzung").select("*").order("id").range(von, bis),
    ),
    ladeSeitenweise<OpticaEkv>((von, bis) =>
      supabase.from("optica_ekv").select("*").order("id").range(von, bis),
    ),
    ladeSeitenweise<Kassenrezept>((von, bis) =>
      supabase
        .from("kassenrezept")
        .select(
          'id, kunde_id, "Abrechnungsmonat", "Belegnummer", "Nachname", "Vorname", "Brutto", "Leistungen"',
        )
        .order("id")
        .range(von, bis),
    ),
  ]);
  return { laeufe, absetzungen, ekv, rezepte };
};

// ---------------------------------------------------------------------------

const UmsatzVergleich = ({ lauf }: { lauf: OpticaAbrechnung }) => {
  const u = lauf.Umsatzstatistik;
  if (!u) return null;
  const zeilen: [string, UmsatzBlock][] = [
    ["Ihr Betrieb", u.betrieb],
    ["Ø Betriebe Thüringen", u.thueringen],
    ["Ø Bundesgebiet", u.bund],
  ];
  return (
    <Box sx={{ overflowX: "auto" }}>
      <Box component="table" sx={tabelleSx}>
        <thead>
          <tr>
            <th />
            <th className="zahl">Forderung {u.betrieb.monat?.zeitraum}</th>
            <th className="zahl">Rezepte</th>
            <th className="zahl">je Rezept</th>
            <th className="zahl">Forderung {u.betrieb.jahr?.zeitraum}</th>
            <th className="zahl">Rezepte</th>
            <th className="zahl">je Rezept</th>
          </tr>
        </thead>
        <tbody>
          {zeilen.map(([name, b]) => (
            <tr key={name}>
              <td>{name}</td>
              <td className="zahl">
                {b.monat ? formatCurrency(b.monat.forderung) : "–"}
              </td>
              <td className="zahl">{b.monat?.anzahl ?? "–"}</td>
              <td className="zahl">
                {b.monat ? formatCurrency(b.monat.jeRezept) : "–"}
              </td>
              <td className="zahl">
                {b.jahr ? formatCurrency(b.jahr.forderung) : "–"}
              </td>
              <td className="zahl">{b.jahr?.anzahl ?? "–"}</td>
              <td className="zahl">
                {b.jahr ? formatCurrency(b.jahr.jeRezept) : "–"}
              </td>
            </tr>
          ))}
        </tbody>
      </Box>
      <Typography variant="caption" color="text.secondary">
        Aus der Umsatzstatistik von OPTICA (Vormonat der Abrechnung und
        Jahressumme bis dahin).
      </Typography>
    </Box>
  );
};

const AbsetzungTabelle = ({
  liste,
  rezepte,
  onErledigt,
  mitMonat,
}: {
  liste: OpticaAbsetzung[];
  rezepte: Map<number, Kassenrezept>;
  onErledigt: (a: OpticaAbsetzung, wert: boolean) => void;
  mitMonat?: boolean;
}) => (
  <Box sx={{ overflowX: "auto" }}>
    <Box component="table" sx={tabelleSx}>
      <thead>
        <tr>
          {mitMonat && <th>Abrechnung</th>}
          <th>Kostenträger</th>
          <th>Grund</th>
          <th>Rezept</th>
          <th className="zahl">Betrag</th>
          <th>Erledigt</th>
        </tr>
      </thead>
      <tbody>
        {liste.map((a) => {
          const r =
            a.kassenrezept_id != null
              ? rezepte.get(a.kassenrezept_id)
              : undefined;
          return (
            <tr key={a.id}>
              {mitMonat && (
                <td style={{ whiteSpace: "nowrap" }}>
                  {monatName(a.Abrechnungsmonat)}
                </td>
              )}
              <td>{a.Kostentraeger}</td>
              <td style={{ minWidth: 260 }}>
                <Chip
                  size="small"
                  variant="outlined"
                  label={grundKategorie(a.Grund)}
                  sx={{ mr: 1, mb: 0.5 }}
                />
                <Typography variant="body2" component="span">
                  {a.Grund}
                </Typography>
                {a.Notiz && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block" }}
                  >
                    Notiz: {a.Notiz}
                  </Typography>
                )}
              </td>
              <td>
                {r ? (
                  <>
                    <KundeLink
                      id={r.kunde_id}
                      text={personName(r.Nachname, r.Vorname)}
                    />
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block" }}
                    >
                      Beleg {a.Belegnummer} · abgerechnet{" "}
                      {monatName(r.Abrechnungsmonat)}
                    </Typography>
                  </>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    {a.Belegnummer ? `Beleg ${a.Belegnummer}` : "–"}
                    {a.Belegnummer && (
                      <Typography variant="caption" sx={{ display: "block" }}>
                        Rezept nicht in der Kartei (älter)
                      </Typography>
                    )}
                  </Typography>
                )}
              </td>
              <td className="zahl minus">{eur(a.Betrag)}</td>
              <td>
                <Checkbox
                  size="small"
                  checked={a.Erledigt}
                  onChange={(e) => onErledigt(a, e.target.checked)}
                  inputProps={{ "aria-label": "Absetzung erledigt" }}
                />
              </td>
            </tr>
          );
        })}
      </tbody>
    </Box>
  </Box>
);

const EkvTabelle = ({
  liste,
  mitMonat,
}: {
  liste: OpticaEkv[];
  mitMonat?: boolean;
}) => (
  <Box sx={{ overflowX: "auto" }}>
    <Box component="table" sx={tabelleSx}>
      <thead>
        <tr>
          {mitMonat && <th>Abrechnung</th>}
          <th>Kunde</th>
          <th>Kasse</th>
          <th>KV-Nr.</th>
          <th>KV vom</th>
          <th>Genehmigt</th>
          <th>Genehmigungsnr.</th>
          <th className="zahl">Beantragt</th>
          <th className="zahl">Erstattung</th>
          <th className="zahl">Zuzahlung</th>
        </tr>
      </thead>
      <tbody>
        {liste.map((e) => (
          <tr key={e.id}>
            {mitMonat && (
              <td style={{ whiteSpace: "nowrap" }}>
                {monatName(e.Abrechnungsmonat)}
              </td>
            )}
            <td>
              <KundeLink
                id={e.kunde_id}
                text={personName(e.Nachname, e.Vorname)}
              />
              {e.kunde_id == null && (
                <Chip
                  size="small"
                  variant="outlined"
                  label="nicht zugeordnet"
                  sx={{ ml: 1 }}
                />
              )}
            </td>
            <td>{e.Kasse}</td>
            <td>{e.KvNummer}</td>
            <td>{datum(e.KvDatum)}</td>
            <td>
              {datum(e.Genehmigt)}
              {e.Teilgenehmigt && (
                <Chip
                  size="small"
                  color="warning"
                  label="teilweise"
                  sx={{ ml: 1 }}
                />
              )}
            </td>
            <td>{e.Genehmigungsnummer}</td>
            <td className="zahl">{eur(e.Beantragt)}</td>
            <td className="zahl">{eur(e.Erstattung)}</td>
            <td className="zahl">{eur(e.Zuzahlung)}</td>
          </tr>
        ))}
      </tbody>
    </Box>
  </Box>
);

const LaufDetails = ({
  lauf,
  absetzungen,
  ekv,
  rezepte,
  onErledigt,
}: {
  lauf: OpticaAbrechnung;
  absetzungen: OpticaAbsetzung[];
  ekv: OpticaEkv[];
  rezepte: Map<number, Kassenrezept>;
  onErledigt: (a: OpticaAbsetzung, wert: boolean) => void;
}) => (
  <Box sx={{ display: "flex", flexDirection: "column", gap: 2, p: 1.5 }}>
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
        gap: 2,
      }}
    >
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
          Auszahlung
        </Typography>
        <Box component="table" sx={tabelleSx}>
          <tbody>
            <tr>
              <td>Brutto (steuerlich)</td>
              <td className="zahl">{eur(lauf.Brutto)}</td>
            </tr>
            <tr>
              <td>− Zuzahlung/Eigenanteil</td>
              <td className="zahl">{eur(-zahl(lauf.Zuzahlung))}</td>
            </tr>
            <tr>
              <td>
                <b>Forderung an die Kassen</b>
              </td>
              <td className="zahl">
                <b>{eur(lauf.Forderung)}</b>
              </td>
            </tr>
            <tr>
              <td>Ab-/Zusetzungen</td>
              <td className="zahl minus">{eur(lauf.Absetzungen)}</td>
            </tr>
            <tr>
              <td>
                − Gebühren (Rezepte {eur(lauf.GebuehrenRezepte)}, eKV{" "}
                {eur(lauf.GebuehrenEkv)})
              </td>
              <td className="zahl">{eur(-zahl(lauf.Gebuehren))}</td>
            </tr>
            {zahl(lauf.Zahlungen) !== 0 && (
              <tr>
                <td>Zahlungen lfd. Monat</td>
                <td className="zahl">{eur(lauf.Zahlungen)}</td>
              </tr>
            )}
            <tr>
              <td>Auszahlung dieser Monat</td>
              <td className="zahl">{eur(lauf.AuszahlungMonat)}</td>
            </tr>
            <tr>
              <td>Saldo Vormonat (Überzahlung)</td>
              <td className="zahl">{eur(lauf.SaldoVormonat)}</td>
            </tr>
            <tr>
              <td>
                <b>Auszahlung gesamt</b>
              </td>
              <td
                className={`zahl ${zahl(lauf.Auszahlung) < 0 ? "minus" : ""}`}
              >
                <b>{eur(lauf.Auszahlung)}</b>
              </td>
            </tr>
          </tbody>
        </Box>
        {zahl(lauf.Auszahlung) < 0 && (
          <Alert severity="warning" sx={{ mt: 1 }}>
            Überzahlung: OPTICA verrechnet {eur(-zahl(lauf.Auszahlung))} mit der
            nächsten Abrechnung.
          </Alert>
        )}
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mt: 0.5 }}
        >
          Rechnung {lauf.Rechnungsnummer ?? "–"} vom{" "}
          {datum(lauf.Abrechnungsdatum)}
          {lauf.Rechnungsdatum
            ? `, Gebührenrechnung vom ${datum(lauf.Rechnungsdatum)}`
            : ""}
          . Rezepte eingesendet {lauf.RezepteEingesendet ?? "–"}, abgerechnet{" "}
          {lauf.RezepteAbgerechnet ?? "–"}, zurück {lauf.RezepteZurueck ?? "–"}.
        </Typography>
      </Box>
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
          Rechnungen an die Kostenträger
        </Typography>
        {(lauf.Kassenrechnungen ?? []).length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Keine.
          </Typography>
        ) : (
          <Box sx={{ maxHeight: 300, overflowY: "auto" }} tabIndex={0}>
            <Box component="table" sx={tabelleSx}>
              <thead>
                <tr>
                  <th>Kostenträger</th>
                  <th>Rechnung</th>
                  <th className="zahl">Rezepte</th>
                  <th className="zahl">Netto</th>
                </tr>
              </thead>
              <tbody>
                {(lauf.Kassenrechnungen ?? []).map((k) => (
                  <tr key={k.rechnungsnummer}>
                    <td>{k.kostentraeger}</td>
                    <td>{k.rechnungsnummer}</td>
                    <td className="zahl">{k.anzahl}</td>
                    <td className="zahl">{formatCurrency(k.netto)}</td>
                  </tr>
                ))}
              </tbody>
            </Box>
          </Box>
        )}
      </Box>
    </Box>

    {absetzungen.length > 0 && (
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
          Absetzungen ({absetzungen.length})
        </Typography>
        <AbsetzungTabelle
          liste={absetzungen}
          rezepte={rezepte}
          onErledigt={onErledigt}
        />
      </Box>
    )}

    {ekv.length > 0 && (
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
          Kostenvoranschläge (eKV)
        </Typography>
        <EkvTabelle liste={ekv} />
      </Box>
    )}

    {lauf.Umsatzstatistik && (
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
          Umsatzvergleich
        </Typography>
        <UmsatzVergleich lauf={lauf} />
      </Box>
    )}

    <Box>
      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
        Original-Unterlagen
      </Typography>
      {(lauf.Dateien ?? []).length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Keine PDFs abgelegt.
        </Typography>
      ) : (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
          {[...(lauf.Dateien ?? [])]
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((d) => (
              <Tooltip key={d.pfad} title={DOKUMENT_NAME[d.art] ?? ""}>
                <span>
                  <PdfKnopf
                    pfad={d.pfad}
                    name={d.name.replace(/\.pdf$/i, "")}
                  />
                </span>
              </Tooltip>
            ))}
        </Box>
      )}
    </Box>
  </Box>
);

// ---------------------------------------------------------------------------

export const OpticaAbrechnungenSeite = () => {
  const notify = useNotify();
  const [daten, setDaten] = useState<Daten | null>(null);
  const [fehler, setFehler] = useState(false);
  const [jahr, setJahr] = useState("");
  const [offen, setOffen] = useState<number | null>(null);
  const [importOffen, setImportOffen] = useState(false);
  const [nurOffene, setNurOffene] = useState(true);

  const laden = useCallback(async () => {
    try {
      setDaten(await ladeDaten());
      setFehler(false);
    } catch (err) {
      console.error("OPTICA-Abrechnungen konnten nicht geladen werden", err);
      setFehler(true);
      setDaten({ laeufe: [], absetzungen: [], ekv: [], rezepte: [] });
    }
  }, []);

  useEffect(() => {
    void laden();
  }, [laden]);

  const jahre = useMemo(() => jahreDerLaeufe(daten?.laeufe ?? []), [daten]);
  const aktJahr = jahr || jahre[0] || String(dayjs().year());
  const laeufe = useMemo(
    () => imJahr(daten?.laeufe ?? [], aktJahr),
    [daten, aktJahr],
  );
  const absetzungen = useMemo(
    () => imJahr(daten?.absetzungen ?? [], aktJahr),
    [daten, aktJahr],
  );
  const ekv = useMemo(
    () => imJahr(daten?.ekv ?? [], aktJahr),
    [daten, aktJahr],
  );
  const rezepteJahr = useMemo(
    () => imJahr(daten?.rezepte ?? [], aktJahr),
    [daten, aktJahr],
  );
  const rezeptMap = useMemo(
    () => new Map((daten?.rezepte ?? []).map((r) => [r.id, r])),
    [daten],
  );
  const summen = useMemo(() => jahresSummen(laeufe), [laeufe]);
  const nachGrund = useMemo(
    () => absetzungenNachGrund(absetzungen),
    [absetzungen],
  );
  const nachKasse = useMemo(
    () => absetzungenNachKasse(absetzungen),
    [absetzungen],
  );
  const leistungen = useMemo(
    () => leistungenNachPosition(rezepteJahr),
    [rezepteJahr],
  );
  const letzterMitStatistik = useMemo(
    () => [...laeufe].reverse().find((l) => l.Umsatzstatistik),
    [laeufe],
  );
  const offeneAbsetzungen = absetzungen.filter((a) => !a.Erledigt);
  const maxMonat = Math.max(1, ...laeufe.map((l) => zahl(l.Brutto)));

  const setzeErledigt = async (a: OpticaAbsetzung, wert: boolean) => {
    const { error } = await supabase
      .from("optica_absetzung")
      .update({ Erledigt: wert })
      .eq("id", a.id);
    if (error) {
      notify("Konnte nicht gespeichert werden", { type: "error" });
      return;
    }
    setDaten(
      (d) =>
        d && {
          ...d,
          absetzungen: d.absetzungen.map((x) =>
            x.id === a.id ? { ...x, Erledigt: wert } : x,
          ),
        },
    );
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Title title="OPTICA-Abrechnungen" />
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 1.5,
          alignItems: "center",
        }}
      >
        <Typography sx={{ flex: "1 1 auto" }} color="text.secondary">
          Abrechnungen des Abrechnungszentrums OPTICA: Auszahlung, Gebühren,
          Absetzungen und Kostenvoranschläge je Monat.
        </Typography>
        {jahre.length > 1 && (
          <TextField
            select
            size="small"
            label="Jahr"
            value={aktJahr}
            onChange={(e) => setJahr(e.target.value)}
            sx={{ minWidth: 110 }}
          >
            {jahre.map((j) => (
              <MenuItem key={j} value={j}>
                {j}
              </MenuItem>
            ))}
          </TextField>
        )}
        <Button
          variant="contained"
          startIcon={<UploadIcon />}
          onClick={() => setImportOffen(true)}
        >
          Unterlagen einlesen
        </Button>
      </Box>

      <OpticaImportDialog
        offen={importOffen}
        vorhandeneMonate={(daten?.laeufe ?? []).map((l) => l.Abrechnungsmonat)}
        onClose={(geaendert) => {
          setImportOffen(false);
          if (geaendert) void laden();
        }}
      />

      {daten === null ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      ) : fehler ? (
        <Alert severity="error">
          Die OPTICA-Abrechnungen konnten nicht geladen werden.
        </Alert>
      ) : laeufe.length === 0 ? (
        <Alert severity="info">
          Noch keine OPTICA-Abrechnungen eingelesen. Über „Unterlagen einlesen“
          die PDFs eines oder mehrerer Abrechnungsläufe auswählen (z. B. den
          ganzen Ordner „311600532_H 10“).
        </Alert>
      ) : (
        <>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr 1fr",
                md: "repeat(5, minmax(0, 1fr))",
              },
              gap: 1.5,
            }}
          >
            <Kennzahl
              titel={`Rezepte ${aktJahr}`}
              wert={String(summen.rezepte)}
              unter={`${summen.laeufe} Abrechnungen`}
            />
            <Kennzahl
              titel="Forderung an Kassen"
              wert={formatCurrency(summen.forderung)}
              unter={`Brutto ${formatCurrency(summen.brutto)}`}
            />
            <Kennzahl
              titel="Absetzungen"
              wert={formatCurrency(summen.absetzungen)}
              unter={`${prozent(summen.absetzungsquote)} der Forderung`}
            />
            <Kennzahl
              titel="Gebühren OPTICA"
              wert={formatCurrency(summen.gebuehren)}
              unter={`${prozent(summen.gebuehrenquote)} der Forderung`}
            />
            <Kennzahl
              titel="Ausgezahlt"
              wert={formatCurrency(summen.auszahlung)}
              unter="Summe der Monate"
            />
          </Box>

          <Abschnitt titel="Abrechnungsläufe">
            <Box sx={{ overflowX: "auto" }}>
              <Box component="table" sx={tabelleSx}>
                <thead>
                  <tr>
                    <th />
                    <th>Monat</th>
                    <th>Abgerechnet am</th>
                    <th className="zahl">Rezepte</th>
                    <th className="zahl">Brutto</th>
                    <th className="zahl">Absetzungen</th>
                    <th className="zahl">Gebühren</th>
                    <th className="zahl">Saldo Vormonat</th>
                    <th className="zahl">Auszahlung</th>
                    <th>Abgleich Rezepte</th>
                  </tr>
                </thead>
                <tbody>
                  {laeufe.map((l) => {
                    const ab = rezeptAbgleich(l, daten.rezepte);
                    const auf = offen === l.id;
                    const offeneHier = absetzungen.filter(
                      (a) => a.abrechnung_id === l.id && !a.Erledigt,
                    ).length;
                    return (
                      <Fragment key={l.id}>
                        <Box
                          component="tr"
                          onClick={() => setOffen(auf ? null : l.id)}
                          sx={(t) => ({
                            cursor: "pointer",
                            backgroundColor: auf
                              ? tokensFor(t).primarySoft
                              : undefined,
                            "&:hover": { backgroundColor: tokensFor(t).hover },
                          })}
                        >
                          <td>
                            <IconButton
                              size="small"
                              aria-label={
                                auf ? "Details zuklappen" : "Details aufklappen"
                              }
                            >
                              {auf ? (
                                <ZuIcon fontSize="small" />
                              ) : (
                                <AufIcon fontSize="small" />
                              )}
                            </IconButton>
                          </td>
                          <td style={{ whiteSpace: "nowrap" }}>
                            {monatName(l.Abrechnungsmonat)}
                          </td>
                          <td>{datum(l.Abrechnungsdatum)}</td>
                          <td className="zahl">
                            {l.RezepteAbgerechnet ?? "–"}
                          </td>
                          <td className="zahl">{eur(l.Brutto)}</td>
                          <td
                            className={`zahl ${zahl(l.Absetzungen) < 0 ? "minus" : ""}`}
                          >
                            {eur(l.Absetzungen)}
                            {offeneHier > 0 && (
                              <Chip
                                size="small"
                                color="error"
                                variant="outlined"
                                label={`${offeneHier} offen`}
                                sx={{ ml: 1 }}
                              />
                            )}
                          </td>
                          <td className="zahl">{eur(-zahl(l.Gebuehren))}</td>
                          <td
                            className={`zahl ${zahl(l.SaldoVormonat) < 0 ? "minus" : ""}`}
                          >
                            {eur(l.SaldoVormonat)}
                          </td>
                          <td
                            className={`zahl ${zahl(l.Auszahlung) < 0 ? "minus" : ""}`}
                            style={{ fontWeight: 600 }}
                          >
                            {eur(l.Auszahlung)}
                          </td>
                          <td>
                            {ab.passt ? (
                              <Chip
                                size="small"
                                color="success"
                                variant="outlined"
                                label="passt"
                              />
                            ) : (
                              <Tooltip
                                title={`In der App: ${ab.anzahl} Rezepte, ${formatCurrency(ab.brutto)}. Laut OPTICA: ${l.RezepteAbgerechnet ?? "?"} Rezepte, ${eur(l.Brutto)}.`}
                              >
                                <Chip
                                  size="small"
                                  color="warning"
                                  label={
                                    ab.differenz === 0
                                      ? "Anzahl prüfen"
                                      : `Differenz ${formatCurrency(ab.differenz)}`
                                  }
                                />
                              </Tooltip>
                            )}
                          </td>
                        </Box>
                        <tr>
                          <td
                            colSpan={10}
                            style={{
                              padding: 0,
                              borderBottom: auf ? undefined : "none",
                            }}
                          >
                            <Collapse in={auf} unmountOnExit>
                              <LaufDetails
                                lauf={l}
                                absetzungen={absetzungen.filter(
                                  (a) => a.abrechnung_id === l.id,
                                )}
                                ekv={ekv.filter(
                                  (e) => e.abrechnung_id === l.id,
                                )}
                                rezepte={rezeptMap}
                                onErledigt={setzeErledigt}
                              />
                            </Collapse>
                          </td>
                        </tr>
                      </Fragment>
                    );
                  })}
                  <Box component="tr" sx={{ fontWeight: 700 }}>
                    <td />
                    <td>Gesamt {aktJahr}</td>
                    <td />
                    <td className="zahl">{summen.rezepte}</td>
                    <td className="zahl">{formatCurrency(summen.brutto)}</td>
                    <td className="zahl minus">
                      {formatCurrency(-summen.absetzungen)}
                    </td>
                    <td className="zahl">
                      {formatCurrency(-summen.gebuehren)}
                    </td>
                    <td />
                    <td className="zahl">
                      {formatCurrency(summen.auszahlung)}
                    </td>
                    <td />
                  </Box>
                </tbody>
              </Box>
            </Box>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mt: 0.5 }}
            >
              Ein Klick auf einen Monat zeigt Auszahlung, Kassenrechnungen,
              Absetzungen, Kostenvoranschläge und die Original-PDFs.
              „Ausgezahlt“ oben ist die Summe der Monatsbeträge ohne Verrechnung
              von Überzahlungen.
            </Typography>
          </Abschnitt>

          <Abschnitt
            titel={`Absetzungen ${aktJahr} (${nurOffene ? `${offeneAbsetzungen.length} offen` : absetzungen.length})`}
            rechts={
              <FormControlLabel
                control={
                  <Switch
                    checked={nurOffene}
                    onChange={(e) => setNurOffene(e.target.checked)}
                  />
                }
                label="Nur offene"
              />
            }
          >
            {absetzungen.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Keine Absetzungen.
              </Typography>
            ) : (
              <>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                    gap: 2,
                    mb: 2,
                  }}
                >
                  {[
                    ["Nach Grund", nachGrund],
                    ["Nach Kostenträger", nachKasse],
                  ].map(([titel, gruppen]) => (
                    <Box key={titel as string}>
                      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                        {titel as string}
                      </Typography>
                      <Box component="table" sx={tabelleSx}>
                        <tbody>
                          {(gruppen as typeof nachGrund).map((g) => (
                            <tr key={g.name}>
                              <td>{g.name}</td>
                              <td className="zahl">{g.anzahl}×</td>
                              <td style={{ width: "30%" }}>
                                <Balken
                                  anteil={
                                    g.betrag / Math.max(1, summen.absetzungen)
                                  }
                                  farbe="error.light"
                                />
                              </td>
                              <td className="zahl">
                                {formatCurrency(g.betrag)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Box>
                    </Box>
                  ))}
                </Box>
                {(nurOffene ? offeneAbsetzungen : absetzungen).length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    Alle Absetzungen sind erledigt.
                  </Typography>
                ) : (
                  <Box sx={{ maxHeight: 520, overflowY: "auto" }} tabIndex={0}>
                    <AbsetzungTabelle
                      liste={nurOffene ? offeneAbsetzungen : absetzungen}
                      rezepte={rezeptMap}
                      onErledigt={setzeErledigt}
                      mitMonat
                    />
                  </Box>
                )}
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mt: 0.5 }}
                >
                  „Erledigt“ ankreuzen, wenn eine Absetzung bearbeitet ist (z.
                  B. Widerspruch eingelegt, neu eingereicht oder abgeschrieben).
                </Typography>
              </>
            )}
          </Abschnitt>

          <Abschnitt titel={`Kostenvoranschläge (eKV) ${aktJahr}`}>
            {ekv.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Keine Kostenvoranschläge.
              </Typography>
            ) : (
              <EkvTabelle liste={ekv} mitMonat />
            )}
          </Abschnitt>

          <Abschnitt titel={`Statistik ${aktJahr}`}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
                gap: 3,
              }}
            >
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  Monatsverlauf
                </Typography>
                <Box component="table" sx={tabelleSx}>
                  <thead>
                    <tr>
                      <th>Monat</th>
                      <th style={{ width: "45%" }}>Brutto / Auszahlung</th>
                      <th className="zahl">Abs.-Quote</th>
                      <th className="zahl">Geb.-Quote</th>
                    </tr>
                  </thead>
                  <tbody>
                    {laeufe.map((l) => {
                      const f = zahl(l.Forderung);
                      return (
                        <tr key={l.id}>
                          <td style={{ whiteSpace: "nowrap" }}>
                            {monatName(l.Abrechnungsmonat)}
                          </td>
                          <td>
                            <Tooltip
                              title={`Brutto ${eur(l.Brutto)}, Auszahlung ${eur(l.AuszahlungMonat)}`}
                            >
                              <Box
                                sx={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: 0.5,
                                }}
                              >
                                <Balken
                                  anteil={zahl(l.Brutto) / maxMonat}
                                  farbe="primary.light"
                                />
                                <Balken
                                  anteil={
                                    Math.max(0, zahl(l.AuszahlungMonat)) /
                                    maxMonat
                                  }
                                  farbe="success.light"
                                />
                              </Box>
                            </Tooltip>
                          </td>
                          <td className="zahl">
                            {f > 0
                              ? prozent((-zahl(l.Absetzungen) / f) * 100)
                              : "–"}
                          </td>
                          <td className="zahl">
                            {f > 0
                              ? prozent((zahl(l.Gebuehren) / f) * 100)
                              : "–"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  Oberer Balken Brutto, unterer Balken Auszahlung des Monats.
                  Quoten bezogen auf die Forderung an die Kassen.
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  Leistungen nach Position
                </Typography>
                <Box sx={{ maxHeight: 360, overflowY: "auto" }} tabIndex={0}>
                  <Box component="table" sx={tabelleSx}>
                    <thead>
                      <tr>
                        <th>Position</th>
                        <th>Leistung</th>
                        <th className="zahl">Anzahl</th>
                        <th className="zahl">Brutto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leistungen.map((p) => (
                        <tr key={p.pzn || p.text}>
                          <td>{p.pzn}</td>
                          <td>{p.text}</td>
                          <td className="zahl">{p.anzahl}</td>
                          <td className="zahl">{formatCurrency(p.brutto)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Box>
                </Box>
              </Box>
            </Box>
            {letzterMitStatistik && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  Vergleich mit anderen Betrieben (Abrechnung{" "}
                  {monatName(letzterMitStatistik.Abrechnungsmonat)})
                </Typography>
                <UmsatzVergleich lauf={letzterMitStatistik} />
              </Box>
            )}
          </Abschnitt>
        </>
      )}
    </Box>
  );
};

export default OpticaAbrechnungenSeite;
