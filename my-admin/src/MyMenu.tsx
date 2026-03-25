import { Menu } from 'react-admin';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faUser,
    faGlasses,
    faListCheck,
    faEye,
    faLayerGroup,
    faLinesLeaning,
    faUserPlus,
    faHandPointUp,
    faReceipt,
    faMagnifyingGlass
} from '@fortawesome/free-solid-svg-icons';
import {
    Divider,
    Typography
} from '@mui/material';

export const MyMenu = () => (
    <Menu>
        <Typography sx={{ padding: '0.5em 1em', color: 'text.secondary' }}>
            Geschäftsprozesse
        </Typography>
        <Menu.Item
            to="/kunde/create"
            primaryText="neuen Kunden anlegen"
            leftIcon={<FontAwesomeIcon icon={faUserPlus} />}
        />
        <Menu.Item
            to="/search"
            primaryText="Suche"
            leftIcon={<FontAwesomeIcon icon={faMagnifyingGlass} />}
        />
        <Divider />
        <Typography sx={{ padding: '0.5em 1em', color: 'text.secondary' }}>
            Dokumente
        </Typography>
        <Menu.Item
            to=""
            primaryText="Rechnungen"
            leftIcon={<FontAwesomeIcon icon={faReceipt} />}
        />
        <Menu.Item
            to=""
            primaryText="Mahnungen"
            leftIcon={<FontAwesomeIcon icon={faHandPointUp} />}
        />
        <Divider />
        <Typography sx={{ padding: '0.5em 1em', color: 'text.secondary' }}>
            Datenbank
        </Typography>
        <Menu.Item
            to="/kunde"
            primaryText="Kunden"
            leftIcon={<FontAwesomeIcon icon={faUser} />}
        />
        <Menu.Item
            to="/brille"
            primaryText="Brillen"
            leftIcon={<FontAwesomeIcon icon={faGlasses} />}
        />
        <Menu.Item
            to="/glass"
            primaryText="Gläser"
            leftIcon={<FontAwesomeIcon icon={faEye} />} />
        <Menu.Item
            to="/glastyp"
            primaryText="Glastypen"
            leftIcon={<FontAwesomeIcon icon={faLayerGroup} />}
        />
        <Menu.Item
            to="/fassung"
            primaryText="Fassungen"
            leftIcon={<FontAwesomeIcon icon={faLinesLeaning} />}
        />
        <Menu.Item
            to="/zusatzleistung"
            primaryText="Zusatzleistungen"
            leftIcon={<FontAwesomeIcon icon={faListCheck} />}
        />
    </Menu>
);