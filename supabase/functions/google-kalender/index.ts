// Gleicht die Termine eines Google-Kalenders in die Tabelle termin ab
// (Terminliste/Terminkalender der App). Aufruf alle 15 Minuten per pg_cron
// und über den Knopf "Mit Google abgleichen" in der App.
//
// - Quelle: private iCal-Adresse des Kalenders (Google Kalender ->
//   Einstellungen -> Kalender -> "Privatadresse im iCal-Format").
//   Secret: GOOGLE_KALENDER_ICS_URL (pro Supabase-Projekt, siehe
//   supabase/README.md). Die Adresse wird nie ausgegeben oder protokolliert.
// - Zeitraum: Termine ab 30 Tagen zurück bis 12 Monate voraus.
// - Neue Termine werden über Vor-/Nachname im Titel einem Kunden
//   zugeordnet, sonst ohne Kunde ("Kunde offen") übernommen. Eine in der App
//   gesetzte Zuordnung bleibt erhalten.
// - In Google gelöschte oder abgesagte Termine werden entfernt.
// - Serientermine (RRULE) werden nicht übernommen, siehe ics.ts.
// - Die Antwort enthält nur Zählwerte. Ein Aufruf innerhalb von 60 Sekunden
//   nach dem letzten Abgleich wird übersprungen.
import { createClient } from 'npm:@supabase/supabase-js@2.49.4';
import { corsHeaders } from '../_shared/cors.ts';
import { leseIcs, namensWoerter, passenderKunde, type IcsTermin } from './ics.ts';

const TAG = 86_400_000;
const MIN_ABSTAND_MS = 60_000;

const jsonResponse = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

type TerminZeile = { id: number; google_uid: string; kunde_id: number | null };

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const merkeStatus = (ergebnis: Record<string, unknown> | null, fehler: string | null) =>
        supabase
            .from('kalender_abgleich')
            .upsert({ id: 1, zuletzt: new Date().toISOString(), ergebnis, fehler });

    const icsUrl = Deno.env.get('GOOGLE_KALENDER_ICS_URL');
    if (!icsUrl) {
        const fehler = 'GOOGLE_KALENDER_ICS_URL ist nicht gesetzt (Edge Functions -> Secrets).';
        await merkeStatus(null, fehler);
        return jsonResponse({ fehler }, 500);
    }

    const { data: status } = await supabase
        .from('kalender_abgleich')
        .select('zuletzt, ergebnis')
        .eq('id', 1)
        .maybeSingle();
    if (status?.zuletzt && Date.now() - new Date(status.zuletzt).getTime() < MIN_ABSTAND_MS) {
        return jsonResponse({ uebersprungen: true, ...(status.ergebnis ?? {}) });
    }

    try {
        // Fehlermeldungen von fetch enthalten die URL - nie weitergeben
        const antwort = await fetch(icsUrl).catch(() => {
            throw new Error('Google-Kalender nicht erreichbar');
        });
        if (!antwort.ok) throw new Error(`Google-Kalender nicht erreichbar (HTTP ${antwort.status})`);
        const alle = leseIcs(await antwort.text());

        const von = Date.now() - 30 * TAG;
        const bis = Date.now() + 365 * TAG;
        const imZeitraum = (t: IcsTermin) =>
            t.ende.getTime() >= von && t.start.getTime() <= bis;
        // je Kennung nur ein Eintrag (sonst lehnt der upsert den Stapel ab)
        const termine = [
            ...new Map(
                alle.filter((t) => imZeitraum(t) && !t.abgesagt).map((t) => [t.uid, t]),
            ).values(),
        ];
        const uidsImFeed = new Set(termine.map((t) => t.uid));

        // Bisher übernommene Google-Termine
        const bestehende = new Map<string, TerminZeile>();
        for (let seite = 0; ; seite++) {
            const { data, error } = await supabase
                .from('termin')
                .select('id, google_uid, kunde_id')
                .not('google_uid', 'is', null)
                .range(seite * 1000, seite * 1000 + 999);
            if (error) throw error;
            (data as TerminZeile[]).forEach((z) => bestehende.set(z.google_uid, z));
            if (!data || data.length < 1000) break;
        }

        // Kunde für neue bzw. noch nicht zugeordnete Termine suchen
        const kundeZu = async (titel: string) => {
            const woerter = namensWoerter(titel);
            if (woerter.length === 0) return null;
            const { data } = await supabase
                .from('kunde')
                .select('id, Vorname, Nachname')
                .or(woerter.map((w) => `Nachname.ilike.${w}`).join(','))
                .limit(50);
            return passenderKunde(titel, data ?? []);
        };

        let neu = 0;
        let geaendert = 0;
        let ohneKunde = 0;
        const zeilen: Record<string, unknown>[] = [];
        for (const t of termine) {
            const alt = bestehende.get(t.uid);
            const kunde_id = alt?.kunde_id ?? (await kundeZu(t.titel));
            if (!kunde_id) ohneKunde++;
            if (alt) geaendert++;
            else neu++;
            zeilen.push({
                google_uid: t.uid,
                Titel: t.titel || 'Termin',
                Notiz: t.beschreibung || null,
                Start: t.start.toISOString(),
                Ende: t.ende.toISOString(),
                Terminart: t.ganztags ? 'Google (ganztägig)' : 'Google',
                kunde_id,
            });
        }
        for (let i = 0; i < zeilen.length; i += 500) {
            const { error } = await supabase
                .from('termin')
                .upsert(zeilen.slice(i, i + 500), { onConflict: 'google_uid' });
            if (error) throw error;
        }

        // In Google gelöschte/abgesagte Termine im Zeitraum entfernen
        const entfernen = [...bestehende.values()]
            .filter((z) => !uidsImFeed.has(z.google_uid))
            .map((z) => z.id);
        let geloescht = 0;
        for (let i = 0; i < entfernen.length; i += 200) {
            const { data, error } = await supabase
                .from('termin')
                .delete()
                .in('id', entfernen.slice(i, i + 200))
                .gte('Start', new Date(von).toISOString())
                .select('id');
            if (error) throw error;
            geloescht += data?.length ?? 0;
        }

        const ergebnis = { neu, geaendert, geloescht, ohneKunde, imFeed: termine.length };
        await merkeStatus(ergebnis, null);
        return jsonResponse(ergebnis);
    } catch (error) {
        const fehler = (error instanceof Error ? error.message : String(error))
            .split(icsUrl)
            .join('[iCal-Adresse]');
        console.error('Google-Kalender-Abgleich fehlgeschlagen:', fehler);
        await merkeStatus(null, fehler);
        return jsonResponse({ fehler }, 502);
    }
});
