// Auftragsverfolgung (Gehe zu → Auftragsverfolgung): alle Brillenaufträge
// nach Bearbeitungsstand, überfällige Fertigstellung und Abholung, nächste
// Kontaktlinsen-Kontakte. Mehrere Aufträge auf einmal als bestellt, fertig
// oder abgeholt markieren; per Handscanner die Auftrags-Nr. vom
// Auftragszettel einlesen.
import { KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import { Title, useDataProvider, useNotify } from "react-admin";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import dayjs from "dayjs";
import {
  ANSICHTEN,
  Ansicht,
  FRISTEN_VORGABE,
  Fristen,
  PHASEN,
  SCAN_AKTIONEN,
  ScanAktion,
  ansichtFilter,
  ansichtSortierung,
  auftragsNummer,
  auftragsPhase,
  tageSeit,
} from "./auftragsverfolgung";
import { istFertigungsauftrag } from "./aufgabenRegeln";
import { glaeserStatusSetzen, heuteIso } from "./AuftragsstatusLeiste";
import { formatCurrency } from "./CurrencyField";
import { druckeDirekt } from "./direktDruck";

type Datensatz = Record<string, unknown> & { id: number | string };

const MAX = 500;

const datum = (wert: unknown) =>
  wert ? dayjs(String(wert)).format("DD.MM.YY") : "";

const kundeName = (k?: Datensatz) =>
  k
    ? [k.Nachname, k.Vorname].filter(Boolean).join(", ") || `Kunde ${k.id}`
    : "";

const SCHRITT_NAME: Record<string, string> = {
  Bestellt: "bestellt",
  Fertig: "fertig",
  Abholung: "abgeholt",
};

const escape = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

export const AuftragsverfolgungSeite = () => {
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const navigate = useNavigate();

  const [ansicht, setAnsicht] = useState<Ansicht>("offen");
  const [von, setVon] = useState(
    dayjs().subtract(12, "month").format("YYYY-MM-DD"),
  );
  const [bis, setBis] = useState("");
  const [fristen, setFristen] = useState<Fristen>(FRISTEN_VORGABE);
  const [zeilen, setZeilen] = useState<Datensatz[] | null>(null);
  const [kunden, setKunden] = useState<Map<string, Datensatz>>(new Map());
  const [fehler, setFehler] = useState<string | null>(null);
  const [auswahl, setAuswahl] = useState<Set<string>>(new Set());
  const [laeuft, setLaeuft] = useState(false);
  const [stand, setStand] = useState(0);

  const [scan, setScan] = useState("");
  const [scanAktion, setScanAktion] = useState<ScanAktion>("Fertig");
  const [gescannt, setGescannt] = useState<string[]>([]);
  const scanFeld = useRef<HTMLInputElement>(null);

  const istCl = ansicht === "clKontakte";
  const definition = ANSICHTEN.find((a) => a.id === ansicht)!;

  useEffect(() => {
    let abgebrochen = false;
    setZeilen(null);
    setFehler(null);
    setAuswahl(new Set());
    const { resource, filter } = ansichtFilter(ansicht, fristen, { von, bis });
    dataProvider
      .getList(resource, {
        pagination: { page: 1, perPage: MAX },
        sort: ansichtSortierung(ansicht),
        filter,
      })
      .then(async ({ data }) => {
        const liste = (data as Datensatz[]).filter(
          (d) => resource !== "brille" || istFertigungsauftrag(d.BrillenArt),
        );
        const ids = [
          ...new Set(liste.map((d) => d.kunde_id).filter((i) => i != null)),
        ] as (number | string)[];
        const k =
          ids.length > 0
            ? ((await dataProvider.getMany("kunde", { ids }))
                .data as Datensatz[])
            : [];
        if (abgebrochen) return;
        setKunden(new Map(k.map((x) => [String(x.id), x])));
        setZeilen(liste);
      })
      .catch((err: unknown) => {
        if (!abgebrochen)
          setFehler(err instanceof Error ? err.message : String(err));
      });
    return () => {
      abgebrochen = true;
    };
  }, [dataProvider, ansicht, fristen, von, bis, stand]);

  const neuLaden = () => setStand((s) => s + 1);

  // setzt ein Datum (heute) nur, wo es noch fehlt; zieht den Glasstatus mit
  const schrittSetzen = useCallback(
    async (brille: Datensatz, feld: "Bestellt" | "Fertig" | "Abholung") => {
      if (brille[feld]) return false;
      const glas = SCAN_AKTIONEN.find((a) => a.id === feld)?.glas;
      if (glas) await glaeserStatusSetzen(dataProvider, brille, glas);
      await dataProvider.update("brille", {
        id: brille.id,
        data: { [feld]: heuteIso() },
        previousData: brille,
      });
      return true;
    },
    [dataProvider],
  );

  const auswahlSetzen = async (feld: "Bestellt" | "Fertig" | "Abholung") => {
    const brillen = (zeilen ?? []).filter((z) => auswahl.has(String(z.id)));
    setLaeuft(true);
    let gesetzt = 0;
    let fehlgeschlagen = 0;
    for (const b of brillen) {
      try {
        if (await schrittSetzen(b, feld)) gesetzt++;
      } catch {
        fehlgeschlagen++;
      }
    }
    setLaeuft(false);
    notify(
      `${gesetzt} Auftrag/Aufträge als ${SCHRITT_NAME[feld]} markiert` +
        (brillen.length - gesetzt - fehlgeschlagen > 0
          ? `, ${brillen.length - gesetzt - fehlgeschlagen} waren es schon`
          : "") +
        (fehlgeschlagen ? `, ${fehlgeschlagen} fehlgeschlagen` : "") +
        ".",
      { type: fehlgeschlagen ? "warning" : "success" },
    );
    neuLaden();
  };

  const scannen = async () => {
    const nummer = auftragsNummer(scan);
    setScan("");
    if (!nummer) {
      notify("Keine Auftrags-Nr. erkannt.", { type: "warning" });
      return;
    }
    if (scanAktion === "oeffnen") {
      navigate(`/brille/${nummer}/show`);
      return;
    }
    try {
      const { data } = await dataProvider.getOne("brille", { id: nummer });
      const brille = data as Datensatz;
      const k =
        brille.kunde_id != null
          ? ((
              await dataProvider.getOne("kunde", {
                id: brille.kunde_id as number,
              })
            ).data as Datensatz)
          : undefined;
      const neu = await schrittSetzen(brille, scanAktion);
      const text = `Auftrag ${nummer}${k ? ` (${kundeName(k)})` : ""}: ${
        neu
          ? `als ${SCHRITT_NAME[scanAktion]} markiert`
          : `war schon ${SCHRITT_NAME[scanAktion]}`
      }`;
      setGescannt((g) => [text, ...g].slice(0, 8));
      notify(text, { type: neu ? "success" : "info" });
      neuLaden();
    } catch {
      notify(`Auftrag ${nummer} nicht gefunden.`, { type: "error" });
    } finally {
      scanFeld.current?.focus();
    }
  };

  const listeDrucken = () => {
    const kopf = istCl
      ? ["Nachkontrolle", "Kunde", "Telefon", "Linsenart", "Auftrag vom"]
      : [
          "Nr.",
          "Datum",
          "Kunde",
          "Telefon",
          "Art",
          "Stand",
          "Bestellt",
          "Fertig",
        ];
    const sichtbar = (zeilen ?? []).filter(
      (z) => auswahl.size === 0 || auswahl.has(String(z.id)),
    );
    const reihen = sichtbar.map((z) => {
      const k = kunden.get(String(z.kunde_id));
      const tel = k?.Handy ?? k?.TelefonnummerPrivat ?? "";
      return istCl
        ? [
            datum(z.Nachkontrolltermin),
            kundeName(k),
            tel,
            z.Linsenart,
            datum(z.Datum),
          ]
        : [
            z.id,
            datum(z.Datum),
            kundeName(k),
            tel,
            z.BrillenArt,
            PHASEN[auftragsPhase(z)].name,
            datum(z.Bestellt),
            datum(z.Fertig),
          ];
    });
    druckeDirekt(`<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Auftragsverfolgung</title><style>
      @page { size: A4; margin: 12mm; }
      body { font: 9pt system-ui, sans-serif; color: #111; }
      h1 { font-size: 13pt; margin: 0 0 1mm; }
      p { margin: 0 0 4mm; color: #555; }
      table { width: 100%; border-collapse: collapse; }
      th, td { text-align: left; padding: 1.2mm 1.5mm; border-bottom: 0.2mm solid #ccc; }
      th { border-bottom: 0.4mm solid #111; }
    </style></head><body>
      <h1>${escape(definition.name)}</h1>
      <p>${escape(definition.hinweis(fristen))} · Stand ${dayjs().format("DD.MM.YYYY HH:mm")} · ${reihen.length} Einträge</p>
      <table><thead><tr>${kopf.map((h) => `<th>${escape(h)}</th>`).join("")}</tr></thead>
      <tbody>${reihen.map((r) => `<tr>${r.map((c) => `<td>${escape(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>
    </body></html>`);
  };

  const alle = zeilen ?? [];
  const alleGewaehlt = alle.length > 0 && auswahl.size === alle.length;

  const frist = (feld: keyof Fristen, label: string) => (
    <TextField
      size="small"
      type="number"
      label={label}
      value={fristen[feld]}
      onChange={(e) => {
        const n = Math.max(0, Math.min(365, Number(e.target.value) || 0));
        setFristen((f) => ({ ...f, [feld]: n }));
      }}
      sx={{ width: 150 }}
    />
  );

  return (
    <Card sx={{ mt: 2 }}>
      <Title title="Auftragsverfolgung" />
      <CardContent sx={{ display: "grid", gap: 2 }}>
        <Typography variant="h6">Auftragsverfolgung</Typography>

        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
          <TextField
            select
            size="small"
            label="Ansicht"
            value={ansicht}
            onChange={(e) => setAnsicht(e.target.value as Ansicht)}
            sx={{ minWidth: 280 }}
          >
            {ANSICHTEN.map((a) => (
              <MenuItem key={a.id} value={a.id}>
                {a.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            type="date"
            label={istCl ? "Nachkontrolle ab" : "Auftrag ab"}
            value={von}
            onChange={(e) => setVon(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          {!istCl && (
            <TextField
              size="small"
              type="date"
              label="Auftrag bis"
              value={bis}
              onChange={(e) => setBis(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          )}
          {ansicht === "ueberfaelligFertigung" &&
            frist("fertigungTage", "Tage bis überfällig")}
          {ansicht === "ueberfaelligAbholung" &&
            frist("abholungTage", "Tage bis überfällig")}
          {istCl && frist("clVorausTage", "Tage voraus")}
        </Box>

        <Box
          sx={{
            display: "flex",
            gap: 1.5,
            flexWrap: "wrap",
            alignItems: "center",
            p: 1.5,
            borderRadius: 2,
            bgcolor: "action.hover",
          }}
        >
          <QrCodeScannerIcon color="action" />
          <TextField
            inputRef={scanFeld}
            size="small"
            label="Auftrags-Nr. scannen oder eintippen"
            value={scan}
            onChange={(e) => setScan(e.target.value)}
            onKeyDown={(e: KeyboardEvent) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void scannen();
              }
            }}
            sx={{ minWidth: 260 }}
          />
          <TextField
            select
            size="small"
            label="Beim Scannen"
            value={scanAktion}
            onChange={(e) => setScanAktion(e.target.value as ScanAktion)}
            sx={{ minWidth: 220 }}
          >
            {SCAN_AKTIONEN.map((a) => (
              <MenuItem key={a.id} value={a.id}>
                {a.name}
              </MenuItem>
            ))}
          </TextField>
          {gescannt.length > 0 && (
            <Box sx={{ flexBasis: "100%", fontSize: 13 }}>
              {gescannt.map((g, i) => (
                <Typography key={`${i}-${g}`} variant="body2">
                  {g}
                </Typography>
              ))}
            </Box>
          )}
        </Box>

        <Box
          sx={{
            display: "flex",
            gap: 1,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
            {definition.hinweis(fristen)}
            {zeilen &&
              ` · ${zeilen.length}${zeilen.length >= MAX ? "+" : ""} Einträge`}
            {auswahl.size > 0 && ` · ${auswahl.size} ausgewählt`}
          </Typography>
          {!istCl && (
            <>
              <Button
                size="small"
                variant="outlined"
                disabled={auswahl.size === 0 || laeuft}
                onClick={() => void auswahlSetzen("Bestellt")}
              >
                Bestellt
              </Button>
              <Button
                size="small"
                variant="outlined"
                disabled={auswahl.size === 0 || laeuft}
                onClick={() => void auswahlSetzen("Fertig")}
              >
                Fertig
              </Button>
              <Button
                size="small"
                variant="outlined"
                disabled={auswahl.size === 0 || laeuft}
                onClick={() => void auswahlSetzen("Abholung")}
              >
                Abgeholt
              </Button>
            </>
          )}
          <Button
            size="small"
            startIcon={<PrintIcon />}
            disabled={!zeilen || zeilen.length === 0}
            onClick={listeDrucken}
          >
            {auswahl.size > 0 ? "Auswahl drucken" : "Liste drucken"}
          </Button>
        </Box>

        {fehler && <Alert severity="error">{fehler}</Alert>}
        {!zeilen && !fehler && <CircularProgress size={24} />}
        {zeilen && zeilen.length === 0 && (
          <Typography color="text.secondary">Keine Einträge.</Typography>
        )}
        {zeilen && zeilen.length > 0 && (
          <Box sx={{ overflowX: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      size="small"
                      checked={alleGewaehlt}
                      indeterminate={auswahl.size > 0 && !alleGewaehlt}
                      onChange={() =>
                        setAuswahl(
                          alleGewaehlt
                            ? new Set()
                            : new Set(alle.map((z) => String(z.id))),
                        )
                      }
                      inputProps={{ "aria-label": "Alle auswählen" }}
                    />
                  </TableCell>
                  {istCl ? (
                    <>
                      <TableCell>Nachkontrolle</TableCell>
                      <TableCell>Kunde</TableCell>
                      <TableCell>Linsenart</TableCell>
                      <TableCell>Auftrag vom</TableCell>
                      <TableCell>Abgeholt</TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell>Stand</TableCell>
                      <TableCell>Nr.</TableCell>
                      <TableCell>Datum</TableCell>
                      <TableCell>Kunde</TableCell>
                      <TableCell>Art</TableCell>
                      <TableCell>Bestellt</TableCell>
                      <TableCell>Fertig</TableCell>
                      <TableCell>Abgeholt</TableCell>
                      <TableCell align="right">Betrag</TableCell>
                    </>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {zeilen.map((z) => {
                  const id = String(z.id);
                  const k = kunden.get(String(z.kunde_id));
                  const ziel = istCl
                    ? `/kontaktlinse/${id}/show`
                    : `/brille/${id}/show`;
                  const auswahlZelle = (
                    <TableCell
                      padding="checkbox"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        size="small"
                        checked={auswahl.has(id)}
                        onChange={() =>
                          setAuswahl((a) => {
                            const n = new Set(a);
                            if (n.has(id)) n.delete(id);
                            else n.add(id);
                            return n;
                          })
                        }
                        inputProps={{ "aria-label": `Auftrag ${id} auswählen` }}
                      />
                    </TableCell>
                  );
                  if (istCl) {
                    const tage = tageSeit(z.Nachkontrolltermin);
                    return (
                      <TableRow
                        key={id}
                        hover
                        onClick={() => navigate(ziel)}
                        sx={{ cursor: "pointer" }}
                      >
                        {auswahlZelle}
                        <TableCell
                          sx={{
                            color:
                              tage != null && tage > 0
                                ? "error.main"
                                : undefined,
                            fontWeight: 600,
                          }}
                        >
                          {datum(z.Nachkontrolltermin)}
                          {tage != null && tage > 0 && ` (seit ${tage} T.)`}
                        </TableCell>
                        <TableCell>{kundeName(k)}</TableCell>
                        <TableCell>{String(z.Linsenart ?? "")}</TableCell>
                        <TableCell>{datum(z.Datum)}</TableCell>
                        <TableCell>{datum(z.Abholung)}</TableCell>
                      </TableRow>
                    );
                  }
                  const phase = auftragsPhase(z);
                  const seitAuftrag = tageSeit(z.Datum);
                  const seitFertig = tageSeit(z.Fertig);
                  const zuSpaet =
                    (phase === "offen" || phase === "bestellt") &&
                    seitAuftrag != null &&
                    seitAuftrag > fristen.fertigungTage
                      ? `${seitAuftrag} T. seit Auftrag`
                      : phase === "fertig" &&
                          seitFertig != null &&
                          seitFertig > fristen.abholungTage
                        ? `${seitFertig} T. seit fertig`
                        : "";
                  return (
                    <TableRow
                      key={id}
                      hover
                      onClick={() => navigate(ziel)}
                      sx={{ cursor: "pointer" }}
                    >
                      {auswahlZelle}
                      <TableCell>
                        <Chip
                          size="small"
                          variant="outlined"
                          color={PHASEN[phase].farbe}
                          label={PHASEN[phase].name}
                        />
                        {zuSpaet && (
                          <Typography
                            variant="caption"
                            color="error"
                            sx={{ display: "block" }}
                          >
                            {zuSpaet}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{id}</TableCell>
                      <TableCell>{datum(z.Datum)}</TableCell>
                      <TableCell>{kundeName(k)}</TableCell>
                      <TableCell>{String(z.BrillenArt ?? "")}</TableCell>
                      <TableCell>{datum(z.Bestellt)}</TableCell>
                      <TableCell>{datum(z.Fertig)}</TableCell>
                      <TableCell>{datum(z.Abholung)}</TableCell>
                      <TableCell align="right">
                        {z.Summe != null ? formatCurrency(Number(z.Summe)) : ""}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};
