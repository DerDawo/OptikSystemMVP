import { afterEach, describe, expect, it, vi } from "vitest";

// #98: `npm run dev` muss beim Start fehlschlagen, statt versehentlich gegen
// das Prod-Supabase-Projekt zu arbeiten oder mit fehlenden Env-Variablen
// später in einem unklaren Fehler zu enden.

const DEV_URL = "https://psxrxggwqlltfhfskeoa.supabase.co";
const PROD_URL = "https://cktdtojgrxskihihmnjm.supabase.co";
const DUMMY_KEY = "dummy-key";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("utils (Supabase-Client-Konfiguration)", () => {
  it("wirft beim Start, wenn VITE_SUPABASE_URL/-KEY fehlen", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY", "");

    await expect(import("./utils")).rejects.toThrow(/nicht gesetzt/);
  });

  it("wirft im Dev-Modus, wenn VITE_SUPABASE_URL auf das Prod-Projekt zeigt", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", PROD_URL);
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY", DUMMY_KEY);
    vi.stubEnv("DEV", true);

    await expect(import("./utils")).rejects.toThrow(/Prod-Projekt/);
  });

  it("startet unauffällig mit den Dev-Projekt-Werten", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", DEV_URL);
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY", DUMMY_KEY);
    vi.stubEnv("DEV", true);

    const { supabase } = await import("./utils");
    expect(supabase).toBeDefined();
  });
});
