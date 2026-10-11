import { beforeEach, describe, expect, it } from "vitest";
import {
  merkeSeite,
  setzeVerlaufZurueck,
  zurueckNachSpeichern,
  zurueckZiel,
} from "./seitenVerlauf";

const besuche = (...seiten: string[]) => seiten.forEach(merkeSeite);

describe("seitenVerlauf", () => {
  beforeEach(setzeVerlaufZurueck);

  it("Zurück führt genau zum letzten Bild", () => {
    besuche("/kunde", "/kunde/5/show", "/brille/9/show");
    expect(zurueckZiel()).toBe("/kunde/5/show");
    expect(zurueckZiel()).toBe("/kunde");
  });

  it("Speichern führt zur Seite vor dem Formular", () => {
    besuche("/brille/9/show", "/kunde/5");
    expect(zurueckNachSpeichern("kunde", 5)).toBe("/brille/9/show");
  });

  it("nach dem Speichern überspringt Zurück das verlassene Formular", () => {
    besuche("/brille/9/show", "/kunde/5/show", "/kunde/5");
    const ziel = zurueckNachSpeichern("kunde", 5);
    expect(ziel).toBe("/kunde/5/show");
    besuche(ziel);
    expect(zurueckZiel()).toBe("/brille/9/show");
  });

  it("ohne Verlauf: Ansicht bzw. kein Ziel", () => {
    besuche("/kunde/5");
    expect(zurueckNachSpeichern("kunde", 5)).toBe("/kunde/5/show");
    expect(zurueckZiel()).toBeNull();
  });
});
