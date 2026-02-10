// in src/App.tsx
import { Admin, Resource } from "react-admin";
import { dataProvider } from './dataProvider';
import { MyLayout } from './MyLayout';
// import { authProvider } from './authProvider';
import { KundenList, KundeShow, KundeEdit, KundeCreate } from "./kunden";
import { BrilleList, BrilleShow, BrilleEdit, BrilleCreate } from "./brillen";
import { GlassList, GlassShow, GlassEdit, GlassCreate } from "./glass";
import { GlastypList, GlastypShow, GlastypEdit, GlastypCreate } from "./glasstyp";
import { FassungList, FassungShow, FassungEdit, FassungCreate } from "./fassung";
import { KundebrilleList, KundebrilleShow, KundebrilleEdit, KundebrilleCreate } from "./kundebrille";
import { Brille_hat_zusatzleistungenList, Brille_hat_zusatzleistungenShow, Brille_hat_zusatzleistungenEdit, Brille_hat_zusatzleistungenCreate } from "./brille_hat_zusatzleistungen";
import { Kunde_leistet_zauzahlung_fuer_brilleList, Kunde_leistet_zauzahlung_fuer_brilleShow, Kunde_leistet_zauzahlung_fuer_brilleEdit, Kunde_leistet_zauzahlung_fuer_brilleCreate } from "./kunde_leistet_zauzahlung_fuer_brille";
import { ZusatzleistungList, ZusatzleistungShow, ZusatzleistungEdit, ZusatzleistungCreate } from "./zusatzleistung";

import PersonIcon from '@mui/icons-material/Person';
import PanoramaFishEyeIcon from '@mui/icons-material/PanoramaFishEye';

export const App = () => (
    <Admin layout={MyLayout} dataProvider={dataProvider}>
        <Resource name="kunde" list={KundenList} show={KundeShow} edit={KundeEdit} create={KundeCreate} icon={PersonIcon} />
        <Resource name="brille" list={BrilleList} show={BrilleShow} edit={BrilleEdit} create={BrilleCreate} />
        <Resource name="glass" list={GlassList} show={GlassShow} edit={GlassEdit} create={GlassCreate} icon={PanoramaFishEyeIcon} />
        <Resource name="glastyp" list={GlastypList} show={GlastypShow} edit={GlastypEdit} create={GlastypCreate} />
        <Resource name="fassung" list={FassungList} show={FassungShow} edit={FassungEdit} create={FassungCreate} />
        <Resource name="brille_hat_zusatzleistungen" list={Brille_hat_zusatzleistungenList} show={Brille_hat_zusatzleistungenShow} edit={Brille_hat_zusatzleistungenEdit} create={Brille_hat_zusatzleistungenCreate} />
        <Resource name="kunde_hat_brille" list={KundebrilleList} show={KundebrilleShow} edit={KundebrilleEdit} create={KundebrilleCreate} />
        <Resource name="kunde_leistet_zauzahlung_fuer_brille" list={Kunde_leistet_zauzahlung_fuer_brilleList} show={Kunde_leistet_zauzahlung_fuer_brilleShow} edit={Kunde_leistet_zauzahlung_fuer_brilleEdit} create={Kunde_leistet_zauzahlung_fuer_brilleCreate} />
        <Resource name="zusatzleistung" list={ZusatzleistungList} show={ZusatzleistungShow} edit={ZusatzleistungEdit} create={ZusatzleistungCreate} />
    </Admin>
);