import { useState, type ReactNode } from "react";
import { useDataProvider, useGetOne, useNotify } from "react-admin";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
import { Auswahl, Eingabe, type Speichern } from "./KarteiEingabe";
import { Wert } from "./BrilleKarteikarte";
import { MITARBEITER, mitarbeiterAnzeige } from "./mitarbeiterNamen";
import {
  BESCHWERDEN,
  ERGEBNISSE,
  KONTROLLE_AUGE,
  TOPOMETRIE_AUGE,
  TRAGEZEITEN,
  hornhautAstigmatismus,
  hornhautDpt,
  untersuchungTitel,
  type AugenFeld,
} from "./klUntersuchung";

/*
 * Kontrolle bzw. Topometrie zur CL-Kartei bearbeiten (wie die Karteikarte:
 * eintippen, gespeichert wird beim Verlassen des Felds). Links die
 * Beschriftung, daneben rechtes und linkes Auge.
 */

type Datensatz = Record<string, unknown> & { id: number };

const MITARBEITER_AUSWAHL = MITARBEITER.map((m) => ({ id: m, name: m }));

const zahlText = (wert: unknown, stellen: number) => {
  if (wert === null || wert === undefined || wert === "") return "";
  const n = Number(wert);
  return Number.isFinite(n)
    ? new Intl.NumberFormat("en-US", {
        minimumFractionDigits: stellen,
        maximumFractionDigits: Math.max(stellen, 2),
        useGrouping: false,
      }).format(n)
    : "";
};
const datumText = (wert: unknown) =>
  wert ? new Date(String(wert)).toLocaleDateString("de-DE") : "";

const Zeile = ({
  titel,
  children,
}: {
  titel: ReactNode;
  children: ReactNode;
}) => (
  <>
    <Box
      sx={{
        alignSelf: "center",
        fontStyle: "italic",
        fontSize: "0.75rem",
        color: "text.secondary",
      }}
    >
      {titel}
    </Box>
    {children}
  </>
);

