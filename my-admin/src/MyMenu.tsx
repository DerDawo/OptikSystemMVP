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
    faMagnifyingGlass,
    faTags,
    faIndustry,
    faFileImport,
    faCalendarDays,
    faCalendarPlus
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
        <Menu.Item
            to="/kalender"
            primaryText="Terminkalender"
            leftIcon={<FontAwesomeIcon icon={faCalendarDays} />}
        />
        <Menu.Item
            to="/termin/create"
            primaryText="neuen Termin anlegen"
            leftIcon={<FontAwesomeIcon icon={faCalendarPlus} />}
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
            to="/brillenart"
            primaryText="Brillenarten"
            leftIcon={<FontAwesomeIcon icon={faTags} />}
        />
        <Menu.Item
            to="/glaskatalog"
            primaryText="Glaskatalog (Hersteller)"
            leftIcon={<FontAwesomeIcon icon={faIndustry} />}
        />
        <Menu.Item
            to="/glaskatalog-import"
            primaryText="Glaskatalog-Import (SF6)"
            leftIcon={<FontAwesomeIcon icon={faFileImport} />}
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
        <Menu.Item
            to="/termin"
            primaryText="Termine"
            leftIcon={<FontAwesomeIcon icon={faCalendarDays} />}
        />
    </Menu>
);
