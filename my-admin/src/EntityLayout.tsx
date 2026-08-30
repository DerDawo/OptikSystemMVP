import { Children, ReactNode } from "react";
import { Box, Card, Divider, Typography } from "@mui/material";
import {
  EditButton,
  Labeled,
  ListButton,
  ShowButton,
  TopToolbar,
} from "react-admin";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

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
export const ShowColumns = ({ children }: { children: ReactNode }) => (
  <Box
    sx={{
      display: "grid",
      gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1.4fr) minmax(0, 1fr)" },
      gap: "1em",
      width: "100%",
      minWidth: 0,
      alignItems: "start",
    }}
  >
    {children}
  </Box>
);

export const ShowColumn = ({ children }: { children: ReactNode }) => (
  <Box
    sx={{ display: "flex", flexDirection: "column", gap: "1em", minWidth: 0 }}
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
    <ListButton label="Zurück" icon={<ArrowBackIcon />} />
  </TopToolbar>
);

// Always-reachable action bar for Edit views (back to show/list), sticky via the same override.
export const EditActionsBar = ({ children }: { children?: ReactNode }) => (
  <TopToolbar sx={{ gap: 1, flexWrap: "wrap" }}>
    {children}
    <ShowButton />
    <ListButton label="Zurück" icon={<ArrowBackIcon />} />
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
