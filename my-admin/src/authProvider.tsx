import { supabaseAuthProvider } from 'ra-supabase';   
import { supabase } from './utils'

export const authProvider = supabaseAuthProvider(supabase, {});