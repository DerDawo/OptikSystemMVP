import { supabase } from "./utils";

export type MessageChannel = "sms" | "email" | "whatsapp";

export type SendMessagePayload = {
  to: string;
  message: string;
  subject?: string;
};

export type MessageDeliveryResult = {
  channel: MessageChannel;
  success: boolean;
  error?: string;
};

const edgeFunctionByChannel: Record<MessageChannel, string> = {
  sms: "send-sms",
  email: "send-email",
  whatsapp: "send-whatsapp",
};

export const implementedMessageChannels: MessageChannel[] = [
  "sms",
  "email",
  "whatsapp",
];

// Versand über die Edge Functions (Twilio/Resend/WhatsApp Cloud API). Braucht
// API-Keys als Function-Secrets und wird aktuell nicht aus der Oberfläche
// genutzt: Dort öffnet buildExternalMessageUrl() die passende App
// (Gmail bzw. Mail-Programm, SMS, WhatsApp) mit vorausgefüllter Nachricht. Bleibt für
// einen späteren Versand ohne Medienbruch erhalten.
export const sendMessage = async (
  channel: MessageChannel,
  payload: SendMessagePayload,
): Promise<MessageDeliveryResult> => {
  const { error } = await supabase.functions.invoke(
    edgeFunctionByChannel[channel],
    {
      body: payload,
    },
  );

  if (error) {
    return { channel, success: false, error: await readFunctionError(error) };
  }

  return { channel, success: true };
};

// functions.invoke meldet bei einem Fehlerstatus nur "Edge Function returned a
// non-2xx status code". Die verständliche Meldung der Function steht im Body
// ({ error: "..." }) der Antwort.
const readFunctionError = async (error: {
  message: string;
  context?: unknown;
}): Promise<string> => {
  const context = error.context;
  if (context instanceof Response) {
    try {
      const body = (await context.clone().json()) as { error?: unknown };
      if (typeof body.error === "string" && body.error) return body.error;
    } catch {
      // Body war kein JSON - dann bleibt die allgemeine Meldung.
    }
  }
  return error.message;
};

// Direktversand über die Edge Functions im Hintergrund statt Öffnen der
// externen App. Wird erst aktiv, wenn die Functions deployt und die Secrets
// (Twilio, Resend, Meta) gesetzt sind: VITE_DIRECT_MESSAGING=true.
export const isDirectSendEnabled = (): boolean =>
  import.meta.env.VITE_DIRECT_MESSAGING === "true";

export type DirectSendRequest = {
  channel: MessageChannel;
  payload: SendMessagePayload;
};

