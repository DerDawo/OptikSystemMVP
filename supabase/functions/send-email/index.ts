import { corsHeaders } from '../_shared/cors.ts';

type SendEmailRequest = {
    to?: string;
    subject?: string;
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

    let payload: SendEmailRequest;

    try {
        payload = await req.json();
    } catch {
        return jsonResponse({ error: 'Ungültiger Request-Body.' }, 400);
    }

    const { to, subject, message } = payload;

    if (!to || !message) {
        return jsonResponse({ error: '"to" und "message" sind erforderlich.' }, 400);
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const fromAddress = Deno.env.get('RESEND_FROM_ADDRESS');

    if (!resendApiKey || !fromAddress) {
        return jsonResponse({ error: 'Email-Versand ist nicht konfiguriert.' }, 500);
    }

    const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from: fromAddress,
            to: [to],
            subject: subject && subject.trim().length > 0 ? subject : 'Nachricht von Ihrem Optiker',
            text: message,
        }),
    });

    const resendResult = await resendResponse.json();

    if (!resendResponse.ok) {
        return jsonResponse(
            { error: resendResult.message ?? 'Email konnte nicht gesendet werden.' },
            502,
        );
    }

    return jsonResponse({ id: resendResult.id }, 200);
});
