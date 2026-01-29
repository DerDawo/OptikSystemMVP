// in src/App.tsx
import { Admin, Resource } from "react-admin";
import { dataProvider } from './dataProvider';
import { authProvider } from './authProvider';
import { UserList } from "./users";
import { ListGuesser } from 'react-admin';


export const App = () => (
    <Admin dataProvider={dataProvider}>
        <Resource name="kunde" list={ListGuesser} />
        <Resource name="brille" list={ListGuesser} />
        <Resource name="glass" list={ListGuesser} />
        <Resource name="glastype" list={ListGuesser} />
        <Resource name="fassung" list={ListGuesser} />
    </Admin>
);
