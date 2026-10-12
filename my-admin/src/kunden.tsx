import {
  DataTable,
  DataTableProps,
  List,
  useDataProvider,
  useShowController,
  ListActions,
  useRecordContext,
  Title,
  RaRecord,
} from "react-admin";
import { DateField, Show, FunctionField } from "react-admin";
import { DateInput, Edit, SimpleForm, TextInput } from "react-admin";
import { Create } from "react-admin";
import {
  Box,
  Button,
  Card,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
  TextField as MuiTextField,
  Theme,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTastenkuerzel } from "./tastenkuerzel";
import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PrintIcon from "@mui/icons-material/Print";
import SmsIcon from "@mui/icons-material/Sms";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import EmailIcon from "@mui/icons-material/Email";
import SendIcon from "@mui/icons-material/Send";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { supabase } from "./utils";
import {
  type NachrichtTermin,
  renderMessageTemplate,
} from "./nachrichtenPlatzhalter";
import {
  buildExternalMessageUrl,
  choosePhoneNumberForMessaging,
  MessageChannel,
  openExternalMessage,
} from "./messaging";
import {
  EditActionsBar,
  FieldRow,
  FormSection,
  ShowActionsBar,
  ShowColumn,
  ShowLayout,
  DatenbankInfo,
} from "./EntityLayout";
import {
  AnredeInput,
  GeschlechtAusAnrede,
  GeschlechtInput,
  HinweiseInput,
  KundeVerwaltung,
} from "./KundeFelder";
import { KundenAuftraege } from "./KundenAuftraege";
import { zurueckNachSpeichern } from "./seitenVerlauf";
import { KundeKarteikarte } from "./KundeKarteikarte";
import { KrankenkasseInput } from "./krankenkassen";

const messageChannelIcons: Record<MessageChannel, typeof SmsIcon> = {
  sms: SmsIcon,
  whatsapp: WhatsAppIcon,
  email: EmailIcon,
};

const messageChannelLabels: Record<MessageChannel, string> = {
  sms: "SMS",
  whatsapp: "Whatsapp",
  email: "Email",
};

type NachrichtRecord = Record<string, unknown> & {
  _rowKey: string;
  id?: string | number;
};

type KundeMessageSource = Partial<Record<string, unknown>>;

type KundeMessageRouteState = {
  kunde?: KundeMessageSource;
};

type KundeMessageCustomer = {
  id: string;
  anrede: string;
  vorname: string;
  nachname: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  phoneNumberMobile: string;
  phoneNumberPrivate: string;
  phoneNumberBusiness: string;
};

const messageTitleFields = [
  "titel",
  "title",
  "name",
  "bezeichnung",
  "betreff",
  "subject",
  "ueberschrift",
  "headline",
];
const messageContentFields = [
  "content",
  "inhalt",
  "text",
  "nachricht",
  "message",
  "body",
  "beschreibung",
  "vorlage",
  "template",
];
const ignoredMessageFields = new Set([
  "_rowkey",
  "id",
  "created_at",
  "updated_at",
]);

const getMessageFieldValue = (
  record: Record<string, unknown>,
  candidateFields: string[],
) => {
  const entries = Object.entries(record);

  for (const fieldName of candidateFields) {
    const match = entries.find(
      ([key]) => key.toLowerCase() === fieldName.toLowerCase(),
    );

    if (!match) {
      continue;
    }

    const [, value] = match;

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
  }

  return null;
};

const getMessageFieldKey = (
  record: Record<string, unknown>,
  candidateFields: string[],
) => {
  const keys = Object.keys(record);

  for (const fieldName of candidateFields) {
    const match = keys.find(
      (key) => key.toLowerCase() === fieldName.toLowerCase(),
    );

    if (match) {
      return match;
    }
  }

  return null;
};

const getMessageContent = (record: NachrichtRecord) => {
  const preferredContent = getMessageFieldValue(record, messageContentFields);

  if (preferredContent) {
    return preferredContent;
  }

  const fallbackContent = Object.entries(record)
    .filter(
      ([key, value]) =>
        !ignoredMessageFields.has(key.toLowerCase()) &&
        value !== null &&
        value !== undefined &&
        String(value).trim() !== "",
    )
    .map(([key, value]) => `${key}: ${String(value).trim()}`)
    .join("\n");

  return fallbackContent || "Kein Nachrichteninhalt vorhanden.";
};

const getMessageTitle = (record: NachrichtRecord) => {
  const preferredTitle = getMessageFieldValue(record, messageTitleFields);

  if (preferredTitle) {
    return preferredTitle;
  }

  const firstLine = getMessageContent(record).split(/\r?\n/, 1)[0]?.trim();

  if (!firstLine) {
    return `Nachricht ${record.id ?? record._rowKey}`;
  }

  return firstLine.length > 60 ? `${firstLine.slice(0, 57)}...` : firstLine;
};

type MessageTemplateDraft = {
  id?: string | number;
  titleKey: string;
  contentKey: string;
  titel: string;
  text: string;
};

const defaultTemplateTitleKey = "Titel";
const defaultTemplateContentKey = "Text";

