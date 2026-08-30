import {
  DataTable,
  DateField,
  List,
  ReferenceField,
  ReferenceManyField,
  Pagination,
} from "react-admin";
import { NumberField, Show, TextField } from "react-admin";
import {
  DateInput,
  Edit,
  Create,
  NumberInput,
  SimpleForm,
  TextInput,
  ReferenceInput,
  SelectInput,
  FunctionField,
} from "react-admin";
import {
  ReferenceArrayInput,
  AutocompleteArrayInput,
  ReferenceArrayField,
  Datagrid,
  SingleFieldList,
  ChipField,
} from "react-admin";
import {
  AutocompleteInput,
  useDataProvider,
  useGetList,
  useNotify,
} from "react-admin";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowUpRightFromSquare } from "@fortawesome/free-solid-svg-icons";
import PrintIcon from "@mui/icons-material/Print";
import { Button } from "@mui/material";
import { CurrencyField } from "./CurrencyField";
import {
  EditActionsBar,
  Field,
  FieldRow,
  FormSection,
  RelatedSection,
  ShowActionsBar,
  ShowColumn,
  ShowColumns,
  ShowLayout,
  ShowSection,
} from "./EntityLayout";
import { BrilleHistoryDatagrid } from "./BrilleHistory";
import { BrilleStatusChip, brilleRowSx } from "./orderStatus";

// Rabatt-Codes aus Issue #22: wirken auf die Summe aus Glas rechts + Glas
// links + Fassung, nicht auf Zusatzleistungen. "Sonderrabatt" hat keinen
// festen Prozentsatz und wird individuell im Feld "RabattProzent" gepflegt.
const RABATT_CODES = [
  { id: "VIP-Rabatt", name: "VIP-Rabatt (-15 %)" },
  { id: "ZNEU-Neukunden-Rabatt", name: "ZNEU-Neukunden-Rabatt (-10 %)" },
  { id: "zw-Zweitbrillen-Rabatt", name: "zw-Zweitbrillen-Rabatt (-35 %)" },
  { id: "Sonderrabatt", name: "Sonderrabatt (individuell)" },
];

// `brille.BrillenArt` stays a plain text column so existing free-text values
// keep working; this input offers the maintained `brillenart` list as
// choices while still allowing users to create a new, not-yet-listed value.
const BrillenArtInput = () => {
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const { data: brillenartChoices } = useGetList("brillenart", {
    pagination: { page: 1, perPage: 200 },
    sort: { field: "Bezeichnung", order: "ASC" },
  });

  const handleCreateBrillenart = async (value?: string) => {
    if (!value) return undefined;
    try {
      const { data } = await dataProvider.create("brillenart", {
        data: { Bezeichnung: value },
      });
      return { Bezeichnung: data.Bezeichnung };
    } catch {
      notify("Brillenart konnte nicht angelegt werden", { type: "error" });
      return undefined;
    }
  };

  return (
    <AutocompleteInput
      source="BrillenArt"
      choices={brillenartChoices ?? []}
      optionText="Bezeichnung"
      optionValue="Bezeichnung"
      onCreate={handleCreateBrillenart}
      createLabel="Neue Brillenart anlegen"
      createItemLabel={(filter: string) => `„${filter}“ als neue Brillenart anlegen`}
    />
  );
};

export const BrilleList = () => (
  <List
    title="Brillen"
    perPage={5}
    pagination={<Pagination rowsPerPageOptions={[5]} />}
  >
    <DataTable rowSx={brilleRowSx}>
      <DataTable.Col source="id" />
      <DataTable.Col label="Status">
        <FunctionField
          render={(record) => <BrilleStatusChip record={record} />}
        />
      </DataTable.Col>
      <DataTable.Col source="BrillenArt" />
      <DataTable.Col label="Kunde">
        <ReferenceField source="kunde_id" reference="kunde" link="show">
          <FunctionField
            render={(record) => {
              if (!record) return "";
              const anrede = record.Anrede ? record.Anrede : "";
              const nachname = record.Nachname ? record.Nachname : "";
              const vorname = record.Vorname ? record.Vorname : "";
              return `${anrede} ${vorname} ${nachname}`.trim();
            }}
          />
        </ReferenceField>
      </DataTable.Col>
      <DataTable.Col source="Berater" />
      <DataTable.Col source="Refraktion" />
      <DataTable.Col source="Datum">
        <DateField source="Datum" />
      </DataTable.Col>
      <DataTable.Col source="Werkstatt" />
      <DataTable.Col source="Abholung">
        <DateField source="Abholung" />
      </DataTable.Col>
      <DataTable.Col source="Notizen" />
      <DataTable.NumberCol source="GlasLinks">
        <ReferenceField source="GlasLinks" reference="glass" link="show">
          Nr.
          <TextField source="id" />
          &nbsp;
          <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
        </ReferenceField>
      </DataTable.NumberCol>
      <DataTable.NumberCol source="GlasRechts">
        <ReferenceField source="GlasRechts" reference="glass" link="show">
          Nr.
          <TextField source="id" />
          &nbsp;
          <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
        </ReferenceField>
      </DataTable.NumberCol>
      <DataTable.Col source="Fassung">
        <ReferenceField source="Fassung" reference="fassung" link="show">
          <TextField source="Bezeichnung" />
        </ReferenceField>
      </DataTable.Col>
      <DataTable.Col source="Glastyp">
        <ReferenceField source="Glastyp" reference="glastyp" link="show">
          <TextField source="Bezeichnung" />
        </ReferenceField>
      </DataTable.Col>
      <DataTable.Col label="Zusatzleistungen">
        <ReferenceArrayField
          source="ZusatzleistungIDs"
          reference="zusatzleistung"
        >
          <SingleFieldList linkType="show">
            <ChipField source="Bezeichnung" size="small" />
          </SingleFieldList>
        </ReferenceArrayField>
      </DataTable.Col>
      <DataTable.Col source="RabattBezeichnung" />
      <DataTable.Col sx={{ textAlign: "end" }} source="Summe" label="Betrag">
        <CurrencyField source="Summe" />
      </DataTable.Col>
    </DataTable>
  </List>
);

