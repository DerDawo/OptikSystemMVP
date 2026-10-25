import { PDFDocument } from "pdf-lib";
import {
  buildExternalMessageUrl,
  istHandy,
  openExternalMessage,
  type MessageChannel,
} from "./messaging";

// Seitenformate in PDF-Punkten und die Breite bei 96 dpi in Bildschirmpixeln
const SEITENFORMATE = {
  A4: { breite: 595.28, hoehe: 841.89, px: 794 },
  A5: { breite: 419.53, hoehe: 595.28, px: 559 },
};
export type Seitenformat = keyof typeof SEITENFORMATE;

/*
 * Erzeugt aus dem Druck-HTML eines Belegs (Rechnung, Mahnung) eine echte
 * PDF-Datei: das HTML wird unsichtbar in Seitenbreite (A4, Formulare auch
 * A5) dargestellt, mit html2canvas abfotografiert und seitenweise in ein PDF
 * gelegt (pdf-lib).
 */
// Stellt HTML unsichtbar in der angegebenen Breite dar und fotografiert es
// mit html2canvas ab (doppelte Auflösung). Das iframe wird danach entfernt.
const htmlAlsCanvas = async (
  html: string,
  breitePx: number,
  // nur diese Elemente einzeln abfotografieren (z. B. die Karte ohne
  // Leerraum oder jedes Blatt eines A5-Formulars)
  auswahl?: string,
): Promise<HTMLCanvasElement[]> => {
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
    const ziele = auswahl
      ? [...doc.querySelectorAll<HTMLElement>(auswahl)]
      : [];
    if (!ziele.length) {
      return [
        await html2canvas(doc.body, {
          scale: 2,
          backgroundColor: "#ffffff",
          windowWidth: breitePx,
          width: breitePx,
        }),
      ];
    }
    const bilder: HTMLCanvasElement[] = [];
    for (const ziel of ziele) {
      bilder.push(
        await html2canvas(ziel, {
          scale: 2,
          backgroundColor: "#ffffff",
          windowWidth: breitePx,
        }),
      );
    }
    return bilder;
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
  const [bild] = await htmlAlsCanvas(html, breitePx, auswahl);
  const blob = await new Promise<Blob | null>((fertig) =>
    bild.toBlob(fertig, "image/png"),
  );
  if (!blob) throw new Error("Bild konnte nicht erstellt werden.");
  return new File([blob], dateiname, { type: "image/png" });
};

// Langes Bild in Seiten der angegebenen Höhe aufteilen
const inSeitenAufteilen = (
  bild: HTMLCanvasElement,
  format: (typeof SEITENFORMATE)[Seitenformat],
): HTMLCanvasElement[] => {
  const seiten: HTMLCanvasElement[] = [];
  const seitenHoehe = Math.round((bild.width * format.hoehe) / format.breite);
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
    seiten.push(teil);
  }
  return seiten;
};

export const belegAlsPdf = async (
  html: string,
  dateiname: string,
  // Formulare mit festen Blättern (Auftragszettel in A5): jedes Element zum
  // CSS-Selektor `blatt` wird eine eigene Seite
  formatName: Seitenformat = "A4",
  blatt?: string,
): Promise<File> => {
  const format = SEITENFORMATE[formatName];
  const bilder = await htmlAlsCanvas(html, format.px, blatt);
  // ein Blatt ergibt genau eine Seite, das ganze Dokument wird aufgeteilt
  const seiten = bilder.flatMap((bild) => inSeitenAufteilen(bild, format));
  const pdf = await PDFDocument.create();
  for (const teil of seiten) {
    const jpg = await pdf.embedJpg(teil.toDataURL("image/jpeg", 0.9));
    const seite = pdf.addPage([format.breite, format.hoehe]);
    seite.drawImage(jpg, {
      x: 0,
      y: 0,
      width: format.breite,
      height: format.hoehe,
    });
  }
  const bytes = await pdf.save();
  return new File([bytes as BlobPart], dateiname, {
    type: "application/pdf",
  });
};

export const herunterladen = (datei: File) => {
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
 * Beleg verschicken: am Handy/iPad öffnet sich das Teilen-Fenster mit
 * angehängtem PDF (dort Mail-App oder WhatsApp wählen). Das Teilen-Fenster
 * kann keinen Empfänger übergeben, deshalb liegt die E-Mail-Adresse des
 * Kunden vorher in der Zwischenablage (`beiAdresseKopiert` meldet das). Am
 * Computer wird das PDF gespeichert und gleich Gmail mit Empfänger, Betreff
 * und Text bzw. der WhatsApp-Chat des Kunden geöffnet - das PDF dort
 * hineinziehen.
 */
export const belegVersenden = async (
  kanal: Extract<MessageChannel, "email" | "whatsapp">,
  datei: File,
  nachricht: { an: string; betreff: string; text: string },
  beiAdresseKopiert?: (adresse: string) => void,
): Promise<VersandErgebnis> => {
  // Am Computer bietet das Teilen-Menü weder Gmail noch WhatsApp an (die
  // Mac-App von WhatsApp fehlt dort), daher gleich Gmail bzw. den Chat des
  // Kunden öffnen und die Datei speichern. Am Handy/iPad bleibt das
  // Teilen-Menü, dort lassen sich Mail-App und WhatsApp samt Anhang wählen.
  const teilbar =
    istHandy() &&
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
  // Chrome blockiert den automatischen Download gern: das PDF zusätzlich in
  // einem eigenen Tab öffnen, von dort lässt es sich speichern (Tab bleibt
  // offen, Gmail/WhatsApp kommt danach in den Vordergrund)
  try {
    const pdfUrl = URL.createObjectURL(datei);
    window.open(pdfUrl, "unicorn-pdf");
    window.setTimeout(() => URL.revokeObjectURL(pdfUrl), 10 * 60_000);
  } catch {
    // Pop-up blockiert: dann bleibt der Download
  }
  openExternalMessage(
    buildExternalMessageUrl(kanal, {
      to: nachricht.an,
      subject: nachricht.betreff,
      message: nachricht.text,
    }),
  );
  return "heruntergeladen";
};
