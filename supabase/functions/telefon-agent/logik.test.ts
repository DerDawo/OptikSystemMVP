// deno test supabase/functions/telefon-agent/logik.test.ts
import { assert, assertEquals } from 'jsr:@std/assert@1';
import { berlin, findeTerminart, signaturGueltig, waehleZeiten, ziffernEinzeln, zumVorlesen } from './logik.ts';

// Mittwoch 25.11.2026 und Donnerstag 26.11.2026, Berlin = UTC+1
const slots = [
    '2026-11-25T08:00:00Z', // 9:00
    '2026-11-25T08:30:00Z', // 9:30
    '2026-11-25T10:00:00Z', // 11:00
    '2026-11-25T13:00:00Z', // 14:00
    '2026-11-25T15:30:00Z', // 16:30
    '2026-11-26T08:00:00Z',
    '2026-11-26T14:00:00Z', // 15:00
    '2026-11-27T09:00:00Z',
];

Deno.test('Berliner Zeit und Vorlesetext', () => {
    assertEquals(berlin('2026-11-25T08:00:00Z').tag, '2026-11-25');
    assertEquals(zumVorlesen('2026-11-25T08:00:00Z'), 'Mittwoch, 25. November um 9 Uhr');
    assertEquals(zumVorlesen('2026-11-25T15:30:00Z'), 'Mittwoch, 25. November um 16:30 Uhr');
    // Sommerzeit: 7:15 UTC = 9:15 Uhr
    assertEquals(zumVorlesen('2026-07-01T07:15:00Z'), 'Mittwoch, 1. Juli um 9:15 Uhr');
});

Deno.test('Vorschläge ohne Wunschtag: je Tag höchstens zwei', () => {
    const { zeiten, wunschtagFrei } = waehleZeiten(slots, {});
    assertEquals(wunschtagFrei, null);
    assertEquals(zeiten.length, 4);
    assertEquals(zeiten.filter((z) => z.startsWith('2026-11-25')).length, 2);
    assertEquals(zeiten[0], slots[0]);
});

Deno.test('Wunschtag und Tageszeit', () => {
    const r = waehleZeiten(slots, { wunschtag: '2026-11-25', tageszeit: 'nachmittag' });
    assertEquals(r.wunschtagFrei, true);
    assertEquals(r.zeiten, ['2026-11-25T13:00:00Z', '2026-11-25T15:30:00Z']);
    const vormittag = waehleZeiten(slots, { wunschtag: '2026-11-25', tageszeit: 'vormittag' }, 2);
    assertEquals(vormittag.zeiten, ['2026-11-25T08:00:00Z', '2026-11-25T10:00:00Z']);
});

Deno.test('Wunschtag belegt: Ausweichtermine danach', () => {
    const r = waehleZeiten(slots, { wunschtag: '2026-11-28' });
    assertEquals(r.wunschtagFrei, false);
    assert(r.zeiten.length > 0);
    const r2 = waehleZeiten(slots, { wunschtag: '2026-11-24' });
    assertEquals(r2.wunschtagFrei, false);
    assertEquals(r2.zeiten[0], slots[0]);
});

Deno.test('Terminart unscharf finden', () => {
    const arten = [
        { id: 1, name: 'Sehtest' },
        { id: 2, name: 'Brillenberatung' },
        { id: 3, name: 'Kontaktlinsen' },
        { id: 4, name: 'Allgemeine Beratung Augenkrankheiten' },
        { id: 5, name: 'Abholung / Service' },
    ];
    assertEquals(findeTerminart(arten, 'sehtest')?.id, 1);
    assertEquals(findeTerminart(arten, 'Augen messen lassen')?.id, 1);
    assertEquals(findeTerminart(arten, 'neue Gleitsichtbrille')?.id, 2);
    assertEquals(findeTerminart(arten, 'Kontaktlinse')?.id, 3);
    assertEquals(findeTerminart(arten, 'grüner Star')?.id, 4);
    assertEquals(findeTerminart(arten, 'Brille abholen')?.id, 2); // „Brille“ kommt zuerst
    assertEquals(findeTerminart(arten, 'Reparatur')?.id, 5);
    assertEquals(findeTerminart(arten, 'Haarschnitt'), null);
});

Deno.test('Rufnummer Ziffer für Ziffer', () => {
    assertEquals(ziffernEinzeln('+49 731 12'), '0 7 3 1 1 2');
});

Deno.test('Webhook-Signatur', async () => {
    const body = '{"type":"post_call_transcription"}';
    const t = 1_800_000_000;
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode('geheim'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${body}`));
    const hex = Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('');
    assert(await signaturGueltig(`t=${t},v0=${hex}`, body, 'geheim', t + 60));
    assert(!(await signaturGueltig(`t=${t},v0=${hex}`, body + ' ', 'geheim', t + 60)));
    assert(!(await signaturGueltig(`t=${t},v0=${hex}`, body, 'anders', t + 60)));
    assert(!(await signaturGueltig(`t=${t},v0=${hex}`, body, 'geheim', t + 3600)));
    assert(!(await signaturGueltig(null, body, 'geheim', t)));
});
