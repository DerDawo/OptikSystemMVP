// Refraktionsprotokoll eines Kunden (wie in Prisma): links der Baum mit
// Brillenkarten, CL-Karteien, objektiven und subjektiven Refraktionen,
// MKH, nc-Tonometrie und medizinischen Sachverhalten; rechts der gewählte
// Eintrag. Refraktionen werden eingetippt und beim Verlassen des Felds
// gespeichert, Brillen und CL-Karteien werden zusammengefasst angezeigt.
import { useState, type ReactNode } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import {
  Title,
  useDataProvider,
  useGetList,
  useGetMany,
  useGetOne,
  useNotify,
} from "react-admin";
import {
  Box,
  Button,
  Card,
  CardContent,
  Link,
  Typography,
} from "@mui/material";
import { Auswahl, Eingabe, type Speichern } from "./KarteiEingabe";
import { Wert } from "./BrilleKarteikarte";
import { MITARBEITER, mitarbeiterAnzeige } from "./mitarbeiterNamen";
import {
  ARTEN,
  MKH_TESTS,
  artBeschreibung,
  staerkeKurz,
  zeitpunktText,
  type RefraktionsArt,
} from "./refraktionsprotokoll";

type Datensatz = Record<string, unknown> & { id: number };
type Auswahl =
  | { typ: "refraktion"; id: number }
  | { typ: "brille"; id: number }
  | { typ: "cl"; id: number }
  | null;

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
const datum = (wert: unknown) =>
  wert ? new Date(String(wert)).toLocaleDateString("de-DE") : "";

const Abschnitt = ({ titel }: { titel: string }) => (
  <Typography
    sx={{ fontSize: "0.78rem", fontWeight: 700, mt: 1, color: "text.primary" }}
  >
    {titel}
  </Typography>
);

const Eintrag = ({
  text,
  aktiv,
  klick,
}: {
  text: string;
  aktiv: boolean;
  klick: () => void;
}) => (
  <Box
    onClick={klick}
    sx={{
      pl: 1.5,
      py: "1px",
      fontSize: "0.8rem",
      cursor: "pointer",
      borderRadius: "3px",
      whiteSpace: "nowrap",
      bgcolor: aktiv ? "action.selected" : undefined,
      "&:hover": { bgcolor: "action.hover" },
    }}
  >
    {text}
  </Box>
);

const Beschr = ({ children }: { children: ReactNode }) => (
  <Box
    sx={{
      alignSelf: "center",
      fontStyle: "italic",
      fontSize: "0.75rem",
      color: "text.secondary",
      whiteSpace: "nowrap",
    }}
  >
    {children}
  </Box>
);

