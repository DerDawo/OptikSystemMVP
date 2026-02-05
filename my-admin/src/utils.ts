import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY

console.log("Supabase URL:", supabaseUrl);

export const supabase = createClient(supabaseUrl, supabaseKey);