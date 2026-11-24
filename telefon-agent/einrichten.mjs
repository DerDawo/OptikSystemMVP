#!/usr/bin/env node
// Legt den Telefon-Assistenten bei ElevenLabs an bzw. aktualisiert ihn:
// Geheimnis, Werkzeuge (Webhooks auf die Edge Function telefon-agent) und
// den Agenten mit Gesprächsleitfaden aus prompt.md.
//
//   node telefon-agent/einrichten.mjs
//
// Liest telefon-agent/.env, merkt sich die von ElevenLabs vergebenen IDs in
// telefon-agent/.elevenlabs-ids.json (nicht im Repo) und kann beliebig oft
// laufen: beim zweiten Mal wird aktualisiert statt neu angelegt.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ordner = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
    readFileSync(join(ordner, '.env'), 'utf8')
        .split('\n')
        .filter((z) => /^[A-Z_]+=/.test(z))
        .map((z) => [z.slice(0, z.indexOf('=')), z.slice(z.indexOf('=') + 1).trim()]),
);
const fehlt = ['ELEVENLABS_API_KEY', 'TELEFON_AGENT_SCHLUESSEL', 'SUPABASE_PROJEKT'].filter((k) => !env[k]);
if (fehlt.length) {
    console.error(`Bitte in telefon-agent/.env ausfüllen: ${fehlt.join(', ')}`);
    process.exit(1);
}

const API = env.ELEVENLABS_API_BASE || 'https://api.elevenlabs.io';
const BASIS = `https://${env.SUPABASE_PROJEKT}.supabase.co/functions/v1/telefon-agent`;
const idDatei = join(ordner, '.elevenlabs-ids.json');
const ids = existsSync(idDatei) ? JSON.parse(readFileSync(idDatei, 'utf8')) : {};
const merken = () => writeFileSync(idDatei, JSON.stringify(ids, null, 2) + '\n', { mode: 0o600 });

