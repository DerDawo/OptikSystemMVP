import { corsHeaders } from '../_shared/cors.ts';

type SendWhatsappRequest = {
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

    let payload: SendWhatsappRequest;

    try {
        payload = await req.json();
    } catch {
        return jsonResponse({ error: 'Ungültiger Request-Body.' }, 400);
    }

    const { to, message } = payload;

    if (!to || !message) {
        return jsonResponse({ error: '"to" und "message" sind erforderlich.' }, 400);
    }

    const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
    const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
    const apiVersion = Deno.env.get('WHATSAPP_API_VERSION') ?? 'v21.0';

    if (!accessToken || !phoneNumberId) {
        return jsonResponse({ error: 'Whatsapp-Versand ist nicht konfiguriert.' }, 500);
    }

    // Free-form text only works inside Meta's 24h customer-service window
    // (i.e. the customer messaged this business number recently). Outside
    // that window the Cloud API rejects this and requires an approved
    // template message instead.
    const whatsappResponse = await fetch(
        `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                to,
                type: 'text',
                text: { body: message },
            }),
        },
    );

    const whatsappResult = await whatsappResponse.json();

    if (!whatsappResponse.ok) {
        return jsonResponse(
            { error: whatsappResult.error?.message ?? 'Whatsapp-Nachricht konnte nicht gesendet werden.' },
            502,
        );
    }

    return jsonResponse({ id: whatsappResult.messages?.[0]?.id }, 200);
});
