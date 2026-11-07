import { useState } from "react";
import { useNotify, useRecordContext, useRedirect } from "react-admin";
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { supabase } from "./utils";
import { DOKUMENT_BUCKET } from "./kundeDokumenteSpeicher";
import { kundeLoeschSperre } from "./kundeLoeschen";

/*
 * "Kunde löschen" auf der Kundenseite. Vorher wird geprüft, ob Aufträge,
 * abgerechnete Rezepte oder Fundusberichte bestehen (dann gesperrt).
 * Beim Löschen gehen Dokumente samt Dateien, Brillenversicherungen und
 * Kontaktlinsen-Karteien mit; Termine bleiben ohne Kundenbezug erhalten.
 */

const anzahl = async (tabelle: string, spalte: string, id: number) => {
  const { count, error } = await supabase
    .from(tabelle)
    .select("id", { count: "exact", head: true })
    .eq(spalte, id);
  if (error) throw error;
  return count ?? 0;
};

export const KundeLoeschenButton = () => {
  const kunde = useRecordContext();
  const notify = useNotify();
  const redirect = useRedirect();
  const [offen, setOffen] = useState(false);
  const [sperre, setSperre] = useState<string | null>(null);
  const [arbeitet, setArbeitet] = useState(false);
  const id = kunde?.id as number | undefined;
  if (id == null) return null;
  const name =
    [kunde?.Vorname, kunde?.Nachname].filter(Boolean).join(" ") ||
    `Kunde ${id}`;

  const pruefen = async () => {
    setArbeitet(true);
    try {
      const [brillen, kontaktlinsen, kassenrezepte, fundusberichte] =
        await Promise.all([
          anzahl("brille", "kunde_id", id),
          // nur abgerechnete Kontaktlinsen sind Belege, Karteien gehen mit
          supabase
            .from("kontaktlinse")
            .select("id", { count: "exact", head: true })
            .eq("kunde_id", id)
            .not("Rechnungsnummer", "is", null)
            .then(({ count, error }) => {
              if (error) throw error;
              return count ?? 0;
            }),
          anzahl("kassenrezept", "kunde_id", id),
          anzahl("fundusbericht", "kunde_id", id),
        ]);
      setSperre(
        kundeLoeschSperre({
          brillen,
          kontaktlinsen,
          kassenrezepte,
          fundusberichte,
        }),
      );
      setOffen(true);
    } catch (fehler) {
      notify(`Prüfung fehlgeschlagen: ${(fehler as Error).message}`, {
        type: "error",
      });
    }
    setArbeitet(false);
  };

  const loeschen = async () => {
    setArbeitet(true);
    try {
      // Dateien der Dokumente zuerst, die Einträge löscht die Datenbank mit
      const { data: dokumente, error: dokFehler } = await supabase
        .from("kunde_dokument")
        .select("Pfad")
        .eq("kunde_id", id);
      if (dokFehler) throw dokFehler;
      const pfade = (dokumente ?? []).map((d) => d.Pfad as string);
      if (pfade.length > 0) {
        const { error } = await supabase.storage
          .from(DOKUMENT_BUCKET)
          .remove(pfade);
        if (error) throw error;
      }
      // Termine bleiben im Kalender, nur ohne Kunde
      const { error: terminFehler } = await supabase
        .from("termin")
        .update({ kunde_id: null })
        .eq("kunde_id", id);
      if (terminFehler) throw terminFehler;
      const { error } = await supabase.from("kunde").delete().eq("id", id);
      if (error) throw error;
      notify(`${name} gelöscht.`, { type: "success" });
      setOffen(false);
      redirect("list", "kunde");
    } catch (fehler) {
      notify(
        `Kunde konnte nicht gelöscht werden: ${(fehler as Error).message}`,
        {
          type: "error",
        },
      );
    }
    setArbeitet(false);
  };

  return (
    <>
      <Button
        color="error"
        startIcon={
          arbeitet && !offen ? (
            <CircularProgress size={16} />
          ) : (
            <DeleteOutlineIcon />
          )
        }
        disabled={arbeitet}
        onClick={() => void pruefen()}
      >
        Kunde löschen
      </Button>
      <Dialog open={offen} onClose={() => !arbeitet && setOffen(false)}>
        <DialogTitle>
          {sperre ? "Kunde kann nicht gelöscht werden" : `${name} löschen?`}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {sperre ??
              "Der Kunde wird endgültig gelöscht, zusammen mit seinen Dokumenten, Brillenversicherungen und Kontaktlinsen-Karteien. Termine bleiben im Kalender ohne Kunde. Das lässt sich nicht rückgängig machen."}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button disabled={arbeitet} onClick={() => setOffen(false)}>
            {sperre ? "Schließen" : "Abbrechen"}
          </Button>
          {!sperre && (
            <Button
              color="error"
              variant="contained"
              disabled={arbeitet}
              onClick={() => void loeschen()}
              startIcon={arbeitet ? <CircularProgress size={16} /> : undefined}
            >
              Endgültig löschen
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
};
