// Druckfenster für Belege und Formulare: ein eigenes Fenster mit dem
// Druck-HTML, dessen Druckdialog der Nutzer an einen Drucker schickt oder
// als PDF speichert.
//
// Gedruckt wird erst, wenn alle Bilder (Logo, QR-Code der Google-Bewertung)
// dekodiert sind: Direkt nach document.write() sind eingebettete Bilder je
// nach Browser (z. B. Safari) oder Auslastung noch nicht fertig, und der
// Druck zeigt an ihrer Stelle nur leere Kästen.

// Wartet auf alle Bilder des Dokuments; fehlerhafte Bilder halten nicht auf
export const bilderGeladen = async (doc: Document): Promise<void> => {
  await Promise.all(
    Array.from(doc.images, (bild) => bild.decode().catch(() => undefined)),
  );
};

export const druckenWennBilderGeladen = async (fenster: Window) => {
  await bilderGeladen(fenster.document);
  fenster.print();
};

// Öffnet das Druckfenster, mit `drucken` danach den Druckdialog. false, wenn
// der Browser das Fenster blockiert (Pop-up-Sperre).
export const druckfensterOeffnen = (
  html: string,
  drucken: boolean,
): boolean => {
  const fenster = window.open("", "_blank", "width=850,height=1100");
  if (!fenster) return false;
  fenster.document.open();
  fenster.document.write(html);
  fenster.document.close();
  fenster.focus();
  if (drucken) void druckenWennBilderGeladen(fenster);
  return true;
};
