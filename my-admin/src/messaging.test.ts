import { afterEach, describe, expect, it, vi } from "vitest";

// messaging.ts importiert den Supabase-Client, der ohne Env-Variablen beim
// Laden abbricht (#98). Für die reinen Link-Funktionen wird er nicht gebraucht.
vi.mock("./utils", () => ({ supabase: {} }));

import {
  buildExternalMessageUrl,
  choosePhoneNumberForMessaging,
  gmailUrl,
  normalizePhoneNumberForSms,
  openExternalMessage,
  whatsappWebUrl,
} from "./messaging";

describe("buildExternalMessageUrl", () => {
  it("baut einen mailto-Link mit Betreff und Text", () => {
    expect(
      buildExternalMessageUrl("email", {
        to: " kunde@example.de ",
        subject: "Ihre Brille",
        message: "Ist abholbereit & wartet.",
      }),
    ).toBe(
      "mailto:kunde@example.de?subject=Ihre%20Brille&body=Ist%20abholbereit%20%26%20wartet.",
    );
  });

  it("lässt den Betreff weg, wenn keiner angegeben ist", () => {
    expect(
      buildExternalMessageUrl("email", { to: "a@b.de", message: "Hallo" }),
    ).toBe("mailto:a@b.de?body=Hallo");
  });

  it("baut einen sms-Link mit normalisierter deutscher Nummer", () => {
    expect(
      buildExternalMessageUrl("sms", {
        to: "0170 123-45 67",
        message: "Hallo Welt",
      }),
    ).toBe("sms:+491701234567?body=Hallo%20Welt");
  });

  it("baut einen wa.me-Link ohne Pluszeichen", () => {
    expect(
      buildExternalMessageUrl("whatsapp", {
        to: "+49 170 1234567",
        message: "Hallo",
      }),
    ).toBe("https://wa.me/491701234567?text=Hallo");
  });
});

describe("Telefonnummern für SMS/WhatsApp", () => {
  it("bereitet Schrägstriche, 0049 und Freitext auf", () => {
    expect(normalizePhoneNumberForSms("0365/123 45 67")).toBe("+493651234567");
    expect(normalizePhoneNumberForSms("0049 170 1234567")).toBe(
      "+491701234567",
    );
    expect(normalizePhoneNumberForSms("Sohn: 0170/1234567")).toBe(
      "+491701234567",
    );
    expect(normalizePhoneNumberForSms("0170 1234567, 0365 123456")).toBe(
      "+491701234567",
    );
  });

  it("nimmt die erste Handynummer, sonst die erste vorhandene", () => {
    expect(
      choosePhoneNumberForMessaging(["", "0365 123456", "0171 7654321"]),
    ).toBe("0171 7654321");
    expect(
      choosePhoneNumberForMessaging(["0160 111222", "0365 123456", ""]),
    ).toBe("0160 111222");
    expect(choosePhoneNumberForMessaging([null, "0365 123456", ""])).toBe(
      "0365 123456",
    );
    expect(choosePhoneNumberForMessaging([null, undefined, ""])).toBe("");
  });
});

describe("whatsappWebUrl", () => {
  it("macht aus wa.me einen direkten WhatsApp-Web-Link", () => {
    const url = buildExternalMessageUrl("whatsapp", {
      to: "0170 1234567",
      message: "Hallo & 100% fertig",
    });
    expect(whatsappWebUrl(url)).toBe(
      "https://web.whatsapp.com/send?phone=491701234567&text=Hallo%20%26%20100%25%20fertig",
    );
    expect(new URL(url).searchParams.get("text")).toBe("Hallo & 100% fertig");
  });

  it("lässt andere Links in Ruhe", () => {
    expect(whatsappWebUrl("mailto:a@b.de?body=x")).toBeNull();
    expect(whatsappWebUrl("https://example.org")).toBeNull();
  });
});

describe("E-Mail über Gmail", () => {
  const MAC =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";
  const IPHONE =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
  const mailto = buildExternalMessageUrl("email", {
    to: "kunde@example.de",
    subject: "Rechnung 114 & Co",
    message: "Guten Tag,\nanbei die Rechnung.",
  });

  const umgebung = (userAgent: string, fenster: object | null) => {
    const open = vi.fn(() => fenster);
    const ort = { href: "" };
    vi.stubGlobal("navigator", { userAgent, maxTouchPoints: 0 });
    vi.stubGlobal("window", { open, location: ort });
    return { open, ort };
  };

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("übernimmt Empfänger, Betreff und Text in den Gmail-Link", () => {
    const url = new URL(gmailUrl(mailto) ?? "");
    expect(url.origin + url.pathname).toBe("https://mail.google.com/mail/");
    expect(url.searchParams.get("view")).toBe("cm");
    expect(url.searchParams.get("to")).toBe("kunde@example.de");
    expect(url.searchParams.get("su")).toBe("Rechnung 114 & Co");
    expect(url.searchParams.get("body")).toBe(
      "Guten Tag,\nanbei die Rechnung.",
    );
    expect(gmailUrl("https://wa.me/491701234567")).toBeNull();
  });

  it("öffnet am Computer Gmail statt des Mail-Programms", () => {
    const { open, ort } = umgebung(MAC, {});
    expect(openExternalMessage(mailto)).toBe(false);
    expect(open).toHaveBeenCalledWith(gmailUrl(mailto), "unicorn-gmail");
    expect(ort.href).toBe("");
  });

  it("nimmt das Mail-Programm, wenn das Gmail-Fenster blockiert ist", () => {
    const { ort } = umgebung(MAC, null);
    openExternalMessage(mailto);
    expect(ort.href).toBe(mailto);
  });

  it("bleibt am Handy beim mailto-Link", () => {
    const { open, ort } = umgebung(IPHONE, {});
    openExternalMessage(mailto);
    expect(open).not.toHaveBeenCalled();
    expect(ort.href).toBe(mailto);
  });
});
