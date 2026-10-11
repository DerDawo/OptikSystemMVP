import { Box } from "@mui/material";
import {
  Labeled,
  useDataProvider,
  useRecordContext,
  useRefresh,
  useResourceContext,
} from "react-admin";
import { Eingabe } from "./KarteiEingabe";

// Feld auf einer Ansichtsseite, das sich direkt anklicken und beschreiben
// lässt wie in der Brillenkartei (Speichern beim Verlassen des Feldes).
// Großes, mehrzeiliges Feld über die ganze Breite des Abschnitts; Enter
// macht eine neue Zeile, Strg+Enter oder Verlassen speichert.
export const DirektFeld = ({
  source,
  label,
}: {
  source: string;
  label: string;
}) => {
  const record = useRecordContext();
  const resource = useResourceContext();
  const dataProvider = useDataProvider();
  const refresh = useRefresh();
  if (!record || !resource) return null;
  return (
    <Box sx={{ gridColumn: "1 / -1" }}>
      <Labeled label={label} fullWidth>
        <Box
          sx={(theme) => ({
            bgcolor:
              theme.palette.mode === "dark"
                ? "rgba(255,255,255,0.08)"
                : "#e8eef6",
            minHeight: 72,
            px: "8px",
            py: "6px",
            display: "flex",
            alignItems: "flex-start",
            whiteSpace: "pre-wrap",
            borderRadius: "4px",
            fontSize: "0.95rem",
            "&:focus-within": {
              boxShadow: `inset 0 0 0 2px ${theme.palette.primary.main}`,
            },
          })}
        >
          <Eingabe
            name={label}
            mehrzeilig
            wert={record[source]}
            speichere={async (neu) => {
              await dataProvider.update(resource, {
                id: record.id,
                data: { [source]: neu },
                previousData: record,
              });
              refresh();
            }}
          />
        </Box>
      </Labeled>
    </Box>
  );
};
