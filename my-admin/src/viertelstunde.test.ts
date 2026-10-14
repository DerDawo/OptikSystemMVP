import { describe, expect, it } from "vitest";
import dayjs from "dayjs";
import {
  VIERTELSTUNDEN,
  endeNachStart,
  setzeZusammen,
  zeitOptionen,
  zerlege,
} from "./viertelstunde";

describe("Viertelstunden", () => {
  it("07:00 bis 20:00 in 15-Minuten-Schritten", () => {
    expect(VIERTELSTUNDEN[0]).toBe("07:00");
    expect(VIERTELSTUNDEN[1]).toBe("07:15");
    expect(VIERTELSTUNDEN.at(-1)).toBe("20:00");
    expect(VIERTELSTUNDEN).toHaveLength(53);
    expect(VIERTELSTUNDEN.every((z) => /:(00|15|30|45)$/.test(z))).toBe(true);
  });

  it("zerlegt und setzt lokal zusammen", () => {
    const iso = setzeZusammen("2026-10-14", "09:45");
    expect(zerlege(iso)).toEqual({ datum: "2026-10-14", zeit: "09:45" });
    expect(setzeZusammen("", "09:45")).toBeNull();
    expect(zerlege(null)).toEqual({ datum: "", zeit: "" });
  });

  it("abweichende Uhrzeit bleibt wählbar", () => {
    expect(zeitOptionen("10:10")).toContain("10:10");
    expect(zeitOptionen("10:15")).toBe(VIERTELSTUNDEN);
  });

  it("Ende = Start + 30 Minuten, wenn leer oder nicht danach", () => {
    const start = dayjs("2026-10-14T09:00").toISOString();
    expect(endeNachStart(start, null)).toBe(
      dayjs("2026-10-14T09:30").toISOString(),
    );
    expect(endeNachStart(start, dayjs("2026-10-14T08:00").toISOString())).toBe(
      dayjs("2026-10-14T09:30").toISOString(),
    );
    expect(
      endeNachStart(start, dayjs("2026-10-14T10:00").toISOString()),
    ).toBeNull();
  });
});
