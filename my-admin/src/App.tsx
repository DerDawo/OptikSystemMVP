// in src/App.tsx
import { Admin, Resource, ListGuesser, ShowGuesser } from "react-admin";
import { dataProvider } from './dataProvider';
import { authProvider } from './authProvider';
import { UserList } from "./users";
import { KundenList } from "./kunden";
import { BrilleList } from "./brillen";
import { GlassList } from "./glass";


export const App = () => (
    <Admin dataProvider={dataProvider}>
        <Resource name="kunde" list={KundenList} show={ShowG} />
        <Resource name="brille" list={BrilleList} />
        <Resource name="glass" list={GlassList} />
        <Resource name="glastype" list={ListGuesser} />
        <Resource name="fassung" list={ListGuesser} />
    </Admin>
);
