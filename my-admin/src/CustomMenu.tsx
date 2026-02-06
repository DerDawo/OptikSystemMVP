import { Menu } from 'react-admin';
import { MenuItem } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import PanoramaFishEyeIcon from '@mui/icons-material/PanoramaFishEye';
import LocalPharmacyIcon from '@mui/icons-material/LocalPharmacy';
import ReceiptIcon from '@mui/icons-material/Receipt';

export const CustomMenu = () => (
    <Menu>
        <Menu.ResourceItem name="kunde" icon={<PersonIcon />} label="Kunden" />
        <Menu.ResourceItem name="brille" icon={<LocalPharmacyIcon />} label="Brillen" />
        <Menu.ResourceItem name="glass" icon={<PanoramaFishEyeIcon />} label="Gläser" />
        <Menu.ResourceItem name="glastyp" label="Glastypen" />
        <Menu.ResourceItem name="fassung" label="Fassungen" />
        <Menu.ResourceItem name="brille_hat_zusatzleistungen" label="Brillen Zusatzleistungen" />
        <Menu.ResourceItem name="kunde_hat_brille" label="Kundenbrillen" />
        <Menu.ResourceItem name="kunde_leistet_zauzahlung_fuer_brille" icon={<ReceiptIcon />} label="Zuzahlungen" />
        <Menu.ResourceItem name="zusatzleistung" label="Zusatzleistungen" />
    </Menu>
);
