import {
    Box
} from '@mui/material';
import {
    Title,
    useDataProvider,
    ListBase,
    DataTable,
} from 'react-admin';
import { useEffect, useState } from 'react';

const getSevenDaysAgo = () => {
    const now = new Date();
    now.setDate(now.getDate() - 7);
    return now.toISOString();
};

const LastCustomersSearched = () => {

    const [attributes, setAttributes] = useState<string[]>([]);

    const dataProvider = useDataProvider();

    useEffect(() => {
        const date7DaysAgo = getSevenDaysAgo();

        dataProvider
            .getList('kunde', {
                pagination: { page: 1, perPage: 1 },
                sort: { field: 'last_viewed_at', order: 'DESC' },
                filter: {
                    'last_viewed_at@gte': date7DaysAgo,
                },
            })
            .then(({ data }) => {
                setAttributes(data.length > 0 ? Object.keys(data[0]) : []);
            })
            .catch(error => {
                console.error('Fehler getList', error);
                setAttributes([]);
            });
    }, [dataProvider]);

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '1em' }}>
            <Title title="Zuletzt gesuchte Kunden" />
            <Box sx={{ minHeight: 300 }}>
                <ListBase
                    key={`kunde`}
                    resource={'kunde'}
                    perPage={10}
                    sort={{ field: 'id', order: 'ASC' }}
                    disableSyncWithLocation
                    storeKey={false}
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
            </Box>
        </Box>
    );
};

export default LastCustomersSearched;
