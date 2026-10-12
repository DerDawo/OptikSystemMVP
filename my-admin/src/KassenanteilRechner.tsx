import { useEffect, useMemo, useRef, useState } from "react";

// Ereignis zum Öffnen des KK-Rechners von außerhalb (Menü "Optionen")
export const KK_RECHNER_OEFFNEN = "kk-rechner-oeffnen";
import { useNotify } from "react-admin";
import {
  Box,
  Button,
  Checkbox,
  Divider,
  FormControlLabel,
  IconButton,
  Popover,
  Tooltip,
  Typography,
} from "@mui/material";
import CalculateIcon from "@mui/icons-material/Calculate";
import {
  GespeichertePosition,
  MWST,
  ZUSAETZE,
  berechneKassenanteil,
  mitMwst,
} from "./kassenanteil";

type Glas = Record<string, unknown> | undefined;

const euro = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});

const hatWerte = (glas: Glas) =>
  [glas?.Sph, glas?.Cyl].some((w) => w !== null && w !== undefined && w !== "");

// Knopf neben "KK-Anteil": berechnet den Kassenanteil aus den Glaswerten
// nach dem vdek-ZVA-Vertrag (kassenanteil.ts). Die Positionen aus den Werten
// sind vorausgewählt, Zuschläge wie Kantenfilter oder Brillenglasbestimmung
// werden angehakt; "Übernehmen" trägt den Betrag inkl. MwSt. als KK-Anteil
// ein (die Zuzahlung ergibt sich daraus) und merkt sich die gewählten
// Positionen für den Berechtigungsschein.
export const KassenanteilRechner = ({
  augen,
  speichere,
  augenaerztlicheVerordnung,
}: {
  augen: { seite: "R" | "L"; glas: Glas }[];
  speichere: (
    brutto: number,
    positionen: GespeichertePosition[],
  ) => Promise<unknown>;
  // Brillenglasbestimmung ist dann nicht abrechenbar
  augenaerztlicheVerordnung: boolean;
}) => {
  const notify = useNotify();
  const [anker, setAnker] = useState<HTMLElement | null>(null);
  const knopf = useRef<HTMLButtonElement>(null);
  // "Optionen -> Positionen Krankenkasse" öffnet den Rechner
  useEffect(() => {
    const oeffnen = () => setAnker(knopf.current);
    window.addEventListener(KK_RECHNER_OEFFNEN, oeffnen);
    return () => window.removeEventListener(KK_RECHNER_OEFFNEN, oeffnen);
  }, []);
  const [abgewaehlt, setAbgewaehlt] = useState<Set<string>>(new Set());
  const [zusaetze, setZusaetze] = useState<Set<string>>(
    () => new Set(augenaerztlicheVerordnung ? [] : ["glasbestimmung"]),
  );
  const [speichert, setSpeichert] = useState(false);

  const ergebnis = useMemo(() => berechneKassenanteil(augen), [augen]);
  const anzahlAugen = augen.filter((a) => hatWerte(a.glas)).length;

  const zeilen = [
    ...ergebnis.positionen.map((p, i) => ({
      key: `p${i}`,
      text: `${p.seite} · ${p.nummer} ${p.bezeichnung}`,
      netto: p.netto,
      position: {
        nummer: p.nummer,
        bezeichnung: p.bezeichnung,
        faktor: 1,
        netto: p.netto,
      },
      an: !abgewaehlt.has(`p${i}`),
      umschalten: () => setAbgewaehlt((alt) => schalte(alt, `p${i}`)),
    })),
    ...ZUSAETZE.map((z) => {
      const anzahl = z.jeAuge ? anzahlAugen : 1;
      return {
        key: z.id,
        text: `${z.nummer} ${z.bezeichnung}${anzahl > 1 ? ` × ${anzahl}` : ""}${
          z.id === "glasbestimmung" && augenaerztlicheVerordnung
            ? " – nicht bei augenärztlicher Verordnung"
            : ""
        }`,
        netto: Math.round(z.netto * anzahl * 100) / 100,
        position: {
          nummer: z.nummer,
          bezeichnung: z.bezeichnung,
          faktor: anzahl,
          netto: z.netto,
        },
        an: zusaetze.has(z.id),
        umschalten: () => setZusaetze((alt) => schalte(alt, z.id)),
        gruppe: z.gruppe as string,
      };
    }),
  ];
  const gruppeVor = (i: number) => {
    const vorher = zeilen[i - 1];
    return vorher && "gruppe" in vorher ? vorher.gruppe : undefined;
  };
  const netto =
    Math.round(
      zeilen.filter((z) => z.an).reduce((s, z) => s + z.netto, 0) * 100,
    ) / 100;
  const brutto = mitMwst(netto);

  const uebernehmen = async () => {
    setSpeichert(true);
    try {
      await speichere(
        brutto,
        zeilen.filter((z) => z.an).map((z) => z.position),
      );
      setAnker(null);
    } catch {
      notify("KK-Anteil konnte nicht gespeichert werden.", { type: "error" });
    } finally {
      setSpeichert(false);
    }
  };

  return (
    <>
      <Tooltip title="KK-Anteil berechnen">
        <IconButton
          ref={knopf}
          size="small"
          aria-label="KK-Anteil berechnen"
          onClick={(e) => setAnker(e.currentTarget)}
          sx={{ p: 0.25, color: "primary.main" }}
        >
          <CalculateIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Tooltip>
      <Popover
        open={anker !== null}
        anchorEl={anker}
        onClose={() => setAnker(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Box sx={{ p: 2, width: 520, maxWidth: "90vw" }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            KK-Anteil berechnen
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Preisvereinbarung Brillengläser, vdek – ZVA vom 1. September 2024
            (Nettopreise)
          </Typography>

          {anzahlAugen === 0 && (
            <Typography sx={{ mt: 1.5 }} color="text.secondary">
              Keine Glaswerte eingetragen.
            </Typography>
          )}

          <Box sx={{ mt: 1 }}>
            {zeilen.map((z, i) => (
              <Box key={z.key}>
                {"gruppe" in z && z.gruppe !== gruppeVor(i) && (
                  <Divider sx={{ my: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      {String(z.gruppe)} (bei Bedarf anhaken)
                    </Typography>
                  </Divider>
                )}
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <FormControlLabel
                    sx={{ flex: 1, mr: 1 }}
                    control={
                      <Checkbox
                        size="small"
                        checked={z.an}
                        onChange={z.umschalten}
                        sx={{ py: 0.25 }}
                      />
                    }
                    label={<Typography variant="body2">{z.text}</Typography>}
                  />
                  <Typography variant="body2" sx={{ whiteSpace: "nowrap" }}>
                    {euro.format(z.netto)}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>

          {ergebnis.hinweise.map((h) => (
            <Typography
              key={h}
              variant="body2"
              color="warning.main"
              sx={{ mt: 0.5 }}
            >
              {h}
            </Typography>
          ))}

          <Divider sx={{ my: 1 }} />
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              rowGap: 0.25,
            }}
          >
            <Typography variant="body2">Netto</Typography>
            <Typography variant="body2" align="right">
              {euro.format(netto)}
            </Typography>
            <Typography variant="body2">
              + {Math.round(MWST * 100)} % MwSt.
            </Typography>
            <Typography variant="body2" align="right">
              {euro.format(brutto - netto)}
            </Typography>
            <Typography sx={{ fontWeight: 600 }}>KK-Anteil</Typography>
            <Typography sx={{ fontWeight: 600 }} align="right">
              {euro.format(brutto)}
            </Typography>
          </Box>
          <Box
            sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 2 }}
          >
            <Button onClick={() => setAnker(null)}>Abbrechen</Button>
            <Button
              variant="contained"
              disableElevation
              disabled={speichert}
              onClick={uebernehmen}
            >
              Übernehmen
            </Button>
          </Box>
        </Box>
      </Popover>
    </>
  );
};

const schalte = (menge: Set<string>, schluessel: string) => {
  const neu = new Set(menge);
  if (neu.has(schluessel)) neu.delete(schluessel);
  else neu.add(schluessel);
  return neu;
};