const createEmptyTemplateDraft = (): MessageTemplateDraft => ({
  titleKey: defaultTemplateTitleKey,
  contentKey: defaultTemplateContentKey,
  titel: "",
  text: "",
});

const createTemplateDraftFromRecord = (
  record: NachrichtRecord,
): MessageTemplateDraft => ({
  id: record.id,
  titleKey:
    getMessageFieldKey(record, messageTitleFields) ?? defaultTemplateTitleKey,
  contentKey:
    getMessageFieldKey(record, messageContentFields) ??
    defaultTemplateContentKey,
  titel: getMessageFieldValue(record, messageTitleFields) ?? "",
  text: getMessageFieldValue(record, messageContentFields) ?? "",
});

const toTextValue = (value: unknown) => {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number") {
    return String(value);
  }

  return "";
};

const getCustomerSourceValue = (
  source: KundeMessageSource | undefined,
  candidateKeys: string[],
) => {
  if (!source) {
    return "";
  }

  for (const key of candidateKeys) {
    const value = source[key];

    if (value === null || value === undefined) {
      continue;
    }

    const textValue = toTextValue(value);

    if (textValue) {
      return textValue;
    }
  }

  return "";
};

const normalizeKundeMessageCustomer = (
  source: KundeMessageSource | undefined,
  fallbackId = "",
): KundeMessageCustomer => {
  const id = getCustomerSourceValue(source, ["id", "Id"]) || fallbackId;
  const anrede = getCustomerSourceValue(source, ["Anrede", "anrede"]);
  const vorname = getCustomerSourceValue(source, [
    "Vorname",
    "vorname",
    "name",
  ]);
  const nachname = getCustomerSourceValue(source, [
    "Nachname",
    "nachname",
    "lastname",
  ]);
  const email = getCustomerSourceValue(source, ["Email", "email", "mail"]);
  const phoneNumberPrivate = getCustomerSourceValue(source, [
    "TelefonnummerPrivat",
    "telefonnummerPrivat",
    "telefonnummerprivat",
    "phoneNumberPrivate",
  ]);
  const phoneNumberBusiness = getCustomerSourceValue(source, [
    "TelefonnummerGeschaeftlich",
    "telefonnummerGeschaeftlich",
    "telefonnummergeschaeftlich",
    "phoneNumberBusiness",
  ]);
  const phoneNumberMobile = getCustomerSourceValue(source, [
    "Handy",
    "handy",
    "phoneNumberMobile",
  ]);
  // SMS/WhatsApp: erste Handynummer, sonst die erste vorhandene Nummer
  const phoneNumber = choosePhoneNumberForMessaging([
    phoneNumberMobile,
    phoneNumberPrivate,
    phoneNumberBusiness,
  ]);
  const fullName = [vorname, nachname].filter(Boolean).join(" ").trim();

  return {
    id,
    anrede,
    vorname,
    nachname,
    fullName,
    email,
    phoneNumber,
    phoneNumberMobile,
    phoneNumberPrivate,
    phoneNumberBusiness,
  };
};

const kundenFilterDesktop = [
  <TextInput
    key="vorname"
    resettable
    source="Vorname@ilike"
    label="Vorname"
    alwaysOn
  />,
  <TextInput
    key="nachname"
    resettable
    source="Nachname@ilike"
    label="Nachname"
    alwaysOn
  />,
  <DateInput
    key="geburtsdatum"
    source="Geburtsdatum@ilike"
    label="Geburtsdatum"
    alwaysOn
  />,
  <TextInput
    key="kundennummer"
    resettable
    source="KundenNummer@ilike"
    label="Kundennummer"
    alwaysOn
  />,
];
const kundenFilterMobile = [
  <TextInput key="vorname" resettable source="Vorname@ilike" label="Vorname" />,
  <TextInput
    key="nachname"
    resettable
    source="Nachname@ilike"
    label="Nachname"
  />,
  <DateInput
    key="geburtsdatum"
    source="Geburtsdatum@ilike"
    label="Geburtsdatum"
  />,
  <TextInput
    key="kundennummer"
    resettable
    source="KundenNummer@ilike"
    label="Kundennummer"
  />,
];
const nachrichtRouteState = (record: RaRecord): KundeMessageRouteState => ({
  kunde: {
    id: record.id,
    Anrede: record.Anrede,
    Vorname: record.Vorname,
    Nachname: record.Nachname,
    Email: record.Email,
    Handy: record.Handy,
    TelefonnummerPrivat: record.TelefonnummerPrivat,
    TelefonnummerGeschaeftlich: record.TelefonnummerGeschaeftlich,
  },
});

const MessageButton = () => {
  const record = useRecordContext();
  const navigate = useNavigate();
  const oeffneNachricht = () => {
    if (!record) return;
    navigate(`/kunde/${record.id}/message`, {
      state: nachrichtRouteState(record),
    });
  };
  useTastenkuerzel({ m: oeffneNachricht });

  if (!record) {
    return null;
  }

  return (
    <Tooltip title="Alt + M">
      <Button
        variant="contained"
        startIcon={<SendIcon />}
        onClick={oeffneNachricht}
      >
        Nachricht senden
      </Button>
    </Tooltip>
  );
};

