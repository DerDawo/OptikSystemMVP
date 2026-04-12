import {
    Box
} from '@mui/material';
import {
    Title,
    useDataProvider,
    ListBase,
} from 'react-admin';
import { useEffect } from 'react';
import { KundenDataTable } from './kunden';

const LastCustomersSearched = () => {

    const dataProvider = useDataProvider();

    useEffect(() => {

        dataProvider
            .getList('kunde', {
                pagination: { page: 1, perPage: 10 },
                filter: {},
            })
            .then(({ data }) => {
                console.log('Daten von getList', data);
            })
            .catch(error => {
                console.error('Fehler getList', error);
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
                    <KundenDataTable bulkActionButtons={false} />
                </ListBase>
            </Box>
        </Box>
    );
};

export default LastCustomersSearched;
