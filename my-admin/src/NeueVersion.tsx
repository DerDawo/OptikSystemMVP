import { useEffect, useState } from "react";
import { Button, Snackbar } from "@mui/material";

// Hinweis "Neue Version verfügbar": Das Programm bleibt oft den ganzen Tag
// geöffnet und lädt eine neue Version erst beim Neuladen der Seite. Alle
// fünf Minuten und beim Zurückkehren ins Fenster wird geprüft, ob die
// veröffentlichte Startseite auf ein anderes Programmpaket verweist als das
// geladene. Neu geladen wird erst auf Klick, damit keine Eingabe verloren
// geht.

const PAKET = /\/assets\/index-[\w-]+\.js/;
const ABSTAND_MS = 5 * 60_000;

const geladenesPaket = () =>
  Array.from(document.querySelectorAll<HTMLScriptElement>("script[src]"))
    .map((s) => PAKET.exec(new URL(s.src).pathname)?.[0])
    .find(Boolean);

export const NeueVersion = () => {
  const [neu, setNeu] = useState(false);

  useEffect(() => {
    const geladen = geladenesPaket();
    if (!import.meta.env.PROD || !geladen) return;
    let aktiv = true;
    const pruefe = async () => {
      try {
        const antwort = await fetch("/", { cache: "no-store" });
        const veroeffentlicht = PAKET.exec(await antwort.text())?.[0];
        if (aktiv && veroeffentlicht && veroeffentlicht !== geladen)
          setNeu(true);
      } catch {
        // offline o. Ä. - beim nächsten Mal erneut prüfen
      }
    };
    const zeitgeber = window.setInterval(pruefe, ABSTAND_MS);
    const beiFokus = () => {
      if (document.visibilityState === "visible") pruefe();
    };
    document.addEventListener("visibilitychange", beiFokus);
    return () => {
      aktiv = false;
      window.clearInterval(zeitgeber);
      document.removeEventListener("visibilitychange", beiFokus);
    };
  }, []);

  return (
    <Snackbar
      open={neu}
      anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      message="Eine neue Version von UNICORN ist verfügbar."
      action={
        <Button
          color="secondary"
          size="small"
          onClick={() => window.location.reload()}
        >
          Jetzt neu laden
        </Button>
      }
    />
  );
};