// Always-reachable actions for the Brille detail page (print, edit, back).
const BrilleShowActions = () => (
  <ShowActionsBar>
    <Button startIcon={<PrintIcon />} onClick={() => window.print()}>
      Drucken
    </Button>
  </ShowActionsBar>
);

export const BrilleShow = () => (
  <Show actions={<BrilleShowActions />}>
    <ShowLayout>
      <ShowColumns>
        <ShowColumn>
          <ShowSection title="Datenbankfelder">
            <Field>
              <TextField source="id" />
            </Field>
            <Field>
              <DateField source="created_at" />
            </Field>
          </ShowSection>
          <ShowSection title="Auftragsdaten">
            <Field label="Status">
              <FunctionField
                render={(record) => <BrilleStatusChip record={record} />}
              />
            </Field>
            <Field>
              <TextField source="BrillenArt" />
            </Field>
            <Field>
              <TextField source="Berater" />
            </Field>
            <Field>
              <TextField source="Refraktion" />
            </Field>
            <Field>
              <DateField source="Datum" />
            </Field>
            <Field>
              <TextField source="Werkstatt" />
            </Field>
            <Field>
              <DateField source="Abholung" />
            </Field>
            <Field>
              <TextField source="Notizen" />
            </Field>
          </ShowSection>
          <ShowSection title="Komponenten">
            <Field>
              <ReferenceField
                source="GlasLinks"
                reference="glass"
                link="show"
              />
            </Field>
            <Field>
              <ReferenceField
                source="GlasRechts"
                reference="glass"
                link="show"
              />
            </Field>
            <Field>
              <ReferenceField
                source="Fassung"
                reference="fassung"
                link="show"
              />
            </Field>
            <Field>
              <ReferenceField
                source="Glastyp"
                reference="glastyp"
                link="show"
              />
            </Field>
          </ShowSection>
          <RelatedSection title="Zusatzleistungen">
            <ReferenceManyField
              reference="brille_hat_zusatzleistungen"
              target="BrillenID"
              label={false}
            >
              <Datagrid bulkActionButtons={false}>
                <ReferenceField
                  source="ZusatzleistungID"
                  reference="zusatzleistung"
                  link="show"
                  label="Bezeichnung"
                >
                  <TextField source="Bezeichnung" />
                </ReferenceField>
                <ReferenceField
                  source="ZusatzleistungID"
                  reference="zusatzleistung"
                  link={false}
                  label="Kategorie"
                >
                  <TextField source="Kategorie" />
                </ReferenceField>
                <ReferenceField
                  source="ZusatzleistungID"
                  reference="zusatzleistung"
                  link={false}
                  label="Preis"
                >
                  <CurrencyField source="Betrag" />
                </ReferenceField>
              </Datagrid>
            </ReferenceManyField>
          </RelatedSection>
          <ShowSection title="Rabatt">
            <Field>
              <TextField source="RabattBezeichnung" />
            </Field>
            <Field>
              <FunctionField
                source="RabattProzent"
                render={(record) =>
                  record?.RabattProzent != null
                    ? `-${record.RabattProzent} %`
                    : ""
                }
              />
            </Field>
          </ShowSection>
          <ShowSection title="Preis">
            <Field>
              <NumberField source="Summe" />
            </Field>
          </ShowSection>
        </ShowColumn>
        <ShowColumn>
          <RelatedSection title="Weitere Aufträge dieses Kunden">
            <ReferenceManyField
              reference="brille"
              target="kunde_id"
              source="kunde_id"
              label={false}
              sort={{ field: "Datum", order: "DESC" }}
            >
              <BrilleHistoryDatagrid />
            </ReferenceManyField>
          </RelatedSection>
        </ShowColumn>
      </ShowColumns>
    </ShowLayout>
  </Show>
);

