import { describe, expect, it } from "vitest";
import dayjs from "dayjs";
import {
  anzahlFaellig,
  faelligkeit,
  sortiereErinnerungen,
} from "./erinnerungen";

const heute = dayjs("2026-10-21");

describe("sortiereErinnerungen", () => {
  it("überfällig zuerst, dann ohne Datum, dann künftig", () => {
    const sortiert = sortiereErinnerungen(
      [
        { id: 1, Text: "künftig", Faellig: "2026-10-30" },
        { id: 2, Text: "ohne", created_at: "2026-10-20T08:00:00Z" },
        { id: 3, Text: "heute", Faellig: "2026-10-21" },
        { id: 4, Text: "alt", Faellig: "2026-10-01" },
        { id: 5, Text: "ohne früher", created_at: "2026-10-19T08:00:00Z" },
      ],
      heute,
    );
    expect(sortiert.map((e) => e.id)).toEqual([4, 3, 5, 2, 1]);
  });
});

describe("faelligkeit", () => {
  it("Texte je nach Abstand zu heute", () => {
    expect(faelligkeit(null, heute)).toBeNull();
    expect(faelligkeit("2026-10-20", heute)).toEqual({
      text: "seit 20.10.2026 fällig",
      ueberfaellig: true,
    });
    expect(faelligkeit("2026-10-21", heute)?.text).toBe("heute fällig");
    expect(faelligkeit("2026-10-22", heute)?.text).toBe("morgen fällig");
    expect(faelligkeit("2026-11-02", heute)?.text).toBe("fällig am 02.11.2026");
  });
});

describe("anzahlFaellig", () => {
  it("zählt ohne Datum und bis heute fällige, nicht künftige", () => {
    expect(
      anzahlFaellig(
        [
          { id: 1, Text: "a" },
          { id: 2, Text: "b", Faellig: "2026-10-21" },
          { id: 3, Text: "c", Faellig: "2026-10-22" },
        ],
        heute,
      ),
    ).toBe(2);
  });
});
