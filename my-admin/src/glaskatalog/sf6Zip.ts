import JSZip from "jszip";
import { type Sf6SourceFiles } from "./sf6Format";

/** SF6-Dateiname (ohne Pfad/Groß-Kleinschreibung) -> Schlüssel in Sf6SourceFiles. */
const REQUIRED_FILES: Record<string, keyof Sf6SourceFiles> = {
  "head.dat": "head",
  "lenstype.dat": "lensType",
  "lensprice.dat": "lensPrice",
  "options.dat": "options",
  "optionsprice.dat": "optionsPrice",
  "optionscolor.dat": "optionsColor",
  "combination.dat": "combination",
};

/** SF6-.dat-Dateien sind ISO-8859-1-kodiert (siehe sf6Format.ts). */
const decoder = new TextDecoder("iso-8859-1");

/**
 * Liest ein SF6-ZIP-Archiv ein und liefert den Rohtext der für den Import
 * benötigten .dat-Dateien. Wirft einen Fehler mit den fehlenden Dateinamen,
 * falls das Archiv nicht wie erwartet aufgebaut ist.
 */
export async function readSf6Zip(file: Blob): Promise<Sf6SourceFiles> {
  // Über arrayBuffer() statt den Blob direkt an JSZip zu übergeben: JSZips
  // Blob-Erkennung verlässt sich auf FileReader, das es z. B. in Node
  // (Vitest) nicht gibt - Blob.arrayBuffer() funktioniert dagegen überall.
  const zip = await JSZip.loadAsync(await file.arrayBuffer());

  const found: Partial<Record<keyof Sf6SourceFiles, string>> = {};
  for (const entry of Object.values(zip.files)) {
    if (entry.dir) continue;
    const baseName = entry.name.split("/").pop()?.toLowerCase();
    const key = baseName ? REQUIRED_FILES[baseName] : undefined;
    if (!key) continue;
    const bytes = await entry.async("uint8array");
    found[key] = decoder.decode(bytes);
  }

  const missing = Object.values(REQUIRED_FILES).filter(
    (key) => found[key] === undefined,
  );
  if (missing.length > 0) {
    throw new Error(
      `SF6-ZIP unvollständig, es fehlen: ${missing.join(", ")}. Erwartet werden die Standard-SF6-Dateien ${Object.keys(REQUIRED_FILES).join(", ")}.`,
    );
  }

  return found as Sf6SourceFiles;
}
