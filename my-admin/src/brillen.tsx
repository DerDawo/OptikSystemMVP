import {
  DataTable,
  DateField,
  List,
  ReferenceField,
  ReferenceManyField,
  Pagination,
} from "react-admin";
import { Show, TextField } from "react-admin";
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
  SaveButton,
  Toolbar,
  useDataProvider,
  useGetMany,
  useGetOne,
  useNotify,
  useRecordContext,
} from "react-admin";
import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AddIcon from "@mui/icons-material/Add";
import { KundeInput } from "./KundeInput";
import { BrilleKarteikarte, WerteTabelle } from "./BrilleKarteikarte";
import { brillenartOptionen } from "./brillenarten";
import { rabattDatenBrille, rabattOptionen } from "./rabatte";
import { ZAHLUNGSSTATUS } from "./zahlungsstatus";
import { zurueckNachSpeichern } from "./seitenVerlauf";
import { useFormContext, useWatch } from "react-hook-form";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowUpRightFromSquare } from "@fortawesome/free-solid-svg-icons";
import {
  Box,
  CircularProgress,
  TextField as MuiTextField,
} from "@mui/material";
import {
  MitarbeiterField,
  MitarbeiterInput,
  RefraktionInput,
} from "./mitarbeiter";
import { CurrencyField, formatCurrency } from "./CurrencyField";
import { GlasassistentButton } from "./glaskatalog/Glasassistent";
import {
  BerechtigungsscheinErstellenButton,
  FormulareButton,
  MahnungErstellenButton,
  RechnungErstellenButton,
  WerkstattauftragButton,
} from "./FormulareDialog";
import { KarteikarteKopierenButton } from "./KarteikarteKopieren";
import { BrilleOptionenMenu } from "./BrilleOptionen";
import { BrilleSymbolleiste } from "./BrilleSymbolleiste";
import {
  EditActionsBar,
  FieldRow,
  FormSection,
  RelatedSection,
  ShowActionsBar,
  ShowLayout,
  DatenbankInfo,
} from "./EntityLayout";
import { BrilleHistoryDatagrid } from "./BrilleHistory";
import { BrilleStatusChip, brilleRowSx } from "./orderStatus";

// Rabatt-Auswahl (rabatte.ts): Neukunden-/Zweitbrillenrabatt setzen den
// Prozentsatz, beim Sonderrabatt wird er von Hand eingetragen.
const RabattInputs = () => {
  const record = useRecordContext();
  const { setValue } = useFormContext();
  return (
    <FieldRow>
      <SelectInput
        source="RabattBezeichnung"
        label="Rabatt"
        choices={rabattOptionen(record?.RabattBezeichnung)}
        emptyText="–"
        helperText="Wirkt auf Glas rechts + Glas links + Fassung, nicht auf Zusatzleistungen."
        onChange={(e) => {
          const daten = rabattDatenBrille(e?.target?.value || null);
          if ("RabattProzent" in daten) {
            setValue("RabattProzent", daten.RabattProzent, {
              shouldDirty: true,
            });
            setValue("RabattBetrag", daten.RabattBetrag, { shouldDirty: true });
          }
        }}
      />
      <NumberInput
        source="RabattProzent"
        label="Rabatt in %"
        helperText="Neukunden 10 / Zweitbrille 15 / Sonderrabatt individuell"
      />
      <NumberInput
        source="RabattBetrag"
        label="Rabatt in €"
        helperText="Fester Betrag, wird von der Summe abgezogen"
      />
    </FieldRow>
  );
};

const zahlungsstatusChoices = ZAHLUNGSSTATUS;

// Live-Vorschau der "Summe" (Issue #52): spiegelt im Formular dieselbe Formel,
// die serverseitig per Trigger berechnet wird -
//   (GlasLinks.Betrag + GlasRechts.Betrag + Fassung.Betrag) * (1 - Rabatt%)
//   + Summe(Zusatzleistung.Betrag) + WeitereLeistungen (#131) - RabattBetrag
// - damit Nutzer den Betrag schon vor dem Speichern sehen. Der eigentliche
// Wert bleibt serverseitig maßgeblich (Trigger überschreibt ihn beim
// Speichern ohnehin), die Vorschau schreibt ihn zusätzlich ins Formular, damit
// er beim Absenden bereits mitgeschickt wird.
const useZusatzleistungenSumme = (zusatzleistungIds: number[]) => {
  const { data: zusatzleistungen } = useGetMany(
    "zusatzleistung",
    { ids: zusatzleistungIds },
    { enabled: zusatzleistungIds.length > 0 },
  );
  return (zusatzleistungen ?? []).reduce(
    (summe, zusatzleistung) => summe + (Number(zusatzleistung.Betrag) || 0),
    0,
  );
};

