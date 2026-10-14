import { useEffect, useState } from "react";
import { useDataProvider, useNotify } from "react-admin";
import { useNavigate } from "react-router-dom";
import {
  Box,
  ButtonBase,
  Card,
  IconButton,
  Tooltip,
  Typography,
} from "@mui/material";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import dayjs from "dayjs";
import { tokensFor } from "./designTokens";
import {
  FRISTEN,
  NACHRICHTEN,
  isoTag,
  istFertigungsauftrag,
  istGleitsicht,
  sehtestFaellig,
} from "./aufgabenRegeln";
import {
  buildExternalMessageUrl,
  choosePhoneNumberForMessaging,
  openExternalMessage,
} from "./messaging";
import { RECHNUNG_ABSENDER } from "./rechnungTemplate";

/*
 * "Heute zu tun" im Dashboard: fünf Listen aus den Daten der Kartei
 * (Knöpfe Bestellt/Fertig/Abgeholt, KV verschickt/genehmigt,
 * CL-Nachkontrolle, letzte Brille). Klick auf eine Zeile öffnet den Auftrag
 * bzw. Kunden; das WhatsApp-Symbol öffnet eine vorbereitete Nachricht.
 */

type Datensatz = Record<string, unknown> & { id: number | string };
type Kunde = Datensatz & {
  Anrede?: string | null;
  Vorname?: string | null;
  Nachname?: string | null;
  Handy?: string | null;
  TelefonnummerPrivat?: string | null;
  Werbeeinwilligung?: boolean | null;
};

type Zeile = {
  key: string;
  ziel: string;
  kunde?: Kunde;
  detail: string;
  nachricht?: (kunde: Kunde | undefined, firma: string) => string;
};

type Liste = {
  titel: string;
  hinweis: string;
  leer: string;
  zeilen: Zeile[];
  // reine Übersicht (keine Aufgabe): ohne Anzahl oben rechts
  ohneZahl?: boolean;
};

const MAX_ZEILEN = 6;

const datum = (wert: unknown) =>
  wert ? dayjs(String(wert)).format("DD.MM.YYYY") : "—";

const kundeName = (kunde?: Kunde) =>
  kunde
    ? [kunde.Nachname, kunde.Vorname].filter(Boolean).join(", ") ||
      `Kunde ${kunde.id}`
    : "Unbekannter Kunde";

