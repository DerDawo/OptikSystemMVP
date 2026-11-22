// Einstellungen → Datensicherung, Karte „Nächtliche Sicherung“:
//   GET  → Stand der letzten Läufe der nächtlichen Sicherung
//   POST → startet die Sicherung sofort (GitHub Actions, workflow_dispatch)
//
// Die nächtliche Sicherung läuft im privaten Repo SICHERUNG_REPO
// (ulmrobert/optik-datensicherung). Der GitHub-Token liegt nur hier als
// Function-Secret und kommt nie in den Browser. Nur der Inhaber darf die
// Function benutzen (public.ist_inhaber()).
//
// Secrets (pro Supabase-Projekt, siehe supabase/README.md):
//   SICHERUNG_GITHUB_TOKEN  Fine-grained Token, nur dieses Repo,
//                           Berechtigung „Actions: Read and write“
//   SICHERUNG_REPO          optional, Standard ulmrobert/optik-datensicherung
//   SICHERUNG_WORKFLOW      optional, Standard datensicherung.yml
import { createClient } from 'npm:@supabase/supabase-js@2.49.4';
import { corsHeaders } from '../_shared/cors.ts';

const headers = { ...corsHeaders, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };

const antwort = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { ...headers, 'Content-Type': 'application/json' },
    });

type Lauf = {
    id: number;
    status: string; // queued | in_progress | completed …
    conclusion: string | null; // success | failure | cancelled …
    created_at: string;
    updated_at: string;
    event: string; // schedule | workflow_dispatch
};

const kurz = (l: Lauf) => ({
    zeit: l.created_at,
    fertig: l.status === 'completed' ? l.updated_at : null,
    status: l.status,
    ergebnis: l.conclusion,
    vonHand: l.event === 'workflow_dispatch',
});

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers });
    if (req.method !== 'GET' && req.method !== 'POST') {
        return antwort({ error: 'Methode nicht erlaubt.' }, 405);
    }

    // Nur der Inhaber
    const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
    );
    const { data: inhaber, error: rollenFehler } = await supabase.rpc('ist_inhaber');
    if (rollenFehler || inhaber !== true) {
        return antwort({ error: 'Nur der Inhaber kann die Datensicherung starten.' }, 403);
    }

    const token = Deno.env.get('SICHERUNG_GITHUB_TOKEN');
    if (!token) {
        return antwort({ error: 'Die Sicherungs-Taste ist noch nicht eingerichtet (SICHERUNG_GITHUB_TOKEN fehlt).' }, 503);
    }
    const repo = Deno.env.get('SICHERUNG_REPO') ?? 'ulmrobert/optik-datensicherung';
    const workflow = Deno.env.get('SICHERUNG_WORKFLOW') ?? 'datensicherung.yml';
    const basis = `https://api.github.com/repos/${repo}/actions/workflows/${workflow}`;
    const gh = (pfad: string, init?: RequestInit) =>
        fetch(`${basis}${pfad}`, {
            ...init,
            headers: {
                Accept: 'application/vnd.github+json',
                Authorization: `Bearer ${token}`,
                'X-GitHub-Api-Version': '2022-11-28',
                'User-Agent': 'optik-system-datensicherung',
                ...(init?.headers ?? {}),
            },
        });

    try {
        if (req.method === 'POST') {
            // Nicht doppelt starten, wenn schon eine Sicherung läuft
            const offen = await gh('/runs?per_page=5');
            if (offen.ok) {
                const { workflow_runs } = (await offen.json()) as { workflow_runs: Lauf[] };
                if (workflow_runs.some((l) => l.status !== 'completed')) {
                    return antwort({ gestartet: false, meldung: 'Es läuft bereits eine Sicherung.' });
                }
            }
            const start = await gh('/dispatches', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ref: 'main' }),
            });
            if (start.status === 401 || start.status === 403 || start.status === 404) {
                console.error('GitHub dispatch', start.status, await start.text());
                return antwort({ error: 'GitHub hat den Start abgelehnt (Token prüfen).' }, 502);
            }
            if (!start.ok) {
                console.error('GitHub dispatch', start.status, await start.text());
                return antwort({ error: 'Die Sicherung konnte nicht gestartet werden.' }, 502);
            }
            return antwort({ gestartet: true, meldung: 'Die Sicherung wurde gestartet.' });
        }

        const r = await gh('/runs?per_page=30');
        if (!r.ok) {
            console.error('GitHub runs', r.status, await r.text());
            return antwort({ error: 'Der Stand der Sicherung konnte nicht gelesen werden (Token prüfen).' }, 502);
        }
        const { workflow_runs } = (await r.json()) as { workflow_runs: Lauf[] };
        const letzte = workflow_runs[0];
        const letzteErfolgreiche = workflow_runs.find((l) => l.conclusion === 'success');
        return antwort({
            letzte: letzte ? kurz(letzte) : null,
            letzteErfolgreiche: letzteErfolgreiche ? kurz(letzteErfolgreiche) : null,
        });
    } catch (fehler) {
        console.error('datensicherung-starten', fehler);
        return antwort({ error: 'GitHub ist gerade nicht erreichbar.' }, 502);
    }
});
