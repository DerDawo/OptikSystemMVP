// in src/App.tsx
import { Admin, Resource, ListGuesser, ShowGuesser, EditGuesser } from "react-admin";
import { dataProvider } from './dataProvider';
// import { authProvider } from './authProvider';
import { KundenList, KundeShow, KundeEdit, KundeCreate } from "./kunden";
import { BrilleList } from "./brillen";
import { GlassList } from "./glass";
import { GlastypList } from "./glasstyp";
import { FassungList } from "./fassung";
import { CssVarsProvider } from '@mui/joy/styles';
import CssBaseline from '@mui/joy/CssBaseline';

export const App = () => (
    <CssVarsProvider>
        <CssBaseline />
        <Admin dataProvider={dataProvider}>
            <Resource name="kunde" list={KundenList} show={KundeShow} edit={KundeEdit} create={KundeCreate} />
            <Resource name="brille" list={BrilleList} />
            <Resource name="glass" list={GlassList} />
            <Resource name="glastyp" list={GlastypList} />
            <Resource name="fassung" list={FassungList} />
        </Admin>
    </CssVarsProvider>
);