// Bearbeiten eines Eintrags aus der Tabelle "refraktion"
const RefraktionEintrag = ({
  id,
  geloescht,
}: {
  id: number;
  geloescht: () => void;
}) => {
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const { data: r, refetch } = useGetOne<Datensatz>("refraktion", { id });
  if (!r) return null;
  const art = artBeschreibung(r.Art);

  const speichere =
    (feld: string): Speichern =>
    async (neu) => {
      await dataProvider.update("refraktion", {
        id: r.id,
        data: { [feld]: neu },
        previousData: r,
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
      wert={r[feld]}
      speichere={speichere(feld)}
      {...weiteres}
    />
  );
  const loeschen = async () => {
    if (
      !window.confirm(`${art.titel} vom ${zeitpunktText(r.Zeitpunkt)} löschen?`)
    )
      return;
    try {
      await dataProvider.delete("refraktion", { id: r.id, previousData: r });
      geloescht();
    } catch (f) {
      notify((f as Error).message || "Konnte nicht gelöscht werden.", {
        type: "error",
      });
    }
  };

  return (
    <Box sx={{ display: "grid", gap: 1.5 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Typography variant="h6" sx={{ flex: 1 }}>
          {art.titel} vom {zeitpunktText(r.Zeitpunkt)}
        </Typography>
        <Button color="error" size="small" onClick={() => void loeschen()}>
          Löschen
        </Button>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns:
            "110px minmax(140px, 220px) 90px minmax(140px, 220px)",
          gap: "4px 8px",
        }}
      >
        <Beschr>Datum</Beschr>
        <Wert links>
          {eingabe("Zeitpunkt", "Datum", {
            typ: "datum",
            anzeige: zeitpunktText(r.Zeitpunkt),
          })}
        </Wert>
        <Beschr>Untersucher</Beschr>
        <Wert links>
          <Auswahl
            name="Untersucher"
            wert={mitarbeiterAnzeige(r.Untersucher) || null}
            optionen={MITARBEITER_AUSWAHL}
            speichere={speichere("Untersucher")}
          />
        </Wert>
        {art.geraet && (
          <>
            <Beschr>Gerät</Beschr>
            <Wert links>{eingabe("Geraet", "Gerät")}</Wert>
          </>
        )}
        {art.visBino && (
          <>
            <Beschr>Vis bino</Beschr>
            <Wert rechts>
              {eingabe("VisBino", "Vis bino", {
                typ: "zahl",
                rechts: true,
                anzeige: zahlText(r.VisBino, 2),
              })}
            </Wert>
          </>
        )}
      </Box>

      {art.augen.length > 0 && (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: `24px repeat(${art.augen.length}, minmax(52px, 80px))`,
            gap: "4px",
            overflowX: "auto",
          }}
        >
          <Box />
          {art.augen.map((a) => (
            <Box
              key={a.feld}
              sx={{
                fontSize: "0.72rem",
                fontStyle: "italic",
                color: "text.secondary",
                textAlign: "center",
              }}
            >
              {a.titel}
            </Box>
          ))}
          {(["Rechts", "Links"] as const).map((endung) => [
            <Beschr key={endung}>{endung === "Rechts" ? "R" : "L"}</Beschr>,
            ...art.augen.map((a) => (
              <Wert key={`${a.feld}${endung}`} rechts>
                {eingabe(`${a.feld}${endung}`, `${a.titel} ${endung}`, {
                  typ: "zahl",
                  rechts: true,
                  anzeige: zahlText(r[`${a.feld}${endung}`], a.stellen),
                })}
              </Wert>
            )),
          ])}
        </Box>
      )}

      {art.mkh && (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "130px minmax(180px, 320px)",
            gap: "4px 8px",
          }}
        >
          {MKH_TESTS.map((t) => [
            <Beschr key={`${t.feld}-b`}>{t.titel}</Beschr>,
            <Wert key={t.feld} links>
              {eingabe(t.feld, t.titel, { vorschlaege: t.vorschlaege })}
            </Wert>,
          ])}
        </Box>
      )}

      {art.anamnese && (
        <Box>
          <Beschr>
            Medizinische Sachverhalte (Erkrankungen, Medikamente, Operationen,
            Familie)
          </Beschr>
          <Wert links>
            {eingabe("Anamnese", "Medizinische Sachverhalte", {
              mehrzeilig: true,
            })}
          </Wert>
        </Box>
      )}
      <Box>
        <Beschr>Notizen</Beschr>
        <Wert links>{eingabe("Notizen", "Notizen", { mehrzeilig: true })}</Wert>
      </Box>
    </Box>
  );
};

