import { useState } from "react";
import { useGetList } from "react-admin";
import { Link as RouterLink } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
  Radio,
  Typography,
} from "@mui/material";
import {
  type Lagerglas,
  type Werte,
  hatAddition,
  indexEmpfehlung,
  minusZylinder,
  passendeLagerglaeser,
  werteText,
} from "./glasFinder";

/*
 * Glas-Finder in der Brillen-Karteikarte: sucht zu den Werten des Auftrags
 * passende Gläser im Glas-Lager (je Auge) und empfiehlt sonst einen Index
 * für die Bestellung über den Glasassistenten. "Übernehmen" trägt das
 * Lagerglas in den Auftrag ein und bucht es ab (siehe BrilleKarteikarte).
 */

export type FinderAuge = { seite: "R" | "L"; werte: Werte | undefined };

const euro = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});

const AugeSuche = ({
  auge,
  lager,
  gewaehlt,
  waehle,
}: {
  auge: FinderAuge;
  lager: Lagerglas[];
  gewaehlt: Lagerglas | null;
  waehle: (g: Lagerglas | null) => void;
}) => {
  const werte = auge.werte ? minusZylinder(auge.werte) : null;
  const treffer = auge.werte ? passendeLagerglaeser(auge.werte, lager) : [];
  const name = auge.seite === "R" ? "Rechts" : "Links";
  return (
    <Box sx={{ display: "grid", gap: 0.75 }}>
      <Typography variant="subtitle2">
        {name}
        {werte && (
          <Box component="span" sx={{ fontWeight: 400, ml: 1 }}>
            {werteText(werte.sph, werte.cyl)}
            {werte.cyl && werte.achse !== null ? ` × ${werte.achse}°` : ""}
          </Box>
        )}
      </Typography>
      {!werte ? (
        <Typography variant="body2" color="text.secondary">
          Keine Werte eingetragen.
        </Typography>
      ) : auge.werte && hatAddition(auge.werte) ? (
        <Typography variant="body2" color="text.secondary">
          Mit Addition: kein Lagerglas, bitte über den Glasassistenten
          bestellen.
        </Typography>
      ) : treffer.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Kein passendes Glas im Lager.
        </Typography>
      ) : (
        <>
          {treffer.map((g) => (
            <Box
              key={g.id}
              onClick={() => waehle(gewaehlt?.id === g.id ? null : g)}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                p: 0.5,
                borderRadius: 1,
                cursor: "pointer",
                border: 1,
                borderColor: gewaehlt?.id === g.id ? "primary.main" : "divider",
              }}
            >
              <Radio size="small" checked={gewaehlt?.id === g.id} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {[g.Hersteller, g.Bezeichnung].filter(Boolean).join(" ")}
                  {g.Brechungsindex
                    ? ` ${String(g.Brechungsindex).replace(".", ",")}`
                    : ""}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {[
                    g.Verguetung,
                    g.Durchmesser ? `Ø ${g.Durchmesser}` : "",
                    `${g.Bestand} auf Lager`,
                    g.Lagerort,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </Typography>
              </Box>
              {g.Verkaufspreis != null && (
                <Typography variant="body2">
                  {euro.format(Number(g.Verkaufspreis))}
                </Typography>
              )}
            </Box>
          ))}
        </>
      )}
    </Box>
  );
};

export const GlasFinderDialog = ({
  augen,
  onClose,
  onAssistent,
  uebernehmen,
}: {
  augen: FinderAuge[];
  onClose: () => void;
  onAssistent: () => void;
  uebernehmen: (wahl: {
    R: Lagerglas | null;
    L: Lagerglas | null;
  }) => Promise<void>;
}) => {
  const { data, isPending } = useGetList<Lagerglas & { id: number }>(
    "glaslager",
    {
      filter: { Aktiv: true, "Bestand@gt": 0 },
      pagination: { page: 1, perPage: 1000 },
      sort: { field: "Sph", order: "ASC" },
    },
  );
  const lager = data ?? [];
  const [wahl, setWahl] = useState<{
    R: Lagerglas | null;
    L: Lagerglas | null;
  }>({ R: null, L: null });
  const [speichert, setSpeichert] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const empfehlung = indexEmpfehlung(
    augen.map((a) => a.werte).filter((w): w is Werte => Boolean(w)),
  );
  const gleitsicht = augen.some((a) => a.werte && hatAddition(a.werte));

  const los = async () => {
    setSpeichert(true);
    setFehler(null);
    try {
      await uebernehmen(wahl);
      onClose();
    } catch (f) {
      setFehler((f as Error).message);
    }
    setSpeichert(false);
  };

  return (
    <Dialog
      open
      onClose={() => !speichert && onClose()}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Glas-Finder</DialogTitle>
      <DialogContent sx={{ display: "grid", gap: 2 }}>
        {isPending ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary">
              Passende Gläser aus dem{" "}
              <Link component={RouterLink} to="/glaslager" onClick={onClose}>
                Glas-Lager
              </Link>{" "}
              ({lager.length} vorrätige Sorten). Ein übernommenes Glas wird
              eingetragen und vom Bestand abgebucht.
            </Typography>
            {augen.map((auge) => (
              <AugeSuche
                key={auge.seite}
                auge={auge}
                lager={lager}
                gewaehlt={wahl[auge.seite]}
                waehle={(g) => setWahl((w) => ({ ...w, [auge.seite]: g }))}
              />
            ))}
            {empfehlung && (
              <Alert severity="info" sx={{ py: 0 }}>
                Für die Bestellung empfohlen: {gleitsicht ? "Gleitsicht, " : ""}
                Index {empfehlung.text}.
              </Alert>
            )}
            {fehler && <Alert severity="error">{fehler}</Alert>}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => {
            onClose();
            onAssistent();
          }}
          disabled={speichert}
        >
          Im Glasassistenten bestellen
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose} disabled={speichert}>
          Abbrechen
        </Button>
        <Button
          variant="contained"
          disabled={speichert || (!wahl.R && !wahl.L)}
          onClick={() => void los()}
          startIcon={speichert ? <CircularProgress size={16} /> : undefined}
        >
          Übernehmen und abbuchen
        </Button>
      </DialogActions>
    </Dialog>
  );
};
