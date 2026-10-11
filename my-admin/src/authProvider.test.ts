import { afterEach, describe, expect, it, vi } from "vitest";

const { resetPasswordForEmail } = vi.hoisted(() => ({
  resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
}));
vi.mock("./utils", () => ({ supabase: { auth: { resetPasswordForEmail } } }));

import { authCallbackUrl, authProvider } from "./authProvider";

afterEach(() => {
  vi.unstubAllGlobals();
  resetPasswordForEmail.mockClear();
});

describe("authProvider (Passwort zurücksetzen)", () => {
  it("bildet die Rücksprungadresse neben der aktuellen Seite", () => {
    expect(authCallbackUrl("http://localhost:5173/#/forgot-password")).toBe(
      "http://localhost:5173/auth-callback.html",
    );
    expect(
      authCallbackUrl("https://optik.example/app/index.html?x=1#/login"),
    ).toBe("https://optik.example/app/auth-callback.html");
  });

  it("schickt die Reset-Mail mit Rücksprung auf auth-callback.html", async () => {
    vi.stubGlobal("window", {
      location: { href: "https://optik.example/#/forgot-password" },
    });

    await authProvider.resetPassword({ email: "kunde@example.com" });

    expect(resetPasswordForEmail).toHaveBeenCalledWith("kunde@example.com", {
      redirectTo: "https://optik.example/auth-callback.html",
    });
  });
});