// Zusammenfassung einer Brillenkarte
const BrilleAnsicht = ({ brille }: { brille: Datensatz }) => {
  const ids = [brille.GlasRechts, brille.GlasLinks].filter(
    (x): x is number => typeof x === "number",
  );
  const { data: glaeser } = useGetMany<Datensatz>("glass", { ids });
  const glas = (id: unknown) => glaeser?.find((g) => g.id === id);
  return (
    <Box sx={{ display: "grid", gap: 1 }}>
      <Typography variant="h6">
        Brillenkarte vom {datum(brille.Datum)}
      </Typography>
      <Typography variant="body2">
        {[brille.BrillenArt, mitarbeiterAnzeige(brille.Refraktion)]
          .filter(Boolean)
          .map(String)
          .join(" · ")}
      </Typography>
      {(
        [
          ["R", brille.GlasRechts],
          ["L", brille.GlasLinks],
        ] as const
      ).map(([seite, id]) => {
        const g = glas(id);
        return (
          <Typography key={seite} variant="body2">
            <strong>{seite}:</strong> {g ? staerkeKurz(g) || "–" : "–"}
            {g?.Vis ? ` · Vis cc ${zahlText(g.Vis, 2)}` : ""}
            {g?.VisSC ? ` · Vis sc ${zahlText(g.VisSC, 2)}` : ""}
            {g?.PD ? ` · PD ${zahlText(g.PD, 1)}` : ""}
            {g?.iod ? ` · IOD ${zahlText(g.iod, 0)}` : ""}
          </Typography>
        );
      })}
      <Link component={RouterLink} to={`/brille/${brille.id}/show`}>
        Brillenkarte öffnen
      </Link>
    </Box>
  );
};

const ClAnsicht = ({ cl }: { cl: Datensatz }) => (
  <Box sx={{ display: "grid", gap: 1 }}>
    <Typography variant="h6">CL-Kartei vom {datum(cl.Datum)}</Typography>
    <Typography variant="body2">
      {[cl.Linsenart, mitarbeiterAnzeige(cl.Berater)]
        .filter(Boolean)
        .map(String)
        .join(" · ")}
    </Typography>
    {(["Rechts", "Links"] as const).map((endung) => (
      <Typography key={endung} variant="body2">
        <strong>{endung === "Rechts" ? "R" : "L"}:</strong>{" "}
        {staerkeKurz(cl, endung) || "–"}
        {cl[`Radius${endung}`]
          ? ` · BC ${zahlText(cl[`Radius${endung}`], 2)}`
          : ""}
        {cl[`Durchmesser${endung}`]
          ? ` · DM ${zahlText(cl[`Durchmesser${endung}`], 1)}`
          : ""}
        {cl[`Linsentyp${endung}`]
          ? ` · ${String(cl[`Linsentyp${endung}`])}`
          : ""}
      </Typography>
    ))}
    <Link component={RouterLink} to={`/kontaktlinse/${cl.id}/show`}>
      CL-Kartei öffnen
    </Link>
  </Box>
);

