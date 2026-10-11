import { describe, expect, it, vi } from "vitest";

// messaging.ts lädt den Supabase-Client
vi.mock("./utils", () => ({ supabase: {} }));

import { kontaktAktionen } from "./kontaktLinks";

const arten = (wert: unknown) => kontaktAktionen(wert).map((a) => a.art);

describe("kontaktAktionen", () => {
  it("Handynummer: anrufen, SMS, WhatsApp", () => {
    const aktionen = kontaktAktionen("0171 4336699");
    expect(aktionen.map((a) => a.href)).toEqual([
      "tel:+491714336699",
      "sms:+491714336699",
      "https://wa.me/491714336699",
    ]);
  });

  it("Festnetz: nur anrufen", () => {
    expect(kontaktAktionen("0365/12 34 56")).toEqual([
      { art: "anrufen", titel: "Anrufen", href: "tel:+49365123456" },
    ]);
  });

  it("E-Mail-Adresse, auch in einem Telefonfeld", () => {
    expect(kontaktAktionen("kunde@example.org")).toEqual([
      {
        art: "email",
        titel: "E-Mail schreiben",
        href: "mailto:kunde@example.org",
      },
    ]);
  });

  it("leer oder ohne Nummer: nichts", () => {
    expect(arten("")).toEqual([]);
    expect(arten(null)).toEqual([]);
    expect(arten("Sohn anrufen")).toEqual([]);
  });
});
