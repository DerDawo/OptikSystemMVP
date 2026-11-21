import {
  Create,
  DataTable,
  Edit,
  List,
  SearchInput,
  SimpleForm,
  TextInput,
  email,
  regex,
} from "react-admin";
import { FieldRow, FormSection } from "./EntityLayout";
import { arztKurzname, plzOrt, type Arzt } from "./aerzte";

/*
 * Ärzte-Adressliste (Tabelle "arzt"): augenärztliche Praxen und Kliniken,
 * von denen Rezepte kommen. Die Schnellsuche "q" wird im dataProvider über
 * arztFilter() in eine Suche über Name, Praxis, Ort, LANR, BSNR ... übersetzt.
 */

export const arztRepresentation = (record: Arzt) => arztKurzname(record);

const filter = [
  <SearchInput
    key="q"
    source="q"
    alwaysOn
    placeholder="Name, Praxis, Ort, LANR, BSNR"
  />,
];

export const ArztList = () => (
  <List
    title="Ärzte"
    filters={filter}
    sort={{ field: "Praxis", order: "ASC" }}
    perPage={50}
  >
    <DataTable>
      <DataTable.Col source="Praxis" label="Praxis / Klinik" />
      <DataTable.Col source="Name" label="Arzt" />
      <DataTable.Col source="Fachrichtung" />
      <DataTable.Col source="Straße" />
      <DataTable.Col
        source="Ort"
        label="PLZ Ort"
        render={(record: Arzt) => plzOrt(record)}
      />
      <DataTable.Col source="Telefon" />
      <DataTable.Col source="BSNR" />
      <DataTable.Col source="LANR" />
    </DataTable>
  </List>
);

const neunStellen = regex(/^\d{9}$/, "Bitte 9 Ziffern eingeben");
const plz = regex(/^\d{5}$/, "Bitte 5 Ziffern eingeben");

const mindestensNameOderPraxis = (werte: Arzt) => {
  const fehler: Record<string, string> = {};
  if (!werte.Name?.trim() && !werte.Praxis?.trim()) {
    fehler.Praxis = "Bitte Praxis/Klinik oder Arzt angeben";
  }
  return fehler;
};

const ArztFormular = () => (
  <SimpleForm validate={mindestensNameOderPraxis}>
    <FormSection title="Arzt / Praxis">
      <TextInput
        source="Praxis"
        label="Praxis / Klinik / BAG"
        fullWidth
        helperText="z. B. Universitätsklinikum Jena, Klinik für Augenheilkunde"
      />
      <FieldRow>
        <TextInput
          source="Name"
          label="Titel und Name"
          helperText="z. B. Dr. med. Ulrich Voigt"
        />
        <TextInput
          source="Fachrichtung"
          helperText="z. B. Facharzt für Augenheilkunde"
        />
      </FieldRow>
      <FieldRow>
        <TextInput source="LANR" label="LANR" validate={neunStellen} />
        <TextInput source="BSNR" label="BSNR" validate={neunStellen} />
      </FieldRow>
    </FormSection>
    <FormSection title="Adresse und Kontakt">
      <TextInput source="Straße" fullWidth />
      <FieldRow>
        <TextInput source="PLZ" label="PLZ" validate={plz} />
        <TextInput source="Ort" />
      </FieldRow>
      <FieldRow>
        <TextInput source="Telefon" />
        <TextInput source="Fax" />
        <TextInput source="Email" label="E-Mail" validate={email()} />
      </FieldRow>
      <TextInput source="Bemerkung" multiline minRows={2} fullWidth />
    </FormSection>
  </SimpleForm>
);

export const ArztEdit = () => (
  <Edit title="Arzt bearbeiten">
    <ArztFormular />
  </Edit>
);

export const ArztCreate = () => (
  <Create title="Neuer Arzt" redirect="list">
    <ArztFormular />
  </Create>
);