export const RefraktionsprotokollSeite = () => {
  const { id } = useParams();
  const kundeId = Number(id);
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const [wahl, setWahl] = useState<Auswahl>(null);

  const { data: kunde } = useGetOne<Datensatz>("kunde", { id: kundeId });
  const liste = (feld: string) => ({
    filter: { kunde_id: kundeId },
    sort: { field: feld, order: "DESC" as const },
    pagination: { page: 1, perPage: 500 },
  });
  const { data: brillen } = useGetList<Datensatz>("brille", liste("Datum"));
  const { data: cls } = useGetList<Datensatz>("kontaktlinse", liste("Datum"));
  const { data: refraktionen, refetch } = useGetList<Datensatz>(
    "refraktion",
    liste("Zeitpunkt"),
  );

  const neu = async (art: RefraktionsArt) => {
    try {
      const { data } = await dataProvider.create("refraktion", {
        data: {
          kunde_id: kundeId,
          Art: art,
          Zeitpunkt: new Date().toISOString(),
        },
      });
      await refetch();
      setWahl({ typ: "refraktion", id: data.id as number });
    } catch (f) {
      notify((f as Error).message || "Konnte nicht angelegt werden.", {
        type: "error",
      });
    }
  };

  // ohne Auswahl: der neueste Eintrag
  const aktuell: Auswahl =
    wahl ??
    (refraktionen?.[0]
      ? { typ: "refraktion", id: refraktionen[0].id }
      : brillen?.[0]
        ? { typ: "brille", id: brillen[0].id }
        : null);
  const istAktiv = (typ: string, eid: number) =>
    aktuell?.typ === typ && aktuell.id === eid;

  const name = kunde
    ? [kunde.Vorname, kunde.Nachname].filter(Boolean).map(String).join(" ")
    : "";

  return (
    <Card sx={{ mt: 2 }}>
      <Title title={`Refraktionsprotokoll ${name}`} />
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "baseline", gap: 2, mb: 1 }}>
          <Typography variant="h5" sx={{ color: "text.secondary" }}>
            Refraktionsprotokoll {name}
          </Typography>
          <Link component={RouterLink} to={`/kunde/${kundeId}/show`}>
            zum Kunden
          </Link>
        </Box>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "230px minmax(0, 1fr)" },
            gap: 2,
          }}
        >
          <Box
            sx={{
              borderRight: { md: 1 },
              borderColor: "divider",
              pr: { md: 1 },
            }}
          >
            <Abschnitt titel="Brillenkarten" />
            {(brillen ?? []).map((b) => (
              <Eintrag
                key={`b${b.id}`}
                text={`vom ${datum(b.Datum) || `#${b.id}`}`}
                aktiv={istAktiv("brille", b.id)}
                klick={() => setWahl({ typ: "brille", id: b.id })}
              />
            ))}
            <Abschnitt titel="CL-Kartei" />
            {(cls ?? []).map((c) => (
              <Eintrag
                key={`c${c.id}`}
                text={`vom ${datum(c.Datum) || `#${c.id}`}`}
                aktiv={istAktiv("cl", c.id)}
                klick={() => setWahl({ typ: "cl", id: c.id })}
              />
            ))}
            {ARTEN.map((a) => (
              <Box key={a.art}>
                <Abschnitt titel={a.titel} />
                {(refraktionen ?? [])
                  .filter((r) => r.Art === a.art)
                  .map((r) => (
                    <Eintrag
                      key={`r${r.id}`}
                      text={`vom ${zeitpunktText(r.Zeitpunkt)}`}
                      aktiv={istAktiv("refraktion", r.id)}
                      klick={() => setWahl({ typ: "refraktion", id: r.id })}
                    />
                  ))}
              </Box>
            ))}
            <Typography
              sx={{ fontSize: "0.78rem", fontWeight: 700, mt: 2, mb: 0.5 }}
            >
              Neu anlegen
            </Typography>
            <Box sx={{ display: "grid", gap: 0.5 }}>
              {ARTEN.map((a) => (
                <Button
                  key={a.art}
                  size="small"
                  variant="outlined"
                  onClick={() => void neu(a.art)}
                  sx={{ justifyContent: "flex-start" }}
                >
                  + {a.titel}
                </Button>
              ))}
            </Box>
          </Box>

          <Box sx={{ minWidth: 0 }}>
            {aktuell?.typ === "refraktion" && (
              <RefraktionEintrag
                key={aktuell.id}
                id={aktuell.id}
                geloescht={() => {
                  setWahl(null);
                  void refetch();
                }}
              />
            )}
            {aktuell?.typ === "brille" &&
              brillen?.find((b) => b.id === aktuell.id) && (
                <BrilleAnsicht
                  brille={brillen.find((b) => b.id === aktuell.id)!}
                />
              )}
            {aktuell?.typ === "cl" && cls?.find((c) => c.id === aktuell.id) && (
              <ClAnsicht cl={cls.find((c) => c.id === aktuell.id)!} />
            )}
            {!aktuell && (
              <Typography color="text.secondary">
                Noch keine Einträge. Links eine Refraktion, Tonometrie oder
                medizinische Sachverhalte anlegen.
              </Typography>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};
