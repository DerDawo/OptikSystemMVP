import { Menu } from 'react-admin';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faGlasses, faListCheck, faEye, faLayerGroup, faLinesLeaning, faUserPlus } from '@fortawesome/free-solid-svg-icons';
import Divider from '@mui/material/Divider';

export const MyMenu = () => (
    <Menu>
        <Menu.Item
            to="/kunde/create"
            primaryText="neuen Kunden anlegen"
            leftIcon={<FontAwesomeIcon icon={faUserPlus} />}
        />
        <Divider />
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