export const KlUntersuchungDialog = ({
  id,
  onClose,
  geloescht,
}: {
  id: number;
  onClose: () => void;
  geloescht: () => void;
}) => {
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const { data: u, refetch } = useGetOne<Datensatz>("kl_untersuchung", { id });
  const [loescht, setLoescht] = useState(false);

  if (!u) {
    return (
      <Dialog open onClose={onClose}>
        <DialogContent>
          <CircularProgress size={24} />
        </DialogContent>
      </Dialog>
    );
  }

  const speichere =
    (feld: string): Speichern =>
    async (neu) => {
      await dataProvider.update("kl_untersuchung", {
        id: u.id,
        data: { [feld]: neu },
        previousData: u,
      });
      await refetch();
    };
  const eingabe = (
    feld: string,
    name: string,
    weiteres: Partial<Parameters<typeof Eingabe>[0]> = {},
  ) => (
    <Eingabe
      name={name}
      wert={u[feld]}
      speichere={speichere(feld)}
      {...weiteres}
    />
  );
  const augenFeld = (f: AugenFeld, endung: "Rechts" | "Links") => {
    const feld = `${f.feld}${endung}`;
    const name = `${f.titel} ${endung === "Rechts" ? "R" : "L"}`;
    return (
      <Wert
        key={feld}
        rechts={f.stellen !== undefined}
        links={!f.stellen && f.stellen !== 0}
      >
        {f.stellen !== undefined
          ? eingabe(feld, name, {
              typ: "zahl",
              rechts: true,
              anzeige: zahlText(u[feld], f.stellen),
            })
          : eingabe(feld, name, { vorschlaege: f.vorschlaege })}
      </Wert>
    );
  };

  const topometrie = u.Art === "Topometrie";
  const felder = topometrie ? TOPOMETRIE_AUGE : KONTROLLE_AUGE;

  const loeschen = async () => {
    if (!window.confirm(`${untersuchungTitel(u)} wirklich löschen?`)) return;
    setLoescht(true);
    try {
      await dataProvider.delete("kl_untersuchung", {
        id: u.id,
        previousData: u,
      });
      geloescht();
    } catch (f) {
      notify((f as Error).message || "Konnte nicht gelöscht werden.", {
        type: "error",
      });
      setLoescht(false);
    }
  };

  const hornhaut = (endung: "Rechts" | "Links") => {
    const kf = hornhautDpt(u[`RadiusFlach${endung}`]);
    const ks = hornhautDpt(u[`RadiusSteil${endung}`]);
    const ast = hornhautAstigmatismus(
      u[`RadiusFlach${endung}`],
      u[`RadiusSteil${endung}`],
    );
    return (
      <Box
        key={endung}
        sx={{ fontSize: "0.8rem", color: "text.secondary", px: "6px" }}
      >
        {kf === null && ks === null
          ? "–"
          : `${zahlText(kf, 2)} / ${zahlText(ks, 2)} dpt${
              ast === null ? "" : ` · Ast. ${zahlText(ast, 2)} dpt`
            }`}
      </Box>
    );
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>{untersuchungTitel(u)}</DialogTitle>
      <DialogContent>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "130px 1fr 1fr",
            columnGap: "6px",
            rowGap: "4px",
          }}
        >
          <Zeile titel="Datum">
            <Wert links>
              {eingabe("Datum", "Datum", {
                typ: "datum",
                anzeige: datumText(u.Datum),
              })}
            </Wert>
            <Box />
          </Zeile>
          <Zeile titel="Untersucher">
            <Wert links>
              <Auswahl
                name="Untersucher"
                wert={mitarbeiterAnzeige(u.Untersucher) || null}
                optionen={MITARBEITER_AUSWAHL}
                speichere={speichere("Untersucher")}
              />
            </Wert>
            <Box />
          </Zeile>
          {topometrie ? (
            <Zeile titel="Gerät">
              <Box sx={{ gridColumn: "2 / 4" }}>
                <Wert links>{eingabe("Geraet", "Gerät")}</Wert>
              </Box>
            </Zeile>
          ) : (
            <>
              <Zeile titel="Tragezeit">
                <Wert links>
                  {eingabe("Tragezeit", "Tragezeit", {
                    vorschlaege: TRAGEZEITEN,
                  })}
                </Wert>
                <Box />
              </Zeile>
              <Zeile titel="Beschwerden">
                <Box sx={{ gridColumn: "2 / 4" }}>
                  <Wert links>
                    {eingabe("Beschwerden", "Beschwerden", {
                      vorschlaege: BESCHWERDEN,
                    })}
                  </Wert>
                </Box>
              </Zeile>
            </>
          )}

          <Box sx={{ gridColumn: "1 / -1", height: 6 }} />
          <Box />
          <Typography variant="subtitle2" sx={{ textAlign: "center" }}>
            R
          </Typography>
          <Typography variant="subtitle2" sx={{ textAlign: "center" }}>
            L
          </Typography>
          {felder.map((f) => (
            <Zeile
              key={f.feld}
              titel={`${f.titel}${f.einheit ? ` (${f.einheit})` : ""}`}
            >
              {augenFeld(f, "Rechts")}
              {augenFeld(f, "Links")}
            </Zeile>
          ))}
          {topometrie && (
            <Zeile titel="Brechwert flach / steil">
              {hornhaut("Rechts")}
              {hornhaut("Links")}
            </Zeile>
          )}

          <Box sx={{ gridColumn: "1 / -1", height: 6 }} />
          {!topometrie && (
            <>
              <Zeile titel="Ergebnis">
                <Box sx={{ gridColumn: "2 / 4" }}>
                  <Wert links>
                    {eingabe("Ergebnis", "Ergebnis", {
                      vorschlaege: ERGEBNISSE,
                    })}
                  </Wert>
                </Box>
              </Zeile>
              <Zeile titel="Nächste Kontrolle">
                <Wert links>
                  {eingabe("NaechsteKontrolle", "Nächste Kontrolle", {
                    typ: "datum",
                    anzeige: datumText(u.NaechsteKontrolle),
                  })}
                </Wert>
                <Box />
              </Zeile>
            </>
          )}
          <Zeile titel="Notizen">
            <Box
              sx={(theme) => ({
                gridColumn: "2 / 4",
                minHeight: 60,
                px: "6px",
                py: "4px",
                bgcolor:
                  theme.palette.mode === "dark"
                    ? "rgba(255,255,255,0.06)"
                    : "#e8eef7",
                whiteSpace: "pre-wrap",
                fontSize: "0.9rem",
              })}
            >
              {eingabe("Notizen", "Notizen", { mehrzeilig: true })}
            </Box>
          </Zeile>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button
          color="error"
          onClick={() => void loeschen()}
          disabled={loescht}
        >
          Löschen
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button variant="contained" onClick={onClose}>
          Fertig
        </Button>
      </DialogActions>
    </Dialog>
  );
};
