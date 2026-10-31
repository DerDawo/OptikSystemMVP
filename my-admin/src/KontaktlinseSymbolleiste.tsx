import { useNavigate } from "react-router-dom";
import {
  useDataProvider,
  useNotify,
  useRecordContext,
  useRefresh,
} from "react-admin";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import PrintOutlinedIcon from "@mui/icons-material/PrintOutlined";
import SearchIcon from "@mui/icons-material/Search";
import KeyboardReturnIcon from "@mui/icons-material/KeyboardReturn";
import EventOutlinedIcon from "@mui/icons-material/EventOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import { GlassesIcon } from "./icons";
import { Symbol, SymbolleistenRahmen } from "./BrilleSymbolleiste";
import { druckeDirekt } from "./direktDruck";
import { buildKontaktlinseAuftragPrintHtml } from "./kontaktlinseAuftragTemplate";
import { KontaktlinseRechnungButton } from "./KontaktlinseRechnung";
import { zurueckZiel } from "./seitenVerlauf";

/*
 * Symbolleiste am rechten Rand der Kontaktlinsenkartei, gleiches Aussehen
 * wie die der Brillenkartei. Es gibt nur die Symbole, die für einen
 * Kontaktlinsenauftrag funktionieren: Formulare, Brillenpass, KK-Anteil,
 * Werkstattauftrag und Auftragszettel sind auf Brillenaufträge ausgelegt.
 */

export const KontaktlinseSymbolleiste = () => {
  const cl = useRecordContext();
  const navigate = useNavigate();
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const refresh = useRefresh();
  if (!cl) return null;
  const kundeId = cl.kunde_id;
  const neu = (pfad: string) =>
    navigate(pfad, { state: kundeId ? { kunde_id: kundeId } : undefined });

  const heuteAbgeholt = async () => {
    const heute = new Date().toISOString().slice(0, 10);
    try {
      await dataProvider.update("kontaktlinse", {
        id: cl.id,
        data: { Abholung: heute },
        previousData: cl,
      });
      notify("Abholung auf heute gesetzt.", { type: "success" });
      refresh();
    } catch {
      notify("Abholung konnte nicht gespeichert werden.", { type: "error" });
    }
  };

  // Kontaktlinsen-Auftrag als A4-Kartei drucken (statt des Bildschirms)
  const drucken = async () => {
    try {
      const { data: kunde } =
        kundeId != null
          ? await dataProvider.getOne("kunde", { id: kundeId })
          : { data: null };
      druckeDirekt(buildKontaktlinseAuftragPrintHtml({ cl, kunde }));
    } catch {
      notify("Auftrag konnte nicht gedruckt werden.", { type: "error" });
    }
  };

  return (
    <SymbolleistenRahmen>
      <Symbol
        titel="Neuer Brillenauftrag"
        onClick={() => neu("/brille/create")}
      >
        <GlassesIcon />
      </Symbol>
      <Symbol
        titel="Neuer Kontaktlinsenauftrag"
        onClick={() => neu("/kontaktlinse/create")}
      >
        <VisibilityOutlinedIcon />
      </Symbol>
      <Symbol titel="Abholung heute" onClick={heuteAbgeholt}>
        <TaskAltIcon />
      </Symbol>
      <Symbol titel="Auftrag drucken" onClick={drucken}>
        <PrintOutlinedIcon />
      </Symbol>
      <Symbol titel="Kundensuche" onClick={() => navigate("/search")}>
        <SearchIcon />
      </Symbol>
      <Symbol
        titel="Zurück"
        onClick={() => {
          const ziel = zurueckZiel();
          navigate(ziel ?? "/kontaktlinse");
        }}
      >
        <KeyboardReturnIcon />
      </Symbol>
      <Symbol titel="Neuer Termin" onClick={() => neu("/termin/create")}>
        <EventOutlinedIcon />
      </Symbol>
      <KontaktlinseRechnungButton symbol />
      {kundeId != null && (
        <Symbol
          titel="Kunde anzeigen"
          onClick={() => navigate(`/kunde/${kundeId}/show`)}
        >
          <PersonOutlineIcon />
        </Symbol>
      )}
    </SymbolleistenRahmen>
  );
};
