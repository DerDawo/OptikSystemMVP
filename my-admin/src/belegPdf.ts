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
export const belegAlsPdf = async (
  html: string,
  dateiname: string,
): Promise<File> => {
  const rahmen = document.createElement("iframe");
  rahmen.setAttribute("aria-hidden", "true");
  Object.assign(rahmen.style, {
    position: "fixed",
    left: "-10000px",
    top: "0",
    width: `${A4_PX_BREITE}px`,
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
    const bild = await html2canvas(doc.body, {
      scale: 2,
      backgroundColor: "#ffffff",
      windowWidth: A4_PX_BREITE,
      width: A4_PX_BREITE,
    });

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
  } finally {
    rahmen.remove();
  }
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

export type VersandErgebnis = "geteilt" | "abgebrochen" | "heruntergeladen";

/*
 * Beleg verschicken: wo der Rechner das Teilen von Dateien kann (Windows,
 * macOS, Handy), öffnet sich das Teilen-Fenster mit angehängtem PDF (dort
 * Mail/Outlook oder WhatsApp wählen). Sonst wird das PDF gespeichert und das
 * E-Mail-Programm bzw. WhatsApp mit vorbereitetem Text an den Kunden
 * geöffnet - das PDF dort anhängen.
 */
export const belegVersenden = async (
  kanal: Extract<MessageChannel, "email" | "whatsapp">,
  datei: File,
  nachricht: { an: string; betreff: string; text: string },
): Promise<VersandErgebnis> => {
  const teilbar =
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [datei] });
  if (teilbar) {
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
