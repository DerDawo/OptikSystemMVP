import {
  DataTable,
  DateField,
  List,
  ReferenceField,
  Pagination,
} from "react-admin";
import { Show } from "react-admin";
import {
  DateInput,
  Edit,
  Create,
  NumberInput,
  SimpleForm,
  TextInput,
  FunctionField,
} from "react-admin";
import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import {
  SaveButton,
  Toolbar,
  useDataProvider,
  useNotify,
  useRecordContext,
} from "react-admin";
import {
  KarteiwerteKopieren,
  KontaktlinseKarteikarte,
} from "./KontaktlinseKarteikarte";
import { KontaktlinseRechnungButton } from "./KontaktlinseRechnung";
import { KontaktlinseSymbolleiste } from "./KontaktlinseSymbolleiste";
import { KundeInput } from "./KundeInput";
import { MitarbeiterField, MitarbeiterInput } from "./mitarbeiter";
import { CurrencyField } from "./CurrencyField";
import {
  FieldRow,
  FormSection,
  ShowActionsBar,
  ShowLayout,
  DatenbankInfo,
} from "./EntityLayout";
import { zurueckNachSpeichern } from "./seitenVerlauf";

const KundeOptionText = (record?: Record<string, unknown>) => {
  if (!record) return "";
  const anrede = record.Anrede ? record.Anrede : "";
  const nachname = record.Nachname ? record.Nachname : "";
  const vorname = record.Vorname ? record.Vorname : "";
  return `${anrede} ${vorname} ${nachname}`.trim();
};

export const KontaktlinseList = () => (
  <List
    title="Kontaktlinsen"
    perPage={5}
    pagination={<Pagination rowsPerPageOptions={[5]} />}
  >
    <DataTable>
      <DataTable.Col source="id" />
      <DataTable.Col label="Kunde">
        <ReferenceField source="kunde_id" reference="kunde" link="show">
          <FunctionField render={KundeOptionText} />
        </ReferenceField>
      </DataTable.Col>
      <DataTable.Col source="Berater" label="Bedient von">
        <MitarbeiterField source="Berater" label="Bedient von" />
      </DataTable.Col>
      <DataTable.Col source="Datum">
        <DateField source="Datum" />
      </DataTable.Col>
      <DataTable.Col source="Abholung">
        <DateField source="Abholung" />
      </DataTable.Col>
      <DataTable.Col source="Nachkontrolltermin">
        <DateField source="Nachkontrolltermin" />
      </DataTable.Col>
      <DataTable.Col source="LinsentypLinks" label="Linsentyp Links" />
      <DataTable.Col source="LinsentypRechts" label="Linsentyp Rechts" />
      <DataTable.Col source="Notizen" />
      <DataTable.Col sx={{ textAlign: "end" }} source="Summe" label="Betrag">
        <CurrencyField source="Summe" />
      </DataTable.Col>
    </DataTable>
  </List>
);

// Aktionen oben: Karteiwerte kopieren (wie in Prisma), Bearbeiten
const KontaktlinseShowActions = () => {
  const cl = useRecordContext();
  return (
    <ShowActionsBar>
      <KontaktlinseRechnungButton />
      {cl && <KarteiwerteKopieren cl={cl as { id: number }} />}
    </ShowActionsBar>
  );
};

