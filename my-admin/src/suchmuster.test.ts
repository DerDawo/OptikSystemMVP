import { describe, expect, it } from "vitest";
import { namensSuchmuster } from "./suchmuster";

const trifft = (eingabe: string, name: string) =>
  new RegExp(namensSuchmuster(eingabe), "i").test(name);

describe("namensSuchmuster", () => {
  it("behandelt ü/ue, ö/oe, ä/ae und ß/ss gleich", () => {
    expect(namensSuchmuster("Müller")).toBe("m(ü|ue)ller");
    expect(trifft("müller", "Mueller")).toBe(true);
    expect(trifft("mueller", "Müller")).toBe(true);
    expect(trifft("weiss", "Weiß")).toBe(true);
    expect(trifft("koehler", "Köhler")).toBe(true);
    expect(trifft("jäger", "Jaeger")).toBe(true);
  });

  it("findet Teiltreffer und mehrere Wörter", () => {
    expect(trifft("müll", "Müller-Lüdenscheidt")).toBe(true);
    expect(trifft("von heide", "von der Heide")).toBe(true);
    expect(trifft("müller", "Schulz")).toBe(false);
  });

  it("entschärft Sonderzeichen", () => {
    expect(namensSuchmuster("a.b")).toBe("a\\.b");
    expect(trifft("a.b", "axb")).toBe(false);
  });
});
