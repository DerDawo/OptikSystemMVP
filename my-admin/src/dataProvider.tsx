// in src/dataProvider.ts
//import jsonServerProvider from 'ra-data-json-server';
import { supabase } from './utils';
import { supabaseDataProvider } from 'ra-supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY

console.log("Supabase URL:", supabaseUrl);

const rawDataProvider = supabaseDataProvider({ instanceUrl: supabaseUrl, apiKey: supabaseKey, supabaseClient: supabase });

// React Admin requires data provider methods to return a Promise, not throw.
// Wrap methods to convert synchronous throws into rejected promises.
export const dataProvider = new Proxy(rawDataProvider, {
    get(target, prop, receiver) {
        const value = Reflect.get(target, prop, receiver);
        if (typeof value !== 'function') {
            return value;
        }

        return (...args: unknown[]) => {
            try {
                const result = value.apply(target, args);

                if (result && typeof (result as any).then === 'function') {
                    return (result as Promise<unknown>).catch(err => Promise.reject(err));
                }

                return Promise.resolve(result);
            } catch (error) {
                return Promise.reject(error);
            }
        };
    },
});
//export const dataProvider = jsonServerProvider(
//    import.meta.env.VITE_JSON_SERVER_URL
//);
