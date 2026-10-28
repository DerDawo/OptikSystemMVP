// Dokumente in der Kundenkartei (Tabelle kunde_dokument, privater Bucket
// kunde-dokumente): Hilfsfunktionen ohne React, damit sie sich testen lassen.

export const DOKUMENT_BUCKET = "kunde-dokumente";

export const DOKUMENT_ARTEN = [
  "Befund",
  "Fundusaufnahme",
  "Rezept",
  "Arztbrief",
  "Kostenzusage",
  "Formular",
  "Sonstiges",
] as const;

export type DokumentArt = (typeof DOKUMENT_ARTEN)[number];

export const ERLAUBTE_TYPEN = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

export const MAX_DATEI_BYTES = 25 * 1024 * 1024;
export const MAX_BILD_KANTE = 2000;

/** Vorschlag für die Art aus dem Dateinamen, z. B. "Fundus_rechts.jpg". */
export const schlageArtVor = (dateiname: string): DokumentArt => {
  const n = dateiname.toLowerCase();
  if (/fundus|netzhaut|retina|papille|makula|oct\b/.test(n))
    return "Fundusaufnahme";
  if (/befund|gesichtsfeld|perimetrie|topograph|tonometrie/.test(n))
    return "Befund";
  if (/rezept|verordnung/.test(n)) return "Rezept";
  if (/arztbrief|arzt-brief|entlassbrief/.test(n)) return "Arztbrief";
  if (/kostenzusage|kosten[uü]bernahme|genehmigung|zusage/.test(n))
    return "Kostenzusage";
  if (/formular|gutachten|antrag/.test(n)) return "Formular";
  return "Sonstiges";
};

/** Fehlertext, wenn die Datei nicht abgelegt werden darf, sonst null. */
export const pruefeDatei = (datei: {
  name: string;
  type: string;
  size: number;
}): string | null => {
  if (!ERLAUBTE_TYPEN.includes(datei.type)) {
    return `${datei.name}: Nur PDF und Bilder (JPG, PNG, WebP) sind erlaubt.`;
  }
  if (datei.size > MAX_DATEI_BYTES) {
    return `${datei.name}: Datei ist größer als 25 MB.`;
  }
  if (datei.size === 0) {
    return `${datei.name}: Datei ist leer.`;
  }
  return null;
};

/** Dateiname ohne Umlaute und Sonderzeichen, für den Objektnamen im Bucket. */
export const sichererDateiname = (voll: string): string => {
  // nur der Dateiname, nie Ordneranteile wie "../"
  const name = voll.split(/[\\/]/).pop() ?? "";
  const punkt = name.lastIndexOf(".");
  const stamm = punkt > 0 ? name.slice(0, punkt) : name;
  const endung = punkt > 0 ? name.slice(punkt + 1) : "";
  const bereinigt = (wert: string) =>
    wert
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/ß/g, "ss")
      .replace(/[^A-Za-z0-9._-]+/g, "_")
      .replace(/^[._-]+|[._-]+$/g, "");
  const s = bereinigt(stamm).slice(0, 80) || "dokument";
  const e = bereinigt(endung).slice(0, 8).toLowerCase();
  return e ? `${s}.${e}` : s;
};

/** Objektname im Bucket: <kunde_id>/<zufall>-<dateiname>. */
export const speicherPfad = (
  kundeId: number | string,
  dateiname: string,
  zufall: string = crypto.randomUUID(),
): string => `${kundeId}/${zufall}-${sichererDateiname(dateiname)}`;

/** Zielgröße beim Verkleinern: längste Kante höchstens `max`. */
export const zielGroesse = (
  breite: number,
  hoehe: number,
  max: number = MAX_BILD_KANTE,
): { breite: number; hoehe: number } => {
  const laengste = Math.max(breite, hoehe);
  if (laengste <= max) return { breite, hoehe };
  const faktor = max / laengste;
  return {
    breite: Math.max(1, Math.round(breite * faktor)),
    hoehe: Math.max(1, Math.round(hoehe * faktor)),
  };
};

export const formatGroesse = (bytes: number | null | undefined): string => {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
};

/**
 * Bilder werden auf höchstens 2000 px Kantenlänge verkleinert und als JPEG
 * gespeichert (Fotos von Befunden und Fundus müssen nicht im Original
 * liegen). PDFs und Bilder, die schon klein sind, bleiben unverändert.
 * Die verkleinerte Fassung wird nur genommen, wenn sie wirklich kleiner ist.
 */
export const bildVerkleinern = async (datei: File): Promise<File> => {
  if (!datei.type.startsWith("image/")) return datei;
  try {
    const bitmap = await createImageBitmap(datei, {
      imageOrientation: "from-image",
    });
    const { breite, hoehe } = zielGroesse(bitmap.width, bitmap.height);
    const verkleinert = breite !== bitmap.width || hoehe !== bitmap.height;
    if (!verkleinert && datei.type === "image/jpeg") {
      bitmap.close();
      return datei;
    }
    const canvas = document.createElement("canvas");
    canvas.width = breite;
    canvas.height = hoehe;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return datei;
    }
    // weißer Hintergrund, falls PNG/WebP Transparenz haben
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, breite, hoehe);
    ctx.drawImage(bitmap, 0, 0, breite, hoehe);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.85),
    );
    if (!blob || (blob.size >= datei.size && !verkleinert)) return datei;
    const stamm = datei.name.replace(/\.[^.]+$/, "") || "bild";
    return new File([blob], `${stamm}.jpg`, {
      type: "image/jpeg",
      lastModified: datei.lastModified,
    });
  } catch {
    // Bild nicht lesbar (z. B. beschädigt): Original ablegen
    return datei;
  }
};
