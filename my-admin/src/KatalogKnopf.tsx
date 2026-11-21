// Knopf "Poloptic-Katalog" (nur öffnen, ohne Sprung auf eine Seite) (Glasassistent, Beratungsbilder) und das
// Upload-Feld auf der Seite "Betriebsdaten".
import { useEffect, useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import { useNotify } from "react-admin";
import {
  katalogVorhanden,
  loescheKatalog,
  oeffneKatalog,
  speichereKatalog,
} from "./infomaterial";

const meldung = (fehler: unknown, sonst: string) =>
  fehler instanceof Error ? fehler.message : sonst;

export const KatalogKnopf = ({
  variant = "text",
}: {
  variant?: "text" | "outlined" | "contained";
}) => {
  const notify = useNotify();
  return (
    <Button
      variant={variant}
      startIcon={<MenuBookIcon />}
      onClick={() => {
        oeffneKatalog().catch((fehler) =>
          notify(meldung(fehler, "Der Katalog konnte nicht geöffnet werden."), {
            type: "warning",
          }),
        );
      }}
    >
      Poloptic-Katalog
    </Button>
  );
};

export const KatalogUploadFeld = () => {
  const notify = useNotify();
  const [vorhanden, setVorhanden] = useState(false);
  const [laedt, setLaedt] = useState(false);

  useEffect(() => {
    katalogVorhanden()
      .then(setVorhanden)
      .catch(() => undefined);
  }, []);

  const aendern = async (aktion: () => Promise<void>, text: string) => {
    setLaedt(true);
    try {
      await aktion();
      setVorhanden(await katalogVorhanden());
      notify(text);
    } catch (fehler) {
      notify(meldung(fehler, "Der Katalog konnte nicht gespeichert werden."), {
        type: "error",
      });
    } finally {
      setLaedt(false);
    }
  };

  return (
    <Box sx={{ py: 1 }}>
      <Typography sx={{ fontSize: "0.85rem", mb: 1 }}>
        {vorhanden
          ? "Poloptic-Katalog ist hochgeladen."
          : "Noch kein Poloptic-Katalog hochgeladen (PDF, höchstens 50 MB)."}
      </Typography>
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
        <Button
          size="small"
          variant="outlined"
          component="label"
          disabled={laedt}
        >
          {laedt ? "Wird hochgeladen …" : vorhanden ? "Ersetzen" : "Hochladen"}
          <input
            type="file"
            hidden
            accept="application/pdf,.pdf"
            onChange={(ev) => {
              const datei = ev.target.files?.[0];
              ev.target.value = "";
              if (datei)
                void aendern(
                  () => speichereKatalog(datei),
                  "Katalog gespeichert.",
                );
            }}
          />
        </Button>
        {vorhanden && <KatalogKnopf />}
        {vorhanden && (
          <Button
            size="small"
            color="error"
            disabled={laedt}
            onClick={() =>
              void aendern(() => loescheKatalog(), "Katalog entfernt.")
            }
          >
            Entfernen
          </Button>
        )}
      </Box>
    </Box>
  );
};
