// Upload von Betriebsstempel und Unterschrift (Seite "Betriebsdaten").
// Die Bilder liegen privat in der Datenbank und erscheinen in Formularen
// mit Stempel-/Unterschriftsfeld (z. B. Rezeptanfrage an den Augenarzt).
import { useEffect, useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import { useNotify } from "react-admin";
import {
  ladeBetriebBilder,
  loescheBetriebBild,
  speichereBetriebBild,
} from "./betriebBilder";
import {
  type BetriebBildName,
  type BetriebBilder as Bilder,
  bildUrl,
} from "./betriebBilderCache";

const FELDER: { name: BetriebBildName; label: string }[] = [
  { name: "stempel", label: "Betriebsstempel" },
  { name: "unterschrift", label: "Unterschrift" },
];

export const BetriebBilderFeld = () => {
  const notify = useNotify();
  const [bilder, setBilder] = useState<Bilder>({});
  const [laedt, setLaedt] = useState(false);

  useEffect(() => {
    ladeBetriebBilder()
      .then(setBilder)
      .catch(() => undefined);
  }, []);

  const aendern = async (aktion: () => Promise<void>, meldung: string) => {
    setLaedt(true);
    try {
      await aktion();
      setBilder({ ...(await ladeBetriebBilder()) });
      notify(meldung);
    } catch (fehler) {
      notify(
        fehler instanceof Error
          ? fehler.message
          : "Das Bild konnte nicht gespeichert werden.",
        { type: "error" },
      );
    } finally {
      setLaedt(false);
    }
  };

  return (
    <Box sx={{ display: "flex", gap: 4, flexWrap: "wrap", py: 1 }}>
      {FELDER.map(({ name, label }) => {
        const url = bildUrl(bilder[name]);
        return (
          <Box key={name} sx={{ minWidth: 220 }}>
            <Typography sx={{ fontSize: "0.85rem", mb: 0.5 }}>
              {label}
            </Typography>
            <Box
              sx={{
                width: 220,
                height: 110,
                border: "1px dashed #bbb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mb: 1,
                bgcolor: "#fff",
              }}
            >
              {url ? (
                <img
                  src={url}
                  alt={label}
                  style={{ maxWidth: "100%", maxHeight: "100%" }}
                />
              ) : (
                <Typography sx={{ color: "#888", fontSize: "0.8rem" }}>
                  noch kein Bild
                </Typography>
              )}
            </Box>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button
                size="small"
                variant="outlined"
                component="label"
                disabled={laedt}
              >
                {url ? "Ersetzen" : "Hochladen"}
                <input
                  type="file"
                  hidden
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(ev) => {
                    const datei = ev.target.files?.[0];
                    ev.target.value = "";
                    if (datei)
                      void aendern(
                        () => speichereBetriebBild(name, datei),
                        `${label} gespeichert.`,
                      );
                  }}
                />
              </Button>
              {url && (
                <Button
                  size="small"
                  color="error"
                  disabled={laedt}
                  onClick={() =>
                    void aendern(
                      () => loescheBetriebBild(name),
                      `${label} entfernt.`,
                    )
                  }
                >
                  Entfernen
                </Button>
              )}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};