// Central, always-reachable actions for the Kunde detail page (message, print, edit, back).
const KundeShowActions = () => (
  <ShowActionsBar>
    <MessageButton />
    <Button startIcon={<PrintIcon />} onClick={() => window.print()}>
      Drucken
    </Button>
  </ShowActionsBar>
);

export const KundenDataTable = (props: Partial<DataTableProps>) => (
  <DataTable rowClick="show" {...props}>
    <DataTable.Col source="id" />
    <DataTable.Col label="Kunde">
      <FunctionField
        render={(record) => {
          if (!record) return "";
          const anrede = record.Anrede ? record.Anrede : "";
          const nachname = record.Nachname ? record.Nachname : "";
          const vorname = record.Vorname ? record.Vorname : "";
          return `${anrede} ${vorname} ${nachname}`.trim();
        }}
      />
    </DataTable.Col>
    <DataTable.Col label="Anschrift">
      <FunctionField
        render={(record) => {
          if (!record) return "";
          const strasse = record.Straße ? record.Straße : "";
          const hausnummer = record.Hausnummer ? record.Hausnummer : "";
          const plz = record.Postleitzahl ? record.Postleitzahl : "";
          const stadt = record.Stadt ? record.Stadt : "";
          return `${strasse} ${hausnummer}, ${plz} ${stadt}`.trim();
        }}
      />
    </DataTable.Col>
    <DataTable.Col source="KundenNummer" label="Kundennummer" />
    <DataTable.Col source="Aufnahmedatum">
      <DateField source="Aufnahmedatum" />
    </DataTable.Col>
    <DataTable.Col source="Geburtsdatum">
      <DateField source="Geburtsdatum" />
    </DataTable.Col>
    <DataTable.Col source="Geschlecht" />
    <DataTable.Col source="Tätigkeit" />
    <DataTable.Col source="TelefonnummerPrivat" label="Private Telefonnummer" />
    <DataTable.Col
      source="TelefonnummerGeschaeftlich"
      label="Geschäftliche Telefonnummer"
    />
    <DataTable.Col source="Handy" />
    <DataTable.Col source="Email" />
    <DataTable.Col source="KrankenkassenNummer" label="Krankenkassennummer" />
    <DataTable.Col source="VersichertenNummer" label="Versichertennummer" />
    <DataTable.Col
      source="KrankenversicherungsTyp"
      label="Krankenversicherung"
    />
  </DataTable>
);

export const KundenList = () => {
  const isMobile: boolean = useMediaQuery((theme: Theme) =>
    theme.breakpoints.down("sm"),
  );

  return (
    <List
      className="list-page"
      title="Kunden"
      disableSyncWithLocation
      filters={isMobile ? kundenFilterMobile : kundenFilterDesktop}
      actions={<ListActions />}
    >
      <KundenDataTable />
    </List>
  );
};

export const KundeShow = () => {
  const showObject = useShowController();
  const dataProvider = useDataProvider();

  useEffect(() => {
    if (showObject?.record?.id) {
      try {
        dataProvider.update("kunde", {
          id: showObject.record.id,
          data: {
            last_viewed_at: new Date().toISOString(),
          },
          previousData: showObject.record,
        });
      } catch (error) {
        console.error("Fehler beim Setzen last_viewed_at", error);
      }
    }
  }, [showObject, dataProvider]);

  return (
    <Show title="Kunde anzeigen" actions={<KundeShowActions />}>
      <ShowLayout>
        {/* Kundenkartei wie in Prisma, daneben die Aufträge. Die Kartei
            behält eine Mindestbreite, damit alle Felder lesbar bleiben; die
            Aufträge bekommen den Rest (auf breiten Bildschirmen 2/3) und
            rutschen bei schmalen Fenstern darunter. */}
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: "1em",
            alignItems: "flex-start",
          }}
        >
          <Box sx={{ flex: "1 1 0", minWidth: "min(100%, 460px)" }}>
            <ShowColumn>
              <KundeKarteikarte />
              <DatenbankInfo />
            </ShowColumn>
          </Box>
          <Box sx={{ flex: "2 1 0", minWidth: "min(100%, 400px)" }}>
            <ShowColumn>
              <KundenAuftraege />
            </ShowColumn>
          </Box>
        </Box>
      </ShowLayout>
    </Show>
  );
};

