import { useEffect, useMemo, useState } from "react";
import { useRecordContext } from "react-admin";
import {
  Box,
  Card,
  Chip,
  CircularProgress,
  Tooltip,
  Typography,
} from "@mui/material";
import dayjs from "dayjs";
import { supabase } from "./utils";
import { formatCurrency } from "./CurrencyField";
import {
  Kassenrezept,
  doppelteIds,
  kassenanteil,
  leistungenText,
  monatKurz,
  rezeptSummen,
  sortiereRezepte,
  zahl,
} from "./kassenrezept";

/*
 * Bereich "Abgerechnete Rezepte" in der Kundenkartei: alle für diesen Kunden
 * über den Abrechnungsdienstleister abgerechneten Kassenrezepte (Tabelle
 * kassenrezept) mit Brutto, Zuzahlung und Kassenanteil. Gefunden werden sie
 * über die Kundenzuordnung (kunde_id) und zusätzlich über die
 * Versichertennummer, damit auch noch nicht zugeordnete Belege erscheinen.
 * Reine Anzeige: die Daten stammen aus den Rezeptübersichten.
 */

const datum = (w: string | null) => (w ? dayjs(w).format("DD.MM.YYYY") : "");

export const KundeKassenrezepte = () => {
  const kunde = useRecordContext();
  const kundeId = kunde?.id as number | undefined;
  const versichertenNr = (
    (kunde?.VersichertenNummer as string | null | undefined) ?? ""
  ).trim();
  const [liste, setListe] = useState<Kassenrezept[] | null>(null);
  const [fehler, setFehler] = useState(false);

  useEffect(() => {
    if (kundeId == null) return;
    let abgebrochen = false;
    setListe(null);
    setFehler(false);
    const abfrage = supabase.from("kassenrezept").select("*");
    // Versichertennummern bestehen nur aus Buchstaben und Ziffern; alles
    // andere wird entfernt, damit der or-Filter nicht verfälscht wird.
    const nr = versichertenNr.replace(/[^A-Za-z0-9]/g, "");
    (nr
      ? abfrage.or(`kunde_id.eq.${kundeId},Versichertennummer.eq.${nr}`)
      : abfrage.eq("kunde_id", kundeId)
    ).then(({ data, error }) => {
      if (abgebrochen) return;
      if (error) {
        console.error(
          "Abgerechnete Rezepte konnten nicht geladen werden",
          error,
        );
        setFehler(true);
        setListe([]);
        return;
      }
      setListe(sortiereRezepte((data ?? []) as Kassenrezept[]));
    });
    return () => {
      abgebrochen = true;
    };
  }, [kundeId, versichertenNr]);

  const doppelt = useMemo(() => doppelteIds(liste ?? []), [liste]);
  const summen = useMemo(() => rezeptSummen(liste ?? []), [liste]);

  if (kundeId == null) return null;

  return (
    <Card variant="outlined" sx={{ p: 1.5, width: "100%" }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
        Abgerechnete Rezepte
        {summen.anzahl > 0 ? ` (${summen.anzahl})` : ""}
      </Typography>

      {liste === null ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
          <CircularProgress size={22} />
        </Box>
      ) : fehler ? (
        <Typography variant="body2" color="error" sx={{ py: 1 }}>
          Die abgerechneten Rezepte konnten nicht geladen werden.
        </Typography>
      ) : liste.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
          Noch kein Rezept dieses Kunden über die Sammelabrechnung abgerechnet.
        </Typography>
      ) : (
        <>
          <Box
            tabIndex={0}
            aria-label="Abgerechnete Rezepte, scrollbar"
            sx={{ maxHeight: 320, overflow: "auto" }}
          >
            <Box
              component="table"
              sx={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.9rem",
                "& th": {
                  textAlign: "left",
                  fontWeight: 600,
                  color: "text.secondary",
                  p: "4px 8px",
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  whiteSpace: "nowrap",
                  position: "sticky",
                  top: 0,
                  backgroundColor: "background.paper",
                },
                "& td": {
                  p: "4px 8px",
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  verticalAlign: "top",
                },
                "& .zahl": { textAlign: "right", whiteSpace: "nowrap" },
              }}
            >
              <thead>
                <tr>
                  <th>Rezept vom</th>
                  <th>Leistungen</th>
                  <th className="zahl">Brutto</th>
                  <th className="zahl">Zuzahlung</th>
                  <th className="zahl">Kassenanteil</th>
                </tr>
              </thead>
              <tbody>
                {liste.map((r) => (
                  <tr key={r.id}>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {datum(r.Rezeptdatum)}
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block" }}
                      >
                        Abrechnung {monatKurz(r.Abrechnungsmonat)}
                      </Typography>
                    </td>
                    <td>
                      {leistungenText(r)}
                      {doppelt.has(r.id) && (
                        <Tooltip title="Dieses Rezeptdatum wurde mehrfach abgerechnet">
                          <Chip
                            size="small"
                            color="warning"
                            label="prüfen"
                            sx={{ ml: 1 }}
                          />
                        </Tooltip>
                      )}
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block" }}
                      >
                        {[r.Krankenkasse, `Beleg ${r.Belegnummer}`]
                          .filter(Boolean)
                          .join(" · ")}
                      </Typography>
                    </td>
                    <td className="zahl">{formatCurrency(zahl(r.Brutto))}</td>
                    <td className="zahl">
                      {formatCurrency(zahl(r.Zuzahlung))}
                    </td>
                    <td className="zahl">{formatCurrency(kassenanteil(r))}</td>
                  </tr>
                ))}
              </tbody>
            </Box>
          </Box>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mt: 1 }}
          >
            Brutto {formatCurrency(summen.brutto)} · Zuzahlung{" "}
            {formatCurrency(summen.zuzahlung)} · Kassenanteil{" "}
            {formatCurrency(summen.kassenanteil)}
          </Typography>
        </>
      )}
    </Card>
  );
};
