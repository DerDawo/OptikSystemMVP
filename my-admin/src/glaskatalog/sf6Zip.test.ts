import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readSf6Zip } from "./sf6Zip";
import { parseSf6Katalog } from "./sf6Format";

const FIXTURE_PATH = join(__dirname, "__fixtures__", "sf6-beispielkatalog.zip");

describe("readSf6Zip + parseSf6Katalog (End-zu-End mit Beispiel-ZIP)", () => {
  it("liest ein vollständiges SF6-ZIP-Beispielarchiv und liefert den erwarteten Katalog", async () => {
    const bytes = readFileSync(FIXTURE_PATH);
    const files = await readSf6Zip(new Blob([bytes]));
    const katalog = parseSf6Katalog(files);

    expect(katalog.hersteller).toEqual({ code: "TST", name: "Testglas GmbH" });
    expect(katalog.produkte.map((p) => p.esdCode)).toEqual([
      "3Z50TB",
      "3Z60TB",
      "ACT50P",
    ]);
    expect(katalog.produkte[0].brechungsindex).toBe(1.5);
    expect(katalog.basispreise.get("3Z50TB")).toBe(25);
    expect(katalog.optionen.map((o) => o.code)).toEqual(["009", "A01", "120"]);
    expect(katalog.optionen.find((o) => o.code === "120")?.typ).toBe("farbe");
    expect(katalog.optionen.find((o) => o.code === "009")?.typ).toBe(
      "beschichtung",
    );
    expect(katalog.verfuegbareOptionen.get("3Z50TB")).toEqual(
      new Set(["009", "A01", "120"]),
    );
    expect(katalog.verfuegbareOptionen.get("ACT50P")).toEqual(
      new Set(["009", "A01"]),
    );
  });

  it("meldet fehlende Pflichtdateien mit Klarnamen", async () => {
    const JSZip = (await import("jszip")).default;
    const incompleteZip = new JSZip();
    incompleteZip.file("Head.dat", "manufacturer-code TST");
    const buffer = await incompleteZip.generateAsync({ type: "uint8array" });

    await expect(readSf6Zip(new Blob([buffer]))).rejects.toThrow(
      /lensType|lensPrice/,
    );
  });
});
