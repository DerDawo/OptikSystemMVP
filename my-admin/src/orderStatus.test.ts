import { describe, expect, it } from "vitest";
import { getBrilleOrderStatus } from "./orderStatus";

const tagIso = (tage: number) => {
  const d = new Date();
  d.setDate(d.getDate() + tage);
  const zwei = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${zwei(d.getMonth() + 1)}-${zwei(d.getDate())}`;
};

describe("getBrilleOrderStatus", () => {
  it("ohne Datum ist der Auftrag in Bearbeitung", () => {
    expect(getBrilleOrderStatus({}).key).toBe("offen");
    expect(getBrilleOrderStatus(null).key).toBe("offen");
  });

  it("Fertig gesetzt = bereit zur Abholung", () => {
    expect(getBrilleOrderStatus({ Fertig: tagIso(-3) }).key).toBe("bereit");
  });

  it("Abholung heute oder früher = abgeholt, auch wenn Fertig gesetzt", () => {
    expect(getBrilleOrderStatus({ Abholung: tagIso(0) }).key).toBe("abgeholt");
    expect(
      getBrilleOrderStatus({ Abholung: tagIso(-1), Fertig: tagIso(-5) }).key,
    ).toBe("abgeholt");
  });

  it("Abholung in der Zukunft gilt weiter als bereit", () => {
    expect(getBrilleOrderStatus({ Abholung: tagIso(2) }).key).toBe("bereit");
  });
});
