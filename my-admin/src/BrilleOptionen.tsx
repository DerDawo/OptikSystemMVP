import { ReactNode, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRecordContext, useSidebarState } from "react-admin";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Typography,
} from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import { OptionenMenu } from "./PrismaMenues";
import { KarteikarteKopierenButton } from "./KarteikarteKopieren";
import {
  AuftragszettelButton,
  BerechtigungsscheinErstellenButton,
  FormulareButton,
  MahnungErstellenButton,
  WerkstattauftragButton,
} from "./FormulareDialog";
import { KK_RECHNER_OEFFNEN } from "./KassenanteilRechner";
import { BRILLENPASS_OEFFNEN } from "./BrillenpassButton";

/*
 * "Optionen ▾" der Brillenkartei im Aufbau des Prisma-Menüs. Vorhandene
 * Funktionen sind verknüpft; Einträge, die es in UNICORN noch nicht gibt,
 * stehen grau mit "folgt" da.
 */

const Folgt = ({ children }: { children: ReactNode }) => (
  <Button disabled sx={{ justifyContent: "space-between !important" }}>
    <span>{children}</span>
    <Typography component="span" variant="caption" sx={{ ml: 2 }}>
      folgt
    </Typography>
  </Button>
);

// Feld der Karteikarte ansteuern (z. B. Rabatt-Auswahl öffnen) - erst nach
// dem Schließen des Menüs, sonst springt der Fokus zurück
const fokussiere = (name: string) =>
  window.setTimeout(() => {
    const feld =
      document.querySelector<HTMLElement>(
        `[role="combobox"][aria-label="${name}"]`,
      ) ?? document.querySelector<HTMLElement>(`[aria-label="${name}"]`);
    if (!feld) return;
    feld.scrollIntoView({ block: "center", behavior: "smooth" });
    // Auswahllisten öffnen sich bei mousedown, Textfelder beim Fokus
    feld.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    feld.focus();
  }, 250);

const BaumButton = () => {
  const [offen, setOffen] = useSidebarState();
  return <Button onClick={() => setOffen(!offen)}>Baum ein-/ausblenden</Button>;
};

const AlteMemoButton = () => {
  const brille = useRecordContext();
  const [offen, setOffen] = useState(false);
  const memo = String(brille?.PrismaAngaben ?? "").trim();
  return (
    <>
      <Button onClick={() => setOffen(true)}>1 Alte Memo</Button>
      <Dialog
        open={offen}
        onClose={() => setOffen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Alte Memo (aus Prisma)</DialogTitle>
        <DialogContent>
          <Box sx={{ whiteSpace: "pre-wrap", fontSize: "0.95rem" }}>
            {memo || "Für diesen Auftrag gibt es keine alte Memo."}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOffen(false)}>Schließen</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export const BrilleOptionenMenu = () => {
  const navigate = useNavigate();
  return (
    <OptionenMenu>
      <Folgt>Konformität</Folgt>
      <Button
        onClick={() =>
          window.setTimeout(
            () => window.dispatchEvent(new Event(KK_RECHNER_OEFFNEN)),
            250,
          )
        }
      >
        Positionen Krankenkasse
      </Button>
      <KarteikarteKopierenButton nurGlaswerte label="Optische Werte kopieren" />
      <KarteikarteKopierenButton label="Karteiwerte kopieren" />
      <Folgt>Merker</Folgt>
      <BaumButton />
      <Folgt>CL Katalog</Folgt>
      <FormulareButton label="Dokumente" />
      <Button onClick={() => navigate("/fassung")}>
        Fassungsmodell suchen
      </Button>
      <Divider />
      <Folgt>Kennwort</Folgt>
      <Button onClick={() => navigate("/betrieb/1")}>Voreinstellungen</Button>
      <Divider />
      <AlteMemoButton />
      <Folgt>2 Auftrag stornieren</Folgt>
      <Folgt>3 Auftrag zu anderem Kunden verschieben</Folgt>
      <Button
        onClick={() =>
          window.setTimeout(
            () => window.dispatchEvent(new Event(BRILLENPASS_OEFFNEN)),
            250,
          )
        }
      >
        4 Digitalen Brillenpass senden
      </Button>
      <Folgt>5 Medikamentenauskunft</Folgt>
      <Folgt>6 Mwst-Satz ändern</Folgt>
      <Folgt>7 Protokoll der Änderungen</Folgt>
      <Button onClick={() => fokussiere("Rabatt")}>8 Rabatt eintragen</Button>
      <Folgt>9 Rechnungsdatum ändern</Folgt>
      <Button onClick={() => fokussiere("Refraktion")}>
        10 Refraktion zuordnen
      </Button>
      <Button onClick={() => fokussiere("Zahlungsstatus")}>
        11 Zahlungsbuchungen anzeigen
      </Button>
      <Divider />
      <BerechtigungsscheinErstellenButton />
      <WerkstattauftragButton />
      <AuftragszettelButton />
      <MahnungErstellenButton />
      <Button startIcon={<PrintIcon />} onClick={() => window.print()}>
        Drucken
      </Button>
    </OptionenMenu>
  );
};
