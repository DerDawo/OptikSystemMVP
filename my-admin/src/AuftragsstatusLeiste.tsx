import { useState } from "react";
import { Confirm, useDataProvider, useNotify } from "react-admin";
import { Box, ButtonBase, Typography } from "@mui/material";
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
import { Speichern } from "./KarteiEingabe";

/*
 * Auftragsstatus oben in der Brillenkartei: drei Knöpfe "Bestellt", "Fertig",
 * "Abgeholt". Ein Klick setzt das heutige Datum (und den Bestellstatus der
 * Gläser), ein Klick auf einen gesetzten Knopf löscht das Datum nach
 * Rückfrage. Daneben: wann ein Kostenvoranschlag/Antrag verschickt wurde und
 * der Haken "genehmigt". Daraus speisen sich die Aufgaben im Dashboard.
 */

type Datensatz = Record<string, unknown> & { id: number };

// Kalendertag (lokal) als "YYYY-MM-DD"
export const heuteIso = () => {
  const d = new Date();
  const zwei = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${zwei(d.getMonth() + 1)}-${zwei(d.getDate())}`;
};

const datumKurz = (wert: unknown) =>
  wert
    ? new Date(String(wert)).toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      })
    : "";

const SCHRITTE = [
  { feld: "Bestellt", titel: "Bestellt", glas: "bestellt" },
  { feld: "Fertig", titel: "Fertig", glas: "eingetroffen" },
  { feld: "Abholung", titel: "Abgeholt", glas: "abgeholt" },
] as const;

export const AuftragsstatusLeiste = ({
  brille,
  auftrag,
}: {
  brille: Datensatz;
  auftrag: (feld: string) => Speichern;
}) => {
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const [loeschen, setLoeschen] = useState<(typeof SCHRITTE)[number] | null>(
    null,
  );
  const [laeuft, setLaeuft] = useState(false);

  // Bestellstatus der Gläser mitziehen (Spalte "Liefern"); Fehler dort
  // halten den Auftragsstatus nicht auf
  const glaeserSetzen = async (status: string) => {
    const ids = [brille.GlasRechts, brille.GlasLinks].filter(
      (id): id is number => typeof id === "number",
    );
    await Promise.all(
      ids.map((id) =>
        dataProvider
          .update("glass", {
            id,
            data: { Auftragsstatus: status },
            previousData: { id },
          })
          .catch(() => undefined),
      ),
    );
  };

  const setze = async (
    schritt: (typeof SCHRITTE)[number],
    wert: string | null,
  ) => {
    setLaeuft(true);
    try {
      if (wert) await glaeserSetzen(schritt.glas);
      await auftrag(schritt.feld)(wert);
    } catch {
      notify(`${schritt.titel}: Änderung konnte nicht gespeichert werden.`, {
        type: "error",
      });
    } finally {
      setLaeuft(false);
    }
  };

  const kvVersendet = brille.KVVersendet;
  const kvGenehmigt = brille.KVGenehmigt === true;

  return (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 0.75,
        mb: 0.75,
        minWidth: 820,
        fontSize: "0.8rem",
      }}
    >
      <Typography
        component="span"
        sx={{
          fontSize: "0.72rem",
          fontStyle: "italic",
          color: "text.secondary",
          width: 95,
          flexShrink: 0,
        }}
      >
        Status
      </Typography>
      {SCHRITTE.map((schritt) => {
        const wert = brille[schritt.feld];
        const gesetzt = Boolean(wert);
        return (
          <ButtonBase
            key={schritt.feld}
            disabled={laeuft}
            onClick={() =>
              gesetzt ? setLoeschen(schritt) : setze(schritt, heuteIso())
            }
            title={
              gesetzt
                ? `${schritt.titel} am ${datumKurz(wert)} – klicken zum Zurücksetzen`
                : `${schritt.titel}: heutiges Datum setzen`
            }
            sx={{
              px: 1.25,
              py: 0.25,
              minHeight: 24,
              borderRadius: "3px",
              fontSize: "0.8rem",
              fontWeight: 700,
              border: "1px solid",
              borderColor: gesetzt ? "#1d4e8f" : "divider",
              bgcolor: gesetzt ? "#1d4e8f" : "background.paper",
              color: gesetzt ? "#fff" : "text.secondary",
              "&:hover": { bgcolor: gesetzt ? "#173f74" : "action.hover" },
            }}
          >
            {gesetzt
              ? `${schritt.titel} ${datumKurz(wert)}`
              : `${schritt.titel} …`}
          </ButtonBase>
        );
      })}
      {Boolean(kvVersendet) && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            ml: 2,
            color: kvGenehmigt ? "text.secondary" : "warning.dark",
          }}
        >
          KV/Antrag verschickt {datumKurz(kvVersendet)}
          <ButtonBase
            disabled={laeuft}
            onClick={() => auftrag("KVGenehmigt")(!kvGenehmigt)}
            aria-pressed={kvGenehmigt}
            sx={{ fontSize: "0.8rem", gap: 0.25, ml: 0.5 }}
          >
            {kvGenehmigt ? (
              <CheckBoxIcon fontSize="small" />
            ) : (
              <CheckBoxOutlineBlankIcon fontSize="small" />
            )}
            genehmigt
          </ButtonBase>
        </Box>
      )}
      <Confirm
        isOpen={loeschen !== null}
        title={`„${loeschen?.titel ?? ""}“ zurücksetzen?`}
        content="Das Datum wird gelöscht, der Auftrag gilt dann wieder als nicht erledigt."
        confirm="Zurücksetzen"
        cancel="Abbrechen"
        onConfirm={() => {
          const schritt = loeschen;
          setLoeschen(null);
          if (schritt) setze(schritt, null);
        }}
        onClose={() => setLoeschen(null)}
      />
    </Box>
  );
};
