import { describe, expect, it } from "vitest";
import {
  AUGE,
  NETZHAUT_X,
  THEMEN,
  aufNetzhaut,
  strahlengang,
  unschaerfekreis,
} from "./beratungsbilder";

const zustand = (thema: string, id: string) =>
  THEMEN.find((t) => t.id === thema)!.zustaende.find((z) => z.id === id)!;

describe("aufNetzhaut", () => {
  it("liegt auf dem Augapfel", () => {
    const [x, y] = aufNetzhaut([412, 150], [600, 200]);
    expect(Math.hypot(x - AUGE.cx, y - AUGE.cy)).toBeCloseTo(AUGE.r, 5);
    expect(x).toBeGreaterThan(AUGE.cx);
  });
});

describe("strahlengang", () => {
  it("normal und korrigiert: alle Strahlen treffen sich auf der Netzhaut", () => {
    for (const [thema, id] of [
      ["normal", "ohne"],
      ["kurzsichtig", "brille"],
      ["kurzsichtig", "kontaktlinse"],
      ["weitsichtig", "brille"],
      ["astigmatismus", "brille"],
      ["alterssichtig", "jung"],
      ["alterssichtig", "lesebrille"],
    ]) {
      const strahlen = strahlengang(zustand(thema, id).szenario);
      expect(unschaerfekreis(strahlen)).toBe(0);
      strahlen.forEach((s) => {
        expect(s.punkte[s.punkte.length - 1]).toEqual([NETZHAUT_X, AUGE.cy]);
        expect(s.gedacht).toBeUndefined();
      });
    }
  });

  it("kurzsichtig: Strahlen kreuzen sich vor der Netzhaut", () => {
    const strahlen = strahlengang(zustand("kurzsichtig", "ohne").szenario);
    expect(unschaerfekreis(strahlen)).toBeGreaterThan(10);
    expect(strahlen[0].punkte).toContainEqual([590, 200]);
    // oberer Strahl landet unten
    expect(strahlen[0].punkte[0][1]).toBeLessThan(200);
    expect(strahlen[0].punkte.at(-1)![1]).toBeGreaterThan(200);
  });

  it("weitsichtig: gedachter Brennpunkt hinter der Netzhaut", () => {
    const strahlen = strahlengang(zustand("weitsichtig", "ohne").szenario);
    expect(unschaerfekreis(strahlen)).toBeGreaterThan(10);
    expect(strahlen[0].gedacht?.[1]).toEqual([770, 200]);
  });

  it("Hornhautverkrümmung: zwei Strahlenbündel", () => {
    const strahlen = strahlengang(zustand("astigmatismus", "ohne").szenario);
    expect(strahlen.filter((s) => s.zweite)).toHaveLength(4);
    expect(strahlen.filter((s) => !s.zweite)).toHaveLength(4);
  });

  it("Brille steht vor dem Auge, Kontaktlinse auf der Hornhaut", () => {
    const brille = strahlengang(zustand("kurzsichtig", "brille").szenario);
    const linse = strahlengang(zustand("kurzsichtig", "kontaktlinse").szenario);
    expect(brille[0].punkte[1][0]).toBe(250);
    expect(linse[0].punkte[1][0]).toBe(346);
  });
});

describe("THEMEN", () => {
  it("hat eindeutige Kennungen und Texte", () => {
    const ids = THEMEN.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    THEMEN.forEach((t) => expect(t.text.length).toBeGreaterThan(0));
  });
});
