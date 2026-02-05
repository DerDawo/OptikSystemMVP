// in src/App.tsx
import { Admin, Resource, ListGuesser, ShowGuesser, EditGuesser } from "react-admin";
import { dataProvider } from './dataProvider';
// import { authProvider } from './authProvider';
import { KundenList, KundeShow, KundeEdit, KundeCreate } from "./kunden";
import { BrilleList, BrilleShow, BrilleEdit, BrilleCreate } from "./brillen";
import { GlassList, GlassShow, GlassEdit, GlassCreate } from "./glass";
import { GlastypList } from "./glasstyp";
import { FassungList } from "./fassung";
import { KundebrilleList, KundebrilleShow, KundebrilleEdit, KundebrilleCreate } from "./kundebrille";
import { CssVarsProvider } from '@mui/joy/styles';
import CssBaseline from '@mui/joy/CssBaseline';
import PersonIcon from '@mui/icons-material/Person';
import PanoramaFishEyeIcon from '@mui/icons-material/PanoramaFishEye';

export const App = () => (
    <CssVarsProvider>
        <CssBaseline />
        <Admin dataProvider={dataProvider}>
            <Resource name="kunde" list={KundenList} show={KundeShow} edit={KundeEdit} create={KundeCreate} icon={PersonIcon} />
            <Resource name="brille" list={BrilleList} show={BrilleShow} edit={BrilleEdit} create={BrilleCreate}/>
            <Resource name="glass" list={GlassList} show={GlassShow} edit={GlassEdit} create={GlassCreate} icon={PanoramaFishEyeIcon}/>
            <Resource name="glastyp" list={GlastypList} show={ShowGuesser} edit={EditGuesser} />
            <Resource name="fassung" list={FassungList} show={ShowGuesser} edit={EditGuesser} />
            <Resource name="kunde_hat_brille" list={KundebrilleList} show={KundebrilleShow} edit={KundebrilleEdit} create={KundebrilleCreate} />
        </Admin>
    </CssVarsProvider>
);


// create={GlastypCreate}
// create={FassungCreate}