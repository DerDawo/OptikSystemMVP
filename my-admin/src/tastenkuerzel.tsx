import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRefresh } from "react-admin";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@mui/material";

/*
 * Tastenkürzel wie in Prisma, aber mit Alt (Mac: Option), weil Chrome die
 * meisten Strg-Kürzel selbst belegt. Geprüft wird die Taste (event.code),
 * nicht das Zeichen, da Alt/Option auf dem Mac Sonderzeichen erzeugt.
 */

type Kuerzel = Record<string, () => void>;

const tasteAusCode = (code: string) =>
  code.startsWith("Key") ? code.slice(3).toLowerCase() : "";

export const useTastenkuerzel = (kuerzel: Kuerzel) => {
  const aktuell = useRef(kuerzel);
  useEffect(() => {
    aktuell.current = kuerzel;
  });
  useEffect(() => {
    const beiTaste = (event: KeyboardEvent) => {
      if (!event.altKey || event.ctrlKey || event.metaKey || event.repeat)
        return;
      const aktion = aktuell.current[tasteAusCode(event.code)];
      if (!aktion) return;
      event.preventDefault();
      aktion();
    };
    window.addEventListener("keydown", beiTaste);
    return () => window.removeEventListener("keydown", beiTaste);
  }, []);
};

const UEBERSICHT: [string, string][] = [
  ["Alt + K", "Kundensuche"],
  ["Alt + N", "Neuen Kunden anlegen"],
  ["Alt + T", "Terminkalender"],
  ["Alt + M", "Nachricht an den geöffneten Kunden"],
  ["Alt + B", "Neue Brille für den geöffneten Kunden"],
  ["Alt + L", "Neue Kontaktlinsen für den geöffneten Kunden"],
  ["Alt + E", "Neuer Termin für den geöffneten Kunden"],
  ["Alt + R", "Daten neu laden (wie der Knopf ⟳ oben rechts)"],
  ["Alt + H", "Diese Übersicht"],
];

// Kürzel, die überall gelten, und die Übersicht (Alt + H)
export const GlobaleTastenkuerzel = () => {
  const navigate = useNavigate();
  const refresh = useRefresh();
  const [hilfeOffen, setHilfeOffen] = useState(false);
  useTastenkuerzel({
    k: () => navigate("/search"),
    n: () => navigate("/kunde/create"),
    t: () => navigate("/kalender"),
    // Lädt die angezeigten Daten neu, ohne die Seite neu zu laden
    // (Eingaben in offenen Formularen bleiben erhalten).
    r: () => refresh(),
    h: () => setHilfeOffen((offen) => !offen),
  });
  return (
    <Dialog open={hilfeOffen} onClose={() => setHilfeOffen(false)}>
      <DialogTitle>Tastenkürzel</DialogTitle>
      <DialogContent>
        <Table size="small">
          <TableBody>
            {UEBERSICHT.map(([taste, wirkung]) => (
              <TableRow key={taste}>
                <TableCell sx={{ whiteSpace: "nowrap", fontWeight: 600 }}>
                  {taste}
                </TableCell>
                <TableCell>{wirkung}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
};
