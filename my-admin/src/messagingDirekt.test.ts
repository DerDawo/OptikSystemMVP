import { beforeEach, describe, expect, it, vi } from "vitest";

const invoke = vi.hoisted(() => vi.fn());
vi.mock("./utils", () => ({ supabase: { functions: { invoke } } }));

import {
  sendMessage,
  sendMessagesInBackground,
  summarizeDeliveryResults,
} from "./messaging";

beforeEach(() => invoke.mockReset());

describe("sendMessage", () => {
  it("ruft die Edge Function des Kanals auf", async () => {
    invoke.mockResolvedValue({ data: {}, error: null });
    const payload = { to: "a@b.de", message: "Hallo", subject: "Hi" };
    await expect(sendMessage("email", payload)).resolves.toEqual({
      channel: "email",
      success: true,
    });
    expect(invoke).toHaveBeenCalledWith("send-email", { body: payload });
  });

  it("liefert die Meldung der Function statt der allgemeinen", async () => {
    invoke.mockResolvedValue({
      data: null,
      error: {
        message: "Edge Function returned a non-2xx status code",
        context: new Response(
          JSON.stringify({ error: "Email-Versand ist nicht konfiguriert." }),
          { status: 500 },
        ),
      },
    });
    await expect(
      sendMessage("email", { to: "a@b.de", message: "Hallo" }),
    ).resolves.toEqual({
      channel: "email",
      success: false,
      error: "Email-Versand ist nicht konfiguriert.",
    });
  });
});

describe("sendMessagesInBackground", () => {
  it("lässt einen fehlgeschlagenen Kanal die anderen nicht abbrechen", async () => {
    invoke.mockImplementation(async (name: string) => {
      if (name === "send-sms") throw new Error("Netzwerk weg");
      return { data: {}, error: null };
    });
    const results = await sendMessagesInBackground([
      { channel: "sms", payload: { to: "0170", message: "x" } },
      { channel: "email", payload: { to: "a@b.de", message: "x" } },
    ]);
    expect(results).toEqual([
      { channel: "sms", success: false, error: "Netzwerk weg" },
      { channel: "email", success: true },
    ]);
  });
});

describe("summarizeDeliveryResults", () => {
  it("meldet Erfolg", () => {
    expect(
      summarizeDeliveryResults([
        { channel: "sms", success: true },
        { channel: "email", success: true },
      ]),
    ).toEqual({ type: "success", message: "Nachricht gesendet (SMS, Email)." });
  });

  it("meldet Teilerfolg mit Fehlergrund", () => {
    const summary = summarizeDeliveryResults([
      { channel: "sms", success: true },
      { channel: "whatsapp", success: false, error: "Nicht erlaubt" },
    ]);
    expect(summary.type).toBe("warning");
    expect(summary.message).toContain("Whatsapp: Nicht erlaubt");
  });

  it("meldet Misserfolg", () => {
    const summary = summarizeDeliveryResults([
      { channel: "email", success: false },
    ]);
    expect(summary).toEqual({
      type: "error",
      message: "Nachricht nicht gesendet. Email: Unbekannter Fehler",
    });
  });
});
