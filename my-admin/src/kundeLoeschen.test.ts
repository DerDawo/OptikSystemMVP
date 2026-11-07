import { describe, expect, it } from "vitest";
import { kundeLoeschSperre } from "./kundeLoeschen";

const leer = {
  brillen: 0,
  kontaktlinsen: 0,
  kassenrezepte: 0,
  fundusberichte: 0,
};

describe("kundeLoeschSperre", () => {
  it("erlaubt das Löschen ohne Belege", () => {
    expect(kundeLoeschSperre(leer)).toBeNull();
  });
  it("sperrt bei Aufträgen und Rezepten und nennt sie", () => {
    const grund = kundeLoeschSperre({ ...leer, brillen: 2, kassenrezepte: 1 });
    expect(grund).toContain("2 Brillenaufträge");
    expect(grund).toContain("1 abgerechnetes Rezept");
  });
  it("sperrt auch bei einem Fundusbericht", () => {
    expect(kundeLoeschSperre({ ...leer, fundusberichte: 1 })).toContain(
      "1 Fundusbericht",
    );
  });
});
