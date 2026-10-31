// Fundusbericht: strukturierte Dokumentation echter Fundusaufnahmen als PDF
// (pdf-lib). Die Bilder werden unverändert eingebettet, die Befunde trägt der
// Untersucher ein. Ohne React, damit es sich testen lässt.
import type { PDFFont, PDFImage, PDFPage, RGB } from "pdf-lib";
import { fuerPdfSchrift } from "./pdfFormulare";

export type Auge = "OS" | "OD";
export const AUGEN: { id: Auge; name: string }[] = [
  { id: "OS", name: "Linkes Auge (OS)" },
  { id: "OD", name: "Rechtes Auge (OD)" },
];

export const BEREICHE = [
  {
    id: "papille",
    name: "Papille",
    hilfe: "Form, Farbe, Begrenzung, Exkavation",
  },
  { id: "makula", name: "Makula", hilfe: "Erscheinungsbild, Pigmentierung" },
  {
    id: "gefaesse",
    name: "Gefäßsystem",
    hilfe: "Arterien, Venen, Kaliber, Verlauf",
  },
  {
    id: "netzhaut",
    name: "Netzhaut",
    hilfe: "Hintergrund, Blutungen, Exsudate, Drusen",
  },
] as const;
export type BereichId = (typeof BEREICHE)[number]["id"];

export const STATUS = {
  unauffaellig: { name: "Unauffällig", farbe: [0.13, 0.55, 0.36] },
  kontrolle: { name: "Kontrollbedarf", farbe: [0.8, 0.58, 0.05] },
  abklaerung: { name: "Abklärung empfohlen", farbe: [0.75, 0.2, 0.18] },
  nicht_beurteilbar: { name: "Nicht beurteilbar", farbe: [0.5, 0.53, 0.57] },
} as const;
export type Status = keyof typeof STATUS;

export const BILDQUALITAET = [
  "gut",
  "eingeschränkt",
  "nicht ausreichend",
] as const;
export type Bildqualitaet = (typeof BILDQUALITAET)[number];

export type Bereichsbefund = { status: Status | ""; text: string };
export type Augenbefund = {
  qualitaet: Bildqualitaet | "";
  bereiche: Record<BereichId, Bereichsbefund>;
};
export type Bild = { bytes: Uint8Array; typ: string; name?: string };

export type FundusberichtDaten = {
  praxis: { firma: string; marke: string; adresse: string };
  patientennummer: string;
  patient: string;
  geburtsdatum: string;
  untersuchung: string;
  untersucher: string;
  methode: string;
  geraet: string;
  bilder: Partial<Record<Auge, Bild>>;
  befund: Record<Auge, Augenbefund>;
  seitenvergleich: string;
  gesamtbeurteilung: string;
  empfehlung: string;
};

export const leererAugenbefund = (): Augenbefund => ({
  qualitaet: "",
  bereiche: {
    papille: { status: "", text: "" },
    makula: { status: "", text: "" },
    gefaesse: { status: "", text: "" },
    netzhaut: { status: "", text: "" },
  },
});

/** Seite aus dem Dateinamen, z. B. "Fundus_rechts.jpg" oder "2026_OS.png". */
export const erkenneAuge = (dateiname: string): Auge | null => {
  const n = dateiname.toLowerCase().replace(/\.[^.]+$/, "");
  const wort = (muster: string) =>
    new RegExp(`(^|[^a-zäöüß])(${muster})([^a-zäöüß]|$)`).test(n);
  const rechts = wort("od|rechts|rechtes|re|right");
  const links = wort("os|links|linkes|li|left");
  if (rechts === links) return null;
  return rechts ? "OD" : "OS";
};

/** Kritischster Status eines Berichts, für Archiv und Verlauf. */
export const schlechtesterStatus = (
  befund: Record<Auge, Augenbefund>,
): Status | "" => {
  const alle = AUGEN.flatMap(({ id }) =>
    BEREICHE.map((b) => befund[id]?.bereiche?.[b.id]?.status ?? ""),
  );
  return (
    (
      ["abklaerung", "kontrolle", "nicht_beurteilbar", "unauffaellig"] as const
    ).find((s) => alle.includes(s)) ?? ""
  );
};

