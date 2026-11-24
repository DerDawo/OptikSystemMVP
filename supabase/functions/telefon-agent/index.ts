// Telefon-Assistent: Schnittstelle für den KI-Sprachagenten bei ElevenLabs.
//
//   POST /telefon-agent/start               Anrufbeginn (Öffnungsstatus usw. als Variablen)
//   POST /telefon-agent/werkzeug/<name>     Werkzeuge, die der Agent im Gespräch aufruft
//   POST /telefon-agent/nach-anruf          Nach dem Anruf: Verlauf, Zusammenfassung, E-Mail
//
// /start und /werkzeug/* verlangen die Kopfzeile x-telefon-schluessel
// (= Secret TELEFON_AGENT_SCHLUESSEL, bei ElevenLabs als Secret hinterlegt).
// /nach-anruf prüft die Signatur von ElevenLabs (TELEFON_AGENT_WEBHOOK_SECRET).
// Bereitstellen ohne JWT-Prüfung:  supabase functions deploy telefon-agent --no-verify-jwt
//
// Secrets: TELEFON_AGENT_SCHLUESSEL, TELEFON_AGENT_WEBHOOK_SECRET,
// optional TELEFON_AGENT_MELDUNG_AN (sonst E-Mail aus Betriebsdaten),
// RESEND_API_KEY + RESEND_FROM_ADDRESS (wie send-email).
import { createClient } from 'npm:@supabase/supabase-js@2.49.4';
import { checkRecipientAllowed } from '../_shared/recipientAllowlist.ts';
import {
    findeTerminart,
    gleich,
    signaturGueltig,
    waehleZeiten,
    ziffernEinzeln,
    zumVorlesen,
    type Tageszeit,
} from './logik.ts';

const db = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
    auth: { persistSession: false },
});

const antwort = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

