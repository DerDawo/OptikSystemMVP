import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createSignedUrl, upload, list, from } = vi.hoisted(() => {
  const createSignedUrl = vi.fn();
  const upload = vi.fn();
  const list = vi.fn();
  const from = vi.fn(() => ({ createSignedUrl, upload, list }));
  return { createSignedUrl, upload, list, from };
});
vi.mock("./utils", () => ({ supabase: { storage: { from } } }));

import {
  INFO_BUCKET,
  KATALOG_DATEI,
  KATALOG_MAX_BYTES,
  KEIN_KATALOG,
  katalogVorhanden,
  oeffneKatalog,
  pruefeKatalogDatei,
  speichereKatalog,
} from "./infomaterial";

describe("pruefeKatalogDatei", () => {
  it("nimmt ein PDF unter 50 MB an", () => {
    expect(
      pruefeKatalogDatei({
        type: "application/pdf",
        name: "Katalog 2024.pdf",
        size: 23_112_580,
      }),
    ).toBeNull();
  });
  it("erkennt PDF auch an der Endung ohne Dateityp", () => {
    expect(
      pruefeKatalogDatei({ type: "", name: "k.PDF", size: 10 }),
    ).toBeNull();
  });
  it("lehnt andere Dateien ab", () => {
    expect(
      pruefeKatalogDatei({ type: "image/png", name: "k.png", size: 10 }),
    ).toMatch(/PDF/);
  });
  it("lehnt zu große Dateien ab", () => {
    expect(
      pruefeKatalogDatei({
        type: "application/pdf",
        name: "k.pdf",
        size: KATALOG_MAX_BYTES + 1,
      }),
    ).toMatch(/50 MB/);
  });
});

describe("oeffneKatalog", () => {
  const fenster = { location: { href: "" }, close: vi.fn() };
  beforeEach(() => {
    fenster.location.href = "";
    vi.stubGlobal("window", {
      open: vi.fn(() => fenster),
      location: { assign: vi.fn() },
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("öffnet erst ein Fenster und setzt dann den signierten Link", async () => {
    createSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://x/sign/infomaterial/k.pdf?token=1" },
      error: null,
    });
    await oeffneKatalog();
    expect(window.open).toHaveBeenCalledWith("", "_blank");
    expect(from).toHaveBeenCalledWith(INFO_BUCKET);
    expect(createSignedUrl).toHaveBeenCalledWith(KATALOG_DATEI, 3600);
    expect(fenster.location.href).toBe(
      "https://x/sign/infomaterial/k.pdf?token=1",
    );
  });

  it("schließt das Fenster und meldet, wenn kein Katalog da ist", async () => {
    createSignedUrl.mockResolvedValue({
      data: null,
      error: { message: "Object not found" },
    });
    await expect(oeffneKatalog()).rejects.toThrow(KEIN_KATALOG);
    expect(fenster.close).toHaveBeenCalled();
  });
});

describe("speichereKatalog / katalogVorhanden", () => {
  afterEach(() => vi.clearAllMocks());

  it("lädt als PDF unter festem Namen hoch und ersetzt den alten", async () => {
    upload.mockResolvedValue({ error: null });
    const datei = { type: "application/pdf", name: "a.pdf", size: 5 } as File;
    await speichereKatalog(datei);
    expect(upload).toHaveBeenCalledWith(KATALOG_DATEI, datei, {
      contentType: "application/pdf",
      upsert: true,
    });
  });

  it("lädt keine falsche Datei hoch", async () => {
    const datei = { type: "text/plain", name: "a.txt", size: 5 } as File;
    await expect(speichereKatalog(datei)).rejects.toThrow(/PDF/);
    expect(upload).not.toHaveBeenCalled();
  });

  it("erkennt einen vorhandenen Katalog", async () => {
    list.mockResolvedValue({ data: [{ name: KATALOG_DATEI }], error: null });
    expect(await katalogVorhanden()).toBe(true);
    list.mockResolvedValue({ data: [], error: null });
    expect(await katalogVorhanden()).toBe(false);
  });
});
