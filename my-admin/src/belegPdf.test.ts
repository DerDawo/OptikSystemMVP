import { afterEach, describe, expect, it, vi } from "vitest";
import { belegVersenden } from "./belegPdf";

vi.mock("./utils", () => ({ supabase: {} }));

const datei = new File(["%PDF"], "Rechnung-1.pdf", { type: "application/pdf" });
const nachricht = {
  an: "kunde@example.org",
  betreff: "Rechnung 1",
  text: "Guten Tag",
};

const teilenMoeglich = () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  const share = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("navigator", {
    canShare: () => true,
    share,
    clipboard: { writeText },
  });
  return { writeText, share };
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("belegVersenden", () => {
  it("kopiert die E-Mail-Adresse vor dem Teilen in die Zwischenablage", async () => {
    const { writeText, share } = teilenMoeglich();
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
    const { writeText } = teilenMoeglich();
    const kopiert = vi.fn();
    await belegVersenden("email", datei, { ...nachricht, an: "" }, kopiert);
    await belegVersenden("whatsapp", datei, nachricht, kopiert);
    expect(writeText).not.toHaveBeenCalled();
    expect(kopiert).not.toHaveBeenCalled();
  });

  it("teilt auch, wenn die Zwischenablage gesperrt ist", async () => {
    const { writeText, share } = teilenMoeglich();
    writeText.mockRejectedValue(new Error("NotAllowedError"));
    const kopiert = vi.fn();
    const ergebnis = await belegVersenden("email", datei, nachricht, kopiert);
    expect(ergebnis).toBe("geteilt");
    expect(share).toHaveBeenCalled();
    expect(kopiert).not.toHaveBeenCalled();
  });
});
