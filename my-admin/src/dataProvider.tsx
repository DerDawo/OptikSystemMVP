// in src/dataProvider.ts
//import jsonServerProvider from 'ra-data-json-server';
import { supabase } from './utils';
import { supabaseDataProvider } from 'ra-supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY

console.log("Supabase URL:", supabaseUrl);

export const dataProvider = supabaseDataProvider({ instanceUrl: supabaseUrl, apiKey: supabaseKey, supabaseClient: supabase });
//export const dataProvider = jsonServerProvider(
//    import.meta.env.VITE_JSON_SERVER_URL
//);
