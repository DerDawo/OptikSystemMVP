import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import type { Identifier } from "react-admin";

// Verlauf der besuchten Seiten im Programm, für
// - "Speichern" in einem Bearbeiten-Formular: zurück dorthin, von wo aus
//   bearbeitet wurde (z. B. zur Brillenkartei des Auftrags) statt zur Liste,
// - "Zurück": genau zum letzten Bild - bereits verlassene Formulare
//   (Bearbeiten, Neu anlegen) werden dabei übersprungen.

const MAX_EINTRAEGE = 50;
let verlauf: string[] = [];

const pfadOhneSuche = (seite: string) => seite.split("?")[0];

// Bearbeiten-Formular "/kunde/12" oder Neuanlage "/kunde/create"
export const istFormular = (seite: string) => {
  const teile = pfadOhneSuche(seite).split("/").filter(Boolean);
  return teile.length === 2 || pfadOhneSuche(seite).endsWith("/create");
};

export const SeitenVerlauf = () => {
  const { pathname, search } = useLocation();
  useEffect(() => {
    merkeSeite(pathname + search);
  }, [pathname, search]);
  return null;
};

export const merkeSeite = (seite: string) => {
  if (seite.startsWith("/login")) return;
  if (verlauf[verlauf.length - 1] !== seite) {
    verlauf = [...verlauf, seite].slice(-MAX_EINTRAEGE);
  }
};

// Letzte Seite vor der aktuellen, die kein Formular ist und nicht der
// aktuellen Seite entspricht; entfernt die übersprungenen Einträge.
export const zurueckZiel = (): string | null => {
  const aktuell = verlauf.pop();
  while (
    verlauf.length > 0 &&
    (istFormular(verlauf[verlauf.length - 1]) ||
      verlauf[verlauf.length - 1] === aktuell)
  ) {
    verlauf.pop();
  }
  return verlauf[verlauf.length - 1] ?? null;
};

// redirect-Funktion für <Edit>: zurück zur Seite vor dem Formular, sonst zur
// Ansicht des Datensatzes
export const zurueckNachSpeichern = (
  resource?: string,
  id?: Identifier,
): string => {
  const formular = `/${resource}/${id}`;
  for (let i = verlauf.length - 1; i >= 0; i--) {
    const seite = verlauf[i];
    if (pfadOhneSuche(seite) === formular || istFormular(seite)) continue;
    return seite;
  }
  return `${formular}/show`;
};

// nur für Tests
export const setzeVerlaufZurueck = () => {
  verlauf = [];
};
