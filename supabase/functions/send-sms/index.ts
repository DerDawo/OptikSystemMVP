import { corsHeaders } from '../_shared/cors.ts';
import { checkRecipientAllowed } from '../_shared/recipientAllowlist.ts';

type SendSmsRequest = {
    to?: string;
    message?: string;
};

const jsonResponse = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    let payload: SendSmsRequest;

    try {
        payload = await req.json();
    } catch {
        return jsonResponse({ error: 'Ungültiger Request-Body.' }, 400);
    }

    const { to, message } = payload;

    if (!to || !message) {
        return jsonResponse({ error: '"to" und "message" sind erforderlich.' }, 400);
    }

    const allowlistError = checkRecipientAllowed(to);
    if (allowlistError) {
        return jsonResponse({ error: allowlistError }, 403);
    }

    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const fromNumber = Deno.env.get('TWILIO_FROM_NUMBER');

    if (!accountSid || !authToken || !fromNumber) {
        return jsonResponse({ error: 'SMS-Versand ist nicht konfiguriert.' }, 500);
    }

    const twilioResponse = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
            method: 'POST',
            headers: {
                Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({ To: to, From: fromNumber, Body: message }),
        },
    );

    const twilioResult = await twilioResponse.json();

    if (!twilioResponse.ok) {
        return jsonResponse(
            { error: twilioResult.message ?? 'SMS konnte nicht gesendet werden.' },
            502,
        );
    }

    return jsonResponse({ sid: twilioResult.sid }, 200);
});
