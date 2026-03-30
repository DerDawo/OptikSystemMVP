import {
    Box,
    Button,
    Divider,
    FormControl,
    TextField,
} from '@mui/material';
import {
    Title,
    useDataProvider,
    ListBase,
    DataTable,
} from 'react-admin';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { Dayjs } from 'dayjs';

const buildFilter = (filters: Record<string, string>) => {
    const result: Record<string, any> = {};

    Object.entries(filters).forEach(([key, value]) => {
        const trimmed = value.trim();
        if (!trimmed) return;

        // For date fields, use exact match (avoid ilike on timestamp columns)
        if (key === 'Geburtsdatum' || key.toLowerCase().includes('datum')) {
            result[key] = trimmed;
        } else {
            result[`${key}@ilike`] = `*${trimmed}*`;
        }
    });

    return result;
};

const CustomerSearch = () => {
    const resource = 'kunde';

    const [nachname, setNachname] = useState('');
    const [vorname, setVorname] = useState('');
    const [geburtsdatum, setGeburtsdatum] = useState<Dayjs | null>(null);
    const [kundennummer, setKundennummer] = useState('');

    const [attributes, setAttributes] = useState<string[]>([]);
    const [submittedFilter, setSubmittedFilter] = useState<Record<string, any>>({});
    const [hasSearched, setHasSearched] = useState(false);
    const [hasSearchResults, setHasSearchResults] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

    const dataProvider = useDataProvider();

    useEffect(() => {
        dataProvider
            .getList(resource, {
                pagination: { page: 1, perPage: 1 },
                sort: { field: 'id', order: 'ASC' },
                filter: {},
            })
            .then(({ data }) => {
                setAttributes(data.length > 0 ? Object.keys(data[0]) : []);
            })
            .catch(error => {
                console.error('Fehler getList', error);
                setAttributes([]);
            });
    }, [dataProvider, resource]);

    const navigate = useNavigate();

    const handleSearch = async () => {
        const filter = buildFilter({
            Nachname: nachname,
            Vorname: vorname,
            Geburtsdatum: geburtsdatum ? geburtsdatum.format('YYYY-MM-DD') : '',
            KundenNummer: kundennummer,
        });

        setIsSearching(true);
        setSubmittedFilter(filter);

        try {
            const { total, data } = await dataProvider.getList(resource, {
                pagination: { page: 1, perPage: 1 },
                sort: { field: 'id', order: 'ASC' },
                filter,
            });

            setHasSearchResults((total ?? data.length) > 0);
        } catch (error) {
            console.error('Fehler bei der Kundensuche', error);
            setHasSearchResults(false);
        } finally {
            setHasSearched(true);
            setIsSearching(false);
        }
    };

    const handleCreate = () => {
        navigate(`/${resource}/create`, {
            state: {
                Nachname: nachname,
                Vorname: vorname,
                Geburtsdatum: geburtsdatum ? geburtsdatum.format('YYYY-MM-DD') : '',
                KundenNummer: kundennummer,
            },
        });
    };

    const handleReset = () => {
        setNachname('');
        setVorname('');
        setGeburtsdatum(null);
        setKundennummer('');
        setSubmittedFilter({});
        setHasSearched(false);
        setHasSearchResults(false);
        setIsSearching(false);
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '1em' }}>
            <Title title="Kunden suchen" />

            <Box>
                Hier können Sie gezielt nach Kunden suchen oder wenn ein Kunde nicht existiert, diesen anlegen.
            </Box>

            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr 1fr',
                    gap: '1em',
                    alignItems: 'baseline',
                }}
            >
                <FormControl>
                    <TextField
                        label="Nachname"
                        value={nachname}
                        onChange={(e) => setNachname(e.target.value)}
                    />
                </FormControl>

                <FormControl>
                    <TextField
                        label="Vorname"
                        value={vorname}
                        onChange={(e) => setVorname(e.target.value)}
                    />
                </FormControl>

                <FormControl>
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <DatePicker
                            label="Geburtsdatum"
                            value={geburtsdatum}
                            onChange={(value) => setGeburtsdatum(value)}
                            format="YYYY-MM-DD"
                            slotProps={{
                                textField: {
                                    variant: 'filled',
                                    fullWidth: true,
                                },
                            }}
                            sx={{
                                '.MuiPickersInputBase-root': {
                                    height: '48px'
                                }
                            }}
                        />
                    </LocalizationProvider>
                </FormControl>

                <FormControl>
                    <TextField
                        label="Kundennummer"
                        value={kundennummer}
                        onChange={(e) => setKundennummer(e.target.value)}
                    />
                </FormControl>
            </Box>

            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'row',
                    gap: '1em',
                    justifyContent: 'flex-end',
                }}
            >
                <Button variant="outlined" onClick={handleReset}>
                    Zurücksetzen
                </Button>

                <Button
                    variant="contained"
                    onClick={handleCreate}
                    disabled={!hasSearched || hasSearchResults || isSearching}
                >
                    neuen Kunden anlegen
                </Button>

                <Button variant="contained" onClick={handleSearch}>
                    Suchen
                </Button>
            </Box>

            <Divider />

            <Box>Hier werden die Suchergebnisse angezeigt.</Box>

            <Box sx={{ minHeight: 300 }}>
                {hasSearched ? (
                    <ListBase
                        key={`${resource}-${JSON.stringify(submittedFilter)}-${hasSearched ? 'searched' : 'idle'}`}
                        resource={resource}
                        filter={submittedFilter}
                        perPage={10}
                        sort={{ field: 'id', order: 'ASC' }}
                        disableSyncWithLocation
                        storeKey={false}
                        queryOptions={{ enabled: hasSearched }}
                    >
                        <DataTable>
                            {attributes.map((col) => (
                                <DataTable.Col
                                    key={col}
                                    source={col}
                                    label={col}
                                    disableSort
                                />
                            ))}
                        </DataTable>
                    </ListBase>
                ) : null}
            </Box>
        </Box>
    );
};

export default CustomerSearch;