const el = async (methode, pfad, body) => {
    const r = await fetch(`${API}${pfad}`, {
        method: methode,
        headers: { 'xi-api-key': env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
    });
    const text = await r.text();
    if (!r.ok) throw new Error(`${methode} ${pfad} → ${r.status}\n${text}`);
    return text ? JSON.parse(text) : {};
};

// 1. Gemeinsamer Schlüssel als ElevenLabs-Secret (geht nie an das Sprachmodell)
if (!ids.secret) {
    const s = await el('POST', '/v1/convai/secrets', {
        type: 'new',
        name: `telefon_agent_schluessel_${env.SUPABASE_PROJEKT}`,
        value: env.TELEFON_AGENT_SCHLUESSEL,
    });
    ids.secret = s.secret_id;
    merken();
}
const kopf = { 'x-telefon-schluessel': { secret_id: ids.secret } };

// 2. Werkzeuge
const llm = (beschreibung, typ = 'string') => ({ type: typ, description: beschreibung });
const system = {
    conversation_id: { type: 'string', dynamic_variable: 'system__conversation_id' },
    anrufer: { type: 'string', dynamic_variable: 'system__caller_id' },
};
const werkzeuge = [
    {
        name: 'oeffnungszeiten',
        description: 'Aktuelle Uhrzeit, ob gerade geöffnet ist, und die Öffnungszeiten der Woche.',
        properties: {},
        required: [],
    },
    {
        name: 'freie_termine',
        description: 'Freie Terminzeiten für eine Terminart suchen. Liefert bis zu vier Vorschläge mit Feld "start".',
        properties: {
            terminart: llm('Terminart, möglichst einer der Namen aus der Liste der Terminarten, z. B. Sehtest'),
            wunschtag: llm('Gewünschter Tag als JJJJ-MM-TT, leer wenn egal'),
            tageszeit: llm('vormittag, nachmittag oder egal'),
        },
        required: ['terminart'],
    },
    {
        name: 'termin_vormerken',
        description: 'Einen Termin verbindlich vormerken. Erst aufrufen, nachdem der Anrufer Termin, Namen und Nummer bestätigt hat.',
        properties: {
            terminart: llm('Terminart wie bei freie_termine'),
            start: llm('Genau der Wert "start" des gewählten Vorschlags aus freie_termine'),
            vorname: llm('Vorname des Kunden'),
            nachname: llm('Nachname des Kunden'),
            telefon: llm('Rückrufnummer, leer wenn die Nummer des Anrufs passt'),
            email: llm('E-Mail-Adresse, nur wenn genannt'),
            anliegen: llm('Kurz das Anliegen, z. B. neue Gleitsichtbrille'),
            ...system,
        },
        required: ['terminart', 'start', 'vorname', 'nachname', 'conversation_id', 'anrufer'],
    },
    {
        name: 'rueckruf_notieren',
        description: 'Rückrufbitte an das Team notieren.',
        properties: {
            name: llm('Name des Anrufers'),
            telefon: llm('Rückrufnummer, leer wenn die Nummer des Anrufs passt'),
            anliegen: llm('Anliegen in einem Satz'),
            dringend: llm('true, wenn es eilig ist', 'boolean'),
            ...system,
        },
        required: ['name', 'anliegen', 'conversation_id', 'anrufer'],
    },
    {
        name: 'auftragsstatus',
        description: 'Stand der Brillenaufträge eines Kunden. Nur mit Nachname UND Geburtsdatum.',
        properties: {
            nachname: llm('Nachname des Kunden'),
            geburtsdatum: llm('Geburtsdatum als JJJJ-MM-TT'),
            ...system,
        },
        required: ['nachname', 'geburtsdatum', 'conversation_id', 'anrufer'],
    },
    {
        name: 'wissen_suchen',
        description: 'Im Wissen des Geschäfts nachschlagen (Parken, Zahlung, Kassenzuschuss, Reparatur, Angebote usw.).',
        properties: { frage: llm('Die Frage des Anrufers in eigenen Worten') },
        required: ['frage'],
    },
    {
        name: 'wissensluecke_melden',
        description: 'Eine Frage melden, die du nicht beantworten konntest, damit das Team die Antwort ergänzt.',
        properties: { frage: llm('Die unbeantwortete Frage'), conversation_id: system.conversation_id },
        required: ['frage', 'conversation_id'],
    },
];

ids.tools ??= {};
for (const w of werkzeuge) {
    const tool_config = {
        type: 'webhook',
        name: w.name,
        description: w.description,
        response_timeout_secs: 15,
        api_schema: {
            url: `${BASIS}/werkzeug/${w.name}`,
            method: 'POST',
            request_headers: kopf,
            content_type: 'application/json',
            request_body_schema: {
                type: 'object',
                description: w.description,
                properties: w.properties,
                required: w.required,
            },
        },
    };
    if (ids.tools[w.name]) {
        await el('PATCH', `/v1/convai/tools/${ids.tools[w.name]}`, { tool_config });
    } else {
        ids.tools[w.name] = (await el('POST', '/v1/convai/tools', { tool_config })).id;
        merken();
    }
    console.log(`Werkzeug ${w.name} ✓`);
}

// 3. Aktuelle Werte für Tests im Browser (bei Telefonanrufen kommen sie live über /start)
const startAntwort = await fetch(`${BASIS}/start`, {
    method: 'POST',
    headers: { 'x-telefon-schluessel': env.TELEFON_AGENT_SCHLUESSEL },
});
if (!startAntwort.ok) {
    console.error(`Die Edge Function antwortet nicht (${startAntwort.status}). Ist sie bereitgestellt und der Schlüssel als Secret gesetzt?`);
    process.exit(1);
}
const variablen = (await startAntwort.json()).dynamic_variables;

// 4. Agent
const agent = {
    name: `Telefon-Assistent ${variablen.firma} (${env.SUPABASE_PROJEKT === 'cktdtojgrxskihihmnjm' ? 'Prod' : 'Dev'})`,
    conversation_config: {
        agent: {
            language: 'de',
            first_message: 'Guten Tag, hier ist der KI-Telefonassistent von {{firma}}. {{oeffnungsstatus}} Wie kann ich Ihnen helfen?',
            dynamic_variables: { dynamic_variable_placeholders: variablen },
            prompt: {
                prompt: readFileSync(join(ordner, 'prompt.md'), 'utf8'),
                llm: env.TELEFON_AGENT_LLM || 'claude-haiku-5-5',
                temperature: 0.1,
                timezone: 'Europe/Berlin',
                tool_ids: Object.values(ids.tools),
                built_in_tools: {
                    end_call: { name: 'end_call', description: '', params: { system_tool_type: 'end_call' } },
                    language_detection: {
                        name: 'language_detection',
                        description: '',
                        params: { system_tool_type: 'language_detection' },
                    },
                },
            },
        },
        ...(env.TELEFON_AGENT_STIMME ? { tts: { voice_id: env.TELEFON_AGENT_STIMME } } : {}),
    },
    platform_settings: {
        data_collection: {
            zusammenfassung: {
                type: 'string',
                description: 'Fasse das Gespräch in ein bis zwei deutschen Sätzen für das Team zusammen: Wer rief an, was wollte er, was wurde vereinbart.',
            },
            notfall: {
                type: 'boolean',
                description: 'true, wenn der Anrufer einen medizinischen Notfall geschildert hat und an 112, Augenklinik oder 116 117 verwiesen wurde.',
            },
        },
    },
};

if (ids.agent) {
    await el('PATCH', `/v1/convai/agents/${ids.agent}`, agent);
    console.log(`Agent aktualisiert ✓  ${ids.agent}`);
} else {
    ids.agent = (await el('POST', '/v1/convai/agents/create', agent)).agent_id;
    merken();
    console.log(`Agent angelegt ✓  ${ids.agent}`);
}
console.log(`\nIm Browser testen: https://elevenlabs.io/app/talk-to?agent_id=${ids.agent}`);
console.log(`Anrufbeginn-Webhook:  ${BASIS}/start   (Kopfzeile x-telefon-schluessel)`);
console.log(`Nach-Anruf-Webhook:   ${BASIS}/nach-anruf`);
