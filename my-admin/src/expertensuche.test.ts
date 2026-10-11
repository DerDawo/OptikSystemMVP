import { describe, expect, it } from "vitest";
import { parseFilters } from "@raphiniert/ra-data-postgrest/lib/urlBuilder";
import {
  Bedingung,
  expertenAbfrage,
  spaltenTyp,
  wertFuerTyp,
} from "./expertensuche";

const url = (bedingungen: Bedingung[]) => {
  const { filter, spalten } = expertenAbfrage(bedingungen);
  return parseFilters({ filter, meta: { columns: spalten } }, "eq");
};

describe("spaltenTyp", () => {
  it("erkennt Zahl, Ja/Nein, Datum, Zeitpunkt und Text", () => {
    expect(spaltenTyp([null, 12.5])).toBe("zahl");
    expect(spaltenTyp([true])).toBe("bool");
    expect(spaltenTyp(["2026-04-01"])).toBe("datum");
    expect(spaltenTyp(["2026-04-01T10:00:00+00:00"])).toBe("zeitpunkt");
    expect(spaltenTyp(["Robert Ulm"])).toBe("text");
    expect(spaltenTyp([null, undefined])).toBe("text");
  });
});

describe("wertFuerTyp", () => {
  it("wandelt deutsche Eingaben um", () => {
    expect(wertFuerTyp("01.04.2026", "datum")).toBe("2026-04-01");
    expect(wertFuerTyp("1.4.2026", "datum")).toBe("2026-04-01");
    expect(wertFuerTyp("1.234,50", "zahl")).toBe("1234.50");
    expect(wertFuerTyp("ja", "bool")).toBe("true");
    expect(wertFuerTyp("nein", "bool")).toBe("false");
  });
});

describe("expertenAbfrage", () => {
  it("filtert Kundenfelder direkt", () => {
    expect(
      url([
        {
          feld: { tabelle: "kunde", spalte: "Stadt", typ: "text" },
          vergleich: "gleich",
          wert: "Gera",
        },
      ]),
    ).toEqual({ filter: { Stadt: "eq.Gera" }, select: "*" });
  });

  it("findet Kunden über Brillenaufträge (Einbettung mit !inner)", () => {
    expect(
      url([
        {
          feld: { tabelle: "brille", spalte: "BrillenArt", typ: "text" },
          vergleich: "gleich",
          wert: "Sonnenbrille",
        },
        {
          feld: { tabelle: "brille", spalte: "Datum", typ: "datum" },
          vergleich: "groesserGleich",
          wert: "01.01.2025",
        },
      ]),
    ).toEqual({
      filter: {
        "brille.BrillenArt": "eq.Sonnenbrille",
        "brille.Datum": "gte.2025-01-01",
      },
      select: "*,brille!inner(id)",
    });
  });

  it("enthält/beginnt mit sind umlauttolerant, leer prüft auf null", () => {
    expect(
      url([
        {
          feld: { tabelle: "kunde", spalte: "Nachname", typ: "text" },
          vergleich: "beginntMit",
          wert: "Mül",
        },
        {
          feld: { tabelle: "kontaktlinse", spalte: "Notizen", typ: "text" },
          vergleich: "leer",
          wert: "",
        },
      ]),
    ).toEqual({
      filter: {
        Nachname: "imatch.^m(ü|ue)l",
        "kontaktlinse.Notizen": "is.null",
      },
      select: "*,kontaktlinse!inner(id)",
    });
  });

  it("nimmt bei Zeitpunkten mit 'gleich' den ganzen Tag", () => {
    expect(
      url([
        {
          feld: { tabelle: "kunde", spalte: "created_at", typ: "zeitpunkt" },
          vergleich: "gleich",
          wert: "31.12.2025",
        },
      ]).filter,
    ).toEqual({ created_at: ["gte.2025-12-31", "lt.2026-01-01"] });
  });

  it("überspringt unvollständige Bedingungen", () => {
    expect(
      url([
        { feld: null, vergleich: "gleich", wert: "x" },
        {
          feld: { tabelle: "kunde", spalte: "Stadt", typ: "text" },
          vergleich: "gleich",
          wert: " ",
        },
      ]),
    ).toEqual({ filter: {}, select: "*" });
  });
});