/** Was vor der Freigabe noch fehlt; leer = Bericht kann erstellt werden. */
export const fehlendeAngaben = (
  augen: Auge[],
  befund: Record<Auge, Augenbefund>,
  untersucher: string,
  geprueft: boolean,
): string[] => {
  const fehlt: string[] = [];
  if (augen.length === 0) fehlt.push("mindestens eine Fundusaufnahme");
  augen.forEach((auge) => {
    if (!befund[auge].qualitaet) fehlt.push(`Bildqualität ${auge}`);
    BEREICHE.forEach(({ id, name }) => {
      if (!befund[auge].bereiche[id].status) fehlt.push(`${name} ${auge}`);
    });
  });
  if (!untersucher.trim()) fehlt.push("Untersucher");
  if (!geprueft) fehlt.push("Bestätigung der Prüfung");
  return fehlt;
};

const BREITE = 595.28;
const HOEHE = 841.89;
const RAND = 40;
const INHALT = BREITE - 2 * RAND;
const UNTEN = 62;

const pfadGerundet = (b: number, h: number, r: number) =>
  `M ${r} 0 H ${b - r} Q ${b} 0 ${b} ${r} V ${h - r} Q ${b} ${h} ${b - r} ${h} H ${r} Q 0 ${h} 0 ${h - r} V ${r} Q 0 0 ${r} 0 Z`;

const umbrechen = (
  text: string,
  font: PDFFont,
  groesse: number,
  breite: number,
) => {
  const zeilen: string[] = [];
  text.split("\n").forEach((absatz) => {
    let zeile = "";
    fuerPdfSchrift(absatz)
      .split(" ")
      .forEach((wort) => {
        const probe = zeile ? `${zeile} ${wort}` : wort;
        if (font.widthOfTextAtSize(probe, groesse) <= breite || !zeile) {
          zeile = probe;
        } else {
          zeilen.push(zeile);
          zeile = wort;
        }
      });
    zeilen.push(zeile);
  });
  return zeilen;
};

const oder = (wert: string) => wert.trim() || "Nicht angegeben";

