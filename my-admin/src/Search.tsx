import {
    Card,
    Tabs,
    Tab,
    Box
} from '@mui/material';
import { useState } from 'react';

import ExpertSearch from './ExpertSearch';
import CustomerSearch from './CustomerSearch';
import LastCustomersSearched from './LastCustomersSearched';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function CustomTabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`simple-tabpanel-${index}`}
            aria-labelledby={`simple-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
        </div>
    );
}

function a11yProps(index: number) {
    return {
        id: `simple-tab-${index}`,
        'aria-controls': `simple-tabpanel-${index}`,
    };
}


const Search = () => {

    const [value, setValue] = useState(0);

    const handleChange = (event: React.SyntheticEvent, newValue: number) => {
        setValue(newValue);
    };

    return (
        <Box>
            <Box>
                <Tabs value={value} onChange={handleChange}>
                    <Tab label="Kunden suchen" {...a11yProps(0)}/>
                    <Tab label="Letzte Kunden" {...a11yProps(1)}/>
                    <Tab label="Expertensuche" {...a11yProps(2)}>
                    </Tab>
                </Tabs>
            </Box>
            <Card>
                <CustomTabPanel value={value} index={0}>
                    <CustomerSearch/>
                </CustomTabPanel>
                <CustomTabPanel value={value} index={1}>
                    <LastCustomersSearched/>
                </CustomTabPanel>
                <CustomTabPanel value={value} index={2}>
                    <ExpertSearch/>
                </CustomTabPanel>
            </Card>
        </Box>
    )
};

export default Search;