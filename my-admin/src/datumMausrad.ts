// Datumsfelder (input type="date") mit dem Mausrad verstellen, wie man es
// aus Prisma kennt. Der Browser selbst kann das nicht. Es wirkt nur auf das
// gerade angeklickte Feld, damit beim Scrollen der Seite nichts verstellt
// wird: Mausrad = Tag, mit Umschalt = Monat, mit Alt (Option) = Jahr.
// Nach oben drehen = später, nach unten = früher.
import { useEffect } from "react";

export type Einheit = "tag" | "monat" | "jahr";

const zweistellig = (n: number) => String(n).padStart(2, "0");

const tageImMonat = (jahr: number, monat0: number) =>
  new Date(Date.UTC(jahr, monat0 + 1, 0)).getUTCDate();

const alsText = (d: Date) =>
  `${String(d.getUTCFullYear()).padStart(4, "0")}-${zweistellig(
    d.getUTCMonth() + 1,
  )}-${zweistellig(d.getUTCDate())}`;

// Heutiges Datum in Ortszeit als "JJJJ-MM-TT"
const heute = () => {
  const d = new Date();
  return `${d.getFullYear()}-${zweistellig(d.getMonth() + 1)}-${zweistellig(d.getDate())}`;
};

const leseDatum = (wert: string): Date | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(wert);
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return Number.isNaN(d.getTime()) ? null : d;
};

// Verschiebt ein Datum "JJJJ-MM-TT" um `schritte` Tage, Monate oder Jahre.
// Bei Monat/Jahr bleibt der Tag erhalten, solange es ihn gibt (31.01. + 1
// Monat = 28./29.02.). Leeres Feld beginnt bei `heute`. min/max werden
// eingehalten.
export const verschiebeDatum = (
  wert: string,
  schritte: number,
  einheit: Einheit,
  grenzen: { min?: string; max?: string; heute?: string } = {},
): string => {
  const start =
    leseDatum(wert) ?? leseDatum(grenzen.heute ?? "") ?? leseDatum(heute());
  if (!start) return wert;
  // Leeres Feld: der erste Dreh setzt nur das Startdatum
  if (!leseDatum(wert)) return alsText(start);

  let ziel: Date;
  if (einheit === "tag") {
    ziel = new Date(start.getTime() + schritte * 86400000);
  } else {
    const monate = einheit === "monat" ? schritte : schritte * 12;
    const gesamt = start.getUTCFullYear() * 12 + start.getUTCMonth() + monate;
    const jahr = Math.floor(gesamt / 12);
    const monat0 = gesamt - jahr * 12;
    const tag = Math.min(start.getUTCDate(), tageImMonat(jahr, monat0));
    ziel = new Date(Date.UTC(jahr, monat0, tag));
  }

  let text = alsText(ziel);
  if (grenzen.min && leseDatum(grenzen.min) && text < grenzen.min)
    text = grenzen.min;
  if (grenzen.max && leseDatum(grenzen.max) && text > grenzen.max)
    text = grenzen.max;
  return text;
};

export const einheitAusTasten = (e: {
  shiftKey: boolean;
  altKey: boolean;
}): Einheit => (e.altKey ? "jahr" : e.shiftKey ? "monat" : "tag");

// Richtung aus dem Mausrad: nach oben (negatives delta) = +1
export const richtungAusDelta = (deltaY: number, deltaX: number): number => {
  // Mit Umschalt liefert macOS die Bewegung waagerecht
  const delta = deltaY !== 0 ? deltaY : deltaX;
  return delta < 0 ? 1 : delta > 0 ? -1 : 0;
};

// Wert so setzen, dass React (onChange) es mitbekommt
const setzeWert = (feld: HTMLInputElement, wert: string) => {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set;
  setter?.call(feld, wert);
  feld.dispatchEvent(new Event("input", { bubbles: true }));
  feld.dispatchEvent(new Event("change", { bubbles: true }));
};

// Trackpads feuern sehr viele Ereignisse; höchstens ein Schritt je Pause
const MIN_ABSTAND_MS = 60;

export const useDatumMausrad = () => {
  useEffect(() => {
    let letzterSchritt = 0;
    const beiRad = (e: WheelEvent) => {
      const feld = e.target;
      if (
        !(feld instanceof HTMLInputElement) ||
        feld.type !== "date" ||
        feld.disabled ||
        feld.readOnly ||
        document.activeElement !== feld
      )
        return;
      if (e.ctrlKey || e.metaKey) return; // Zoom nicht abfangen
      const richtung = richtungAusDelta(e.deltaY, e.deltaX);
      if (richtung === 0) return;
      e.preventDefault();
      const jetzt = performance.now();
      if (jetzt - letzterSchritt < MIN_ABSTAND_MS) return;
      letzterSchritt = jetzt;
      const neu = verschiebeDatum(feld.value, richtung, einheitAusTasten(e), {
        min: feld.min || undefined,
        max: feld.max || undefined,
      });
      if (neu !== feld.value) setzeWert(feld, neu);
    };
    window.addEventListener("wheel", beiRad, { passive: false });
    return () => window.removeEventListener("wheel", beiRad);
  }, []);
};

export const DatumMausrad = () => {
  useDatumMausrad();
  return null;
};
