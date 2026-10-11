import {
  extractPhoneNumber,
  isMobilePhoneNumber,
  normalizePhoneNumberForSms,
  normalizePhoneNumberForWhatsapp,
} from "./messaging";

// Direkte Kontaktaufnahme aus einem Kontaktfeld der Kundenseite: Anrufen,
// bei Handynummern zusätzlich SMS und WhatsApp, bei E-Mail-Adressen eine
// neue E-Mail. Steht in einem Telefonfeld eine E-Mail-Adresse (aus Prisma
// übernommen), wird sie als E-Mail angeboten.

export type KontaktAktion = {
  art: "anrufen" | "sms" | "whatsapp" | "email";
  titel: string;
  href: string;
};

const EMAIL = /[^\s@,;<>()]+@[^\s@,;<>()]+\.[^\s@,;<>()]+/;

export const kontaktAktionen = (wert: unknown): KontaktAktion[] => {
  const text = String(wert ?? "").trim();
  if (!text) return [];

  const email = EMAIL.exec(text)?.[0];
  if (email)
    return [
      { art: "email", titel: "E-Mail schreiben", href: `mailto:${email}` },
    ];

  const ziffern = extractPhoneNumber(text).replace(/\D/g, "");
  if (ziffern.length < 5) return [];
  const nummer = normalizePhoneNumberForSms(text);
  const aktionen: KontaktAktion[] = [
    { art: "anrufen", titel: "Anrufen", href: `tel:${nummer}` },
  ];
  if (isMobilePhoneNumber(text)) {
    aktionen.push(
      { art: "sms", titel: "SMS schreiben", href: `sms:${nummer}` },
      {
        art: "whatsapp",
        titel: "WhatsApp öffnen",
        href: `https://wa.me/${normalizePhoneNumberForWhatsapp(text)}`,
      },
    );
  }
  return aktionen;
};