const SummeUndRestbetragVorschau = () => {
  const [
    glasLinksId,
    glasRechtsId,
    fassungId,
    rabattProzent,
    anzahlung,
    kkAnteil,
    weitereLeistungen,
    rabattEuro,
  ] = useWatch({
    name: [
      "GlasLinks",
      "GlasRechts",
      "Fassung",
      "RabattProzent",
      "Anzahlung",
      "KKAnteil",
      "WeitereLeistungen",
      "RabattBetrag",
    ],
  });
  const zusatzleistungIds: number[] = (
    useWatch({ name: "ZusatzleistungIDs" }) ?? []
  ).filter((id: number | null | undefined) => id !== null && id !== undefined);
  const { setValue } = useFormContext();

  const glasIds = [glasLinksId, glasRechtsId].filter(
    (id) => id !== null && id !== undefined,
  );
  const { data: glaeser } = useGetMany(
    "glass",
    { ids: glasIds },
    { enabled: glasIds.length > 0 },
  );
  const { data: fassung } = useGetOne(
    "fassung",
    { id: fassungId },
    { enabled: fassungId !== null && fassungId !== undefined },
  );
  const zusatzleistungenSumme = useZusatzleistungenSumme(zusatzleistungIds);

  const betragOf = (id: unknown) =>
    Number(glaeser?.find((glas) => glas.id === id)?.Betrag) || 0;
  const glasLinksBetrag = betragOf(glasLinksId);
  const glasRechtsBetrag = betragOf(glasRechtsId);
  const fassungBetrag = Number(fassung?.Betrag) || 0;
  const rabattFaktor = 1 - (Number(rabattProzent) || 0) / 100;

  const summe =
    Math.round(
      ((glasLinksBetrag + glasRechtsBetrag + fassungBetrag) * rabattFaktor +
        zusatzleistungenSumme +
        (Number(weitereLeistungen) || 0) -
        (Number(rabattEuro) || 0)) *
        100,
    ) / 100;
  const restbetrag =
    Math.round(
      (summe - (Number(anzahlung) || 0) - (Number(kkAnteil) || 0)) * 100,
    ) / 100;

  useEffect(() => {
    setValue("Summe", summe, { shouldDirty: true, shouldValidate: false });
  }, [summe, setValue]);

  return (
    <FieldRow>
      <MuiTextField
        label="Summe (berechnet)"
        value={formatCurrency(summe)}
        helperText="Automatisch berechnet aus Glas links + Glas rechts + Fassung (abzüglich Rabatt) plus Zusatzleistungen und weitere Leistungen."
        slotProps={{ input: { readOnly: true } }}
        fullWidth
      />
      <MuiTextField
        label="Offener Restbetrag"
        value={formatCurrency(restbetrag)}
        helperText="Summe abzüglich Anzahlung und KK-Anteil."
        slotProps={{ input: { readOnly: true } }}
        fullWidth
      />
    </FieldRow>
  );
};

