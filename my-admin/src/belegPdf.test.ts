import { afterEach, describe, expect, it, vi } from "vitest";
import { belegVersenden } from "./belegPdf";
import { openExternalMessage } from "./messaging";

vi.mock("./utils", () => ({ supabase: {} }));
vi.mock("./messaging", async (original) => ({
  ...(await original<typeof import("./messaging")>()),
  openExternalMessage: vi.fn(() => true),
}));

const MAC =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";
const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";

const datei = new File(["%PDF"], "Rechnung-1.pdf", { type: "application/pdf" });
const nachricht = {
  an: "kunde@example.org",
  betreff: "Rechnung 1",
  text: "Guten Tag",
};

const teilenMoeglich = (userAgent = MAC, maxTouchPoints = 0) => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  const share = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("navigator", {
    canShare: () => true,
    share,
    clipboard: { writeText },
    userAgent,
    maxTouchPoints,
  });
  return { writeText, share };
};

// Speichern der Datei über einen Download-Link
const herunterladenMoeglich = () => {
  const link = { click: vi.fn(), remove: vi.fn(), href: "", download: "" };
  vi.stubGlobal("document", {
    createElement: () => link,
    body: { appendChild: vi.fn() },
  });
  vi.stubGlobal("window", { setTimeout: vi.fn() });
  return link;
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.mocked(openExternalMessage).mockClear();
});

describe("belegVersenden", () => {
  it("kopiert die E-Mail-Adresse vor dem Teilen in die Zwischenablage", async () => {
    const { writeText, share } = teilenMoeglich(IPHONE);
    const kopiert = vi.fn();
    const ergebnis = await belegVersenden("email", datei, nachricht, kopiert);
    expect(ergebnis).toBe("geteilt");
    expect(writeText).toHaveBeenCalledWith("kunde@example.org");
    expect(kopiert).toHaveBeenCalledWith("kunde@example.org");
    expect(writeText.mock.invocationCallOrder[0]).toBeLessThan(
      share.mock.invocationCallOrder[0],
    );
  });

  it("kopiert nichts ohne Adresse oder bei WhatsApp", async () => {
    const { writeText } = teilenMoeglich(IPHONE);
    const kopiert = vi.fn();
    await belegVersenden("email", datei, { ...nachricht, an: "" }, kopiert);
    await belegVersenden("whatsapp", datei, nachricht, kopiert);
    expect(writeText).not.toHaveBeenCalled();
    expect(kopiert).not.toHaveBeenCalled();
  });

  it("teilt auch, wenn die Zwischenablage gesperrt ist", async () => {
    const { writeText, share } = teilenMoeglich(IPHONE);
    writeText.mockRejectedValue(new Error("NotAllowedError"));
    const kopiert = vi.fn();
    const ergebnis = await belegVersenden("email", datei, nachricht, kopiert);
    expect(ergebnis).toBe("geteilt");
    expect(share).toHaveBeenCalled();
    expect(kopiert).not.toHaveBeenCalled();
  });

  it("öffnet bei WhatsApp am Computer gleich den Chat statt des Teilen-Menüs", async () => {
    const { share } = teilenMoeglich(MAC);
    const link = herunterladenMoeglich();
    const ergebnis = await belegVersenden("whatsapp", datei, {
      ...nachricht,
      an: "0170 1234567",
    });
    expect(ergebnis).toBe("heruntergeladen");
    expect(share).not.toHaveBeenCalled();
    expect(link.download).toBe("Rechnung-1.pdf");
    expect(link.click).toHaveBeenCalled();
    expect(openExternalMessage).toHaveBeenCalledWith(
      "https://wa.me/491701234567?text=Guten%20Tag",
    );
  });

  it("nutzt bei WhatsApp am Handy und iPad weiter das Teilen-Menü", async () => {
    const { share } = teilenMoeglich(IPHONE);
    expect(await belegVersenden("whatsapp", datei, nachricht)).toBe("geteilt");
    // iPad meldet sich als Mac, hat aber einen Touchscreen
    const ipad = teilenMoeglich(MAC, 5);
    expect(await belegVersenden("whatsapp", datei, nachricht)).toBe("geteilt");
    expect(share).toHaveBeenCalledTimes(1);
    expect(ipad.share).toHaveBeenCalledTimes(1);
    expect(openExternalMessage).not.toHaveBeenCalled();
  });

  it("öffnet bei E-Mail am Computer gleich die E-Mail an den Kunden", async () => {
    const { share, writeText } = teilenMoeglich(MAC);
    const link = herunterladenMoeglich();
    const kopiert = vi.fn();
    const ergebnis = await belegVersenden("email", datei, nachricht, kopiert);
    expect(ergebnis).toBe("heruntergeladen");
    expect(share).not.toHaveBeenCalled();
    expect(writeText).not.toHaveBeenCalled();
    expect(kopiert).not.toHaveBeenCalled();
    expect(link.download).toBe("Rechnung-1.pdf");
    // openExternalMessage öffnet daraus am Computer Gmail
    expect(openExternalMessage).toHaveBeenCalledWith(
      "mailto:kunde@example.org?subject=Rechnung%201&body=Guten%20Tag",
    );
  });

  it("teilt E-Mails am Handy weiter über das Teilen-Menü", async () => {
    const { share } = teilenMoeglich(IPHONE);
    expect(await belegVersenden("email", datei, nachricht)).toBe("geteilt");
    expect(share).toHaveBeenCalled();
  });
});
