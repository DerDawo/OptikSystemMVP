import { supabaseAuthProvider } from "ra-supabase";
import { supabase } from "./utils";

// Rücksprungadresse für den Link in der Passwort-Reset-Mail. Sie zeigt auf
// public/auth-callback.html neben der aktuellen Seite, damit lokal, in
// Vercel-Previews und in Prod jeweils die eigene Instanz geöffnet wird. Jede
// dieser Adressen muss im Supabase-Projekt unter Authentication → URL
// Configuration → Redirect URLs freigegeben sein, sonst nimmt Supabase die
// Site URL (siehe supabase/README.md).
export const authCallbackUrl = (href: string) =>
  new URL("auth-callback.html", href.split("#")[0]).href;

const baseAuthProvider = supabaseAuthProvider(supabase, {});

export const authProvider = {
  ...baseAuthProvider,
  resetPassword: (
    params: Parameters<typeof baseAuthProvider.resetPassword>[0],
  ) =>
    baseAuthProvider.resetPassword({
      redirectTo: authCallbackUrl(window.location.href),
      ...params,
    }),
};