type Eingabe = Record<string, unknown>;
const text = (v: unknown, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
// ElevenLabs schickt bei Web-Tests statt einer Nummer leere Werte oder Platzhalter
const nummer = (v: unknown) => {
    const t = text(v, 40);
    return /[0-9]{5,}/.test(t.replace(/[^0-9]/g, '')) ? t : '';
};

// Eintrag im Anrufprotokoll anlegen oder ergänzen (je Gespräch einer)
const anrufMerken = async (conversationId: string, felder: Record<string, unknown>) => {
    if (!conversationId) return;
    const { error } = await db
        .from('telefon_anruf')
        .upsert({ conversation_id: conversationId, ...felder }, { onConflict: 'conversation_id' });
    if (error) console.error('telefon_anruf', error);
};

const kundeZurNummer = async (anrufer: string) => {
    if (!anrufer) return null;
    const { data } = await db.rpc('telefon_kunde_zur_nummer', { p_nummer: anrufer });
    return (data as number | null) ?? null;
};

const terminarten = async () => {
    const { data } = await db.rpc('buchung_konfiguration');
    const konf = (data ?? {}) as { aktiv?: boolean; firma?: string; telefon?: string; terminarten?: { id: number; name: string; dauer_min: number }[] };
    return { aktiv: !!konf.aktiv, firma: konf.firma ?? 'unserem Augenoptiker', telefon: konf.telefon ?? '', arten: konf.terminarten ?? [] };
};

const oeffnung = async () => {
    const { data } = await db.rpc('telefon_oeffnungsstatus');
    return (data ?? { text: '', woche: '' }) as { offen: boolean | null; text: string; woche: string };
};

const jetztText = () =>
    new Intl.DateTimeFormat('de-DE', {
        timeZone: 'Europe/Berlin',
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date()) + ' Uhr';

// ---------------------------------------------------------------- Anrufbeginn

const start = async () => {
    const [o, t] = await Promise.all([oeffnung(), terminarten()]);
    return antwort({
        type: 'conversation_initiation_client_data',
        dynamic_variables: {
            firma: t.firma,
            oeffnungsstatus: o.text,
            oeffnungszeiten: o.woche,
            terminarten: t.arten.map((a) => a.name).join(', '),
            jetzt: jetztText(),
        },
    });
};

// ---------------------------------------------------------------- Werkzeuge

const werkzeuge: Record<string, (e: Eingabe) => Promise<unknown>> = {
    async oeffnungszeiten() {
        const o = await oeffnung();
        return { jetzt: jetztText(), status: o.text, oeffnungszeiten: o.woche };
    },

    async freie_termine(e) {
        const { aktiv, arten } = await terminarten();
        if (!aktiv) return { ok: false, hinweis: 'Terminvergabe am Telefon ist gerade nicht möglich. Rückruf anbieten.' };
        const art = findeTerminart(arten, text(e.terminart, 100));
        if (!art) return { ok: false, hinweis: 'Terminart unklar. Bitte eine davon wählen lassen.', terminarten: arten.map((a) => a.name) };
        const { data, error } = await db.rpc('buchung_freie_zeiten', { p_terminart_id: art.id });
        if (error) throw error;
        const starts = ((data ?? []) as { start: string }[]).map((r) => r.start);
        if (!starts.length) return { ok: false, terminart: art.name, hinweis: 'In den nächsten Wochen ist nichts frei. Rückruf anbieten.' };
        const wunschtag = /^\d{4}-\d{2}-\d{2}$/.test(text(e.wunschtag, 10)) ? text(e.wunschtag, 10) : null;
        const tageszeit = (['vormittag', 'nachmittag'].includes(text(e.tageszeit, 20)) ? text(e.tageszeit, 20) : 'egal') as Tageszeit;
        const { zeiten, wunschtagFrei } = waehleZeiten(starts, { wunschtag, tageszeit });
        return {
            ok: true,
            terminart: art.name,
            dauer_minuten: art.dauer_min,
            wunschtag_frei: wunschtagFrei,
            vorschlaege: zeiten.map((s) => ({ start: s, vorlesen: zumVorlesen(s) })),
            hinweis: 'Höchstens drei Zeiten vorlesen. Für termin_vormerken genau den Wert "start" übernehmen.',
        };
    },

    async termin_vormerken(e) {
        const conversationId = text(e.conversation_id, 200);
        const anrufer = nummer(e.anrufer);
        const { arten } = await terminarten();
        const art = findeTerminart(arten, text(e.terminart, 100));
        if (!art) return { ok: false, hinweis: 'Terminart unklar.' };
        const telefon = nummer(e.telefon) || anrufer;
        const { data, error } = await db.rpc('buchung_anfragen', {
            p_terminart_id: art.id,
            p_start: text(e.start, 40),
            p_vorname: text(e.vorname, 80),
            p_nachname: text(e.nachname, 80),
            p_email: text(e.email, 200) || null,
            p_telefon: telefon || null,
            p_nachricht: ['Am Telefon über den KI-Assistenten vorgemerkt.', text(e.anliegen, 800)].filter(Boolean).join(' '),
            p_einwilligung: true,
        });
        if (error) return { ok: false, hinweis: error.message };
        await anrufMerken(conversationId, {
            anrufer_nummer: anrufer || null,
            kunde_id: await kundeZurNummer(anrufer),
            buchung_anfrage_id: data,
            ergebnis: 'termin',
        });
        return {
            ok: true,
            vorgemerkt: zumVorlesen(text(e.start, 40)),
            hinweis: 'Der Termin ist vorgemerkt. Das Team bestätigt ihn noch per Telefon, SMS oder E-Mail.',
        };
    },

    async rueckruf_notieren(e) {
        const conversationId = text(e.conversation_id, 200);
        const anrufer = nummer(e.anrufer);
        const telefon = nummer(e.telefon) || anrufer;
        if (!telefon) return { ok: false, hinweis: 'Bitte nach einer Rückrufnummer fragen.' };
        await anrufMerken(conversationId, {
            anrufer_nummer: anrufer || null,
            kunde_id: await kundeZurNummer(telefon),
            rueckruf_erbeten: true,
            rueckruf_name: text(e.name, 120) || null,
            rueckruf_nummer: telefon,
            rueckruf_anliegen: text(e.anliegen, 1000) || null,
            dringend: e.dringend === true || e.dringend === 'true',
            ergebnis: 'rueckruf',
        });
        if (!conversationId) console.warn('rueckruf_notieren ohne conversation_id');
        return { ok: true, nummer_zum_vorlesen: ziffernEinzeln(telefon), hinweis: 'Rückruf notiert. Das Team meldet sich während der Öffnungszeiten.' };
    },

    async auftragsstatus(e) {
        const geburtsdatum = text(e.geburtsdatum, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(geburtsdatum) || !text(e.nachname)) {
            return { gefunden: false, hinweis: 'Bitte Nachnamen und Geburtsdatum (Tag, Monat, Jahr) erfragen.' };
        }
        const anrufer = nummer(e.anrufer);
        const { data, error } = await db.rpc('telefon_auftragsstatus', {
            p_nachname: text(e.nachname, 80),
            p_geburtsdatum: geburtsdatum,
            p_anrufer: anrufer || null,
        });
        if (error) throw error;
        const r = data as { gefunden: boolean; kunde_id?: number };
        if (r.gefunden) {
            await anrufMerken(text(e.conversation_id, 200), {
                anrufer_nummer: anrufer || null,
                kunde_id: r.kunde_id,
                auftrag_auskunft: true,
            });
        }
        const { kunde_id: _, ...ohneId } = r;
        return ohneId;
    },

    async wissen_suchen(e) {
        const { data, error } = await db.rpc('telefon_wissen_suchen', { p_frage: text(e.frage, 300) });
        if (error) throw error;
        const treffer = (data ?? []) as { frage: string; antwort: string }[];
        return treffer.length
            ? { gefunden: true, eintraege: treffer }
            : { gefunden: false, hinweis: 'Nichts hinterlegt. Nicht raten: wissensluecke_melden aufrufen und Rückruf anbieten.' };
    },

    async wissensluecke_melden(e) {
        const frage = text(e.frage, 500);
        if (frage.length >= 3) {
            const { error } = await db
                .from('telefon_wissensluecke')
                .insert({ frage, conversation_id: text(e.conversation_id, 200) || null });
            if (error) console.error('telefon_wissensluecke', error);
        }
        return { ok: true };
    },
};

// ---------------------------------------------------------------- Nach dem Anruf

type Nachricht = { role?: string; message?: string | null; time_in_call_secs?: number };

const nachAnruf = async (roh: string) => {
    const ereignis = JSON.parse(roh) as { type?: string; data?: Record<string, any> };
    if (ereignis.type !== 'post_call_transcription' || !ereignis.data?.conversation_id) {
        return antwort({ ok: true, ignoriert: ereignis.type ?? 'unbekannt' });
    }
    const d = ereignis.data;
    const conversationId = String(d.conversation_id);
    const variablen = d.conversation_initiation_client_data?.dynamic_variables ?? {};
    const anrufer = nummer(variablen.system__caller_id) || nummer(d.metadata?.phone_call?.external_number);
    const erfasst = d.analysis?.data_collection_results ?? {};
    const notfall = erfasst.notfall?.value === true || erfasst.notfall?.value === 'true';
    const dauer = Number(d.metadata?.call_duration_secs ?? 0) || null;
    const transkript = ((d.transcript ?? []) as Nachricht[])
        .filter((n) => n.message)
        .map((n) => ({ role: n.role, message: n.message, time_in_call_secs: n.time_in_call_secs }));

    const { data: bisher } = await db
        .from('telefon_anruf')
        .select('ergebnis, rueckruf_erbeten, rueckruf_name, rueckruf_nummer, rueckruf_anliegen, dringend, buchung_anfrage_id, kunde_id')
        .eq('conversation_id', conversationId)
        .maybeSingle();

    const ergebnis = notfall
        ? 'notfall'
        : bisher?.buchung_anfrage_id
          ? 'termin'
          : bisher?.rueckruf_erbeten
            ? 'rueckruf'
            : (dauer ?? 0) < 10
              ? 'abgebrochen'
              : 'auskunft';
    const zusammenfassung =
        (typeof erfasst.zusammenfassung?.value === 'string' && erfasst.zusammenfassung.value) ||
        d.analysis?.transcript_summary ||
        null;

    await anrufMerken(conversationId, {
        anrufer_nummer: anrufer || null,
        kunde_id: bisher?.kunde_id ?? (await kundeZurNummer(anrufer)),
        dauer_sek: dauer,
        zusammenfassung,
        transkript,
        ergebnis,
        ...(notfall ? { dringend: true } : {}),
    });

    const { count: luecken } = await db
        .from('telefon_wissensluecke')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', conversationId);

    if (bisher?.rueckruf_erbeten || bisher?.buchung_anfrage_id || notfall || luecken) {
        const zeilen = [
            `Der Telefon-Assistent hat einen Anruf angenommen${anrufer ? ` von ${anrufer}` : ''}.`,
            '',
            zusammenfassung ? `Zusammenfassung: ${zusammenfassung}` : '',
            bisher?.rueckruf_erbeten
                ? `${bisher.dringend ? 'DRINGENDER ' : ''}Rückruf erbeten: ${bisher.rueckruf_name ?? 'ohne Namen'}, ${bisher.rueckruf_nummer ?? ''}\nAnliegen: ${bisher.rueckruf_anliegen ?? '-'}`
                : '',
            bisher?.buchung_anfrage_id ? 'Ein Termin wurde vorgemerkt. Bitte unter „Online-Anfragen“ bestätigen.' : '',
            notfall ? 'Der Anrufer schilderte einen möglichen Notfall und wurde an Notruf bzw. Bereitschaftsdienst verwiesen.' : '',
            luecken ? `${luecken} Frage(n) konnte der Assistent nicht beantworten. Bitte unter „Telefon-Assistent“ ergänzen.` : '',
        ].filter((z, i) => z || i === 1);
        const betreff = notfall
            ? 'Telefon-Assistent: möglicher Notfall'
            : bisher?.rueckruf_erbeten
              ? `Telefon-Assistent: Rückrufbitte${bisher.dringend ? ' (dringend)' : ''}`
              : bisher?.buchung_anfrage_id
                ? 'Telefon-Assistent: Terminanfrage'
                : 'Telefon-Assistent: offene Frage';
        await mailAnsTeam(betreff, zeilen.join('\n'));
    }
    return antwort({ ok: true });
};

const mailAnsTeam = async (betreff: string, nachricht: string) => {
    const key = Deno.env.get('RESEND_API_KEY');
    const von = Deno.env.get('RESEND_FROM_ADDRESS');
    let an = Deno.env.get('TELEFON_AGENT_MELDUNG_AN') ?? '';
    if (!an) {
        const { data } = await db.from('betrieb').select('Email').order('id').limit(1).maybeSingle();
        an = (data?.Email as string | undefined) ?? '';
    }
    if (!key || !von || !an) {
        console.warn('Telefon-Assistent: E-Mail nicht eingerichtet (RESEND_API_KEY, RESEND_FROM_ADDRESS, Empfänger)');
        return;
    }
    if (checkRecipientAllowed(an)) {
        console.warn('Telefon-Assistent: Empfänger nicht in DEV_ALLOWED_RECIPIENTS');
        return;
    }
    const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: von, to: [an], subject: betreff, text: nachricht }),
    });
    if (!r.ok) console.error('Resend', r.status, await r.text());
};

