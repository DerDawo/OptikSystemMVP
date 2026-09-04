import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY sind nicht " +
      "gesetzt. .env.example nach .env kopieren und mit den Werten des " +
      "Supabase Dev-Projekts befüllen, siehe my-admin/.env.example (#98).",
  );
}

// Lokale Entwicklung (`npm run dev`) muss immer gegen das Supabase-Dev-Projekt
// laufen, niemals versehentlich gegen Prod - siehe #98.
const PROD_SUPABASE_PROJECT_REF = "cktdtojgrxskihihmnjm";
if (import.meta.env.DEV && supabaseUrl.includes(PROD_SUPABASE_PROJECT_REF)) {
  throw new Error(
    "VITE_SUPABASE_URL zeigt auf das Prod-Projekt " +
      `(${PROD_SUPABASE_PROJECT_REF}). \`npm run dev\` darf lokal nur gegen ` +
      "das Dev-Projekt laufen, siehe my-admin/.env.example (#98).",
  );
}

console.log("Supabase URL:", supabaseUrl);

export const supabase = createClient(supabaseUrl, supabaseKey);
