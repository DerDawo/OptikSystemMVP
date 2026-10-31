// Druck ohne Vorschau (Werkstattauftrag, Kontaktlinsenauftrag): ein
// unsichtbarer Rahmen nimmt das Druck-HTML auf und öffnet sofort den
// Druckdialog des Browsers - ohne zusätzliches Fenster, daher auch ohne
// Pop-up-Freigabe
export const druckeDirekt = (html: string) => {
  document
    .querySelectorAll("iframe[data-direktdruck]")
    .forEach((alt) => alt.remove());
  const rahmen = document.createElement("iframe");
  rahmen.dataset.direktdruck = "";
  rahmen.setAttribute("aria-hidden", "true");
  rahmen.style.cssText =
    "position:fixed;left:-10000px;top:0;width:210mm;height:297mm;border:0;";
  rahmen.onload = () => {
    const fenster = rahmen.contentWindow;
    if (!fenster || fenster.location.href !== "about:srcdoc") return;
    fenster.addEventListener("afterprint", () =>
      setTimeout(() => rahmen.remove(), 1000),
    );
    fenster.focus();
    fenster.print();
  };
  rahmen.srcdoc = html;
  document.body.appendChild(rahmen);
};
