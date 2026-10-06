// Optionales Sicherheitsnetz für Nicht-Prod-Supabase-Projekte: Ist das
// Secret DEV_ALLOWED_RECIPIENTS gesetzt (kommagetrennte Liste aus
// E-Mail-Adressen bzw. Telefonnummern), wird jeder Versand an einen nicht
// gelisteten Empfänger abgelehnt, bevor der externe Anbieter kontaktiert
// wird. Ist das Secret nicht gesetzt (Standard, auch auf Prod), ändert
// sich am Verhalten nichts. Details: supabase/README.md.
export function checkRecipientAllowed(to: string): string | null {
    const allowlist = Deno.env.get('DEV_ALLOWED_RECIPIENTS');
    if (!allowlist) {
        return null;
    }

    const allowed = allowlist
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);

    if (allowed.includes(to)) {
        return null;
    }

    return 'Empfänger ist nicht in DEV_ALLOWED_RECIPIENTS enthalten - Versand blockiert.';
}