export const BrilleEdit = () => (
  <Edit actions={<EditActionsBar />}>
    <SimpleForm>
      <FormSection title="Datenbankfelder">
        <FieldRow>
          <TextInput source="id" />
          <DateInput source="created_at" />
        </FieldRow>
      </FormSection>
      <FormSection title="Auftragsdaten">
        <FieldRow>
          <BrillenArtInput />
          <TextInput source="Berater" />
          <TextInput source="Refraktion" />
        </FieldRow>
        <FieldRow>
          <DateInput source="Datum" />
          <TextInput source="Werkstatt" />
          <DateInput source="Abholung" />
        </FieldRow>
        <TextInput source="Notizen" multiline fullWidth />
      </FormSection>
      <FormSection title="Komponenten">
        <FieldRow>
          <ReferenceInput source="GlasLinks" reference="glass">
            <SelectInput optionText="id" />
          </ReferenceInput>
          <ReferenceInput source="GlasRechts" reference="glass">
            <SelectInput optionText="id" />
          </ReferenceInput>
        </FieldRow>
        <FieldRow>
          <ReferenceInput source="Fassung" reference="fassung">
            <SelectInput optionText="id" />
          </ReferenceInput>
          <ReferenceInput source="Glastyp" reference="glastyp">
            <SelectInput optionText="id" />
          </ReferenceInput>
        </FieldRow>
      </FormSection>
      <FormSection title="Zusatzleistungen">
        <ReferenceArrayInput
          source="ZusatzleistungIDs"
          reference="zusatzleistung"
        >
          <AutocompleteArrayInput
            optionText="Bezeichnung"
            label="Zusatzleistungen"
            fullWidth
          />
        </ReferenceArrayInput>
        <ReferenceManyField
          reference="brille_hat_zusatzleistungen"
          target="BrillenID"
          label={false}
        >
          <Datagrid bulkActionButtons={false}>
            <ReferenceField
              source="ZusatzleistungID"
              reference="zusatzleistung"
              link={false}
              label="Bezeichnung"
            >
              <TextField source="Bezeichnung" />
            </ReferenceField>
            <ReferenceField
              source="ZusatzleistungID"
              reference="zusatzleistung"
              link={false}
              label="Preis"
            >
              <CurrencyField source="Betrag" />
            </ReferenceField>
          </Datagrid>
        </ReferenceManyField>
      </FormSection>
      <FormSection title="Rabatt">
        <FieldRow>
          <SelectInput
            source="RabattBezeichnung"
            choices={RABATT_CODES}
            helperText="Wirkt auf Glas rechts + Glas links + Fassung, nicht auf Zusatzleistungen."
          />
          <NumberInput
            source="RabattProzent"
            label="Rabatt in %"
            helperText="VIP 15 / ZNEU 10 / zw 35 / Sonderrabatt individuell"
          />
        </FieldRow>
      </FormSection>
      <FormSection title="Preis">
        <NumberInput source="Summe" />
      </FormSection>
    </SimpleForm>
  </Edit>
);

export const BrilleCreate = () => (
  <Create>
    <SimpleForm>
      <FormSection title="Datenbankfelder">
        <FieldRow>
          <TextInput source="id" />
          <DateInput source="created_at" />
        </FieldRow>
      </FormSection>
      <FormSection title="Auftragsdaten">
        <FieldRow>
          <BrillenArtInput />
          <TextInput source="Berater" />
          <TextInput source="Refraktion" />
        </FieldRow>
        <FieldRow>
          <DateInput source="Datum" />
          <TextInput source="Werkstatt" />
          <DateInput source="Abholung" />
        </FieldRow>
        <TextInput source="Notizen" multiline fullWidth />
      </FormSection>
      <FormSection title="Komponenten">
        <FieldRow>
          <ReferenceInput source="GlasLinks" reference="glass">
            <SelectInput optionText="id" />
          </ReferenceInput>
          <ReferenceInput source="GlasRechts" reference="glass">
            <SelectInput optionText="id" />
          </ReferenceInput>
        </FieldRow>
        <FieldRow>
          <ReferenceInput source="Fassung" reference="fassung">
            <SelectInput optionText="id" />
          </ReferenceInput>
          <ReferenceInput source="Glastyp" reference="glastyp">
            <SelectInput optionText="id" />
          </ReferenceInput>
        </FieldRow>
      </FormSection>
      <FormSection title="Zusatzleistungen">
        <ReferenceArrayInput
          source="ZusatzleistungIDs"
          reference="zusatzleistung"
        >
          <AutocompleteArrayInput
            optionText="Bezeichnung"
            label="Zusatzleistungen"
            fullWidth
          />
        </ReferenceArrayInput>
      </FormSection>
      <FormSection title="Rabatt">
        <FieldRow>
          <SelectInput
            source="RabattBezeichnung"
            choices={RABATT_CODES}
            helperText="Wirkt auf Glas rechts + Glas links + Fassung, nicht auf Zusatzleistungen."
          />
          <NumberInput
            source="RabattProzent"
            label="Rabatt in %"
            helperText="VIP 15 / ZNEU 10 / zw 35 / Sonderrabatt individuell"
          />
        </FieldRow>
      </FormSection>
      <FormSection title="Preis">
        <NumberInput source="Summe" />
      </FormSection>
    </SimpleForm>
  </Create>
);