// CL-Kartei im Aufbau von Prisma (direkt bearbeitbar)
export const KontaktlinseShow = () => (
  <Show actions={<KontaktlinseShowActions />}>
    <ShowLayout>
      {/* Karteikarte mit der Symbolleiste am rechten Rand wie bei den Brillen */}
      <Box
        sx={{
          display: "flex",
          gap: 1,
          alignItems: "flex-start",
          width: "100%",
          minWidth: 0,
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <KontaktlinseKarteikarte />
        </Box>
        <Box sx={{ display: { xs: "none", md: "block" } }}>
          <KontaktlinseSymbolleiste />
        </Box>
      </Box>
    </ShowLayout>
  </Show>
);

export const KontaktlinseEdit = () => (
  <Edit redirect={zurueckNachSpeichern}>
    <SimpleForm>
      <FormSection title="Auftrag">
        <MitarbeiterInput source="Berater" label="Bedient von" />
      </FormSection>
      <FormSection title="Auftragsdaten">
        <FieldRow>
          <KundeInput />
        </FieldRow>
        <FieldRow>
          <DateInput source="Datum" />
          <DateInput source="Abholung" />
          <DateInput source="Nachkontrolltermin" />
        </FieldRow>
        <TextInput source="Notizen" multiline fullWidth />
      </FormSection>
      <FormSection title="Kontaktlinse Links">
        <FieldRow>
          <TextInput source="LinsentypLinks" label="Linsentyp Links" />
          <NumberInput source="RadiusLinks" label="Radius Links" />
          <NumberInput source="DurchmesserLinks" label="Durchmesser Links" />
        </FieldRow>
        <FieldRow>
          <NumberInput source="SphLinks" label="Sph Links" />
          <NumberInput source="CylLinks" label="Cyl Links" />
          <NumberInput source="AchseLinks" label="Achse Links" />
        </FieldRow>
        <FieldRow>
          <TextInput source="MaterialLinks" label="Material Links" />
          <TextInput source="HerstellerLinks" label="Hersteller Links" />
          <TextInput source="TragemodusLinks" label="Tragemodus Links" />
        </FieldRow>
        <NumberInput source="PreisLinks" label="Preis Links" />
      </FormSection>
      <FormSection title="Kontaktlinse Rechts">
        <FieldRow>
          <TextInput source="LinsentypRechts" label="Linsentyp Rechts" />
          <NumberInput source="RadiusRechts" label="Radius Rechts" />
          <NumberInput source="DurchmesserRechts" label="Durchmesser Rechts" />
        </FieldRow>
        <FieldRow>
          <NumberInput source="SphRechts" label="Sph Rechts" />
          <NumberInput source="CylRechts" label="Cyl Rechts" />
          <NumberInput source="AchseRechts" label="Achse Rechts" />
        </FieldRow>
        <FieldRow>
          <TextInput source="MaterialRechts" label="Material Rechts" />
          <TextInput source="HerstellerRechts" label="Hersteller Rechts" />
          <TextInput source="TragemodusRechts" label="Tragemodus Rechts" />
        </FieldRow>
        <NumberInput source="PreisRechts" label="Preis Rechts" />
      </FormSection>
      <FormSection title="Preis">
        <NumberInput source="Summe" />
      </FormSection>
      <DatenbankInfo />
    </SimpleForm>
  </Edit>
);

// Heutiges Datum (Ortszeit) als JJJJ-MM-TT
const heute = () => new Date().toLocaleDateString("sv-SE");

/*
 * Neuer Kontaktlinsenauftrag wie in Prisma: mit bekanntem Kunden sofort
 * anlegen und die CL-Kartei öffnen; sonst zuerst den Kunden wählen.
 */
export const KontaktlinseCreate = () => {
  const location = useLocation();
  const vorgaben =
    (location.state as Record<string, unknown> | undefined) ?? {};
  if (vorgaben.kunde_id != null) {
    return <KontaktlinseSofortAnlegen vorgaben={vorgaben} />;
  }
  return (
    <Create
      title="Neuer Kontaktlinsenauftrag"
      redirect="show"
      transform={(daten: Record<string, unknown>) => ({
        ...daten,
        Datum: heute(),
      })}
    >
      <SimpleForm
        defaultValues={vorgaben}
        toolbar={
          <Toolbar>
            <SaveButton label="Auftrag anlegen" icon={<AddIcon />} />
          </Toolbar>
        }
      >
        <FormSection title="Kunde für den neuen Auftrag">
          <KundeInput />
        </FormSection>
      </SimpleForm>
    </Create>
  );
};

const KontaktlinseSofortAnlegen = ({
  vorgaben,
}: {
  vorgaben: Record<string, unknown>;
}) => {
  const dataProvider = useDataProvider();
  const navigate = useNavigate();
  const notify = useNotify();
  // nur einmal anlegen (React StrictMode ruft Effekte doppelt auf)
  const begonnen = useRef(false);
  useEffect(() => {
    if (begonnen.current) return;
    begonnen.current = true;
    dataProvider
      .create("kontaktlinse", { data: { ...vorgaben, Datum: heute() } })
      .then(({ data }) =>
        navigate(`/kontaktlinse/${data.id}/show`, { replace: true }),
      )
      .catch(() => {
        notify("Auftrag konnte nicht angelegt werden.", { type: "error" });
        navigate(-1);
      });
  }, [dataProvider, navigate, notify, vorgaben]);
  return (
    <Box sx={{ display: "flex", justifyContent: "center", p: 6 }}>
      <CircularProgress size={28} />
    </Box>
  );
};
