import { describe, expect, it } from "vitest";
import { aenderungsZeilen, bereichName } from "./protokoll";
import {
  BERECHTIGUNG_FEHLT,
  istBerechtigungsFehler,
  uebersetzeFehler,
} from "./rolleFehler";

describe("aenderungsZeilen", () => {
  it("zeigt bei Änderungen alt und neu je Feld", () => {
    expect(
      aenderungsZeilen({
        aktion: "geändert",
        alt: { Sph: -1.25, Bemerkung: null },
        neu: { Sph: -1.5, Bemerkung: "neu" },
      }),
    ).toEqual(["Sph: -1,25 → -1,5", "Bemerkung: leer → „neu“"]);
  });
  it("zeigt bei Anlage und Löschung die gefüllten Felder", () => {
    expect(
      aenderungsZeilen({
        aktion: "gelöscht",
        alt: {
          id: 7,
          Vorname: "Max",
          Telefon: null,
          created_at: "x",
          Werbung: true,
        },
      }),
    ).toEqual(["id: 7", "Vorname: „Max“", "Werbung: ja"]);
  });
  it("kürzt lange Texte", () => {
    const [zeile] = aenderungsZeilen({
      aktion: "angelegt",
      neu: { Notiz: "x".repeat(200) },
    });
    expect(zeile.length).toBeLessThan(100);
  });
  it("benennt Bereiche auf Deutsch", () => {
    expect(bereichName("glass")).toBe("Glaswerte");
    expect(bereichName("unbekannt")).toBe("unbekannt");
  });
});

describe("Berechtigungsfehler", () => {
  it("erkennt abgelehnte Zugriffe der Datenbank", () => {
    expect(
      istBerechtigungsFehler("create", {
        message: 'new row violates row-level security policy for table "glass"',
      }),
    ).toBe(true);
    expect(
      istBerechtigungsFehler("update", {
        message: "JSON object requested, multiple (or no) rows returned",
        body: { code: "PGRST116" },
      }),
    ).toBe(true);
  });
  it("lässt andere Fehler unverändert", () => {
    // "nicht gefunden" beim Lesen ist kein Rechteproblem
    expect(
      istBerechtigungsFehler("getOne", { body: { code: "PGRST116" } }),
    ).toBe(false);
    const f = new Error("Netzwerkfehler");
    expect(uebersetzeFehler("update", f)).toBe(f);
  });
  it("übersetzt in eine verständliche Meldung", () => {
    const f = uebersetzeFehler("delete", {
      message: "permission denied for table kunde",
    });
    expect((f as Error).message).toBe(BERECHTIGUNG_FEHLT);
  });
});