/** Erzeugt den fertigen Bericht als PDF-Datei. */
export const erstelleFundusberichtPdf = async (
  d: FundusberichtDaten,
): Promise<Uint8Array> => {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const doc = await PDFDocument.create();
  doc.setTitle(fuerPdfSchrift(`Fundusbericht ${d.patient}`));
  doc.setCreator("UNICORN");
  const normal = await doc.embedFont(StandardFonts.Helvetica);
  const fett = await doc.embedFont(StandardFonts.HelveticaBold);

  const NAVY = rgb(0.06, 0.16, 0.3);
  const ANTHRAZIT = rgb(0.2, 0.23, 0.27);
  const GRAU = rgb(0.45, 0.49, 0.54);
  const LINIE = rgb(0.86, 0.89, 0.92);
  const FLAECHE = rgb(0.96, 0.97, 0.98);
  const TUERKIS = rgb(0.05, 0.6, 0.6);
  const WEISS = rgb(1, 1, 1);
  const statusFarbe = (s: Status) => {
    const [r, g, b] = STATUS[s].farbe;
    return rgb(r, g, b);
  };

  let seite: PDFPage = doc.addPage([BREITE, HOEHE]);
  let y = HOEHE;

  const text = (
    wert: string,
    x: number,
    yPos: number,
    groesse = 9,
    font: PDFFont = normal,
    color: RGB = ANTHRAZIT,
  ) =>
    seite.drawText(fuerPdfSchrift(wert), {
      x,
      y: yPos,
      size: groesse,
      font,
      color,
    });

  const karte = (x: number, oben: number, b: number, h: number) =>
    seite.drawSvgPath(pfadGerundet(b, h, 7), {
      x,
      y: oben,
      color: FLAECHE,
      borderColor: LINIE,
      borderWidth: 0.6,
    });

  const pille = (s: Status | "", x: number, yPos: number) => {
    const name = s ? STATUS[s].name : "Keine Aufnahme";
    const farbe = s ? statusFarbe(s) : GRAU;
    seite.drawCircle({ x: x + 4, y: yPos + 3, size: 3.5, color: farbe });
    text(name, x + 12, yPos, 8.5, fett, farbe);
  };

  const neueSeite = () => {
    seite = doc.addPage([BREITE, HOEHE]);
    text("Fundusbericht", RAND, HOEHE - 34, 10, fett, NAVY);
    const rechts = fuerPdfSchrift(`${d.patient} · ${d.patientennummer}`);
    text(
      rechts,
      BREITE - RAND - normal.widthOfTextAtSize(rechts, 8.5),
      HOEHE - 34,
      8.5,
      normal,
      GRAU,
    );
    seite.drawLine({
      start: { x: RAND, y: HOEHE - 42 },
      end: { x: BREITE - RAND, y: HOEHE - 42 },
      thickness: 1,
      color: TUERKIS,
    });
    y = HOEHE - 64;
  };
  const platz = (hoehe: number) => {
    if (y - hoehe < UNTEN) neueSeite();
  };

  const absatz = (wert: string, x = RAND, breite = INHALT) => {
    umbrechen(oder(wert), normal, 9.5, breite).forEach((zeile) => {
      platz(14);
      text(zeile, x, y, 9.5);
      y -= 13.5;
    });
  };

  const abschnitt = (titel: string) => {
    platz(44);
    text(titel.toUpperCase(), RAND, y, 9.5, fett, NAVY);
    y -= 7;
    seite.drawLine({
      start: { x: RAND, y },
      end: { x: BREITE - RAND, y },
      thickness: 0.6,
      color: LINIE,
    });
    y -= 15;
  };

  // Seite 1: Kopf
  seite.drawRectangle({
    x: 0,
    y: HOEHE - 82,
    width: BREITE,
    height: 82,
    color: NAVY,
  });
  seite.drawRectangle({
    x: 0,
    y: HOEHE - 85,
    width: BREITE,
    height: 3,
    color: TUERKIS,
  });
  text("OPHTHALMOLOGISCHER FUNDUSBERICHT", RAND, HOEHE - 42, 15, fett, WEISS);
  text(
    "Bildgestützte Dokumentation",
    RAND,
    HOEHE - 59,
    9.5,
    normal,
    rgb(0.75, 0.84, 0.9),
  );
  [
    [d.praxis.firma, fett],
    [d.praxis.marke, normal],
    [d.praxis.adresse, normal],
  ].forEach(([wert, font], i) => {
    const zeile = fuerPdfSchrift(wert as string);
    const f = font as PDFFont;
    text(
      zeile,
      BREITE - RAND - f.widthOfTextAtSize(zeile, 8.5),
      HOEHE - 32 - i * 12,
      8.5,
      f,
      WEISS,
    );
  });

  // Patient und Untersuchung
  y = HOEHE - 103;
  const INFO_H = 98;
  karte(RAND, y, INHALT, INFO_H);
  const info: [string, string][] = [
    ["PATIENT", oder(d.patient)],
    ["PATIENTENNUMMER", oder(d.patientennummer)],
    ["GEBURTSDATUM", oder(d.geburtsdatum)],
    ["UNTERSUCHUNG", oder(d.untersuchung)],
    ["UNTERSUCHER", oder(d.untersucher)],
    ["METHODE", oder(d.methode)],
    ["GERÄT", oder(d.geraet)],
  ];
  info.forEach(([label, wert], i) => {
    const spalte = i % 3;
    const reihe = Math.floor(i / 3);
    const x = RAND + 14 + spalte * ((INHALT - 20) / 3);
    const oben = y - 18 - reihe * 26;
    text(label, x, oben, 6.5, fett, GRAU);
    text(wert.slice(0, 34), x, oben - 11, 9.5, fett);
  });
  y -= INFO_H + 16;

  // Fundusbilder: gleich groß, vollständig, unverändert
  const BILD_B = (INHALT - 14) / 2;
  const bildOben = y;
  for (const [i, { id, name }] of AUGEN.entries()) {
    const x = RAND + i * (BILD_B + 14);
    text(name.toUpperCase(), x, bildOben - 9, 9.5, fett, NAVY);
    const qualitaet = d.befund[id].qualitaet;
    const rahmenOben = bildOben - 16;
    seite.drawRectangle({
      x,
      y: rahmenOben - BILD_B,
      width: BILD_B,
      height: BILD_B,
      color: rgb(0.03, 0.04, 0.06),
    });
    const bild = d.bilder[id];
    if (bild) {
      const eingebettet: PDFImage =
        bild.typ === "image/png"
          ? await doc.embedPng(bild.bytes)
          : await doc.embedJpg(bild.bytes);
      const faktor = Math.min(
        BILD_B / eingebettet.width,
        BILD_B / eingebettet.height,
      );
      const b = eingebettet.width * faktor;
      const h = eingebettet.height * faktor;
      seite.drawImage(eingebettet, {
        x: x + (BILD_B - b) / 2,
        y: rahmenOben - BILD_B + (BILD_B - h) / 2,
        width: b,
        height: h,
      });
    } else {
      text(
        "Keine Aufnahme",
        x + BILD_B / 2 - 32,
        rahmenOben - BILD_B / 2,
        9.5,
        normal,
        GRAU,
      );
    }
    text(
      bild
        ? `Bildqualität: ${
            qualitaet === "nicht ausreichend"
              ? "nicht ausreichend, Aufnahme nicht auswertbar"
              : qualitaet || "nicht angegeben"
          }`
        : "Keine Aufnahme vorhanden",
      x,
      rahmenOben - BILD_B - 13,
      8.5,
      normal,
      GRAU,
    );
    if (bild?.name) {
      text(
        `Originaldatei: ${bild.name}`.slice(0, 60),
        x,
        rahmenOben - BILD_B - 25,
        7,
        normal,
        GRAU,
      );
    }
  }
  y = bildOben - 16 - BILD_B - 46;

  // Befundübersicht
  abschnitt("Befundübersicht");
  const sp1 = RAND + 150;
  const sp2 = RAND + 320;
  text("Bereich", RAND, y, 8, fett, GRAU);
  text("Linkes Auge (OS)", sp1, y, 8, fett, GRAU);
  text("Rechtes Auge (OD)", sp2, y, 8, fett, GRAU);
  y -= 16;
  BEREICHE.forEach(({ id, name }) => {
    text(name, RAND, y, 9.5, fett);
    pille(d.bilder.OS ? d.befund.OS.bereiche[id].status : "", sp1, y);
    pille(d.bilder.OD ? d.befund.OD.bereiche[id].status : "", sp2, y);
    y -= 16;
  });

  // Seite 2: Einzelbefunde und Freigabe
  neueSeite();
  AUGEN.forEach(({ id, name }) => {
    abschnitt(`Befund ${name}`);
    if (!d.bilder[id]) {
      absatz("Keine Aufnahme vorhanden.");
      y -= 8;
      return;
    }
    BEREICHE.forEach((bereich) => {
      const b = d.befund[id].bereiche[bereich.id];
      platz(30);
      text(bereich.name, RAND, y, 9.5, fett);
      pille(b.status, RAND + 360, y);
      y -= 14;
      absatz(b.text);
      y -= 5;
    });
    y -= 5;
  });

  if (d.bilder.OS && d.bilder.OD) {
    abschnitt("Seitenvergleich");
    absatz(d.seitenvergleich);
    y -= 8;
  }
  abschnitt("Gesamtbeurteilung");
  absatz(d.gesamtbeurteilung);
  y -= 8;
  abschnitt("Empfehlung zur weiteren Abklärung");
  absatz(d.empfehlung);
  y -= 8;

  const FREIGABE_H = 66;
  platz(FREIGABE_H + 24);
  y -= 8;
  karte(RAND, y, INHALT, FREIGABE_H);
  text("FREIGABE", RAND + 14, y - 17, 6.5, fett, GRAU);
  text(
    fuerPdfSchrift(`Geprüft und freigegeben durch ${d.untersucher}`),
    RAND + 14,
    y - 30,
    9.5,
    fett,
  );
  seite.drawLine({
    start: { x: RAND + 300, y: y - 44 },
    end: { x: BREITE - RAND - 14, y: y - 44 },
    thickness: 0.6,
    color: GRAU,
  });
  text("Datum, Unterschrift", RAND + 300, y - 55, 7.5, normal, GRAU);

  // Fußzeile auf jeder Seite
  const seiten = doc.getPages();
  const HINWEIS =
    "Bildgestützte Dokumentation. Sie ersetzt keine augenärztliche Untersuchung, Diagnose oder Behandlung.";
  seiten.forEach((p, i) => {
    p.drawLine({
      start: { x: RAND, y: 44 },
      end: { x: BREITE - RAND, y: 44 },
      thickness: 0.5,
      color: LINIE,
    });
    p.drawText(fuerPdfSchrift(HINWEIS), {
      x: RAND,
      y: 32,
      size: 7.5,
      font: normal,
      color: GRAU,
    });
    const nummer = `Seite ${i + 1} von ${seiten.length}`;
    p.drawText(nummer, {
      x: BREITE - RAND - normal.widthOfTextAtSize(nummer, 7.5),
      y: 32,
      size: 7.5,
      font: normal,
      color: GRAU,
    });
  });

  return doc.save();
};
