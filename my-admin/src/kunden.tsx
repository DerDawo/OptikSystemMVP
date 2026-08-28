import { DataTable, List, ReferenceManyField, Datagrid, useDataProvider, useShowController, ListActions, useRecordContext } from 'react-admin';
import { DateField, Show, SimpleShowLayout, TextField, FunctionField } from 'react-admin';
import { DateInput, Edit, SimpleForm, TextInput } from 'react-admin';
import { Create } from 'react-admin';
import { ReferenceField } from 'react-admin';
import { Box, Button, Card, Checkbox, Divider, FormControlLabel, IconButton, ListItem, ListItemButton, ListItemText, Stack, Theme, Typography, useMediaQuery } from '@mui/material';
import { ChangeEvent, useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SmsIcon from '@mui/icons-material/Sms';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import EmailIcon from '@mui/icons-material/Email';
import SendIcon from '@mui/icons-material/Send';
import { supabase } from './utils';
import { implementedMessageChannels, MessageChannel, MessageDeliveryResult, normalizePhoneNumberForSms, normalizePhoneNumberForWhatsapp, sendMessage } from './messaging';

const messageChannelIcons: Record<MessageChannel, typeof SmsIcon> = {
    sms: SmsIcon,
    whatsapp: WhatsAppIcon,
    email: EmailIcon,
};

const messageChannelLabels: Record<MessageChannel, string> = {
    sms: 'SMS',
    whatsapp: 'Whatsapp',
    email: 'Email',
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
    phoneNumberPrivate: string;
    phoneNumberBusiness: string;
};

const messageTitleFields = ['titel', 'title', 'name', 'bezeichnung', 'betreff', 'subject', 'ueberschrift', 'headline'];
const messageContentFields = ['content', 'inhalt', 'text', 'nachricht', 'message', 'body', 'beschreibung', 'vorlage', 'template'];
const ignoredMessageFields = new Set(['_rowkey', 'id', 'created_at', 'updated_at']);

const getMessageFieldValue = (record: Record<string, unknown>, candidateFields: string[]) => {
    const entries = Object.entries(record);

    for (const fieldName of candidateFields) {
        const match = entries.find(([key]) => key.toLowerCase() === fieldName.toLowerCase());

        if (!match) {
            continue;
        }

        const [, value] = match;

        if (typeof value === 'string' && value.trim()) {
            return value.trim();
        }

        if (typeof value === 'number' || typeof value === 'boolean') {
            return String(value);
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
        .filter(([key, value]) => !ignoredMessageFields.has(key.toLowerCase()) && value !== null && value !== undefined && String(value).trim() !== '')
        .map(([key, value]) => `${key}: ${String(value).trim()}`)
        .join('\n');

    return fallbackContent || 'Kein Nachrichteninhalt vorhanden.';
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

const toTextValue = (value: unknown) => {
    if (typeof value === 'string') {
        return value.trim();
    }

    if (typeof value === 'number') {
        return String(value);
    }

    return '';
};

const getCustomerSourceValue = (source: KundeMessageSource | undefined, candidateKeys: string[]) => {
    if (!source) {
        return '';
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

    return '';
};

const normalizeKundeMessageCustomer = (source: KundeMessageSource | undefined, fallbackId = ''): KundeMessageCustomer => {
    const id = getCustomerSourceValue(source, ['id', 'Id']) || fallbackId;
    const anrede = getCustomerSourceValue(source, ['Anrede', 'anrede']);
    const vorname = getCustomerSourceValue(source, ['Vorname', 'vorname', 'name']);
    const nachname = getCustomerSourceValue(source, ['Nachname', 'nachname', 'lastname']);
    const email = getCustomerSourceValue(source, ['Email', 'email', 'mail']);
    const phoneNumberPrivate = getCustomerSourceValue(source, ['TelefonnummerPrivat', 'telefonnummerPrivat', 'telefonnummerprivat', 'phoneNumberPrivate']);
    const phoneNumberBusiness = getCustomerSourceValue(source, ['TelefonnummerGeschaeftlich', 'telefonnummerGeschaeftlich', 'telefonnummergeschaeftlich', 'phoneNumberBusiness']);
    const phoneNumber = phoneNumberPrivate || phoneNumberBusiness;
    const fullName = [vorname, nachname].filter(Boolean).join(' ').trim();

    return {
        id,
        anrede,
        vorname,
        nachname,
        fullName,
        email,
        phoneNumber,
        phoneNumberPrivate,
        phoneNumberBusiness,
    };
};

const createMessageMergeValues = (customer: KundeMessageCustomer): Record<string, string> => ({
    anrede: customer.anrede,
    vorname: customer.vorname,
    firstname: customer.vorname,
    nachname: customer.nachname,
    lastname: customer.nachname,
    name: customer.fullName,
    fullname: customer.fullName,
    email: customer.email,
    telefon: customer.phoneNumber,
    telefonnummer: customer.phoneNumber,
    phone: customer.phoneNumber,
    phonenumber: customer.phoneNumber,
    sms: customer.phoneNumber,
    whatsapp: customer.phoneNumber,
    kundeid: customer.id,
    kundenid: customer.id,
});

const renderMessageTemplate = (template: string, customer: KundeMessageCustomer) => {
    const mergeValues = createMessageMergeValues(customer);
    const replaceToken = (_match: string, token: string) => mergeValues[token.trim().toLowerCase()] ?? '';

    return template
        .replace(/\{\{\s*([^{}[\]]+?)\s*\}\}/g, replaceToken)
        .replace(/\[\[\s*([^{}[\]]+?)\s*\]\]/g, replaceToken)
        .replace(/\{\s*([^{}[\]]+?)\s*\}/g, replaceToken)
        .replace(/\[\s*([^{}[\]]+?)\s*\]/g, replaceToken)
        .replace(/\{\s*([^{}[\]]+?)\s*\]/g, replaceToken)
        .replace(/\[\s*([^{}[\]]+?)\s*\}/g, replaceToken);
};

const kundenFilterDesktop = [
    <TextInput resettable source="Vorname@ilike" label="Vorname" alwaysOn />,
    <TextInput resettable source="Nachname@ilike" label="Nachname" alwaysOn />,
    <DateInput source="Geburtsdatum@ilike" label="Geburtsdatum" alwaysOn />,
    <TextInput resettable source="KundenNummer@ilike" label="Kundennummer" alwaysOn />,
];
const kundenFilterMobile = [
    <TextInput resettable source="Vorname@ilike" label="Vorname" />,
    <TextInput resettable source="Nachname@ilike" label="Nachname" />,
    <DateInput source="Geburtsdatum@ilike" label="Geburtsdatum" />,
    <TextInput resettable source="KundenNummer@ilike" label="Kundennummer" />,
];
const MessageButton = () => {
    const record = useRecordContext();
    const navigate = useNavigate();

    if (!record) {
        return null;
    }

    const routeState: KundeMessageRouteState = {
        kunde: {
            id: record.id,
            Anrede: record.Anrede,
            Vorname: record.Vorname,
            Nachname: record.Nachname,
            Email: record.Email,
            TelefonnummerPrivat: record.TelefonnummerPrivat,
            TelefonnummerGeschaeftlich: record.TelefonnummerGeschaeftlich,
        },
    };

    return (
        <Button variant='contained' onClick={() => navigate(`/kunde/${record.id}/message`, { state: routeState })}>
            Nachricht senden
        </Button>
    );
};

export const KundenDataTable = (props: any) => (
    <DataTable rowClick="show" {...props}>
        <DataTable.Col source="id" />
        <DataTable.Col label="Kunde">
            <FunctionField render={record => {
                if (!record) return '';
                const anrede = record.Anrede ? record.Anrede : '';
                const nachname = record.Nachname ? record.Nachname : '';
                const vorname = record.Vorname ? record.Vorname : '';
                return `${anrede} ${vorname} ${nachname}`.trim();
            }} />
        </DataTable.Col>
        <DataTable.Col label="Anschrift">
            <FunctionField render={record => {
                if (!record) return '';
                const strasse = record.Straße ? record.Straße : '';
                const hausnummer = record.Hausnummer ? record.Hausnummer : '';
                const plz = record.Postleitzahl ? record.Postleitzahl : '';
                const stadt = record.Stadt ? record.Stadt : '';
                return `${strasse} ${hausnummer}, ${plz} ${stadt}`.trim();
            }} />
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
        <DataTable.Col source="TelefonnummerPrivat" label="Privat Telefonnummer" />
        <DataTable.Col source="TelefonnummerGeschaeftlich" label="Geschäftliche Telefonnummer" />
        <DataTable.Col source="Email" />
        <DataTable.Col source="KrankenkassenNummer" label="Krankenkassennummer" />
        <DataTable.Col source="VersichertenNummer" label="Versichertenummer" />
        <DataTable.Col source="KrankenversicherungsTyp" label="Krankenversicherung" />
    </DataTable>
);


export const KundenList = () => {
    const isMobile: boolean = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'));

    return (
        <List
            className="list-page"
            title="Kunden"
            disableSyncWithLocation
            filters={isMobile ? kundenFilterMobile : kundenFilterDesktop}
            actions={<ListActions isMobile={isMobile} />}
        >
            <KundenDataTable />
        </List>
    );
}

export const KundeShow = () => {

    const showObject = useShowController();
    const dataProvider = useDataProvider();

    useEffect(() => {
        if (showObject?.record?.id) {
            try {
                dataProvider.update('kunde', {
                    'id': showObject.record.id,
                    'data': {
                        'last_viewed_at': new Date().toISOString()
                    },
                    'previousData': showObject.record,
                },
                );
            } catch (error) {
                console.error('Fehler beim Setzen last_viewed_at', error);
            }
        };

    }, [showObject, dataProvider]);

    return (
        <Show title="Kunden anzeigen">
            <SimpleShowLayout>
                <MessageButton />
                <TextField source="id" />
                <DateField source="created_at" />
                <TextField source="KundenNummer" />
                <DateField source="Aufnahmedatum" />
                <TextField source="Anrede" />
                <TextField source="Nachname" />
                <TextField source="Vorname" />
                <DateField source="Geburtsdatum" />
                <TextField source="Geschlecht" />
                <TextField source="Straße" />
                <TextField source="Tätigkeit" />
                <TextField source="TelefonnummerPrivat" />
                <TextField source="Email" />
                <TextField source="KrankenkassenNummer" />
                <TextField source="VersichertenNummer" />
                <TextField source="Postleitzahl" />
                <TextField source="Hausnummer" />
                <TextField source="Stadt" />
                <TextField source="TelefonnummerGeschaeftlich" />
                <TextField source="KrankenversicherungsTyp" />
                <ReferenceManyField reference="brille" target="kunde_id" label="Brillen des Kunden">
                    <Datagrid>
                        <TextField source="id" />
                        <TextField source="BrillenArt" />
                        <TextField source="Berater" />
                        <TextField source="Refraktion" />
                        <DateField source="Datum" />
                        <TextField source="Werkstatt" />
                        <DateField source="Abholung" />
                        <TextField source="Notizen" />
                        <ReferenceField source="GlasLinks" reference="glass" link="show">
                            <TextField source="id" />
                        </ReferenceField>
                        <ReferenceField source="GlasRechts" reference="glass" link="show">
                            <TextField source="id" />
                        </ReferenceField>
                        <ReferenceField source="Fassung" reference="fassung" link="show">
                            <TextField source="id" />
                        </ReferenceField>
                        <ReferenceField source="Glastyp" reference="glastyp" link="show">
                            <TextField source="id" />
                        </ReferenceField>
                        <TextField source="RabattBezeichnung" />
                        <TextField source="Summe" />

                    </Datagrid>
                </ReferenceManyField>
            </SimpleShowLayout>
        </Show>
    );
};

export const KundeEdit = () => (
    <Edit title="Kunden bearbeiten">
        <SimpleForm>
            <TextInput source="id" InputProps={{ disabled: true }} />
            <DateInput source="created_at" InputProps={{ disabled: true }} />
            <TextInput source="KundenNummer" />
            <DateInput source="Aufnahmedatum" />
            <TextInput source="Anrede" />
            <TextInput source="Nachname" />
            <TextInput source="Vorname" />
            <DateInput source="Geburtsdatum" />
            <TextInput source="Geschlecht" />
            <TextInput source="Straße" />
            <TextInput source="Tätigkeit" />
            <TextInput source="TelefonnummerPrivat" />
            <TextInput source="Email" />
            <TextInput source="KrankenkassenNummer" />
            <TextInput source="VersichertenNummer" />
            <TextInput source="Postleitzahl" />
            <TextInput source="Hausnummer" />
            <TextInput source="Stadt" />
            <TextInput source="TelefonnummerGeschaeftlich" />
            <TextInput source="KrankenversicherungsTyp" />
        </SimpleForm>
    </Edit>
);

export const KundeCreate = () => {
    const location = useLocation();
    const locationState = (location.state as Record<string, unknown> | undefined) ?? {};

    const defaultValues = {
        created_at: new Date().toISOString(),
        Nachname: '',
        Vorname: '',
        Geburtsdatum: '',
        KundenNummer: '',
        ...locationState,
    };

    return (
        <Create
            title="Neuen Kunden anlegen"
            transform={data => ({ ...data, created_at: new Date().toISOString() })}
        >
            <SimpleForm defaultValues={defaultValues}>
                <Typography>
                    Datenbankfelder
                </Typography>
                <Box sx={{ display: { xs: 'block', sm: 'flex', width: '100%' } }}>
                    <Box sx={{ flex: 1, mr: { xs: 0, sm: '0.5em' } }}>
                        <TextInput source="id" InputProps={{ disabled: true }} />
                    </Box>
                    <Box sx={{ flex: 1, ml: { xs: 0, sm: '0.5em' } }}>
                        <DateInput source="created_at" InputProps={{ disabled: true }} label="Erstellt am" />
                    </Box>
                </Box>
                <Box sx={{ display: { xs: 'block', sm: 'flex', width: '100%' } }}>
                    <Box sx={{ flex: 1, mr: { xs: 0, sm: '0.5em' } }}>
                        <TextInput source="KundenNummer" />
                    </Box>
                    <Box sx={{ flex: 1, ml: { xs: 0, sm: '0.5em' } }}>
                        <DateInput source="Aufnahmedatum" />
                    </Box>
                </Box>
                <Typography>
                    Stammdaten
                </Typography>
                <TextInput source="Anrede" />
                <TextInput source="Nachname" />
                <TextInput source="Vorname" />
                <TextInput source="Geschlecht" />
                <Box sx={{ display: { xs: 'block', sm: 'flex', width: '100%' } }}>
                    <Box sx={{ flex: 1, mr: { xs: 0, sm: '0.5em' } }}>
                        <DateInput source="Geburtsdatum" />
                    </Box>
                    <Box sx={{ flex: 1, ml: { xs: 0, sm: '0.5em' } }}>
                        <TextInput source="Tätigkeit" />
                    </Box>
                </Box>
                <Divider />
                <Typography>
                    Adresse
                </Typography>
                <Box sx={{ display: { xs: 'block', sm: 'flex', width: '100%' } }}>
                    <Box sx={{ flex: 1, mr: { xs: 0, sm: '0.5em' } }}>
                        <TextInput source="Straße" />
                    </Box>
                    <Box sx={{ flex: 1, ml: { xs: 0, sm: '0.5em' } }}>
                        <TextInput source="Hausnummer" />
                    </Box>
                </Box>
                <Box sx={{ display: { xs: 'block', sm: 'flex', width: '100%' } }}>
                    <Box sx={{ flex: 1, mr: { xs: 0, sm: '0.5em' } }}>
                        <TextInput source="Postleitzahl" />
                    </Box>
                    <Box sx={{ flex: 1, ml: { xs: 0, sm: '0.5em' } }}>
                        <TextInput source="Stadt" />
                    </Box>
                </Box>
                <Divider />
                <Typography>
                    Kontakt
                </Typography>
                <Box sx={{ display: { xs: 'block', sm: 'flex', width: '100%' } }}>
                    <Box sx={{ flex: 1, mr: { xs: 0, sm: '0.5em' } }}>
                        <TextInput source="TelefonnummerPrivat" label="Telefonnummer Privat" />
                    </Box>
                    <Box sx={{ flex: 1, ml: { xs: 0, sm: '0.5em' } }}>
                        <TextInput source="TelefonnummerGeschaeftlich" label="Telefonnummer Geschäftlich" />
                    </Box>
                    <Box sx={{ flex: 1, ml: { xs: 0, sm: '0.5em' } }}>
                        <TextInput source="Email" />
                    </Box>
                </Box>
                <TextInput source="KrankenkassenNummer" label="Krankenkassennummer" />
                <TextInput source="VersichertenNummer" label="Versichertennummer" />
                <TextInput source="KrankenversicherungsTyp" label="Krankenversicherungs Typ" />
            </SimpleForm>
        </Create>
    );
}

export const KundeMessage = () => {
    const recordId = useParams().id ?? '';
    const location = useLocation();
    const navigate = useNavigate();
    const routeState = (location.state as KundeMessageRouteState | null) ?? null;
    const [messages, setMessages] = useState<NachrichtRecord[]>([]);
    const [selectedMessageKey, setSelectedMessageKey] = useState<string | null>(null);
    const [isLoadingMessages, setIsLoadingMessages] = useState(true);
    const [messageError, setMessageError] = useState<string | null>(null);
    const [customer, setCustomer] = useState<KundeMessageCustomer | null>(() => (
        routeState?.kunde ? normalizeKundeMessageCustomer(routeState.kunde, recordId) : null
    ));
    const [isLoadingCustomer, setIsLoadingCustomer] = useState(!routeState?.kunde);
    const [customerError, setCustomerError] = useState<string | null>(null);
    const [selectedChannels, setSelectedChannels] = useState<Record<MessageChannel, boolean>>({
        sms: false,
        whatsapp: false,
        email: false,
    });
    const [isSending, setIsSending] = useState(false);
    const [sendFormError, setSendFormError] = useState<string | null>(null);
    const [sendResults, setSendResults] = useState<MessageDeliveryResult[]>([]);

    useEffect(() => {
        let isActive = true;

        const loadMessages = async () => {
            setIsLoadingMessages(true);
            setMessageError(null);

            const { data, error } = await supabase
                .from('nachrichten')
                .select('*');

            if (!isActive) {
                return;
            }

            if (error) {
                console.error('Fehler beim Laden der Nachrichten', error);
                setMessages([]);
                setSelectedMessageKey(null);
                setMessageError('Nachrichten konnten nicht geladen werden.');
                setIsLoadingMessages(false);
                return;
            }

            const nextMessages = (Array.isArray(data) ? data : [])
                .map((entry, index) => {
                    const record = (entry ?? {}) as Record<string, unknown>;
                    const id = typeof record.id === 'string' || typeof record.id === 'number' ? record.id : undefined;

                    return {
                        ...record,
                        id,
                        _rowKey: id !== undefined ? String(id) : `nachricht-${index}`,
                    };
                })
                .sort((left, right) => {
                    if (typeof left.id === 'number' && typeof right.id === 'number') {
                        return left.id - right.id;
                    }

                    if (typeof left.id === 'string' && typeof right.id === 'string') {
                        return left.id.localeCompare(right.id);
                    }

                    return left._rowKey.localeCompare(right._rowKey);
                });

            setMessages(nextMessages);
            setSelectedMessageKey(previousKey => (
                previousKey && nextMessages.some(message => message._rowKey === previousKey)
                    ? previousKey
                    : nextMessages[0]?._rowKey ?? null
            ));
            setIsLoadingMessages(false);
        };

        void loadMessages();

        return () => {
            isActive = false;
        };
    }, []);

    const selectedMessage = messages.find(message => message._rowKey === selectedMessageKey) ?? null;
    const fallbackCustomer = normalizeKundeMessageCustomer({ id: recordId }, recordId);

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
            setCustomerError('Keine Kundennummer vorhanden.');
            setIsLoadingCustomer(false);
            return;
        }

        let isActive = true;

        const loadCustomer = async () => {
            setIsLoadingCustomer(true);
            setCustomerError(null);

            const { data, error } = await supabase
                .from('kunde')
                .select('id, Anrede, Vorname, Nachname, Email, TelefonnummerPrivat, TelefonnummerGeschaeftlich')
                .eq('id', recordId)
                .maybeSingle();

            if (!isActive) {
                return;
            }

            if (error || !data) {
                console.error('Fehler beim Laden der Kundendaten', error);
                setCustomer(null);
                setCustomerError('Kundendaten konnten nicht geladen werden.');
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

    const messageCustomer = customer ?? fallbackCustomer;
    const renderedMessageTitle = selectedMessage ? renderMessageTemplate(getMessageTitle(selectedMessage), messageCustomer) : '';
    const renderedMessageContent = selectedMessage ? renderMessageTemplate(getMessageContent(selectedMessage), messageCustomer) : '';
    const recipientName = [messageCustomer.anrede, messageCustomer.vorname, messageCustomer.nachname].filter(Boolean).join(' ').trim() || `ID ${recordId}`;
    const deliveryTargets = {
        sms: messageCustomer.phoneNumber,
        whatsapp: messageCustomer.phoneNumber,
        email: messageCustomer.email,
    };
    const toggleChannel = (channel: MessageChannel) => (event: ChangeEvent<HTMLInputElement>) => {
        setSelectedChannels(previous => ({ ...previous, [channel]: event.target.checked }));
    };

    const handleSend = async () => {
        setSendFormError(null);
        setSendResults([]);

        if (!selectedMessage) {
            setSendFormError('Bitte wähle eine Nachricht aus.');
            return;
        }

        const channelsToSend = (Object.keys(selectedChannels) as MessageChannel[]).filter(
            channel => selectedChannels[channel] && deliveryTargets[channel],
        );

        if (channelsToSend.length === 0) {
            setSendFormError('Bitte wähle mindestens einen Nachrichtenkanal aus.');
            return;
        }

        setIsSending(true);

        const results = await Promise.all(channelsToSend.map((channel): Promise<MessageDeliveryResult> => {
            if (!implementedMessageChannels.includes(channel)) {
                return Promise.resolve({ channel, success: false, error: 'Dieser Kanal wird noch nicht unterstützt.' });
            }

            const to = channel === 'sms'
                ? normalizePhoneNumberForSms(deliveryTargets[channel])
                : channel === 'whatsapp'
                    ? normalizePhoneNumberForWhatsapp(deliveryTargets[channel])
                    : deliveryTargets[channel];

            return sendMessage(channel, {
                to,
                message: renderedMessageContent,
                subject: renderedMessageTitle,
            });
        }));

        setSendResults(results);
        setIsSending(false);
    };

    const channelOrder: MessageChannel[] = ['sms', 'whatsapp', 'email'];

    return (
        <Box sx={{ maxWidth: 1080, margin: '0 auto', padding: { xs: '0.75em', md: '1.5em' }, paddingBottom: { xs: '6em', md: '1.5em' } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <IconButton
                    aria-label='Zurück zum Kunden'
                    onClick={() => navigate(`/kunde/${recordId}/show`)}
                    sx={{ mt: '2px' }}
                >
                    <ArrowBackIcon />
                </IconButton>
                <Box sx={{ minWidth: 0 }}>
                    <Typography variant='h5' component='h1' sx={{ fontWeight: 600 }}>
                        Nachricht senden
                    </Typography>
                    <Typography variant='body2' sx={{ color: 'text.secondary' }} noWrap>
                        an {recipientName}
                    </Typography>
                </Box>
            </Box>

            <Box sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                gap: '1em',
                alignItems: 'start',
            }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: '1em' }}>
                    <Card sx={{ padding: '1em' }}>
                        <Typography variant='subtitle1' sx={{ fontWeight: 600, mb: 1 }}>
                            Nachricht auswählen
                        </Typography>
                        <Divider sx={{ mb: 1 }} />
                        <Box sx={{ maxHeight: { xs: '13rem', md: '18rem' }, overflowY: 'auto' }}>
                            {isLoadingMessages ? (
                                <Typography sx={{ mt: 1, color: 'text.secondary' }}>
                                    Lade Nachrichten...
                                </Typography>
                            ) : null}
                            {!isLoadingMessages && messageError ? (
                                <Typography color='error' sx={{ mt: 1 }}>
                                    {messageError}
                                </Typography>
                            ) : null}
                            {!isLoadingMessages && !messageError && messages.length === 0 ? (
                                <Typography sx={{ mt: 1, color: 'text.secondary' }}>
                                    Keine Nachrichten gefunden.
                                </Typography>
                            ) : null}
                            {!isLoadingMessages && !messageError ? messages.map(message => {
                                const messageTitle = getMessageTitle(message);
                                const messageContent = getMessageContent(message);

                                return (
                                    <ListItem key={message._rowKey} disablePadding>
                                        <ListItemButton
                                            selected={selectedMessageKey === message._rowKey}
                                            onClick={() => setSelectedMessageKey(message._rowKey)}
                                            sx={{ borderRadius: 1 }}
                                        >
                                            <ListItemText
                                                primary={messageTitle}
                                                primaryTypographyProps={{ noWrap: true }}
                                                secondary={messageTitle === messageContent ? undefined : messageContent}
                                                secondaryTypographyProps={{ noWrap: true }}
                                            />
                                        </ListItemButton>
                                    </ListItem>
                                );
                            }) : null}
                        </Box>
                    </Card>

                    <Card sx={{ padding: '1em' }}>
                        <Typography variant='subtitle1' sx={{ fontWeight: 600, mb: 1 }}>
                            Versandkanäle
                        </Typography>
                        <Divider sx={{ mb: 1 }} />
                        <Stack spacing={1}>
                            {channelOrder.map(channel => {
                                const ChannelIcon = messageChannelIcons[channel];
                                const target = deliveryTargets[channel];

                                return (
                                    <Box
                                        key={channel}
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1,
                                            border: '1px solid',
                                            borderColor: selectedChannels[channel] ? 'primary.main' : 'divider',
                                            borderRadius: 1,
                                            padding: '0.25em 0.5em',
                                            opacity: target ? 1 : 0.6,
                                        }}
                                    >
                                        <ChannelIcon fontSize='small' sx={{ color: 'text.secondary' }} />
                                        <FormControlLabel
                                            sx={{ flexGrow: 1, minWidth: 0, mr: 0 }}
                                            label={
                                                <Box sx={{ minWidth: 0 }}>
                                                    <Typography variant='body2' noWrap>
                                                        {messageChannelLabels[channel]}
                                                    </Typography>
                                                    <Typography variant='caption' sx={{ color: 'text.secondary' }} noWrap component='div'>
                                                        {target || 'kein Kontaktweg hinterlegt'}
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

                <Card sx={{
                    padding: '1em',
                    position: { md: 'sticky' },
                    top: { md: '1em' },
                }}>
                    <Typography variant='subtitle1' sx={{ fontWeight: 600, mb: 1 }}>
                        Vorschau
                    </Typography>
                    <Divider sx={{ mb: 1 }} />
                    {isLoadingCustomer ? (
                        <Typography sx={{ mb: 2, color: 'text.secondary' }}>
                            Lade Kundendaten...
                        </Typography>
                    ) : null}
                    {customerError ? (
                        <Typography color='error' sx={{ mb: 2 }}>
                            {customerError}
                        </Typography>
                    ) : null}
                    <Stack spacing={0.5} sx={{ mb: 2 }}>
                        <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                            Empfänger: {recipientName}
                        </Typography>
                        <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                            Email: {messageCustomer.email || 'nicht vorhanden'}
                        </Typography>
                        <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                            Telefonnummer: {messageCustomer.phoneNumber || 'nicht vorhanden'}
                        </Typography>
                    </Stack>
                    <Box sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        padding: '1em',
                        backgroundColor: 'action.hover',
                        minHeight: '8rem',
                    }}>
                        {selectedMessage ? (
                            <>
                                <Typography variant='h6' sx={{ mb: 1 }}>
                                    {renderedMessageTitle}
                                </Typography>
                                <Typography sx={{ whiteSpace: 'pre-wrap' }}>
                                    {renderedMessageContent}
                                </Typography>
                            </>
                        ) : (
                            <Typography sx={{ color: 'text.secondary' }}>
                                Wähle eine Nachricht aus, um den Inhalt zu sehen.
                            </Typography>
                        )}
                    </Box>
                </Card>
            </Box>

            <Box sx={{
                position: { xs: 'fixed', md: 'static' },
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 10,
                mt: { xs: 0, md: 2 },
                padding: { xs: '0.75em', md: 0 },
                backgroundColor: { xs: 'background.paper', md: 'transparent' },
                borderTop: { xs: '1px solid', md: 'none' },
                borderColor: 'divider',
            }}>
                {sendFormError ? (
                    <Typography color='error' sx={{ textAlign: 'right', mb: 1 }}>
                        {sendFormError}
                    </Typography>
                ) : null}
                {sendResults.map(result => (
                    <Typography
                        key={result.channel}
                        sx={{ textAlign: 'right', mb: 1, color: result.success ? 'success.main' : 'error.main' }}
                    >
                        {messageChannelLabels[result.channel]}: {result.success ? 'erfolgreich gesendet' : `fehlgeschlagen (${result.error ?? 'unbekannter Fehler'})`}
                    </Typography>
                ))}
                <Box sx={{
                    display: 'flex',
                    gap: '1em',
                    justifyContent: 'flex-end',
                }}>
                    <Button variant='outlined' onClick={() => navigate(`/kunde/${recordId}/show`)}>
                        Abbrechen
                    </Button>
                    <Button
                        variant='contained'
                        startIcon={<SendIcon />}
                        onClick={() => void handleSend()}
                        disabled={isSending}
                    >
                        {isSending ? 'Wird gesendet...' : 'Nachricht senden'}
                    </Button>
                </Box>
            </Box>
        </Box>
    );
};
