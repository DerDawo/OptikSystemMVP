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
// (Mail-Programm, SMS, WhatsApp) mit vorausgefüllter Nachricht. Bleibt für
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
    return { channel, success: false, error: error.message };
  }

  return { channel, success: true };
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

export const openExternalMessage = (url: string): void => {
  if (url.startsWith("https://")) {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }

  window.location.href = url;
};
