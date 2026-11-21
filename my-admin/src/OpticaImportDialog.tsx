// OPTICA-Unterlagen einlesen: PDFs oder ganze Ordner auswählen, die App liest
// sie aus und zeigt je Abrechnungsmonat eine Vorschau. Nach "Übernehmen"
// werden Lauf, Absetzungen, Kostenvoranschläge und neue Rezepte gespeichert
// und die PDFs abgelegt.
import { useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Typography,
} from "@mui/material";
import FolderIcon from "@mui/icons-material/FolderOpenOutlined";
import FileIcon from "@mui/icons-material/UploadFileOutlined";
import { formatCurrency } from "./CurrencyField";
import { monatName } from "./kassenrezept";
import {
  type GeleseneUnterlagen,
  type SpeicherErgebnis,
  ladeKundenFuerAbgleich,
  liesUnterlagen,
  speichereLauf,
} from "./opticaImport";
import { tabelleSx } from "./opticaStil";

type Schritt = "auswahl" | "lesen" | "vorschau" | "speichern" | "fertig";

export const OpticaImportDialog = ({
  offen,
  vorhandeneMonate,
  onClose,
}: {
  offen: boolean;
  vorhandeneMonate: string[];
  onClose: (geaendert: boolean) => void;
}) => {
  const [schritt, setSchritt] = useState<Schritt>("auswahl");
  const [fortschritt, setFortschritt] = useState(0);
  const [gelesen, setGelesen] = useState<GeleseneUnterlagen | null>(null);
  const [auswahl, setAuswahl] = useState<Set<string>>(new Set());
  const [ergebnisse, setErgebnisse] = useState<SpeicherErgebnis[]>([]);
  const [fehler, setFehler] = useState<string | null>(null);
  const dateiInput = useRef<HTMLInputElement>(null);
  const ordnerInput = useRef<HTMLInputElement>(null);

  const zuruecksetzen = () => {
    setSchritt("auswahl");
    setFortschritt(0);
    setGelesen(null);
    setAuswahl(new Set());
    setErgebnisse([]);
    setFehler(null);
  };

  const schliessen = () => {
    const geaendert = ergebnisse.length > 0;
    zuruecksetzen();
    onClose(geaendert);
  };

  const lesen = async (liste: FileList | null) => {
    if (!liste?.length) return;
    setSchritt("lesen");
    setFehler(null);
    try {
      const g = await liesUnterlagen([...liste], (f, n) =>
        setFortschritt(f / n),
      );
      setGelesen(g);
      setAuswahl(new Set(g.laeufe.map((l) => l.monat)));
      setSchritt("vorschau");
    } catch (err) {
      console.error(err);
      setFehler("Die Dateien konnten nicht gelesen werden.");
      setSchritt("auswahl");
    }
  };

  const uebernehmen = async () => {
    if (!gelesen) return;
    setSchritt("speichern");
    setFortschritt(0);
    setFehler(null);
    const laeufe = gelesen.laeufe.filter((l) => auswahl.has(l.monat));
    const fertig: SpeicherErgebnis[] = [];
    try {
      const kunden = await ladeKundenFuerAbgleich();
      for (const [i, lauf] of laeufe.entries()) {
        fertig.push(
          await speichereLauf(
            lauf,
            gelesen.dateien.get(lauf.monat) ?? [],
            kunden,
          ),
        );
        setErgebnisse([...fertig]);
        setFortschritt((i + 1) / laeufe.length);
      }
      setSchritt("fertig");
    } catch (err) {
      console.error(err);
      const text =
        err instanceof Error
          ? err.message
          : (err as { message?: string })?.message;
      setFehler(
        `Beim Speichern ist ein Fehler aufgetreten${text ? ` (${text})` : ""}. ` +
          `${fertig.length} von ${laeufe.length} Abrechnungen wurden übernommen; ` +
          "erneutes Einlesen ist ohne Doppelte möglich.",
      );
      setSchritt("fertig");
    }
  };

  const umschalten = (monat: string) =>
    setAuswahl((a) => {
      const n = new Set(a);
      if (n.has(monat)) n.delete(monat);
      else n.add(monat);
      return n;
    });

  return (
    <Dialog
      open={offen}
      onClose={
        schritt === "speichern" || schritt === "lesen" ? undefined : schliessen
      }
      maxWidth="lg"
      fullWidth
    >
      <DialogTitle>OPTICA-Unterlagen einlesen</DialogTitle>
      <DialogContent dividers>
        {fehler && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {fehler}
          </Alert>
        )}

        {schritt === "auswahl" && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Typography>
              Wählen Sie die PDFs einer oder mehrerer OPTICA-Abrechnungen aus –
              am einfachsten den ganzen Ordner (z. B. „311600532_H 10“ oder den
              Ordner „OPTICA ABRECHNUNG“ mit allen Monaten). Die App erkennt
              Monat und Art jedes PDFs selbst. Bereits eingelesene Monate werden
              aktualisiert, Rezepte nicht doppelt angelegt.
            </Typography>
            <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
              <Button
                variant="contained"
                startIcon={<FolderIcon />}
                onClick={() => ordnerInput.current?.click()}
              >
                Ordner auswählen
              </Button>
              <Button
                variant="outlined"
                startIcon={<FileIcon />}
                onClick={() => dateiInput.current?.click()}
              >
                Einzelne PDFs auswählen
              </Button>
            </Box>
            <input
              ref={dateiInput}
              type="file"
              accept="application/pdf"
              multiple
              hidden
              onChange={(e) => {
                void lesen(e.target.files);
                e.target.value = "";
              }}
            />
            <input
              ref={ordnerInput}
              type="file"
              multiple
              hidden
              // Ordnerauswahl (Chrome, Edge, Safari, Firefox)
              {...({ webkitdirectory: "", directory: "" } as Record<
                string,
                string
              >)}
              onChange={(e) => {
                void lesen(e.target.files);
                e.target.value = "";
              }}
            />
          </Box>
        )}

        {(schritt === "lesen" || schritt === "speichern") && (
          <Box sx={{ py: 2 }}>
            <Typography sx={{ mb: 1 }}>
              {schritt === "lesen"
                ? "PDFs werden gelesen …"
                : "Abrechnungen werden gespeichert …"}
            </Typography>
            <LinearProgress variant="determinate" value={fortschritt * 100} />
          </Box>
        )}

        {schritt === "vorschau" && gelesen && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {gelesen.laeufe.length === 0 ? (
              <Alert
                severity="warning"
                sx={{ display: gelesen.fehler.length ? "none" : undefined }}
              >
                In den ausgewählten Dateien wurde keine OPTICA-Abrechnung
                erkannt.
              </Alert>
            ) : (
              <Box sx={{ overflowX: "auto" }}>
                <Box component="table" sx={tabelleSx}>
                  <thead>
                    <tr>
                      <th />
                      <th>Monat</th>
                      <th className="zahl">PDFs</th>
                      <th className="zahl">Rezepte</th>
                      <th className="zahl">Brutto</th>
                      <th className="zahl">Absetzungen</th>
                      <th className="zahl">Gebühren</th>
                      <th className="zahl">Auszahlung</th>
                      <th className="zahl">eKV</th>
                      <th>Hinweise</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gelesen.laeufe.map((l) => (
                      <tr key={l.monat}>
                        <td>
                          <Checkbox
                            size="small"
                            checked={auswahl.has(l.monat)}
                            onChange={() => umschalten(l.monat)}
                            inputProps={{
                              "aria-label": `${monatName(l.monat)} übernehmen`,
                            }}
                          />
                        </td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          {monatName(l.monat)}
                          {vorhandeneMonate.includes(l.monat) && (
                            <Chip
                              size="small"
                              variant="outlined"
                              label="aktualisieren"
                              sx={{ ml: 1 }}
                            />
                          )}
                        </td>
                        <td className="zahl">
                          {gelesen.dateien.get(l.monat)?.length ?? 0}
                        </td>
                        <td className="zahl">
                          {l.rezepte.length ||
                            (l.konto?.rezepteAbgerechnet ?? "–")}
                        </td>
                        <td className="zahl">
                          {l.nachweis ? formatCurrency(l.nachweis.brutto) : "–"}
                        </td>
                        <td className="zahl">
                          {l.nachweis
                            ? formatCurrency(l.nachweis.absetzungen)
                            : "–"}
                          {l.konto?.absetzungen.length
                            ? ` (${l.konto.absetzungen.length})`
                            : ""}
                        </td>
                        <td className="zahl">
                          {l.nachweis
                            ? formatCurrency(-l.nachweis.gebuehren)
                            : "–"}
                        </td>
                        <td className="zahl">
                          {l.nachweis
                            ? formatCurrency(l.nachweis.auszahlung)
                            : "–"}
                        </td>
                        <td className="zahl">{l.ekv.length}</td>
                        <td>
                          {l.hinweise.length === 0 ? (
                            <Chip
                              size="small"
                              color="success"
                              variant="outlined"
                              label="vollständig"
                            />
                          ) : (
                            l.hinweise.map((h) => (
                              <Typography
                                key={h}
                                variant="caption"
                                color="warning.main"
                                sx={{ display: "block" }}
                              >
                                {h}
                              </Typography>
                            ))
                          )}
                          {l.rezepte.length === 0 &&
                            (l.konto?.rezepteAbgerechnet ?? 0) > 0 && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ display: "block" }}
                              >
                                Ohne Rezeptübersicht: Rezepte werden nicht
                                übernommen.
                              </Typography>
                            )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Box>
              </Box>
            )}
            {gelesen.fehler.length > 0 && (
              <Alert
                severity="error"
                action={
                  <Button
                    color="inherit"
                    size="small"
                    onClick={() => window.location.reload()}
                  >
                    Seite neu laden
                  </Button>
                }
              >
                {gelesen.fehler.length} PDF
                {gelesen.fehler.length === 1 ? " konnte" : "s konnten"} nicht
                gelesen werden. Meist hilft es, die Seite neu zu laden (z. B.
                nach einem Update der App) und die Dateien noch einmal
                auszuwählen.
                <Typography
                  variant="caption"
                  sx={{ display: "block", mt: 0.5 }}
                >
                  {gelesen.fehler
                    .map((f) => `${f.name} (${f.grund})`)
                    .join(", ")}
                </Typography>
              </Alert>
            )}
            {gelesen.uebersprungen.length > 0 && (
              <Typography variant="caption" color="text.secondary">
                Keine OPTICA-Unterlage, übersprungen:{" "}
                {gelesen.uebersprungen.join(", ")}
              </Typography>
            )}
          </Box>
        )}

        {schritt === "fertig" && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {ergebnisse.length > 0 && (
              <Alert severity="success">
                {ergebnisse.length} Abrechnung
                {ergebnisse.length === 1 ? "" : "en"} übernommen.
              </Alert>
            )}
            <Box component="table" sx={tabelleSx}>
              <thead>
                <tr>
                  <th>Monat</th>
                  <th className="zahl">Neue Rezepte</th>
                  <th className="zahl">davon Kunde zugeordnet</th>
                  <th className="zahl">schon vorhanden</th>
                  <th className="zahl">Absetzungen</th>
                  <th className="zahl">eKV</th>
                  <th className="zahl">PDFs abgelegt</th>
                </tr>
              </thead>
              <tbody>
                {ergebnisse.map((e) => (
                  <tr key={e.monat}>
                    <td>{monatName(e.monat)}</td>
                    <td className="zahl">{e.rezepteNeu}</td>
                    <td className="zahl">{e.rezepteZugeordnet}</td>
                    <td className="zahl">{e.rezepteVorhanden}</td>
                    <td className="zahl">
                      {e.absetzungen}
                      {e.absetzungen > 0 &&
                        ` (${e.absetzungenVerknuepft} mit Rezept)`}
                    </td>
                    <td className="zahl">{e.ekv}</td>
                    <td className="zahl">{e.dateien}</td>
                  </tr>
                ))}
              </tbody>
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        {schritt === "vorschau" && (
          <>
            <Button onClick={zuruecksetzen}>Andere Dateien</Button>
            <Button
              variant="contained"
              disabled={auswahl.size === 0}
              onClick={uebernehmen}
            >
              {auswahl.size} Abrechnung{auswahl.size === 1 ? "" : "en"}{" "}
              übernehmen
            </Button>
          </>
        )}
        {(schritt === "auswahl" || schritt === "fertig") && (
          <Button onClick={schliessen}>Schließen</Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
