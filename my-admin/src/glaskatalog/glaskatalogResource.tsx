import {
  BooleanField,
  DataTable,
  DateField,
  List,
  ReferenceField,
  ReferenceManyField,
  Show,
  TextField,
} from "react-admin";
import { CurrencyField } from "../CurrencyField";
import {
  Field,
  FieldRow,
  RelatedSection,
  ShowLayout,
  ShowSection,
} from "../EntityLayout";

export const GlashersstellerList = () => (
  <List title="Glashersteller" resource="glashersteller">
    <DataTable>
      <DataTable.Col source="id" />
      <DataTable.Col source="code" label="Herstellercode" />
      <DataTable.Col source="name" label="Name" />
    </DataTable>
  </List>
);

export const GlashersstellerShow = () => (
  <Show resource="glashersteller">
    <ShowLayout>
      <ShowSection title="Datenbankfelder">
        <Field>
          <TextField source="id" />
        </Field>
        <Field>
          <DateField source="created_at" />
        </Field>
      </ShowSection>
      <ShowSection title="Details">
        <Field>
          <TextField source="code" label="Herstellercode" />
        </Field>
        <Field>
          <TextField source="name" label="Name" />
        </Field>
      </ShowSection>
      <RelatedSection title="Grundgläser">
        <ReferenceManyField
          reference="glaskatalog"
          target="glashersteller_id"
          label={false}
        >
          <DataTable>
            <DataTable.Col source="esd_code" label="ESD-Code" />
            <DataTable.Col source="bezeichnung" />
            <DataTable.NumberCol source="brechungsindex" label="Index" />
            <DataTable.Col sx={{ textAlign: "end" }} source="basispreis">
              <CurrencyField source="basispreis" />
            </DataTable.Col>
            <DataTable.Col source="aktiv">
              <BooleanField source="aktiv" />
            </DataTable.Col>
          </DataTable>
        </ReferenceManyField>
      </RelatedSection>
    </ShowLayout>
  </Show>
);

export const GlaskatalogList = () => (
  <List
    title="Glaskatalog (Herstellerdaten)"
    resource="glaskatalog"
    sort={{ field: "bezeichnung", order: "ASC" }}
  >
    <DataTable>
      <DataTable.Col source="id" />
      <DataTable.Col source="esd_code" label="ESD-Code" />
      <DataTable.Col source="bezeichnung" label="Bezeichnung" />
      <DataTable.Col source="glashersteller_id" label="Hersteller">
        <ReferenceField
          reference="glashersteller"
          source="glashersteller_id"
          link="show"
        >
          <TextField source="name" />
        </ReferenceField>
      </DataTable.Col>
      <DataTable.NumberCol source="brechungsindex" label="Index" />
      <DataTable.Col
        sx={{ textAlign: "end" }}
        source="basispreis"
        label="Basispreis"
      >
        <CurrencyField source="basispreis" />
      </DataTable.Col>
      <DataTable.Col source="aktiv">
        <BooleanField source="aktiv" />
      </DataTable.Col>
    </DataTable>
  </List>
);

export const GlaskatalogShow = () => (
  <Show resource="glaskatalog">
    <ShowLayout>
      <ShowSection title="Datenbankfelder">
        <Field>
          <TextField source="id" />
        </Field>
        <Field>
          <DateField source="created_at" />
        </Field>
      </ShowSection>
      <ShowSection title="Details">
        <Field>
          <TextField source="esd_code" label="ESD-Code" />
        </Field>
        <Field>
          <TextField source="bezeichnung" />
        </Field>
        <Field>
          <ReferenceField
            reference="glashersteller"
            source="glashersteller_id"
            link="show"
          >
            <TextField source="name" />
          </ReferenceField>
        </Field>
        <Field>
          <TextField source="brechungsindex" label="Brechungsindex" />
        </Field>
        <Field>
          <CurrencyField source="basispreis" label="Basispreis" />
        </Field>
        <Field>
          <BooleanField source="aktiv" />
        </Field>
      </ShowSection>
      <RelatedSection title="Verfügbare Beschichtungen/Farben">
        <ReferenceManyField
          reference="glaskatalog_hat_option"
          target="glaskatalog_id"
          label={false}
        >
          <DataTable>
            <DataTable.Col source="glaskatalog_option_id" label="Option">
              <ReferenceField
                reference="glaskatalog_option"
                source="glaskatalog_option_id"
                link="show"
              >
                <TextField source="bezeichnung" />
              </ReferenceField>
            </DataTable.Col>
          </DataTable>
        </ReferenceManyField>
      </RelatedSection>
    </ShowLayout>
  </Show>
);

export const GlaskatalogOptionList = () => (
  <List title="Glaskatalog-Optionen" resource="glaskatalog_option">
    <DataTable>
      <DataTable.Col source="id" />
      <DataTable.Col source="code" label="Code" />
      <DataTable.Col source="bezeichnung" />
      <DataTable.Col source="typ" label="Typ" />
      <DataTable.Col sx={{ textAlign: "end" }} source="preis">
        <CurrencyField source="preis" />
      </DataTable.Col>
      <DataTable.Col source="glashersteller_id" label="Hersteller">
        <ReferenceField
          reference="glashersteller"
          source="glashersteller_id"
          link="show"
        >
          <TextField source="name" />
        </ReferenceField>
      </DataTable.Col>
    </DataTable>
  </List>
);

export const GlaskatalogOptionShow = () => (
  <Show resource="glaskatalog_option">
    <ShowLayout>
      <ShowSection title="Datenbankfelder">
        <Field>
          <TextField source="id" />
        </Field>
        <Field>
          <DateField source="created_at" />
        </Field>
      </ShowSection>
      <ShowSection title="Details">
        <FieldRow>
          <Field>
            <TextField source="code" />
          </Field>
          <Field>
            <TextField source="bezeichnung" />
          </Field>
          <Field>
            <TextField source="typ" />
          </Field>
        </FieldRow>
        <Field>
          <CurrencyField source="preis" />
        </Field>
        <Field>
          <ReferenceField
            reference="glashersteller"
            source="glashersteller_id"
            link="show"
          >
            <TextField source="name" />
          </ReferenceField>
        </Field>
      </ShowSection>
    </ShowLayout>
  </Show>
);
