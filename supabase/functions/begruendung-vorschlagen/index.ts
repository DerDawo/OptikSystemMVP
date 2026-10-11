// Formuliert mit Claude einen Vorschlag für die Begründung in Anträgen und im
// Erprobungsprotokoll (Formulare-Dialog der Brillenkartei, Knopf "Mit KI
// vorschlagen"). Die App schickt nur pseudonymisierte Angaben (Alter,
// Brillenart, Messwerte, Diagnose, Beruf) - keine Namen, Adressen,
// Geburtsdaten oder Versichertennummern. Diese Function übernimmt nur die
// erlaubten Felder, damit auch ein veränderter Client nicht mehr schicken kann.
//
// Secret: ANTHROPIC_API_KEY (pro Supabase-Projekt, siehe supabase/README.md).
import Anthropic from 'npm:@anthropic-ai/sdk@0.128.0';
import { corsHeaders } from '../_shared/cors.ts';

type Formular = 'antrag-zuschuss' | 'antrag-sozialamt' | 'erprobungsprotokoll';

type Werte = { sph?: number; cyl?: number; achse?: number; add?: number; visus?: number };

type Eingabe = {
    formular?: Formular;
    alterJahre?: number;
    brillenart?: string;
    diagnose?: string;
    beruf?: string;
    rechts?: Werte;
    links?: Werte;
    sehstaerkeVeraendert?: boolean | null;
    alterVorherigeBrilleJahre?: number | null;
};

const FORMULARE: Record<Formular, string> = {
    'antrag-zuschuss':
        'Antrag auf Kostenübernahme bzw. Zuschuss für eine Sehhilfe an Krankenkasse, Jobcenter oder Arbeitgeber',
    'antrag-sozialamt': 'Antrag auf Kostenübernahme für eine Brille beim Sozialamt',
    erprobungsprotokoll:
        'Erprobungsprotokoll vergrößernde Sehhilfen (Stellungnahme zur Verordnung nach Muster 8A, HilfsM-RL)',
};

const SYSTEM = `Du unterstützt einen Augenoptikermeister beim Ausfüllen von Formularen.
Formuliere aus den übergebenen Angaben einen sachlichen, gut lesbaren Begründungstext auf Deutsch, den er in das Formular übernimmt und vor dem Druck prüft.

- Verwende ausschließlich die übergebenen Angaben. Erfinde keine Diagnosen, Werte, Beschwerden, Erprobungsergebnisse oder Rechtsgrundlagen.
- Fehlt eine Angabe, lass sie weg, statt sie zu umschreiben oder Platzhalter einzusetzen.
- Bei Anträgen schreibst du aus Sicht der antragstellenden Person (Ich-Form), beim Erprobungsprotokoll aus Sicht des Leistungserbringers.
- 3 bis 6 Sätze, ohne Anrede, Grußformel, Überschrift oder Aufzählungszeichen, ohne Namen.
- Gib nur den Begründungstext aus.`;

const jsonResponse = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

const zahl = (value: unknown) =>
    typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const text = (value: unknown, max = 120) =>
    typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : undefined;

const werte = (value: unknown): Werte | undefined => {
    if (!value || typeof value !== 'object') return undefined;
    const w = value as Record<string, unknown>;
    return {
        sph: zahl(w.sph),
        cyl: zahl(w.cyl),
        achse: zahl(w.achse),
        add: zahl(w.add),
        visus: zahl(w.visus),
    };
};

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    let eingabe: Eingabe;
    try {
        eingabe = await req.json();
    } catch {
        return jsonResponse({ error: 'Ungültiger Request-Body.' }, 400);
    }

    const formular = eingabe.formular;
    if (!formular || !(formular in FORMULARE)) {
        return jsonResponse({ error: 'Unbekanntes Formular.' }, 400);
    }

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
        return jsonResponse({ error: 'KI-Vorschläge sind nicht eingerichtet.' }, 503);
    }

    // Nur erlaubte, pseudonymisierte Felder weitergeben
    const angaben = {
        alterJahre: zahl(eingabe.alterJahre),
        brillenart: text(eingabe.brillenart),
        diagnose: text(eingabe.diagnose, 200),
        beruf: text(eingabe.beruf),
        werteRechts: werte(eingabe.rechts),
        werteLinks: werte(eingabe.links),
        sehstaerkeGegenueberVorherigerBrilleUmMindestens05dptVeraendert:
            typeof eingabe.sehstaerkeVeraendert === 'boolean' ? eingabe.sehstaerkeVeraendert : undefined,
        alterVorherigeBrilleJahre: zahl(eingabe.alterVorherigeBrilleJahre),
    };

    const client = new Anthropic({ apiKey });

    try {
        const response = await client.beta.messages.create({
            model: 'claude-opus-5-5',
            max_tokens: 8000,
            output_config: { effort: 'medium' },
            // Bei einer Ablehnung durch die Sicherheitsfilter übernimmt
            // automatisch ein passendes Ersatzmodell
            betas: ['server-side-fallback-2026-07-01'],
            fallbacks: 'default',
            system: SYSTEM,
            messages: [
                {
                    role: 'user',
                    content: `Formular: ${FORMULARE[formular]}\n\nAngaben (JSON):\n${JSON.stringify(angaben, null, 2)}`,
                },
            ],
        });

        if (response.stop_reason === 'refusal') {
            return jsonResponse({ error: 'Für diese Angaben wurde kein Vorschlag erstellt.' }, 422);
        }

        const begruendung = response.content
            .filter((block) => block.type === 'text')
            .map((block) => (block as { text: string }).text)
            .join('\n')
            .trim();

        if (!begruendung) {
            return jsonResponse({ error: 'Es wurde kein Text erzeugt.' }, 502);
        }
        return jsonResponse({ begruendung }, 200);
    } catch (error) {
        if (error instanceof Anthropic.RateLimitError) {
            return jsonResponse({ error: 'Zu viele Anfragen - bitte gleich noch einmal versuchen.' }, 429);
        }
        if (error instanceof Anthropic.AuthenticationError) {
            return jsonResponse({ error: 'Der KI-Zugang ist ungültig (ANTHROPIC_API_KEY prüfen).' }, 503);
        }
        if (error instanceof Anthropic.APIError) {
            console.error('Claude API', error.status, error.message);
            return jsonResponse({ error: 'Der KI-Dienst hat einen Fehler gemeldet.' }, 502);
        }
        console.error('begruendung-vorschlagen', error);
        return jsonResponse({ error: 'Der Vorschlag konnte nicht erstellt werden.' }, 500);
    }
});
