import { Children, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, Card, Divider, Typography } from "@mui/material";
import {
  EditButton,
  Labeled,
  ShowButton,
  TopToolbar,
  useCreatePath,
  useRecordContext,
  useResourceContext,
} from "react-admin";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { zurueckZiel } from "./seitenVerlauf";

// "Zurück": genau zum letzten Bild (z. B. vom Auftrag zum Kunden oder zur
// Suche); bereits verlassene Formulare werden übersprungen (seitenVerlauf).
// Ohne Verlauf (Seite direkt geöffnet) zur Liste.
export const ZurueckButton = () => {
  const navigate = useNavigate();
  const resource = useResourceContext();
  const createPath = useCreatePath();
  return (
    <Button
      size="small"
      startIcon={<ArrowBackIcon />}
      onClick={() => {
        const ziel = zurueckZiel();
        if (ziel) navigate(ziel);
        else if (resource) navigate(createPath({ resource, type: "list" }));
        else navigate("/");
      }}
    >
      Zurück
    </Button>
  );
};

/*
 * Shared building blocks for grouped, responsive Show/Edit pages.
 * Show pages build a custom layout (instead of the linear SimpleShowLayout), so
 * fields must be wrapped in <Labeled> themselves to keep their automatic labels.
 */

type SectionProps = {
  title: string;
  children: ReactNode;
};

export const ShowLayout = ({ children }: { children: ReactNode }) => (
  <Box
    sx={{
      display: "flex",
      flexDirection: "column",
      gap: "1em",
      width: "100%",
      minWidth: 0,
      padding: { xs: "0.5em", md: "1em" },
    }}
  >
    {children}
  </Box>
);

/*
 * Two-column Show layout: stammdaten (main content) on the left, a narrower
 * verlauf/history column on the right. Stacks to a single column below the
 * `lg` breakpoint so it stays usable on tablets/phones.
 */
export const ShowColumns = ({
  children,
  spalten = "minmax(0, 1.4fr) minmax(0, 1fr)",
}: {
  children: ReactNode;
  // Spaltenaufteilung ab breiten Bildschirmen (lg)
  spalten?: string;
}) => (
  <Box
    sx={{
      display: "grid",
      gridTemplateColumns: { xs: "1fr", lg: spalten },
      gap: "1em",
      width: "100%",
      minWidth: 0,
      alignItems: "start",
    }}
  >
    {children}
  </Box>
);

export const ShowColumn = ({
  children,
  kompakt,
}: {
  children: ReactNode;
  // kleinere Abschnitte (weniger Abstand, kleinere Schrift)
  kompakt?: boolean;
}) => (
  <Box
    sx={{
      display: "flex",
      flexDirection: "column",
      gap: kompakt ? "0.6em" : "1em",
      minWidth: 0,
      ...(kompakt
        ? {
            "& > .MuiCard-root": { padding: "0.6em 0.9em" },
            "& .MuiCard-root .MuiTypography-subtitle1": {
              fontSize: "0.9rem",
              mb: 0.5,
            },
            "& .MuiCard-root .MuiDivider-root": { mb: 0.75 },
            "& .MuiCard-root .MuiTypography-body2": { fontSize: "0.85rem" },
            "& .MuiCard-root .RaLabeled-label": { fontSize: "0.7rem", mb: 0 },
          }
        : {}),
    }}
  >
    {children}
  </Box>
);

// Grouped card of fields for custom Show layouts. Wrap each field in <Field> below.
export const ShowSection = ({ title, children }: SectionProps) => (
  <Card variant="outlined" sx={{ padding: "1em", width: "100%", minWidth: 0 }}>
    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
      {title}
    </Typography>
    <Divider sx={{ mb: 1.5 }} />
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
        gap: "0.25em 2em",
        minWidth: 0,
        "& > *": { minWidth: 0 },
      }}
    >
      {children}
    </Box>
  </Card>
);

// Labels a single field inside a <ShowSection>, mirroring SimpleShowLayout's automatic labeling.
export const Field = ({
  label,
  children,
}: {
  label?: ReactNode;
  children: ReactNode;
}) => (
  <Labeled label={label} fullWidth>
    {children}
  </Labeled>
);

// Wraps a related-records block (e.g. ReferenceManyField) with a heading, for custom Show layouts.
export const RelatedSection = ({ title, children }: SectionProps) => (
  <Box sx={{ width: "100%", minWidth: 0 }}>
    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
      {title}
    </Typography>
    <Box sx={{ minWidth: 0, overflowX: "auto" }}>{children}</Box>
  </Box>
);

// Grouped section of inputs for Edit/Create forms (direct child of <SimpleForm>).
export const FormSection = ({ title, children }: SectionProps) => (
  <Box sx={{ width: "100%", mb: 1 }}>
    <Typography sx={{ fontWeight: 600, mt: 1, mb: 1 }}>{title}</Typography>
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: "0.25em",
        width: "100%",
      }}
    >
      {children}
    </Box>
    <Divider sx={{ mt: 2 }} />
  </Box>
);

/*
 * Always-reachable action bar for Show views (edit/back plus any page-specific
 * actions such as "message" or "print"), rendered sticky by the RaTopToolbar
 * theme override so it stays visible while scrolling.
 */
export const ShowActionsBar = ({ children }: { children?: ReactNode }) => (
  <TopToolbar sx={{ gap: 1, flexWrap: "wrap" }}>
    {children}
    <EditButton />
    <ZurueckButton />
  </TopToolbar>
);

// Always-reachable action bar for Edit views (back to show/list), sticky via the same override.
export const EditActionsBar = ({ children }: { children?: ReactNode }) => (
  <TopToolbar sx={{ gap: 1, flexWrap: "wrap" }}>
    {children}
    <ShowButton />
    <ZurueckButton />
  </TopToolbar>
);

// Places up to a few inputs/fields side by side on wider screens, stacked on mobile.
export const FieldRow = ({ children }: { children: ReactNode }) => (
  <Box sx={{ display: { xs: "block", sm: "flex" }, gap: "1em", width: "100%" }}>
    {Children.map(children, (child) => (
      <Box sx={{ flex: 1, minWidth: 0 }}>{child}</Box>
    ))}
  </Box>
);

/*
 * Technical record info (ID, created date) as a small grey line at the end of
 * a Show/Edit page. Renders nothing while the record does not exist yet.
 */
export const DatenbankInfo = () => {
  const record = useRecordContext();
  if (record?.id == null) return null;
  const angelegt = record.created_at
    ? new Date(record.created_at).toLocaleDateString("de-DE")
    : null;
  return (
    <Typography
      variant="caption"
      color="text.secondary"
      sx={{ display: "block", mt: 1 }}
    >
      ID {record.id}
      {angelegt ? ` · angelegt am ${angelegt}` : ""}
    </Typography>
  );
};
