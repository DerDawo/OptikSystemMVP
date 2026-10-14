import { PDFDocument } from "pdf-lib";
import {
  buildExternalMessageUrl,
  openExternalMessage,
  type MessageChannel,
} from "./messaging";

// A4 in PDF-Punkten und bei 96 dpi in Bildschirmpixeln
const A4_PT = { breite: 595.28, hoehe: 841.89 };
const A4_PX_BREITE = 794;

/*
 * Erzeugt aus dem Druck-HTML eines Belegs (Rechnung, Mahnung) eine echte
 * PDF-Datei: das HTML wird unsichtbar in A4-Breite dargestellt, mit
 * html2canvas abfotografiert und seitenweise in ein PDF gelegt (pdf-lib).
 */
// Stellt HTML unsichtbar in der angegebenen Breite dar und fotografiert es
// mit html2canvas ab (doppelte Auflösung). Das iframe wird danach entfernt.
const htmlAlsCanvas = async (
  html: string,
  breitePx: number,
  // nur dieses Element abfotografieren (z. B. die Karte ohne Leerraum)
  auswahl?: string,
): Promise<HTMLCanvasElement> => {
  const rahmen = document.createElement("iframe");
  rahmen.setAttribute("aria-hidden", "true");
  Object.assign(rahmen.style, {
    position: "fixed",
    left: "-10000px",
    top: "0",
    width: `${breitePx}px`,
    height: "1123px",
    border: "0",
  });
  document.body.appendChild(rahmen);
  try {
    await new Promise<void>((fertig) => {
      rahmen.onload = () => fertig();
      rahmen.srcdoc = html;
    });
    const doc = rahmen.contentDocument;
    if (!doc) throw new Error("Beleg konnte nicht dargestellt werden.");
    await Promise.all(
      [...doc.images].map((bild) => bild.decode().catch(() => undefined)),
    );
    const { default: html2canvas } = await import("html2canvas");
    const ziel = auswahl ? doc.querySelector<HTMLElement>(auswahl) : null;
    return await html2canvas(ziel ?? doc.body, {
      scale: 2,
      backgroundColor: "#ffffff",
      windowWidth: breitePx,
      ...(ziel ? {} : { width: breitePx }),
    });
  } finally {
    rahmen.remove();
  }
};

/*
 * Bild (PNG) aus HTML, z. B. der Brillenpass fürs Handy: wird in WhatsApp
 * direkt im Chat angezeigt.
 */
export const htmlAlsBild = async (
  html: string,
  breitePx: number,
  dateiname: string,
  auswahl?: string,
): Promise<File> => {
  const bild = await htmlAlsCanvas(html, breitePx, auswahl);
  const blob = await new Promise<Blob | null>((fertig) =>
    bild.toBlob(fertig, "image/png"),
  );
  if (!blob) throw new Error("Bild konnte nicht erstellt werden.");
  return new File([blob], dateiname, { type: "image/png" });
};

export const belegAlsPdf = async (
  html: string,
  dateiname: string,
): Promise<File> => {
  const bild = await htmlAlsCanvas(html, A4_PX_BREITE);
  const pdf = await PDFDocument.create();
  // Höhe einer A4-Seite im Bildmaßstab; längere Belege werden aufgeteilt
  const seitenHoehe = Math.round((bild.width * A4_PT.hoehe) / A4_PT.breite);
  for (let y = 0; y < bild.height; y += seitenHoehe) {
    const hoehe = Math.min(seitenHoehe, bild.height - y);
    // fast leere Reste (Rundung) keine eigene Seite
    if (hoehe < 20 && y > 0) break;
    const teil = document.createElement("canvas");
    teil.width = bild.width;
    teil.height = seitenHoehe;
    const ctx = teil.getContext("2d");
    if (!ctx) throw new Error("Canvas nicht verfügbar.");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, teil.width, teil.height);
    ctx.drawImage(bild, 0, y, bild.width, hoehe, 0, 0, bild.width, hoehe);
    const jpg = await pdf.embedJpg(teil.toDataURL("image/jpeg", 0.9));
    const seite = pdf.addPage([A4_PT.breite, A4_PT.hoehe]);
    seite.drawImage(jpg, {
      x: 0,
      y: 0,
      width: A4_PT.breite,
      height: A4_PT.hoehe,
    });
  }
  const bytes = await pdf.save();
  return new File([bytes as BlobPart], dateiname, {
    type: "application/pdf",
  });
};

const herunterladen = (datei: File) => {
  const url = URL.createObjectURL(datei);
  const a = document.createElement("a");
  a.href = url;
  a.download = datei.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

// writeText verbraucht die Klick-Berechtigung nicht, das Teilen klappt danach
export const inZwischenablage = async (text: string) => {
  try {
    if (!navigator.clipboard?.writeText) return false;
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

export type VersandErgebnis = "geteilt" | "abgebrochen" | "heruntergeladen";

/*
 * Beleg verschicken: wo der Rechner das Teilen von Dateien kann (Windows,
 * macOS, Handy), öffnet sich das Teilen-Fenster mit angehängtem PDF (dort
 * Mail/Outlook oder WhatsApp wählen). Das Teilen-Fenster kann keinen
 * Empfänger übergeben, deshalb liegt die E-Mail-Adresse des Kunden vorher in
 * der Zwischenablage (in Outlook bei „An" mit Strg+V einfügen;
 * `beiAdresseKopiert` meldet das). Sonst wird das PDF gespeichert und das
 * E-Mail-Programm bzw. WhatsApp mit vorbereitetem Text an den Kunden
 * geöffnet - das PDF dort anhängen.
 */
export const belegVersenden = async (
  kanal: Extract<MessageChannel, "email" | "whatsapp">,
  datei: File,
  nachricht: { an: string; betreff: string; text: string },
  beiAdresseKopiert?: (adresse: string) => void,
): Promise<VersandErgebnis> => {
  const teilbar =
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [datei] });
  if (teilbar) {
    if (kanal === "email" && nachricht.an) {
      const kopiert = await inZwischenablage(nachricht.an);
      if (kopiert) beiAdresseKopiert?.(nachricht.an);
    }
    try {
      await navigator.share({
        files: [datei],
        title: nachricht.betreff,
        text: nachricht.text,
      });
      return "geteilt";
    } catch (fehler) {
      if (fehler instanceof DOMException && fehler.name === "AbortError")
        return "abgebrochen";
      // z. B. NotAllowedError (Klick zu lange her): wie ohne Teilen weiter
    }
  }
  herunterladen(datei);
  openExternalMessage(
    buildExternalMessageUrl(kanal, {
      to: nachricht.an,
      subject: nachricht.betreff,
      message: nachricht.text,
    }),
  );
  return "heruntergeladen";
};
