// Text-PDFs (z. B. OPTICA-Abrechnungsunterlagen) in Textzeilen zerlegen.
// pdf.js liefert einzelne Textstücke mit Position; hier werden sie zu Zeilen
// zusammengesetzt. Spalten (größerer Abstand) werden durch einen Tabulator
// getrennt. Gedrehte Seiten (Querformat, Text um 90° gedreht) werden erkannt.
// Ohne pdf.js-Abhängigkeit, damit es sich testen lässt.

export type PdfTextStueck = {
  str: string;
  transform: number[]; // [a, b, c, d, e, f]
  width: number;
};

type Stueck = { zeile: number; pos: number; ende: number; text: string };

/** Abstand, ab dem zwei Stücke als getrennte Spalten gelten. */
const SPALTEN_ABSTAND = 4;
/** Toleranz, innerhalb der zwei Stücke auf derselben Zeile liegen. */
const ZEILEN_TOLERANZ = 2.5;

const zuStueck = (it: PdfTextStueck): Stueck => {
  const [a, b, , , e, f] = it.transform;
  // Leserichtung aus der Textmatrix: normal (a > 0), 90° gedreht (b > 0),
  // 270° gedreht (b < 0).
  if (Math.abs(b) > Math.abs(a)) {
    if (b > 0) return { zeile: e, pos: f, ende: f + it.width, text: it.str };
    return { zeile: -e, pos: -f, ende: -f + it.width, text: it.str };
  }
  return { zeile: -f, pos: e, ende: e + it.width, text: it.str };
};

/** Textstücke einer Seite zu Zeilen zusammensetzen (oben nach unten). */
export const zeilenAusStuecken = (stuecke: PdfTextStueck[]): string[] => {
  const zeilen: { y: number; teile: Stueck[] }[] = [];
  for (const it of stuecke) {
    if (!it.str || !it.str.trim()) continue;
    const s = zuStueck(it);
    let z = zeilen.find((k) => Math.abs(k.y - s.zeile) < ZEILEN_TOLERANZ);
    if (!z) {
      z = { y: s.zeile, teile: [] };
      zeilen.push(z);
    }
    z.teile.push(s);
  }
  zeilen.sort((a, b) => a.y - b.y);
  return zeilen.map(({ teile }) => {
    teile.sort((a, b) => a.pos - b.pos);
    let text = "";
    let ende: number | null = null;
    for (const t of teile) {
      if (ende !== null) {
        const luecke = t.pos - ende;
        if (luecke > SPALTEN_ABSTAND) text += "\t";
        else if (luecke > 0.5) text += " ";
      }
      text += t.text;
      ende = Math.max(ende ?? t.ende, t.ende);
    }
    return text.replace(/ +/g, " ").trim();
  });
};
