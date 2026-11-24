// Reine Hilfsregeln des Telefon-Assistenten (ohne Deno/Netz), damit sie sich
// mit vitest testen lassen (my-admin/src/telefonAgent.test.ts).

const ZONE = 'Europe/Berlin';

type Teile = { tag: string; stunde: number; minute: number; wochentag: string; datum: string };

const teileFormat = new Intl.DateTimeFormat('de-DE', {
    timeZone: ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
});
const wochentagFormat = new Intl.DateTimeFormat('de-DE', { timeZone: ZONE, weekday: 'long' });
const datumFormat = new Intl.DateTimeFormat('de-DE', { timeZone: ZONE, day: 'numeric', month: 'long' });

/** Datum/Uhrzeit eines Zeitpunkts in Berliner Zeit. */
export const berlin = (iso: string | Date): Teile => {
    const d = typeof iso === 'string' ? new Date(iso) : iso;
    const p = Object.fromEntries(teileFormat.formatToParts(d).map((t) => [t.type, t.value]));
    return {
        tag: `${p.year}-${p.month}-${p.day}`,
        stunde: Number(p.hour),
        minute: Number(p.minute),
        wochentag: wochentagFormat.format(d),
        datum: datumFormat.format(d),
    };
};

/** „Mittwoch, 25. November um 10:30 Uhr“ zum Vorlesen. */
export const zumVorlesen = (iso: string) => {
    const b = berlin(iso);
    const uhr = b.minute === 0 ? `${b.stunde} Uhr` : `${b.stunde}:${String(b.minute).padStart(2, '0')} Uhr`;
    return `${b.wochentag}, ${b.datum} um ${uhr}`;
};

export type Tageszeit = 'vormittag' | 'nachmittag' | 'egal';

/**
 * Aus allen freien Startzeiten ein paar Vorschläge wählen: an einem
 * Wunschtag bis zu `max` über den Tag verteilt, sonst je Tag höchstens zwei
 * (früh und später) über die nächsten Tage.
 */
export const waehleZeiten = (
    starts: string[],
    { wunschtag, tageszeit = 'egal' }: { wunschtag?: string | null; tageszeit?: Tageszeit | null },
    max = 4,
): { zeiten: string[]; wunschtagFrei: boolean | null } => {
    const passend = starts.filter((s) => {
        const h = berlin(s).stunde;
        if (tageszeit === 'vormittag') return h < 12;
        if (tageszeit === 'nachmittag') return h >= 12;
        return true;
    });

    const verteilt = (liste: string[], n: number) => {
        if (liste.length <= n) return liste;
        const schritt = (liste.length - 1) / (n - 1);
        return Array.from({ length: n }, (_, i) => liste[Math.round(i * schritt)]);
    };

    if (wunschtag) {
        const amTag = passend.filter((s) => berlin(s).tag === wunschtag);
        if (amTag.length) return { zeiten: verteilt(amTag, max), wunschtagFrei: true };
        const danach = passend.filter((s) => berlin(s).tag > wunschtag);
        return { zeiten: jeTag(danach.length ? danach : passend, max), wunschtagFrei: false };
    }
    return { zeiten: jeTag(passend, max), wunschtagFrei: null };
};

const jeTag = (liste: string[], max: number) => {
    const tage = new Map<string, string[]>();
    for (const s of liste) {
        const t = berlin(s).tag;
        tage.set(t, [...(tage.get(t) ?? []), s]);
    }
    const aus: string[] = [];
    for (const zeiten of tage.values()) {
        aus.push(zeiten[0]);
        if (zeiten.length > 1 && aus.length < max) aus.push(zeiten[Math.floor(zeiten.length * 0.6)]);
        if (aus.length >= max) break;
    }
    return aus.slice(0, max);
};

const SYNONYME: [RegExp, string][] = [
    [/seh ?test|augen ?(test|messen|messung)|sehst(ä|ae)rke|refraktion/i, 'sehtest'],
    [/brille|gleitsicht|fassung/i, 'brillenberatung'],
    [/kontakt ?linse|linsen/i, 'kontaktlinsen'],
    [/augenkrank|gr(ü|ue)ner star|glaukom|katarakt|makula|trockene augen/i, 'augenkrankheiten'],
    [/abhol|reparatur|service|anpass|nachstell/i, 'abholung'],
];

/** Terminart zum Namen, den der Anrufer/Agent nennt (unscharf). */
export const findeTerminart = <T extends { id: number; name: string }>(arten: T[], wunsch: string): T | null => {
    const w = wunsch.trim().toLowerCase();
    if (!w) return null;
    const genau = arten.find((a) => a.name.toLowerCase() === w);
    if (genau) return genau;
    const enthalten = arten.find((a) => a.name.toLowerCase().includes(w) || w.includes(a.name.toLowerCase()));
    if (enthalten) return enthalten;
    for (const [muster, stichwort] of SYNONYME) {
        if (muster.test(w)) {
            const a = arten.find((x) => x.name.toLowerCase().includes(stichwort));
            if (a) return a;
        }
    }
    return null;
};

/** Ziffern einzeln zum Vorlesen, z. B. „0 7 3 1 …“. */
export const ziffernEinzeln = (nummer: string) =>
    nummer.replace(/^\+49/, '0').replace(/[^0-9]/g, '').split('').join(' ');

/**
 * ElevenLabs-Webhook-Signatur prüfen. Kopfzeile „t=<unix>,v0=<hex>“,
 * signiert ist „<t>.<roher Body>“ mit HMAC-SHA256 und dem Webhook-Geheimnis.
 */
export const signaturGueltig = async (
    kopf: string | null,
    rohBody: string,
    geheimnis: string,
    jetztSek = Math.floor(Date.now() / 1000),
    toleranzSek = 30 * 60,
) => {
    if (!kopf || !geheimnis) return false;
    const teile = Object.fromEntries(
        kopf.split(',').map((t) => {
            const i = t.indexOf('=');
            return [t.slice(0, i).trim(), t.slice(i + 1).trim()];
        }),
    );
    const t = Number(teile.t);
    const v0 = teile.v0;
    if (!t || !v0 || Math.abs(jetztSek - t) > toleranzSek) return false;
    const schluessel = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(geheimnis),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign'],
    );
    const sig = await crypto.subtle.sign('HMAC', schluessel, new TextEncoder().encode(`${t}.${rohBody}`));
    const hex = Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('');
    return gleich(hex, v0);
};

/** Vergleich ohne frühen Abbruch (gegen Zeitmessungs-Angriffe). */
export const gleich = (a: string, b: string) => {
    if (a.length !== b.length) return false;
    let d = 0;
    for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return d === 0;
};
