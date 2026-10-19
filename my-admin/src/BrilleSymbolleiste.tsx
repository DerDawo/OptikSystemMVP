import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  useDataProvider,
  useNotify,
  useRecordContext,
  useRefresh,
} from "react-admin";
import { Box, IconButton, Tooltip } from "@mui/material";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import CalculateOutlinedIcon from "@mui/icons-material/CalculateOutlined";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import PrintOutlinedIcon from "@mui/icons-material/PrintOutlined";
import SearchIcon from "@mui/icons-material/Search";
import KeyboardReturnIcon from "@mui/icons-material/KeyboardReturn";
import EventOutlinedIcon from "@mui/icons-material/EventOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import { GlassesIcon } from "./icons";
import {
  AuftragszettelButton,
  FormulareButton,
  RechnungErstellenButton,
  WerkstattauftragButton,
} from "./FormulareDialog";
import { KK_RECHNER_OEFFNEN } from "./KassenanteilRechner";
import { BrillenpassButton } from "./BrillenpassButton";
import { zurueckZiel } from "./seitenVerlauf";

/*
 * Schmale Symbolleiste am rechten Rand der Brillenkartei wie in Prisma.
 * Jedes Symbol führt eine vorhandene Funktion aus (Tooltip beim Zeigen).
 */

const Symbol = ({
  titel,
  onClick,
  children,
}: {
  titel: string;
  onClick: () => void;
  children: ReactNode;
}) => (
  <Tooltip title={titel} placement="left">
    <IconButton onClick={onClick} aria-label={titel} sx={{ color: "inherit" }}>
      {children}
    </IconButton>
  </Tooltip>
);

export const BrilleSymbolleiste = () => {
  const brille = useRecordContext();
  const navigate = useNavigate();
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const refresh = useRefresh();
  if (!brille) return null;
  const kundeId = brille.kunde_id;
  const neu = (pfad: string) =>
    navigate(pfad, { state: kundeId ? { kunde_id: kundeId } : undefined });

  const heuteAbgeholt = async () => {
    const heute = new Date().toISOString().slice(0, 10);
    try {
      await dataProvider.update("brille", {
        id: brille.id,
        data: { Abholung: heute },
        previousData: brille,
      });
      notify("Abholung auf heute gesetzt.", { type: "success" });
      refresh();
    } catch {
      notify("Abholung konnte nicht gespeichert werden.", { type: "error" });
    }
  };

  return (
    <Box
      sx={{
        position: "sticky",
        top: 72,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 0.25,
        py: 0.5,
        width: 44,
        borderRadius: "8px",
        bgcolor: "#2b3440",
        color: "#e8eef6",
        "& .MuiIconButton-root": { p: "7px" },
        "& .MuiIconButton-root:hover": { bgcolor: "rgba(255,255,255,0.12)" },
        "& .MuiSvgIcon-root, & svg": { fontSize: 22, width: 22, height: 22 },
      }}
    >
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
      <FormulareButton symbol />
      <BrillenpassButton />
      <Symbol
        titel="KK-Anteil berechnen"
        onClick={() => window.dispatchEvent(new Event(KK_RECHNER_OEFFNEN))}
      >
        <CalculateOutlinedIcon />
      </Symbol>
      <Symbol titel="Abholung heute" onClick={heuteAbgeholt}>
        <TaskAltIcon />
      </Symbol>
      <Symbol titel="Drucken" onClick={() => window.print()}>
        <PrintOutlinedIcon />
      </Symbol>
      <Symbol titel="Kundensuche" onClick={() => navigate("/search")}>
        <SearchIcon />
      </Symbol>
      <WerkstattauftragButton symbol />
      <AuftragszettelButton symbol />
      <Symbol
        titel="Zurück"
        onClick={() => {
          const ziel = zurueckZiel();
          navigate(ziel ?? "/brille");
        }}
      >
        <KeyboardReturnIcon />
      </Symbol>
      <Symbol titel="Neuer Termin" onClick={() => neu("/termin/create")}>
        <EventOutlinedIcon />
      </Symbol>
      <RechnungErstellenButton symbol />
      {kundeId != null && (
        <Symbol
          titel="Kunde anzeigen"
          onClick={() => navigate(`/kunde/${kundeId}/show`)}
        >
          <PersonOutlineIcon />
        </Symbol>
      )}
    </Box>
  );
};
