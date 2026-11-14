// Glas-Lager (Stammdaten → Glas-Lager): fertige Einstärken-Lagergläser mit
// Stückzahl. Bestand lässt sich in der Liste mit − / + ändern; Gläser auf
// oder unter dem Mindestbestand sind rot markiert und lassen sich filtern.
// Der Glas-Finder in der Brillen-Karteikarte bucht übernommene Gläser ab.
import {
  BooleanInput,
  Create,
  DataTable,
  Edit,
  List,
  NumberInput,
  SimpleForm,
  TextInput,
  useNotify,
  useRecordContext,
  useRefresh,
  useUpdate,
  type RaRecord,
} from "react-admin";
import { Box, IconButton, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import { FieldRow, FormSection } from "./EntityLayout";
import { type Lagerglas, nachbestellen, werteText } from "./glasFinder";

const euro = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});

const filter = [
  <TextInput key="q" source="Bezeichnung@ilike" label="Bezeichnung" alwaysOn />,
  <NumberInput key="sph" source="Sph" label="Sph" alwaysOn />,
  <NumberInput key="cyl" source="Cyl" label="Cyl" alwaysOn />,
  <BooleanInput
    key="aktiv"
    source="Aktiv"
    label="Nur aktive"
    defaultValue={true}
  />,
];

const BestandAendern = () => {
  const g = useRecordContext<RaRecord & Lagerglas>();
  const [update, { isPending }] = useUpdate();
  const notify = useNotify();
  const refresh = useRefresh();
  if (!g) return null;
  const setze = (neu: number) =>
    update(
      "glaslager",
      { id: g.id, data: { Bestand: neu }, previousData: g },
      {
        onSuccess: () => refresh(),
        onError: () =>
          notify("Bestand konnte nicht gespeichert werden.", {
            type: "error",
          }),
      },
    );
  return (
    <Box
      sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
      onClick={(e) => e.stopPropagation()}
    >
      <IconButton
        size="small"
        aria-label="Bestand verringern"
        disabled={isPending || g.Bestand <= 0}
        onClick={() => setze(g.Bestand - 1)}
      >
        <RemoveIcon fontSize="small" />
      </IconButton>
      <Typography
        component="span"
        sx={{
          minWidth: 24,
          textAlign: "center",
          fontWeight: 700,
          color: nachbestellen(g) ? "error.main" : undefined,
        }}
      >
        {g.Bestand}
      </Typography>
      <IconButton
        size="small"
        aria-label="Bestand erhöhen"
        disabled={isPending}
        onClick={() => setze(g.Bestand + 1)}
      >
        <AddIcon fontSize="small" />
      </IconButton>
    </Box>
  );
};

export const GlaslagerList = () => (
  <List
    title="Glas-Lager"
    filters={filter}
    filterDefaultValues={{ Aktiv: true }}
    sort={{ field: "Sph", order: "ASC" }}
    perPage={50}
  >
    <DataTable
      rowSx={(g) =>
        nachbestellen(g as Lagerglas) ? { bgcolor: "#fdecea" } : {}
      }
    >
      <DataTable.Col source="Sph" label="Werte">
        <Werte />
      </DataTable.Col>
      <DataTable.Col source="Bezeichnung" />
      <DataTable.Col source="Hersteller" />
      <DataTable.NumberCol source="Brechungsindex" label="Index" />
      <DataTable.Col source="Verguetung" label="Vergütung" />
      <DataTable.NumberCol source="Durchmesser" label="Ø" />
      <DataTable.Col source="Bestand" label="Bestand">
        <BestandAendern />
      </DataTable.Col>
      <DataTable.NumberCol source="Mindestbestand" label="Mindest" />
      <DataTable.Col source="Verkaufspreis" label="VK-Preis">
        <Preis />
      </DataTable.Col>
      <DataTable.Col source="Lagerort" />
    </DataTable>
  </List>
);

const Werte = () => {
  const g = useRecordContext<RaRecord & Lagerglas>();
  return g ? (
    <Box component="span" sx={{ whiteSpace: "nowrap", fontWeight: 600 }}>
      {werteText(Number(g.Sph), Number(g.Cyl))}
    </Box>
  ) : null;
};

const Preis = () => {
  const g = useRecordContext<RaRecord & Lagerglas>();
  return g?.Verkaufspreis != null ? (
    <>{euro.format(Number(g.Verkaufspreis))}</>
  ) : null;
};

// Zylinder als Minuswert speichern (Lagergläser in Minuszylinder-Schreibweise)
const cylNegativ = (wert: unknown) => {
  const n = Number(wert);
  return Number.isFinite(n) ? -Math.abs(n) : 0;
};

const Formular = () => (
  <SimpleForm>
    <FormSection title="Glas">
      <FieldRow>
        <TextInput source="Bezeichnung" required />
        <TextInput source="Hersteller" />
      </FieldRow>
      <FieldRow>
        <NumberInput
          source="Brechungsindex"
          label="Index"
          step={0.01}
          helperText="z. B. 1,5 / 1,6 / 1,67"
        />
        <TextInput source="Verguetung" label="Vergütung" />
        <NumberInput source="Durchmesser" label="Durchmesser (mm)" />
      </FieldRow>
    </FormSection>
    <FormSection title="Werte">
      <FieldRow>
        <NumberInput source="Sph" step={0.25} required />
        <NumberInput
          source="Cyl"
          step={0.25}
          defaultValue={0}
          parse={cylNegativ}
          helperText="Minuszylinder, z. B. -0,50"
        />
      </FieldRow>
    </FormSection>
    <FormSection title="Bestand">
      <FieldRow>
        <NumberInput source="Bestand" min={0} defaultValue={0} />
        <NumberInput
          source="Mindestbestand"
          min={0}
          defaultValue={0}
          helperText="Bei diesem Bestand rot markiert"
        />
        <NumberInput source="Verkaufspreis" label="Verkaufspreis (€)" />
        <TextInput source="Lagerort" helperText="z. B. Schublade 3" />
      </FieldRow>
      <BooleanInput
        source="Aktiv"
        label="Im Glas-Finder anbieten"
        defaultValue
      />
    </FormSection>
  </SimpleForm>
);

export const GlaslagerEdit = () => (
  <Edit title="Lagerglas bearbeiten">
    <Formular />
  </Edit>
);

export const GlaslagerCreate = () => (
  <Create title="Lagerglas anlegen" redirect="list">
    <Formular />
  </Create>
);
