import {
    Box,
    Button,
    Divider,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    SelectChangeEvent,
    TextField,
} from '@mui/material';
import {
    useResourceDefinitions,
    Title,
    useDataProvider,
    ListBase,
    DataTable,
} from 'react-admin';
import { useEffect, useState } from 'react';

type Operator = '' | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7';

const buildFilter = (attribute: string, operator: string, value: string) => {
    if (!attribute || !value) return {};

    switch (operator) {
        case '0':
            return { [attribute]: value }; // eq
        case '1':
            return { [`${attribute}@neq`]: value };
        case '2':
            return { [`${attribute}@gt`]: value };
        case '3':
            return { [`${attribute}@gte`]: value };
        case '4':
            return { [`${attribute}@lt`]: value };
        case '5':
            return { [`${attribute}@lte`]: value };
        case '6':
            return { [`${attribute}@ilike`]: `*${value}*` };
        case '7':
            return { [`${attribute}@not`]: `ilike.*${value}*` };
        default:
            return {};
    }
};

const resourceLabels: Record<string, string> = {
    kunde: 'Kunden',
    brille: 'Brillen',
    glass: 'Gläser',
    glastyp: 'Glastypen',
    fassung: 'Fassungen',
    zusatzleistung: 'Zusatzleistungen',
};

const ExpertSearch = () => {
    const [ressource, setRessource] = useState('');
    const [attribute, setAttribute] = useState('');
    const [operator, setOperator] = useState<Operator>('');
    const [attributes, setAttributes] = useState<string[]>([]);
    const [value, setValue] = useState('');

    // only these values trigger the actual query
    const [submittedResource, setSubmittedResource] = useState('');
    const [submittedFilter, setSubmittedFilter] = useState<Record<string, any>>({});
    const [hasSearched, setHasSearched] = useState(false);

    const dataProvider = useDataProvider();

    useEffect(() => {
        if (!ressource) {
            setAttributes([]);
            setAttribute('');
            return;
        }

        dataProvider
            .getList(ressource, {
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
    }, [ressource, dataProvider]);

    const handleSearch = () => {
        setSubmittedResource(ressource);
        setSubmittedFilter(buildFilter(attribute, operator, value));
        setHasSearched(true);
    };

    const handleReset = () => {
        setRessource('');
        setAttribute('');
        setOperator('');
        setValue('');
        setAttributes([]);

        setSubmittedResource('');
        setSubmittedFilter({});
        setHasSearched(false);
    };

    const resources = useResourceDefinitions();
    const visibleResources = Object.values(resources).filter(
        resource =>
            resource.name !== 'brille_hat_zusatzleistungen' &&
            resource.name !== 'kunde_leistet_zauzahlung_fuer_brille'
    );

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '1em' }}>
            <Title title="Expertensuche" />

            <Box>
                Hier können Sie eine Suche auf Basis der Tabellen der Datenbank und deren Spalten  durchführen.
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1em', alignItems: 'baseline' }}>
                <FormControl>
                    <InputLabel id="ressource-select-label-id">Tabelle</InputLabel>
                    <Select
                        labelId="ressource-select-label-id"
                        value={ressource}
                        label="Tabelle"
                        onChange={(e: SelectChangeEvent) => setRessource(e.target.value)}
                    >
                        {visibleResources.map(r => (
                            <MenuItem key={r.name} value={r.name}>
                                {resourceLabels[r.name] ?? r.name}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <FormControl>
                    <InputLabel id="attribute-select-label-id">Spalte</InputLabel>
                    <Select
                        labelId="attribute-select-label-id"
                        value={attribute}
                        label="Spalte"
                        onChange={(e: SelectChangeEvent) => setAttribute(e.target.value)}
                    >
                        {attributes.map(a => (
                            <MenuItem key={a} value={a}>
                                {a}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <FormControl>
                    <InputLabel id="operator-select-label-id">Operator</InputLabel>
                    <Select
                        labelId="operator-select-label-id"
                        value={operator}
                        label="Operator"
                        onChange={(e: SelectChangeEvent) => setOperator(e.target.value as Operator)}
                    >
                        <MenuItem value={'0'}>gleich</MenuItem>
                        <MenuItem value={'1'}>ungleich</MenuItem>
                        <MenuItem value={'2'}>größer als</MenuItem>
                        <MenuItem value={'3'}>größer gleich</MenuItem>
                        <MenuItem value={'4'}>kleiner als</MenuItem>
                        <MenuItem value={'5'}>kleiner gleich</MenuItem>
                        <MenuItem value={'6'}>enthält</MenuItem>
                        <MenuItem value={'7'}>enthält nicht</MenuItem>
                    </Select>
                </FormControl>

                <FormControl>
                    <TextField
                        label="Wert"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                    />
                </FormControl>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'row', gap: '1em', justifyContent: 'flex-end' }}>
                <Button variant="outlined" onClick={handleReset}>
                    Zurücksetzen
                </Button>
                <Button variant="contained" onClick={handleSearch} disabled={!ressource}>
                    Suchen
                </Button>
            </Box>

            <Divider />

            <Box>
                Hier werden die Suchergebnisse angezeigt.
            </Box>

            {/* table frame always visible */}
            <Box sx={{ minHeight: 300 }}>
                {submittedResource ? (
                    <ListBase
                        key={`${submittedResource}-${hasSearched ? 'searched' : 'idle'}`}
                        resource={submittedResource}
                        filter={submittedFilter}
                        perPage={10}
                        sort={{ field: 'id', order: 'ASC' }}
                        disableSyncWithLocation
                        storeKey={false}
                        queryOptions={{ enabled: hasSearched && !!submittedResource }}
                    >
                        <DataTable>
                            {attributes.map(col => (
                                <DataTable.Col
                                    key={col}
                                    source={col}
                                    label={col}
                                    disableSort
                                />
                            ))}
                        </DataTable>
                    </ListBase>
                ) : (
                    <></>
                )}
            </Box>
        </Box>
    );
};

export default ExpertSearch;