export const KundeEdit = () => (
  <Edit
    title="Kunde bearbeiten"
    actions={<EditActionsBar />}
    redirect={zurueckNachSpeichern}
  >
    <SimpleForm>
      <GeschlechtAusAnrede />
      <FormSection title="Stammdaten">
        <FieldRow>
          <AnredeInput />
          <TextInput source="Vorname" />
          <TextInput source="Nachname" />
          <GeschlechtInput />
          <DateInput source="Geburtsdatum" />
          <TextInput source="Tätigkeit" />
        </FieldRow>
      </FormSection>
      <FormSection title="Adresse">
        <FieldRow>
          <TextInput source="Straße" />
          <TextInput source="Hausnummer" />
          <TextInput source="Postleitzahl" />
          <TextInput source="Stadt" />
        </FieldRow>
      </FormSection>
      <FormSection title="Kontakt">
        <FieldRow>
          <TextInput source="TelefonnummerPrivat" />
          <TextInput source="TelefonnummerGeschaeftlich" />
          <TextInput source="Handy" />
          <TextInput source="Email" />
        </FieldRow>
      </FormSection>
      <FormSection title="Versicherung">
        <FieldRow>
          <KrankenkasseInput />
          <TextInput source="KrankenkassenNummer" label="Kassen-Nr." />
          <TextInput source="VersichertenNummer" label="Versicherten-Nr." />
          <TextInput source="Versichertenstatus" label="Status" />
          <TextInput
            source="KrankenversicherungsTyp"
            label="Versicherungsart"
          />
        </FieldRow>
      </FormSection>
      <FormSection title="Medizinische Notizen">
        <FieldRow>
          <HinweiseInput />
          <TextInput
            source="Notizen"
            label="Medizinische Notizen (Erkrankungen, OPs, Unverträglichkeiten)"
            multiline
            fullWidth
          />
        </FieldRow>
      </FormSection>
      <FormSection title="Merkmale">
        <FieldRow>
          <TextInput source="Merkmal1" label="Beruf" />
          <TextInput source="Merkmal2" label="Besonderes" />
          <TextInput source="KundenNummer" label="Kundennummer" />
          <DateInput source="Aufnahmedatum" />
        </FieldRow>
      </FormSection>
      <KundeVerwaltung />
    </SimpleForm>
  </Edit>
);

export const KundeCreate = () => {
  const location = useLocation();
  const locationState =
    (location.state as Record<string, unknown> | undefined) ?? {};

  const defaultValues = {
    created_at: new Date().toISOString(),
    Nachname: "",
    Vorname: "",
    Geburtsdatum: "",
    KundenNummer: "",
    Aufnahmedatum: new Date().toISOString().slice(0, 10),
    ...locationState,
  };

  return (
    <Create
      title="Neuen Kunden anlegen"
      transform={(data) => ({ ...data, created_at: new Date().toISOString() })}
    >
      <SimpleForm defaultValues={defaultValues}>
        <GeschlechtAusAnrede />
        <FormSection title="Stammdaten">
          <FieldRow>
            <AnredeInput />
            <TextInput source="Vorname" />
            <TextInput source="Nachname" />
            <GeschlechtInput />
            <DateInput source="Geburtsdatum" />
            <TextInput source="Tätigkeit" />
          </FieldRow>
        </FormSection>
        <FormSection title="Adresse">
          <FieldRow>
            <TextInput source="Straße" />
            <TextInput source="Hausnummer" />
            <TextInput source="Postleitzahl" />
            <TextInput source="Stadt" />
          </FieldRow>
        </FormSection>
        <FormSection title="Kontakt">
          <FieldRow>
            <TextInput
              source="TelefonnummerPrivat"
              label="Telefonnummer Privat"
            />
            <TextInput
              source="TelefonnummerGeschaeftlich"
              label="Telefonnummer Geschäftlich"
            />
            <TextInput source="Handy" />
            <TextInput source="Email" />
          </FieldRow>
        </FormSection>
        <FormSection title="Versicherung">
          <FieldRow>
            <KrankenkasseInput />
            <TextInput source="KrankenkassenNummer" label="Kassen-Nr." />
            <TextInput source="VersichertenNummer" label="Versicherten-Nr." />
            <TextInput source="Versichertenstatus" label="Status" />
            <TextInput
              source="KrankenversicherungsTyp"
              label="Versicherungsart"
            />
          </FieldRow>
        </FormSection>
        <FormSection title="Medizinische Notizen">
          <FieldRow>
            <HinweiseInput />
            <TextInput
              source="Notizen"
              label="Medizinische Notizen (Erkrankungen, OPs, Unverträglichkeiten)"
              multiline
              fullWidth
            />
          </FieldRow>
        </FormSection>
        <FormSection title="Merkmale">
          <FieldRow>
            <TextInput source="Merkmal1" label="Beruf" />
            <TextInput source="Merkmal2" label="Besonderes" />
            <TextInput source="KundenNummer" label="Kundennummer" />
            <DateInput source="Aufnahmedatum" />
          </FieldRow>
        </FormSection>
        <KundeVerwaltung />
      </SimpleForm>
    </Create>
  );
};

// "123 Zeichen · 1 SMS" – lange SMS werden in Teilen zu 153 Zeichen
// verschickt, Sonderzeichen/Emojis verkürzen die Teile (ungefähre Angabe).
const smsLaengeText = (text: string) => {
  const laenge = [...text].length;
  if (laenge === 0) return " ";
  const teile = laenge <= 160 ? 1 : Math.ceil(laenge / 153);
  return `${laenge} Zeichen · ${teile} SMS`;
};