// ---------------------------------------------------------------- Verteiler

Deno.serve(async (req: Request) => {
    if (req.method !== 'POST') return antwort({ error: 'Nur POST.' }, 405);
    const pfad = new URL(req.url).pathname.replace(/^.*\/telefon-agent/, '').replace(/\/+$/, '');
    const roh = await req.text();

    try {
        if (pfad === '/nach-anruf') {
            const geheim = Deno.env.get('TELEFON_AGENT_WEBHOOK_SECRET') ?? '';
            if (!(await signaturGueltig(req.headers.get('elevenlabs-signature'), roh, geheim))) {
                return antwort({ error: 'Signatur ungültig.' }, 401);
            }
            return await nachAnruf(roh);
        }

        const schluessel = Deno.env.get('TELEFON_AGENT_SCHLUESSEL') ?? '';
        if (!schluessel || !gleich(req.headers.get('x-telefon-schluessel') ?? '', schluessel)) {
            return antwort({ error: 'Nicht berechtigt.' }, 401);
        }

        if (pfad === '/start') return await start();

        const name = pfad.match(/^\/werkzeug\/([a-z_]+)$/)?.[1];
        const werkzeug = name ? werkzeuge[name] : undefined;
        if (!werkzeug) return antwort({ error: 'Unbekannter Pfad.' }, 404);
        let eingabe: Eingabe = {};
        try {
            eingabe = roh ? JSON.parse(roh) : {};
        } catch {
            return antwort({ error: 'Ungültiger Body.' }, 400);
        }
        return antwort(await werkzeug(eingabe));
    } catch (fehler) {
        console.error('telefon-agent', pfad, fehler);
        return antwort({ ok: false, hinweis: 'Technischer Fehler. Bitte einen Rückruf anbieten.' }, 200);
    }
});
