// Text eines PDFs im Browser auslesen (pdf.js). Wird nur beim Einlesen der
// OPTICA-Unterlagen nachgeladen, damit pdf.js nicht im Hauptpaket landet.
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { type PdfTextStueck, zeilenAusStuecken } from "./pdfZeilen";

GlobalWorkerOptions.workerSrc = workerUrl;

/** Alle Textzeilen eines PDFs, Seite für Seite (Spalten durch Tabulator getrennt). */
export const pdfTextZeilen = async (daten: ArrayBuffer): Promise<string[]> => {
  const doc = await getDocument({ data: new Uint8Array(daten) }).promise;
  try {
    const zeilen: string[] = [];
    for (let seite = 1; seite <= doc.numPages; seite++) {
      const inhalt = await (await doc.getPage(seite)).getTextContent();
      zeilen.push(
        ...zeilenAusStuecken(
          inhalt.items.filter(
            (it): it is PdfTextStueck & typeof it => "str" in it,
          ) as PdfTextStueck[],
        ),
      );
    }
    return zeilen;
  } finally {
    await doc.destroy();
  }
};