// Versendet alle Kanäle parallel. Ein fehlgeschlagener Kanal bricht die
// übrigen nicht ab; auch unerwartete Ausnahmen werden zu einem Ergebnis.
export const sendMessagesInBackground = (
  requests: DirectSendRequest[],
): Promise<MessageDeliveryResult[]> =>
  Promise.all(
    requests.map(async ({ channel, payload }) => {
      try {
        return await sendMessage(channel, payload);
      } catch (error) {
        return {
          channel,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }),
  );

export const messageChannelLabels: Record<MessageChannel, string> = {
  sms: "SMS",
  whatsapp: "Whatsapp",
  email: "Email",
};

export type DeliverySummary = {
  type: "success" | "warning" | "error";
  message: string;
};

// Fasst die Ergebnisse für die Rückmeldung an den Nutzer zusammen:
// alles gesendet, teilweise gesendet oder gar nichts gesendet.
export const summarizeDeliveryResults = (
  results: MessageDeliveryResult[],
): DeliverySummary => {
  const sent = results.filter((result) => result.success);
  const failed = results.filter((result) => !result.success);
  const names = (list: MessageDeliveryResult[]) =>
    list.map((result) => messageChannelLabels[result.channel]).join(", ");
  const failures = failed
    .map(
      (result) =>
        `${messageChannelLabels[result.channel]}: ${result.error ?? "Unbekannter Fehler"}`,
    )
    .join(" · ");

  if (failed.length === 0) {
    return { type: "success", message: `Nachricht gesendet (${names(sent)}).` };
  }
  if (sent.length === 0) {
    return {
      type: "error",
      message: `Nachricht nicht gesendet. ${failures}`,
    };
  }
  return {
    type: "warning",
    message: `Nur teilweise gesendet (${names(sent)}). Fehlgeschlagen: ${failures}`,
  };
};

// Erste Telefonnummer in einem Freitextfeld, z. B. "Sohn: 0365/12 34 56"
// oder "0170 1234567, 0365 123456" (aus Prisma übernommene Felder).
const PHONE_PATTERN = /(?:\+|00)?\d[\d\s/().-]{4,}\d/;

export const extractPhoneNumber = (value: string): string =>
  value.match(PHONE_PATTERN)?.[0] ?? value;

export const normalizePhoneNumberForSms = (phoneNumber: string): string => {
  let digits = extractPhoneNumber(phoneNumber.trim()).replace(/[^\d+]/g, "");

  if (digits.startsWith("00")) {
    digits = `+${digits.slice(2)}`;
  }

  if (digits.startsWith("+")) {
    return digits;
  }

  if (digits.startsWith("0")) {
    return `+49${digits.slice(1)}`;
  }

  return digits;
};

/** Deutsche Mobilnummer (015x, 016x, 017x)? */
export const isMobilePhoneNumber = (phoneNumber: string): boolean =>
  /^\+491[5-7]/.test(normalizePhoneNumberForSms(phoneNumber));

/**
 * Nummer für SMS und WhatsApp: die erste Handynummer unter den Kandidaten
 * (Reihenfolge = Priorität), sonst die erste vorhandene Nummer. An
 * Festnetznummern lässt sich in der Regel keine WhatsApp schicken.
 */
export const choosePhoneNumberForMessaging = (
  candidates: (string | null | undefined)[],
): string => {
  const vorhanden = candidates
    .map((value) => (value ?? "").trim())
    .filter(Boolean);
  return vorhanden.find(isMobilePhoneNumber) ?? vorhanden[0] ?? "";
};

export const normalizePhoneNumberForWhatsapp = (phoneNumber: string): string =>
  normalizePhoneNumberForSms(phoneNumber).replace(/^\+/, "");

const encode = (value: string): string => encodeURIComponent(value);

// Baut einen Link, der die passende externe Anwendung mit vorausgefüllter
// Nachricht öffnet - ohne API-Keys. Versendet wird dort vom Nutzer selbst.
export const buildExternalMessageUrl = (
  channel: MessageChannel,
  payload: SendMessagePayload,
): string => {
  switch (channel) {
    case "email": {
      const params = [
        payload.subject ? `subject=${encode(payload.subject)}` : null,
        `body=${encode(payload.message)}`,
      ]
        .filter(Boolean)
        .join("&");
      return `mailto:${payload.to.trim()}?${params}`;
    }
    case "sms":
      return `sms:${normalizePhoneNumberForSms(payload.to)}?body=${encode(payload.message)}`;
    case "whatsapp":
      return `https://wa.me/${normalizePhoneNumberForWhatsapp(payload.to)}?text=${encode(payload.message)}`;
  }
};

// WhatsApp am PC: direkt WhatsApp Web statt der Zwischenseite von wa.me
// ("App öffnen / Weiter zu WhatsApp Web"). Liefert null für andere Links.
export const whatsappWebUrl = (url: string): string | null => {
  const treffer = /^https:\/\/wa\.me\/(\d+)(?:\?text=(.*))?$/.exec(url);
  if (!treffer) return null;
  const text = treffer[2] ?? "";
  return `https://web.whatsapp.com/send?phone=${treffer[1]}${text ? `&text=${text}` : ""}`;
};

// E-Mail am PC über Gmail im Browser statt des Mail-Programms (Outlook,
// Apple Mail): Empfänger, Betreff und Text wie im mailto-Link. Liefert null
// für andere Links.
export const gmailUrl = (url: string): string | null => {
  if (!url.startsWith("mailto:")) return null;
  const [adresse, abfrage = ""] = url.slice("mailto:".length).split("?");
  const mailto = new URLSearchParams(abfrage);
  const gmail = new URLSearchParams({ view: "cm", fs: "1" });
  if (adresse) gmail.set("to", decodeURIComponent(adresse));
  const betreff = mailto.get("subject");
  if (betreff) gmail.set("su", betreff);
  const text = mailto.get("body");
  if (text) gmail.set("body", text);
  return `https://mail.google.com/mail/?${gmail.toString()}`;
};

// Handy oder Tablet; iPads melden sich in Safari als Mac, haben aber einen
// Touchscreen
export const istHandy = () =>
  typeof navigator !== "undefined" &&
  (/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) ||
    (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1));

/*
 * Öffnet die passende App. Bei WhatsApp kommt der Text zusätzlich in die
 * Zwischenablage: die installierte WhatsApp-Web-App öffnet zwar den Chat,
 * verwirft aber oft den mitgeschickten Text - dann reicht Strg+V. Am PC
 * nutzen WhatsApp und Gmail (E-Mails) immer denselben Browser-Tab, statt
 * jedes Mal einen neuen zu öffnen. Rückgabe: true, wenn es ein
 * WhatsApp-Link war.
 */
export const openExternalMessage = (url: string): boolean => {
  const webUrl = whatsappWebUrl(url);
  if (webUrl) {
    const text = new URL(url).searchParams.get("text") ?? "";
    if (text) navigator.clipboard?.writeText(text).catch(() => undefined);
    if (istHandy()) {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      const fenster = window.open(webUrl, "unicorn-whatsapp");
      if (fenster) fenster.opener = null;
    }
    return true;
  }

  const gmail = istHandy() ? null : gmailUrl(url);
  if (gmail) {
    const fenster = window.open(gmail, "unicorn-gmail");
    if (fenster) {
      fenster.opener = null;
      return false;
    }
    // Pop-up blockiert: dann wie bisher das Mail-Programm
  }

  if (url.startsWith("https://")) {
    window.open(url, "_blank", "noopener,noreferrer");
    return false;
  }

  window.location.href = url;
  return false;
};
