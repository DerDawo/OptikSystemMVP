import { describe, expect, it, vi } from "vitest";

// messaging.ts importiert den Supabase-Client, der ohne Env-Variablen beim
// Laden abbricht (#98). Für die reinen Link-Funktionen wird er nicht gebraucht.
vi.mock("./utils", () => ({ supabase: {} }));

import { buildExternalMessageUrl } from "./messaging";

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