const AufgabenKarte = ({ liste }: { liste: Liste }) => {
  const navigate = useNavigate();
  const notify = useNotify();
  const firma = RECHNUNG_ABSENDER.firma;
  return (
    <Card
      component="section"
      sx={{
        p: "16px 18px",
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        gap: 0.75,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
        <Typography
          component="h2"
          sx={{ fontSize: 15, fontWeight: 700, flex: 1 }}
        >
          {liste.titel}
        </Typography>
        <Typography
          hidden={liste.ohneZahl}
          sx={(theme) => ({
            fontSize: 13,
            fontWeight: 700,
            fontVariantNumeric: "tabular-nums",
            color:
              liste.zeilen.length > 0 ? "warning.dark" : tokensFor(theme).text3,
          })}
        >
          {liste.zeilen.length}
        </Typography>
      </Box>
      <Typography
        sx={{
          fontSize: 12,
          color: (theme) => tokensFor(theme).text3,
          mt: -0.5,
        }}
      >
        {liste.hinweis}
      </Typography>
      {liste.zeilen.length === 0 ? (
        <Typography
          sx={{ fontSize: 13.5, color: "text.secondary", px: 1.5, py: 1 }}
        >
          {liste.leer}
        </Typography>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column" }}>
          {liste.zeilen.slice(0, MAX_ZEILEN).map((zeile) => {
            const nummer = choosePhoneNumberForMessaging([
              zeile.kunde?.Handy,
              zeile.kunde?.TelefonnummerPrivat,
            ]);
            return (
              <Box
                key={zeile.key}
                sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
              >
                <ButtonBase
                  onClick={() => navigate(zeile.ziel)}
                  sx={(theme) => ({
                    flex: 1,
                    minWidth: 0,
                    display: "block",
                    textAlign: "left",
                    px: 1.5,
                    py: 0.75,
                    borderRadius: "10px",
                    "&:hover": { backgroundColor: tokensFor(theme).hover },
                  })}
                >
                  <Typography noWrap sx={{ fontWeight: 600, fontSize: 14 }}>
                    {kundeName(zeile.kunde)}
                  </Typography>
                  <Typography
                    noWrap
                    sx={{
                      fontSize: 12.5,
                      color: (theme) => tokensFor(theme).text3,
                    }}
                  >
                    {zeile.detail}
                  </Typography>
                </ButtonBase>
                {zeile.nachricht && nummer && (
                  <Tooltip title="Nachricht per WhatsApp">
                    <IconButton
                      size="small"
                      aria-label={`WhatsApp an ${kundeName(zeile.kunde)}`}
                      onClick={() => {
                        openExternalMessage(
                          buildExternalMessageUrl("whatsapp", {
                            to: nummer,
                            message: zeile.nachricht!(zeile.kunde, firma),
                          }),
                        );
                        notify(
                          "WhatsApp geöffnet. Der Text ist auch kopiert – ist das Eingabefeld leer, Strg+V drücken.",
                          { type: "info", autoHideDuration: 15000 },
                        );
                      }}
                      sx={{ color: "#1da851" }}
                    >
                      <WhatsAppIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            );
          })}
          {liste.zeilen.length > MAX_ZEILEN && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ px: 1.5, pt: 0.5 }}
            >
              + {liste.zeilen.length - MAX_ZEILEN} weitere
            </Typography>
          )}
        </Box>
      )}
    </Card>
  );
};

export const DashboardAufgaben = ({ stand }: { stand: Date | null }) => {
  const dataProvider = useDataProvider();
  const [listen, setListen] = useState<Liste[] | null>(null);
  const [fehler, setFehler] = useState(false);

  useEffect(() => {
    let abgebrochen = false;
    const laden = async () => {
      const heute = dayjs().startOf("day");
      const vor = (tage: number) => isoTag(heute.subtract(tage, "day"));
      const liste = (resource: string, filter: Record<string, unknown>) =>
        dataProvider
          .getList(resource, {
            pagination: { page: 1, perPage: 300 },
            sort: { field: "id", order: "ASC" },
            filter,
          })
          .then((r) => r.data as Datensatz[]);

      const sehtestBis = heute.subtract(FRISTEN.sehtestMonate, "month");
      const sehtestVon = sehtestBis.subtract(1, "month");

      const [
        nichtAbgeholt,
        ueberfaellig,
        neueKunden,
        gleitsicht,
        clKontrolle,
        sehtestFenster,
      ] = await Promise.all([
        liste("brille", {
          "Fertig@lte": vor(FRISTEN.nichtAbgeholtTage),
          "Abholung@is": "null",
        }),
        liste("brille", {
          "Datum@lte": vor(FRISTEN.ueberfaelligTage),
          "Datum@gte": isoTag(
            heute.subtract(FRISTEN.ueberfaelligBisMonate, "month"),
          ),
          "Fertig@is": "null",
          "Abholung@is": "null",
        }),
        // zuletzt angelegte Kunden (neueste zuerst)
        dataProvider
          .getList("kunde", {
            pagination: { page: 1, perPage: MAX_ZEILEN },
            sort: { field: "id", order: "DESC" },
            filter: {},
          })
          .then((r) => r.data as Kunde[]),
        liste("brille", {
          "Abholung@gte": vor(FRISTEN.gleitsichtBisTage),
          "Abholung@lte": vor(FRISTEN.gleitsichtVonTage),
          "BrillenArt@ilike": "*gleitsicht*",
        }),
        liste("kontaktlinse", {
          "Nachkontrolltermin@gte": vor(FRISTEN.nachkontrolleVorTage),
          "Nachkontrolltermin@lte": isoTag(
            heute.add(FRISTEN.nachkontrolleNachTage, "day"),
          ),
        }),
        liste("brille", {
          "Datum@gte": isoTag(sehtestVon),
          "Datum@lt": isoTag(sehtestBis),
        }),
      ]);

      // Sehtest: Kunden mit neuerer Brille fallen heraus
      const sehtestKunden = [
        ...new Set(sehtestFenster.map((b) => b.kunde_id).filter(Boolean)),
      ];
      const neuere =
        sehtestKunden.length > 0
          ? await liste("brille", {
              "kunde_id@in": `(${sehtestKunden.join(",")})`,
              "Datum@gte": isoTag(sehtestBis),
            })
          : [];
      const sehtest = sehtestFaellig(
        sehtestFenster as { kunde_id?: number; Datum?: string }[],
        neuere as { kunde_id?: number; Datum?: string }[],
      );

      const alleAuftraege = [
        ...nichtAbgeholt,
        ...ueberfaellig,
        ...gleitsicht,
        ...clKontrolle,
      ];
      const kundeIds = [
        ...new Set([
          ...alleAuftraege.map((a) => a.kunde_id).filter((id) => id != null),
          ...sehtest.map((s) => s.kundeId),
        ]),
      ] as (number | string)[];
      const kunden =
        kundeIds.length > 0
          ? ((await dataProvider.getMany("kunde", { ids: kundeIds }))
              .data as Kunde[])
          : [];
      const kundeVon = new Map(kunden.map((k) => [String(k.id), k]));
      const k = (id: unknown) => kundeVon.get(String(id ?? ""));
      const nachDatum = (feld: string) => (x: Datensatz, y: Datensatz) =>
        String(x[feld] ?? "").localeCompare(String(y[feld] ?? ""));

      const ergebnis: Liste[] = [
        {
          titel: "Nicht abgeholt",
          hinweis: `fertig seit über ${FRISTEN.nichtAbgeholtTage} Tagen`,
          leer: "Keine Brille wartet zu lange.",
          zeilen: [...nichtAbgeholt].sort(nachDatum("Fertig")).map((b) => ({
            key: `b${b.id}`,
            ziel: `/brille/${b.id}/show`,
            kunde: k(b.kunde_id),
            detail: `fertig seit ${datum(b.Fertig)} · ${String(b.BrillenArt ?? "Brille")}`,
            nachricht: NACHRICHTEN.abholen,
          })),
        },
        {
          titel: "Überfällige Aufträge",
          hinweis: `seit über ${FRISTEN.ueberfaelligTage} Tagen nicht fertig`,
          leer: "Keine überfälligen Aufträge.",
          zeilen: ueberfaellig
            .filter((b) => istFertigungsauftrag(b.BrillenArt))
            .sort(nachDatum("Datum"))
            .map((b) => ({
              key: `u${b.id}`,
              ziel: `/brille/${b.id}/show`,
              kunde: k(b.kunde_id),
              detail: `Auftrag ${datum(b.Datum)} · ${
                b.Bestellt
                  ? `bestellt ${datum(b.Bestellt)}`
                  : "noch nicht bestellt"
              }`,
            })),
        },
        {
          titel: "Zuletzt angelegte Kunden",
          hinweis: "die neuesten Kunden zuerst",
          leer: "Noch keine Kunden angelegt.",
          ohneZahl: true,
          zeilen: neueKunden.map((kunde) => ({
            key: `n${kunde.id}`,
            ziel: `/kunde/${kunde.id}/show`,
            kunde,
            detail: [
              kunde.KundenNummer ? `Kd.-Nr. ${String(kunde.KundenNummer)}` : "",
              `angelegt ${datum(kunde.Aufnahmedatum ?? kunde.created_at)}`,
            ]
              .filter(Boolean)
              .join(" · "),
          })),
        },
        {
          titel: "Nachkontrollen",
          hinweis: "Kontaktlinsen-Termine und Gleitsicht-Eingewöhnung",
          leer: "Keine Nachkontrollen fällig.",
          zeilen: [
            ...[...clKontrolle]
              .sort(nachDatum("Nachkontrolltermin"))
              .map((c) => ({
                key: `c${c.id}`,
                ziel: `/kontaktlinse/${c.id}/show`,
                kunde: k(c.kunde_id),
                detail: `CL-Nachkontrolle ${datum(c.Nachkontrolltermin)}`,
              })),
            ...gleitsicht
              .filter((b) => istGleitsicht(b.BrillenArt))
              .sort(nachDatum("Abholung"))
              .map((b) => ({
                key: `g${b.id}`,
                ziel: `/brille/${b.id}/show`,
                kunde: k(b.kunde_id),
                detail: `Gleitsicht abgeholt ${datum(b.Abholung)} – nachfragen`,
                nachricht: NACHRICHTEN.gleitsicht,
              })),
          ],
        },
        {
          titel: "Sehtest-Erinnerung",
          hinweis: `letzte Brille vor ${FRISTEN.sehtestMonate} Monaten, mit Werbeeinwilligung`,
          leer: "Diesen Monat niemand fällig.",
          zeilen: sehtest
            .map((s) => ({ s, kunde: k(s.kundeId) }))
            .filter(({ kunde }) => kunde && kunde.Werbeeinwilligung !== false)
            .map(({ s, kunde }) => ({
              key: `s${s.kundeId}`,
              ziel: `/kunde/${s.kundeId}/show`,
              kunde,
              detail: `letzte Brille ${datum(s.datum)}`,
              nachricht: NACHRICHTEN.sehtest,
            })),
        },
      ];
      if (!abgebrochen) {
        setListen(ergebnis);
        setFehler(false);
      }
    };
    laden().catch((err) => {
      console.error("Aufgaben im Dashboard konnten nicht geladen werden", err);
      if (!abgebrochen) setFehler(true);
    });
    return () => {
      abgebrochen = true;
    };
  }, [dataProvider, stand]);

  if (fehler)
    return (
      <Typography variant="body2" color="error">
        „Heute zu tun“ konnte nicht geladen werden.
      </Typography>
    );
  if (!listen) return null;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <Typography
        component="h2"
        sx={{ fontSize: 17, fontWeight: 700, px: 0.5, mt: 0.5 }}
      >
        Heute zu tun
      </Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            md: "repeat(2, minmax(0, 1fr))",
            xl: "repeat(3, minmax(0, 1fr))",
          },
          gap: 1.75,
        }}
      >
        {listen.map((liste) => (
          <AufgabenKarte key={liste.titel} liste={liste} />
        ))}
      </Box>
    </Box>
  );
};
