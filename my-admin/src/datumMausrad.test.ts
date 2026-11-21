import { describe, expect, it } from "vitest";
import {
  einheitAusTasten,
  richtungAusDelta,
  verschiebeDatum,
} from "./datumMausrad";

describe("verschiebeDatum", () => {
  it("Tage vor und zurück, über Monats- und Jahresgrenzen", () => {
    expect(verschiebeDatum("2026-11-01", 1, "tag")).toBe("2026-11-02");
    expect(verschiebeDatum("2026-11-01", -1, "tag")).toBe("2026-10-31");
    expect(verschiebeDatum("2026-12-31", 1, "tag")).toBe("2027-01-01");
  });

  it("Monate behalten den Tag, soweit es ihn gibt", () => {
    expect(verschiebeDatum("2026-11-01", 1, "monat")).toBe("2026-12-01");
    expect(verschiebeDatum("2026-12-15", 1, "monat")).toBe("2027-01-15");
    expect(verschiebeDatum("2026-01-31", 1, "monat")).toBe("2026-02-28");
    expect(verschiebeDatum("2026-01-15", -1, "monat")).toBe("2025-12-15");
  });

  it("Jahre, auch vom 29. Februar", () => {
    expect(verschiebeDatum("2026-11-01", 1, "jahr")).toBe("2027-11-01");
    expect(verschiebeDatum("2026-11-01", -1, "jahr")).toBe("2025-11-01");
    expect(verschiebeDatum("2028-02-29", 1, "jahr")).toBe("2029-02-28");
  });

  it("leeres Feld startet bei heute", () => {
    expect(verschiebeDatum("", 1, "tag", { heute: "2026-11-21" })).toBe(
      "2026-11-21",
    );
  });

  it("hält min und max ein", () => {
    expect(
      verschiebeDatum("2026-11-01", 1, "jahr", { max: "2026-12-31" }),
    ).toBe("2026-12-31");
    expect(
      verschiebeDatum("2026-01-01", -1, "tag", { min: "2026-01-01" }),
    ).toBe("2026-01-01");
  });
});

describe("Mausrad", () => {
  it("nach oben = später, nach unten = früher", () => {
    expect(richtungAusDelta(-100, 0)).toBe(1);
    expect(richtungAusDelta(100, 0)).toBe(-1);
    expect(richtungAusDelta(0, -4)).toBe(1);
    expect(richtungAusDelta(0, 0)).toBe(0);
  });

  it("Tasten wählen die Einheit", () => {
    expect(einheitAusTasten({ shiftKey: false, altKey: false })).toBe("tag");
    expect(einheitAusTasten({ shiftKey: true, altKey: false })).toBe("monat");
    expect(einheitAusTasten({ shiftKey: false, altKey: true })).toBe("jahr");
  });
});
