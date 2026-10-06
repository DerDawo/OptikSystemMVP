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

export const normalizePhoneNumberForSms = (phoneNumber: string): string => {
  const trimmed = phoneNumber.trim().replace(/[\s()-]/g, "");

  if (trimmed.startsWith("+")) {
    return trimmed;
  }

  if (trimmed.startsWith("0")) {
    return `+49${trimmed.slice(1)}`;
  }

  return trimmed;
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
