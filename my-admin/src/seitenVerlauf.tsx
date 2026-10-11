import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import type { Identifier } from "react-admin";

// Merkt sich die zuletzt besuchte Seite, damit "Speichern" in einem
// Bearbeiten-Formular dorthin zurückführt, von wo aus bearbeitet wurde (z. B.
// zur Brillenkartei des Auftrags), statt auf die Liste.

let aktuelle: string | null = null;
let vorherige: string | null = null;

export const SeitenVerlauf = () => {
  const { pathname, search } = useLocation();
  useEffect(() => {
    const neu = pathname + search;
    if (neu !== aktuelle) {
      vorherige = aktuelle;
      aktuelle = neu;
    }
  }, [pathname, search]);
  return null;
};

// redirect-Funktion für <Edit>: zurück zur vorherigen Seite, sonst zur
// Ansicht des Datensatzes
export const zurueckNachSpeichern = (
  resource?: string,
  id?: Identifier,
): string => {
  const ansicht = `/${resource}/${id}/show`;
  if (!vorherige) return ansicht;
  const pfad = vorherige.split("?")[0];
  // nicht zurück ins Formular selbst, zur Anmeldung oder zu einer Neuanlage
  if (
    pfad === `/${resource}/${id}` ||
    pfad.startsWith("/login") ||
    pfad.endsWith("/create")
  )
    return ansicht;
  return vorherige;
};
