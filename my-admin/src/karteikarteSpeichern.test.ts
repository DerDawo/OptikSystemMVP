import { describe, expect, it, vi } from "vitest";
import type { DataProvider } from "react-admin";
import { speichereKomponente } from "./karteikarteSpeichern";

// Minimaler DataProvider: zählt andere Aufträge mit demselben Verweis
const fakeProvider = (andereAuftraege: Record<string, number> = {}) => {
  let naechsteId = 900;
  return {
    getList: vi.fn(async (_res: string, { filter }) => {
      const feld = Object.keys(filter).find((k) => k !== "id@neq")!;
      return { data: [], total: andereAuftraege[feld] ?? 0 };
    }),
    create: vi.fn(async (_res: string, { data }) => ({
      data: { ...data, id: naechsteId++ },
    })),
    update: vi.fn(async (_res: string, { id, data }) => ({
      data: { ...data, id },
    })),
  } as unknown as DataProvider & {
    getList: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

const brille = { id: 1, GlasRechts: 10, GlasLinks: 11, Fassung: 20 };

describe("speichereKomponente", () => {
  it("ändert einen nur hier verwendeten Datensatz direkt", async () => {
    const dp = fakeProvider();
    const id = await speichereKomponente(dp, {
      brille,
      komponente: "glass",
      verweis: "GlasRechts",
      datensatz: { id: 10, Sph: 2.25 },
      data: { Sph: 2.5 },
    });
    expect(id).toBe(10);
    expect(dp.update).toHaveBeenCalledTimes(1);
    expect(dp.update).toHaveBeenCalledWith("glass", {
      id: 10,
      data: { Sph: 2.5 },
      previousData: { id: 10, Sph: 2.25 },
    });
    expect(dp.create).not.toHaveBeenCalled();
  });

  it("legt einen fehlenden Datensatz an und verknüpft ihn", async () => {
    const dp = fakeProvider();
    const id = await speichereKomponente(dp, {
      brille: { id: 1, GlasRechts: null },
      komponente: "glass",
      verweis: "GlasRechts",
      data: { Sph: -1 },
      neu: { Seite: "Rechts" },
    });
    expect(id).toBe(900);
    expect(dp.create).toHaveBeenCalledWith("glass", {
      data: { Seite: "Rechts", Sph: -1 },
    });
    expect(dp.update).toHaveBeenCalledWith(
      "brille",
      expect.objectContaining({ id: 1, data: { GlasRechts: 900 } }),
    );
  });

  it("kopiert einen von anderen Aufträgen verwendeten Datensatz", async () => {
    const dp = fakeProvider({ Fassung: 2 });
    const id = await speichereKomponente(dp, {
      brille,
      komponente: "fassung",
      verweis: "Fassung",
      datensatz: {
        id: 20,
        created_at: "2026-01-01",
        Bezeichnung: "FO 4126",
        Betrag: 129,
      },
      data: { Betrag: 99 },
    });
    expect(id).toBe(900);
    expect(dp.create).toHaveBeenCalledWith("fassung", {
      data: { Bezeichnung: "FO 4126", Betrag: 99 },
    });
    expect(dp.update).toHaveBeenCalledTimes(1);
    expect(dp.update).toHaveBeenCalledWith(
      "brille",
      expect.objectContaining({ data: { Fassung: 900 } }),
    );
  });

  it("kopiert ein Glas, das für beide Augen verwendet wird", async () => {
    const dp = fakeProvider();
    await speichereKomponente(dp, {
      brille: { id: 1, GlasRechts: 10, GlasLinks: 10 },
      komponente: "glass",
      verweis: "GlasLinks",
      datensatz: { id: 10, Seite: "Rechts", Sph: 1 },
      data: { Sph: 1.5 },
      neu: { Seite: "Links" },
    });
    expect(dp.create).toHaveBeenCalledWith("glass", {
      data: { Seite: "Links", Sph: 1.5 },
    });
    expect(dp.update).toHaveBeenCalledWith(
      "brille",
      expect.objectContaining({ data: { GlasLinks: 900 } }),
    );
  });
});
