import { afterEach, describe, expect, it, vi } from "vitest";
import { druckfensterOeffnen } from "./druckfenster";

// Bild, dessen decode() erst auf Zuruf fertig wird
const bild = () => {
  let fertig: () => void = () => undefined;
  let fehler: () => void = () => undefined;
  const decode = vi.fn(
    () =>
      new Promise<void>((resolve, reject) => {
        fertig = resolve;
        fehler = () => reject(new Error("EncodingError"));
      }),
  );
  return { decode, fertig: () => fertig(), fehler: () => fehler() };
};

const fenster = (bilder: { decode: () => Promise<void> }[]) => {
  const f = {
    document: {
      open: vi.fn(),
      write: vi.fn(),
      close: vi.fn(),
      images: bilder,
    },
    focus: vi.fn(),
    print: vi.fn(),
  };
  vi.stubGlobal("window", { open: vi.fn(() => f) });
  return f;
};

// offene Promises abarbeiten lassen
const warten = () => new Promise((fertig) => setTimeout(fertig, 0));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("druckfensterOeffnen", () => {
  it("druckt erst, wenn alle Bilder geladen sind", async () => {
    const logo = bild();
    const qr = bild();
    const f = fenster([logo, qr]);
    expect(druckfensterOeffnen("<p>Rechnung</p>", true)).toBe(true);
    expect(f.document.write).toHaveBeenCalledWith("<p>Rechnung</p>");
    // Bilder werden erst nach dem Schreiben abgefragt
    expect(logo.decode).toHaveBeenCalled();
    logo.fertig();
    await warten();
    expect(f.print).not.toHaveBeenCalled();
    qr.fertig();
    await warten();
    expect(f.print).toHaveBeenCalledTimes(1);
  });

  it("druckt auch, wenn ein Bild nicht geladen werden kann", async () => {
    const kaputt = bild();
    const f = fenster([kaputt]);
    druckfensterOeffnen("<p>Rechnung</p>", true);
    kaputt.fehler();
    await warten();
    expect(f.print).toHaveBeenCalledTimes(1);
  });

  it("druckt ohne Bilder sofort", async () => {
    const f = fenster([]);
    druckfensterOeffnen("<p>Formular</p>", true);
    await warten();
    expect(f.print).toHaveBeenCalledTimes(1);
  });

  it("zeigt die Seitenansicht ohne Druckdialog", async () => {
    const f = fenster([bild()]);
    expect(druckfensterOeffnen("<p>Rechnung</p>", false)).toBe(true);
    await warten();
    expect(f.focus).toHaveBeenCalled();
    expect(f.print).not.toHaveBeenCalled();
  });

  it("meldet ein blockiertes Fenster", () => {
    vi.stubGlobal("window", { open: vi.fn(() => null) });
    expect(druckfensterOeffnen("<p>Rechnung</p>", true)).toBe(false);
  });
});