// Brillenart als feste Auswahl (brillenarten.ts); ein abweichender Altwert
// des Auftrags bleibt wählbar.
const BrillenArtInput = () => {
  const record = useRecordContext();
  return (
    <SelectInput
      source="BrillenArt"
      choices={brillenartOptionen(record?.BrillenArt)}
      emptyText="–"
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
      <DataTable.Col source="Berater" label="Bedient von">
        <MitarbeiterField source="Berater" label="Bedient von" />
      </DataTable.Col>
      <DataTable.Col source="Refraktion" label="Refraktion durch">
        <MitarbeiterField source="Refraktion" label="Refraktion durch" />
      </DataTable.Col>
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
      <DataTable.Col sx={{ textAlign: "end" }} source="Anzahlung">
        <CurrencyField source="Anzahlung" />
      </DataTable.Col>
      <DataTable.Col
        sx={{ textAlign: "end" }}
        source="KKAnteil"
        label="KK-Anteil"
      >
        <CurrencyField source="KKAnteil" />
      </DataTable.Col>
      <DataTable.Col source="Rechnungsnummer" label="Rechnungsnr." />
      <DataTable.Col source="Zahlungsstatus" />
    </DataTable>
  </List>
);

// Always-reachable actions for the Brille detail page (print, edit, back).
const BrilleShowActions = () => (
  <ShowActionsBar>
    <RechnungErstellenButton />
    <FormulareButton />
    <KarteikarteKopierenButton />
    <BrilleOptionenMenu />
  </ShowActionsBar>
);

export const BrilleShow = () => (
  <Show actions={<BrilleShowActions />}>
    <ShowLayout>
      {/* Karteikarte mit der Symbolleiste am rechten Rand wie in Prisma */}
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
          <BrilleKarteikarte />
        </Box>
        <Box sx={{ display: { xs: "none", md: "block" } }}>
          <BrilleSymbolleiste />
        </Box>
      </Box>
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
      <DatenbankInfo />
    </ShowLayout>
  </Show>
);

// Werte der gewählten Gläser im Formular, wie auf der Karteikarte. Bei einem
// gespeicherten Auftrag lassen sich die Werte direkt eintippen (wird sofort
// gespeichert); ein dabei neu angelegtes Glas wird ins Formular übernommen.
const WerteVorschau = () => {
  const record = useRecordContext();
  const { setValue } = useFormContext();
  const rechtsId = useWatch({ name: "GlasRechts" });
  const linksId = useWatch({ name: "GlasLinks" });
  if (!record?.id && !rechtsId && !linksId) return null;
  return (
    <Box sx={{ mb: 1 }}>
      <WerteTabelle
        rechtsId={rechtsId}
        linksId={linksId}
        brille={record?.id != null ? (record as { id: number }) : undefined}
        beiNeuemGlas={(verweis, id) => setValue(verweis, id)}
      />
    </Box>
  );
};

export const BrilleEdit = () => (
  <Edit
    redirect={zurueckNachSpeichern}
    actions={
      <EditActionsBar>
        <RechnungErstellenButton />
        <MahnungErstellenButton />
        <BerechtigungsscheinErstellenButton />
        <WerkstattauftragButton />
        <FormulareButton />
        <KarteikarteKopierenButton />
      </EditActionsBar>
    }
  >
    <SimpleForm>
      <FormSection title="Auftrag">
        <KundeInput />
        <FieldRow>
          <MitarbeiterInput source="Berater" label="Bedient von" />
          <RefraktionInput
            source="Refraktion"
            label="Refraktion durch (Mitarbeiter / Arzt)"
          />
        </FieldRow>
      </FormSection>
      <FormSection title="Auftragsdaten">
        <FieldRow>
          <BrillenArtInput />
          <DateInput source="Datum" />
        </FieldRow>
        <FieldRow>
          <TextInput source="Werkstatt" />
          <DateInput source="Abholung" />
        </FieldRow>
        <TextInput source="Notizen" multiline fullWidth />
      </FormSection>
      <FormSection title="Komponenten">
        {/* Werte direkt in der Tabelle eintippen (ohne Glas-Auswahl) */}
        <WerteVorschau />
        <FieldRow>
          <ReferenceInput source="Fassung" reference="fassung">
            <SelectInput />
          </ReferenceInput>
          <ReferenceInput source="Glastyp" reference="glastyp">
            <SelectInput />
          </ReferenceInput>
        </FieldRow>
        <Box sx={{ mt: 1 }}>
          <GlasassistentButton />
        </Box>
      </FormSection>
      <FormSection title="Zusatzleistungen">
        <ReferenceArrayInput
          source="ZusatzleistungIDs"
          reference="zusatzleistung"
          filter={{ Aktiv: true }}
          sort={{ field: "Reihenfolge", order: "ASC" }}
          perPage={100}
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
        <RabattInputs />
      </FormSection>
      <FormSection title="Preis & Zahlung">
        <NumberInput
          source="WeitereLeistungen"
          label="Weitere Leistungen / Nachlass (€)"
          helperText="Leistungen ohne Katalogeintrag, negativ für Nachlass. Bei Prisma-Aufträgen: die Freitext-Leistungen aus Prisma."
        />
        <SummeUndRestbetragVorschau />
        <FieldRow>
          <NumberInput source="Anzahlung" />
          <NumberInput source="KKAnteil" label="KK-Anteil" />
        </FieldRow>
        <FieldRow>
          <TextInput source="Rechnungsnummer" label="Rechnungsnr." />
          <SelectInput
            source="Zahlungsstatus"
            choices={zahlungsstatusChoices}
          />
        </FieldRow>
      </FormSection>
      <FormSection title="Diagnose">
        <TextInput source="Diagnose" multiline minRows={3} fullWidth />
      </FormSection>
      <DatenbankInfo />
    </SimpleForm>
  </Edit>
);

// Heutiges Datum (Ortszeit) als JJJJ-MM-TT
const heute = () => new Date().toLocaleDateString("sv-SE");

/*
 * Neuer Brillenauftrag wie in Prisma: der Auftrag wird sofort angelegt und
 * öffnet sich in der Brillenkartei, wo alles direkt ausgefüllt wird. Ist der
 * Kunde noch nicht bekannt (z. B. aus der Brillenliste), wird zuerst nur der
 * Kunde gewählt.
 */
export const BrilleCreate = () => {
  const location = useLocation();
  const vorgaben =
    (location.state as Record<string, unknown> | undefined) ?? {};
  if (vorgaben.kunde_id != null) {
    return <BrilleSofortAnlegen vorgaben={vorgaben} />;
  }
  return (
    <Create
      title="Neuer Brillenauftrag"
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

const BrilleSofortAnlegen = ({
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
      .create("brille", { data: { ...vorgaben, Datum: heute() } })
      .then(({ data }) =>
        navigate(`/brille/${data.id}/show`, { replace: true }),
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
