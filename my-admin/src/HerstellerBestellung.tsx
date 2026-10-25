import { useEffect, useMemo, useState } from "react";
import {
  useDataProvider,
  useGetList,
  useGetOne,
  useNotify,
  useRefresh,
} from "react-admin";
import {
  Box,
  Button,
  ButtonBase,
  MenuItem,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import {
  BESTELL_WERTE,
  bestellSeiten,
  bestellText,
  bestellWert,
  glasAngaben,
  kommission,
  passenderHersteller,
  portalUrl,
} from "./bestellDaten";
import { heuteIso } from "./AuftragsstatusLeiste";

/*
 * Bestelloptionen -> "Bestellung im Herstellerportal": Hersteller wählen,
 * Portal öffnen (Adresse wird einmal je Hersteller gespeichert) und die
 * Bestelldaten per Klick kopieren - einzeln oder alle auf einmal. Danach
 * "Als bestellt markieren" (Gläser "bestellt", Auftrag "Bestellt" = heute).
 */

type Datensatz = Record<string, unknown> & { id: number | string };
type Hersteller = {
  id: string;
  code?: string | null;
  name?: string | null;
  bestellportal_url?: string | null;
};

const LETZTER = "bestellportal-hersteller";

const leseLetzten = () => {
  try {
    return localStorage.getItem(LETZTER) ?? "";
  } catch {
    return "";
  }
};

const Kopierbar = ({
  wert,
  kopiere,
  breit,
}: {
  wert: string;
  kopiere: (wert: string) => void;
  breit?: boolean;
}) => (
  <Tooltip title={wert ? "Klicken zum Kopieren" : ""}>
    <ButtonBase
      disabled={!wert}
      onClick={() => kopiere(wert)}
      sx={(theme) => ({
        justifyContent: breit ? "flex-start" : "flex-end",
        px: 0.75,
        minHeight: 26,
        width: "100%",
        borderRadius: "3px",
        fontSize: "0.85rem",
        fontVariantNumeric: "tabular-nums",
        bgcolor: theme.palette.mode === "dark" ? "action.hover" : "#e8eef6",
        "&:hover": { bgcolor: "action.selected" },
      })}
    >
      {wert}
    </ButtonBase>
  </Tooltip>
);

export const HerstellerBestellung = ({
  brille,
  kunde,
  glastyp,
  fassung,
  augen,
}: {
  brille: Datensatz;
  kunde?: Datensatz;
  glastyp?: Datensatz;
  fassung?: Datensatz;
  augen: { seite: string; glas?: Datensatz }[];
}) => {
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const refresh = useRefresh();
  const { data: hersteller = [] } = useGetList<Hersteller>("glashersteller", {
    pagination: { page: 1, perPage: 200 },
    sort: { field: "name", order: "ASC" },
  });
  const { data: katalog } = useGetOne(
    "glaskatalog",
    { id: glastyp?.glaskatalog_id },
    { enabled: Boolean(glastyp?.glaskatalog_id) },
  );
  const vorschlag = useMemo(
    () =>
      passenderHersteller(
        hersteller,
        katalog?.glashersteller_id,
        glastyp?.Hersteller,
      )?.id ??
      (hersteller.some((h) => h.id === leseLetzten()) ? leseLetzten() : ""),
    [hersteller, katalog, glastyp],
  );
  const [gewaehlt, setGewaehlt] = useState<string | null>(null);
  const herstellerId = gewaehlt ?? vorschlag;
  const aktuell = hersteller.find((h) => h.id === herstellerId);
  const [adresse, setAdresse] = useState("");
  useEffect(() => {
    setAdresse(aktuell?.bestellportal_url ?? "");
  }, [aktuell?.id, aktuell?.bestellportal_url]);
  const [laeuft, setLaeuft] = useState(false);

  const kopiere = (wert: string, meldung?: string) => {
    navigator.clipboard
      ?.writeText(wert)
      .then(() =>
        notify(meldung ?? `„${wert}“ kopiert.`, {
          type: "info",
          autoHideDuration: 2500,
        }),
      )
      .catch(() => notify("Kopieren nicht möglich.", { type: "warning" }));
  };

  const alles = bestellText({
    kunde,
    auftragId: brille.id,
    glastyp,
    fassung,
    augen,
  });

  const adresseSpeichern = async () => {
    if (!aktuell || (aktuell.bestellportal_url ?? "") === adresse.trim())
      return;
    try {
      await dataProvider.update("glashersteller", {
        id: aktuell.id,
        data: { bestellportal_url: adresse.trim() || null },
        previousData: aktuell,
      });
      notify(
        `Portal-Adresse für ${aktuell.name ?? aktuell.code} gespeichert.`,
        {
          type: "success",
        },
      );
    } catch {
      notify("Portal-Adresse konnte nicht gespeichert werden.", {
        type: "error",
      });
    }
  };

  const portalOeffnen = () => {
    const url = portalUrl(adresse);
    if (!url) return;
    navigator.clipboard?.writeText(alles).catch(() => undefined);
    const fenster = window.open(url, "unicorn-bestellportal");
    if (fenster) fenster.opener = null;
    notify(
      "Portal geöffnet. Alle Bestelldaten sind kopiert – einzelne Werte hier anklicken zum Kopieren.",
      { type: "info", autoHideDuration: 8000 },
    );
  };

  const seiten = bestellSeiten(augen);

  const alsBestellt = async () => {
    setLaeuft(true);
    try {
      await Promise.all(
        seiten.map(({ glas }) =>
          dataProvider.update("glass", {
            id: glas!.id,
            data: { Auftragsstatus: "bestellt" },
            previousData: glas!,
          }),
        ),
      );
      if (!brille.Bestellt) {
        await dataProvider.update("brille", {
          id: brille.id,
          data: { Bestellt: heuteIso() },
          previousData: brille,
        });
      }
      notify("Als bestellt markiert.", { type: "success" });
      refresh();
    } catch {
      notify("Status konnte nicht gespeichert werden.", { type: "error" });
    } finally {
      setLaeuft(false);
    }
  };

  const titel = {
    fontStyle: "italic",
    fontSize: "0.75rem",
    color: "text.secondary",
  } as const;

  return (
    <Box
      sx={{
        mt: 2.5,
        pt: 2,
        borderTop: "1px solid",
        borderColor: "divider",
        display: "flex",
        flexDirection: "column",
        gap: 1.25,
      }}
    >
      <Typography sx={{ fontWeight: 700 }}>
        Bestellung im Herstellerportal
      </Typography>
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
        <TextField
          select
          size="small"
          label="Hersteller"
          value={
            hersteller.some((h) => h.id === herstellerId) ? herstellerId : ""
          }
          onChange={(ev) => {
            setGewaehlt(ev.target.value);
            try {
              localStorage.setItem(LETZTER, ev.target.value);
            } catch {
              // nur die Vorauswahl geht verloren
            }
          }}
          sx={{ minWidth: 200, flex: "1 1 200px" }}
        >
          {hersteller.map((h) => (
            <MenuItem key={h.id} value={h.id}>
              {h.name || h.code}
              {h.code && h.name ? ` (${h.code})` : ""}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          size="small"
          label="Portal-Adresse"
          placeholder="z. B. shop.hersteller.de"
          value={adresse}
          disabled={!aktuell}
          onChange={(ev) => setAdresse(ev.target.value)}
          onBlur={adresseSpeichern}
          sx={{ flex: "2 1 240px" }}
        />
        <Button
          variant="contained"
          startIcon={<OpenInNewIcon />}
          disabled={!portalUrl(adresse)}
          onClick={portalOeffnen}
        >
          Portal öffnen
        </Button>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "110px minmax(0, 1fr)",
          gap: "4px 8px",
          alignItems: "center",
        }}
      >
        <Box sx={titel}>Kommission</Box>
        <Kopierbar
          breit
          wert={kommission(kunde, brille.id)}
          kopiere={(w) => kopiere(w)}
        />
        {glasAngaben(glastyp, fassung).map(([name, wert]) => [
          <Box key={`${name}-t`} sx={titel}>
            {name}
          </Box>,
          <Kopierbar
            key={`${name}-w`}
            breit
            wert={wert}
            kopiere={(w) => kopiere(w)}
          />,
        ])}
      </Box>

      <Box sx={{ overflowX: "auto" }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: `60px repeat(${BESTELL_WERTE.length}, minmax(52px, 1fr))`,
            gap: "4px",
            alignItems: "center",
            minWidth: 560,
          }}
        >
          <span />
          {BESTELL_WERTE.map((w) => (
            <Box key={w.feld} sx={{ ...titel, textAlign: "right", pr: 0.75 }}>
              {w.titel}
            </Box>
          ))}
          {seiten.map(({ seite, glas }) => [
            <Box key={`${seite}-n`} sx={{ fontWeight: 600 }}>
              {seite === "R" ? "Rechts" : "Links"}
            </Box>,
            ...BESTELL_WERTE.map((w) => (
              <Kopierbar
                key={`${seite}-${w.feld}`}
                wert={bestellWert(glas?.[w.feld], w)}
                kopiere={(wert) => kopiere(wert)}
              />
            )),
          ])}
        </Box>
        {seiten.length === 0 && (
          <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
            Noch keine Glaswerte eingetragen.
          </Typography>
        )}
      </Box>

      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
        <Button
          startIcon={<ContentCopyIcon />}
          onClick={() => kopiere(alles, "Alle Bestelldaten kopiert.")}
        >
          Alle Bestelldaten kopieren
        </Button>
        <Button
          startIcon={<TaskAltIcon />}
          disabled={laeuft || seiten.length === 0}
          onClick={alsBestellt}
        >
          Als bestellt markieren
        </Button>
      </Box>
    </Box>
  );
};