export const KundeMessage = () => {
  const recordId = useParams().id ?? "";
  const location = useLocation();
  const navigate = useNavigate();
  const routeState = (location.state as KundeMessageRouteState | null) ?? null;
  const [messages, setMessages] = useState<NachrichtRecord[]>([]);
  const [selectedMessageKey, setSelectedMessageKey] = useState<string | null>(
    null,
  );
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [customer, setCustomer] = useState<KundeMessageCustomer | null>(() =>
    routeState?.kunde
      ? normalizeKundeMessageCustomer(routeState.kunde, recordId)
      : null,
  );
  const [isLoadingCustomer, setIsLoadingCustomer] = useState(
    !routeState?.kunde,
  );
  const [customerError, setCustomerError] = useState<string | null>(null);
  const [selectedChannels, setSelectedChannels] = useState<
    Record<MessageChannel, boolean>
  >({
    sms: false,
    whatsapp: false,
    email: false,
  });
  const [sendFormError, setSendFormError] = useState<string | null>(null);
  const [externalLinks, setExternalLinks] = useState<
    { channel: MessageChannel; url: string }[]
  >([]);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [templateDraft, setTemplateDraft] = useState<MessageTemplateDraft>(
    createEmptyTemplateDraft(),
  );
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [templateSaveError, setTemplateSaveError] = useState<string | null>(
    null,
  );
  const [templateToDelete, setTemplateToDelete] =
    useState<NachrichtRecord | null>(null);
  const [isDeletingTemplate, setIsDeletingTemplate] = useState(false);
  const [templateDeleteError, setTemplateDeleteError] = useState<string | null>(
    null,
  );

  const isMountedRef = useRef(true);

  // StrictMode mountet Effekte im Dev-Modus zweimal: der Merker muss beim
  // erneuten Mount wieder auf true, sonst bleibt "Lade Nachrichten..." stehen.
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadMessages = useCallback(async (preferredKey?: string | null) => {
    setIsLoadingMessages(true);
    setMessageError(null);

    const { data, error } = await supabase.from("nachrichten").select("*");

    if (!isMountedRef.current) {
      return;
    }

    if (error) {
      console.error("Fehler beim Laden der Nachrichten", error);
      setMessages([]);
      setSelectedMessageKey(null);
      setMessageError("Nachrichten konnten nicht geladen werden.");
      setIsLoadingMessages(false);
      return;
    }

    const nextMessages = (Array.isArray(data) ? data : [])
      .map((entry, index) => {
        const record = (entry ?? {}) as Record<string, unknown>;
        const id =
          typeof record.id === "string" || typeof record.id === "number"
            ? record.id
            : undefined;

        return {
          ...record,
          id,
          _rowKey: id !== undefined ? String(id) : `nachricht-${index}`,
        };
      })
      .sort((left, right) => {
        if (typeof left.id === "number" && typeof right.id === "number") {
          return left.id - right.id;
        }

        if (typeof left.id === "string" && typeof right.id === "string") {
          return left.id.localeCompare(right.id);
        }

        return left._rowKey.localeCompare(right._rowKey);
      });

    setMessages(nextMessages);
    setSelectedMessageKey((previousKey) => {
      const targetKey = preferredKey ?? previousKey;
      return targetKey &&
        nextMessages.some((message) => message._rowKey === targetKey)
        ? targetKey
        : (nextMessages[0]?._rowKey ?? null);
    });
    setIsLoadingMessages(false);
  }, []);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  const selectedMessage =
    messages.find((message) => message._rowKey === selectedMessageKey) ?? null;
  const fallbackCustomer = normalizeKundeMessageCustomer(
    { id: recordId },
    recordId,
  );

  useEffect(() => {
    const routeCustomer = routeState?.kunde;

    if (routeCustomer) {
      setCustomer(normalizeKundeMessageCustomer(routeCustomer, recordId));
      setCustomerError(null);
      setIsLoadingCustomer(false);
      return;
    }

    if (!recordId) {
      setCustomer(null);
      setCustomerError("Keine Kundennummer vorhanden.");
      setIsLoadingCustomer(false);
      return;
    }

    let isActive = true;

    const loadCustomer = async () => {
      setIsLoadingCustomer(true);
      setCustomerError(null);

      const { data, error } = await supabase
        .from("kunde")
        .select(
          "id, Anrede, Vorname, Nachname, Email, TelefonnummerPrivat, TelefonnummerGeschaeftlich",
        )
        .eq("id", recordId)
        .maybeSingle();

      if (!isActive) {
        return;
      }

      if (error || !data) {
        console.error("Fehler beim Laden der Kundendaten", error);
        setCustomer(null);
        setCustomerError("Kundendaten konnten nicht geladen werden.");
        setIsLoadingCustomer(false);
        return;
      }

      setCustomer(normalizeKundeMessageCustomer(data, recordId));
      setIsLoadingCustomer(false);
    };

    void loadCustomer();

    return () => {
      isActive = false;
    };
  }, [recordId, routeState]);

  // Nächster Termin des Kunden für {Termindatum}/{Terminuhrzeit}
  const [naechsterTermin, setNaechsterTermin] = useState<NachrichtTermin>(null);
  useEffect(() => {
    if (!recordId) return;
    let aktiv = true;
    supabase
      .from("termin")
      .select("Start")
      .eq("kunde_id", recordId)
      .gte("Start", new Date().toISOString())
      .order("Start", { ascending: true })
      .limit(1)
      .then(({ data, error }) => {
        if (!aktiv) return;
        if (error) {
          console.error("Fehler beim Laden des nächsten Termins", error);
          return;
        }
        setNaechsterTermin(data?.[0] ?? null);
      });
    return () => {
      aktiv = false;
    };
  }, [recordId]);

  const messageCustomer = customer ?? fallbackCustomer;
  const renderedMessageTitle = selectedMessage
    ? renderMessageTemplate(
        getMessageTitle(selectedMessage),
        messageCustomer,
        naechsterTermin,
      )
    : "";
  const renderedMessageContent = selectedMessage
    ? renderMessageTemplate(
        getMessageContent(selectedMessage),
        messageCustomer,
        naechsterTermin,
      )
    : "";
  // Text der gewählten Vorlage, vor dem Senden änderbar (wie das
  // SMS-Fenster in Prisma). Wechsel der Vorlage setzt ihn neu.
  const [nachrichtText, setNachrichtText] = useState("");
  const [nachrichtBetreff, setNachrichtBetreff] = useState("");
  useEffect(() => {
    setNachrichtText(renderedMessageContent);
    setNachrichtBetreff(renderedMessageTitle);
  }, [renderedMessageContent, renderedMessageTitle]);

  const recipientName =
    [messageCustomer.anrede, messageCustomer.vorname, messageCustomer.nachname]
      .filter(Boolean)
      .join(" ")
      .trim() || `ID ${recordId}`;
  const deliveryTargets = {
    sms: messageCustomer.phoneNumber,
    whatsapp: messageCustomer.phoneNumber,
    email: messageCustomer.email,
  };
  const toggleChannel =
    (channel: MessageChannel) => (event: ChangeEvent<HTMLInputElement>) => {
      setSelectedChannels((previous) => ({
        ...previous,
        [channel]: event.target.checked,
      }));
    };

  // Öffnet die passende App (Mail-Programm, SMS, WhatsApp) mit
  // vorausgefüllter Nachricht, statt über die Edge Functions zu versenden -
  // so geht es ohne API-Keys. Bei mehreren Kanälen wird der erste direkt
  // geöffnet, die übrigen stehen als Links bereit (Browser blockieren sonst
  // weitere Fenster).
  const handleSend = () => {
    setSendFormError(null);
    setExternalLinks([]);

    if (!nachrichtText.trim()) {
      setSendFormError("Bitte wähle eine Vorlage oder schreibe einen Text.");
      return;
    }

    const channelsToSend = (
      Object.keys(selectedChannels) as MessageChannel[]
    ).filter(
      (channel) => selectedChannels[channel] && deliveryTargets[channel],
    );

    if (channelsToSend.length === 0) {
      setSendFormError("Bitte wähle mindestens einen Nachrichtenkanal aus.");
      return;
    }

    const links = channelsToSend.map((channel) => ({
      channel,
      url: buildExternalMessageUrl(channel, {
        to: deliveryTargets[channel],
        message: nachrichtText,
        subject: nachrichtBetreff,
      }),
    }));

    setExternalLinks(links);
    openExternalMessage(links[0].url);
  };

  const openCreateTemplateDialog = () => {
    setTemplateDraft(createEmptyTemplateDraft());
    setTemplateSaveError(null);
    setTemplateDialogOpen(true);
  };

  const openEditTemplateDialog = (message: NachrichtRecord) => {
    setTemplateDraft(createTemplateDraftFromRecord(message));
    setTemplateSaveError(null);
    setTemplateDialogOpen(true);
  };

  const closeTemplateDialog = () => {
    if (isSavingTemplate) {
      return;
    }

    setTemplateDialogOpen(false);
  };

  const handleSaveTemplate = async () => {
    const titel = templateDraft.titel.trim();
    const text = templateDraft.text.trim();

    if (!titel || !text) {
      setTemplateSaveError("Bitte Titel und Text angeben.");
      return;
    }

    setTemplateSaveError(null);
    setIsSavingTemplate(true);

    const payload = {
      [templateDraft.titleKey]: titel,
      [templateDraft.contentKey]: text,
    };

    const { data, error } =
      templateDraft.id !== undefined
        ? await supabase
            .from("nachrichten")
            .update(payload)
            .eq("id", templateDraft.id)
            .select("id")
            .maybeSingle()
        : await supabase
            .from("nachrichten")
            .insert(payload)
            .select("id")
            .maybeSingle();

    if (!isMountedRef.current) {
      return;
    }

    setIsSavingTemplate(false);

    if (error) {
      console.error("Fehler beim Speichern der Nachrichtenvorlage", error);
      setTemplateSaveError("Vorlage konnte nicht gespeichert werden.");
      return;
    }

    setTemplateDialogOpen(false);

    const savedId =
      templateDraft.id ?? (data as { id?: string | number } | null)?.id;
    await loadMessages(savedId !== undefined ? String(savedId) : undefined);
  };

  const openDeleteTemplateDialog = (message: NachrichtRecord) => {
    setTemplateDeleteError(null);
    setTemplateToDelete(message);
  };

  const closeDeleteTemplateDialog = () => {
    if (isDeletingTemplate) {
      return;
    }

    setTemplateToDelete(null);
  };

  const handleConfirmDeleteTemplate = async () => {
    if (!templateToDelete || templateToDelete.id === undefined) {
      return;
    }

    setIsDeletingTemplate(true);
    setTemplateDeleteError(null);

    const { error } = await supabase
      .from("nachrichten")
      .delete()
      .eq("id", templateToDelete.id);

    if (!isMountedRef.current) {
      return;
    }

    setIsDeletingTemplate(false);

    if (error) {
      console.error("Fehler beim Löschen der Nachrichtenvorlage", error);
      setTemplateDeleteError("Vorlage konnte nicht gelöscht werden.");
      return;
    }

    setTemplateToDelete(null);
    await loadMessages();
  };

  const channelOrder: MessageChannel[] = ["sms", "whatsapp", "email"];

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: 1080,
        margin: "0 auto",
        minWidth: 0,
        padding: { xs: "0.75em", md: "1.5em" },
      }}
    >
      <Title title="Nachricht senden" />
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          mb: 2,
          minWidth: 0,
        }}
      >
        <IconButton
          aria-label="Zurück zum Kunden"
          onClick={() => navigate(`/kunde/${recordId}/show`)}
          sx={{ mt: "2px" }}
        >
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="h5"
            component="h1"
            sx={{ fontWeight: 600 }}
            noWrap
          >
            Nachricht senden
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }} noWrap>
            an {recipientName}
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          gap: "1em",
          alignItems: "start",
          minWidth: 0,
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: "1em",
            minWidth: 0,
          }}
        >
          <Card sx={{ padding: "1em" }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: 1,
              }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Nachricht auswählen
              </Typography>
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={openCreateTemplateDialog}
              >
                Neue Vorlage
              </Button>
            </Box>
            <Divider sx={{ mb: 1 }} />
            <Box
              sx={{
                maxHeight: { xs: "13rem", md: "18rem" },
                overflowY: "auto",
              }}
            >
              {isLoadingMessages ? (
                <Typography sx={{ mt: 1, color: "text.secondary" }}>
                  Lade Nachrichten...
                </Typography>
              ) : null}
              {!isLoadingMessages && messageError ? (
                <Typography color="error" sx={{ mt: 1 }}>
                  {messageError}
                </Typography>
              ) : null}
              {!isLoadingMessages && !messageError && messages.length === 0 ? (
                <Typography sx={{ mt: 1, color: "text.secondary" }}>
                  Keine Nachrichten gefunden.
                </Typography>
              ) : null}
              {!isLoadingMessages && !messageError
                ? messages.map((message) => {
                    const messageTitle = getMessageTitle(message);
                    const messageContent = getMessageContent(message);

                    return (
                      <ListItem
                        key={message._rowKey}
                        disablePadding
                        secondaryAction={
                          <Stack direction="row" spacing={0.5}>
                            <IconButton
                              aria-label="Vorlage bearbeiten"
                              size="small"
                              onClick={() => openEditTemplateDialog(message)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              aria-label="Vorlage löschen"
                              size="small"
                              onClick={() => openDeleteTemplateDialog(message)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Stack>
                        }
                      >
                        <ListItemButton
                          selected={selectedMessageKey === message._rowKey}
                          onClick={() => setSelectedMessageKey(message._rowKey)}
                          sx={{ borderRadius: 1, pr: 9 }}
                        >
                          <ListItemText
                            primary={messageTitle}
                            primaryTypographyProps={{ noWrap: true }}
                            secondary={
                              messageTitle === messageContent
                                ? undefined
                                : messageContent
                            }
                            secondaryTypographyProps={{ noWrap: true }}
                          />
                        </ListItemButton>
                      </ListItem>
                    );
                  })
                : null}
            </Box>
          </Card>

          <Card sx={{ padding: "1em" }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              Versandkanäle
            </Typography>
            <Divider sx={{ mb: 1 }} />
            <Stack spacing={1}>
              {channelOrder.map((channel) => {
                const ChannelIcon = messageChannelIcons[channel];
                const target = deliveryTargets[channel];

                return (
                  <Box
                    key={channel}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      minWidth: 0,
                      border: "1px solid",
                      borderColor: selectedChannels[channel]
                        ? "primary.main"
                        : "divider",
                      borderRadius: 1,
                      padding: "0.25em 0.5em",
                      opacity: target ? 1 : 0.6,
                    }}
                  >
                    <ChannelIcon
                      fontSize="small"
                      sx={{ color: "text.secondary" }}
                    />
                    <FormControlLabel
                      sx={{
                        flexGrow: 1,
                        minWidth: 0,
                        mr: 0,
                        "& .MuiFormControlLabel-label": {
                          minWidth: 0,
                          overflow: "hidden",
                        },
                      }}
                      label={
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" noWrap>
                            {messageChannelLabels[channel]}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{ color: "text.secondary" }}
                            noWrap
                            component="div"
                          >
                            {target || "kein Kontaktweg hinterlegt"}
                          </Typography>
                        </Box>
                      }
                      control={
                        <Checkbox
                          checked={selectedChannels[channel]}
                          disabled={!target}
                          onChange={toggleChannel(channel)}
                        />
                      }
                    />
                  </Box>
                );
              })}
            </Stack>
          </Card>
        </Box>

        <Card
          sx={{
            padding: "1em",
            minWidth: 0,
            position: { md: "sticky" },
            top: { md: "1em" },
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
            Vorschau
          </Typography>
          <Divider sx={{ mb: 1 }} />
          {isLoadingCustomer ? (
            <Typography sx={{ mb: 2, color: "text.secondary" }}>
              Lade Kundendaten...
            </Typography>
          ) : null}
          {customerError ? (
            <Typography color="error" sx={{ mb: 2 }}>
              {customerError}
            </Typography>
          ) : null}
          <Stack spacing={0.5} sx={{ mb: 2, minWidth: 0 }}>
            <Typography
              variant="body2"
              sx={{ color: "text.secondary", overflowWrap: "break-word" }}
            >
              Empfänger: {recipientName}
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: "text.secondary", overflowWrap: "break-word" }}
            >
              Email: {messageCustomer.email || "nicht vorhanden"}
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: "text.secondary", overflowWrap: "break-word" }}
            >
              Telefonnummer: {messageCustomer.phoneNumber || "nicht vorhanden"}
            </Typography>
          </Stack>
          <Stack spacing={1.5}>
            {selectedChannels.email ? (
              <MuiTextField
                label="Betreff (E-Mail)"
                value={nachrichtBetreff}
                onChange={(e) => setNachrichtBetreff(e.target.value)}
                fullWidth
              />
            ) : null}
            <MuiTextField
              label="Text"
              placeholder="Vorlage links auswählen oder Text schreiben"
              value={nachrichtText}
              onChange={(e) => setNachrichtText(e.target.value)}
              multiline
              minRows={6}
              maxRows={16}
              fullWidth
              helperText={smsLaengeText(nachrichtText)}
            />
          </Stack>
        </Card>
      </Box>

      <Box
        sx={{
          position: "sticky",
          bottom: 0,
          zIndex: 4,
          mt: 2,
          padding: "0.75em",
          marginX: { xs: "-0.75em", md: "-1.5em" },
          backgroundColor: "background.paper",
          borderTop: "1px solid",
          borderColor: "divider",
        }}
      >
        {sendFormError ? (
          <Typography color="error" sx={{ textAlign: "right", mb: 1 }}>
            {sendFormError}
          </Typography>
        ) : null}
        {externalLinks.length > 0 ? (
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.5em",
              justifyContent: "flex-end",
              alignItems: "center",
              mb: 1,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Bitte in der geöffneten App absenden.
              {externalLinks.some((link) => link.channel === "whatsapp")
                ? " WhatsApp: Der Text ist kopiert – ist das Feld leer, Strg+V drücken."
                : ""}{" "}
              Erneut öffnen:
            </Typography>
            {externalLinks.map((link) => (
              <Button
                key={link.channel}
                size="small"
                variant="text"
                onClick={() => openExternalMessage(link.url)}
              >
                {messageChannelLabels[link.channel]}
              </Button>
            ))}
          </Box>
        ) : null}
        <Box
          sx={{
            display: "flex",
            gap: "1em",
            justifyContent: "flex-end",
          }}
        >
          <Button
            variant="outlined"
            onClick={() => navigate(`/kunde/${recordId}/show`)}
          >
            Abbrechen
          </Button>
          <Button
            variant="contained"
            startIcon={<SendIcon />}
            onClick={handleSend}
          >
            In App öffnen
          </Button>
        </Box>
      </Box>

      <Dialog
        open={templateDialogOpen}
        onClose={closeTemplateDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {templateDraft.id !== undefined
            ? "Vorlage bearbeiten"
            : "Neue Vorlage anlegen"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <MuiTextField
              label="Titel"
              value={templateDraft.titel}
              onChange={(event) =>
                setTemplateDraft((previous) => ({
                  ...previous,
                  titel: event.target.value,
                }))
              }
              fullWidth
              autoFocus
            />
            <MuiTextField
              label="Text"
              value={templateDraft.text}
              onChange={(event) =>
                setTemplateDraft((previous) => ({
                  ...previous,
                  text: event.target.value,
                }))
              }
              fullWidth
              multiline
              minRows={4}
              helperText="Platzhalter wie {{vorname}}, {{nachname}}, {{anrede}}, {{email}} oder {{telefon}} werden beim Versand automatisch ersetzt."
            />
            {templateSaveError ? (
              <Typography color="error">{templateSaveError}</Typography>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeTemplateDialog} disabled={isSavingTemplate}>
            Abbrechen
          </Button>
          <Button
            variant="contained"
            onClick={() => void handleSaveTemplate()}
            disabled={isSavingTemplate}
          >
            {isSavingTemplate ? "Wird gespeichert..." : "Speichern"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={templateToDelete !== null}
        onClose={closeDeleteTemplateDialog}
      >
        <DialogTitle>Vorlage löschen</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Soll die Vorlage „
            {templateToDelete ? getMessageTitle(templateToDelete) : ""}“
            wirklich gelöscht werden?
          </DialogContentText>
          {templateDeleteError ? (
            <Typography color="error" sx={{ mt: 1 }}>
              {templateDeleteError}
            </Typography>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={closeDeleteTemplateDialog}
            disabled={isDeletingTemplate}
          >
            Abbrechen
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => void handleConfirmDeleteTemplate()}
            disabled={isDeletingTemplate}
          >
            {isDeletingTemplate ? "Wird gelöscht..." : "Löschen"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
