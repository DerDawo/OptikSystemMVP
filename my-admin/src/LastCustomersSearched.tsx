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

const LastCustomersSearched = () => {

    const [attributes, setAttributes] = useState<string[]>([]);

    const dataProvider = useDataProvider();

    useEffect(() => {

        dataProvider
            .getList('kunde', {
                pagination: { page: 1, perPage: 10 },
                filter: {},
            })
            .then(({ data }) => {
                console.log('Daten von getList', data);
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
                    disableSyncWithLocation
                    storeKey={false}
                    sort={{ field: 'last_viewed_at', order: 'DESC' }}
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
