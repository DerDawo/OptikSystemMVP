import dayjs from "dayjs";
import "dayjs/locale/de";

/*
 * Reine Hilfsfunktionen der Online-Terminbuchung (Buchungsseite und
 * Anfragen-Seite in UNICORN): freie Zeiten nach Tagen ordnen, Texte für
 * Bestätigung/Absage, Einbau-Code für die Website.
 */

export type Terminart = { id: number; name: string; dauer_min: number };

export type BuchungKonfiguration = {
  aktiv: boolean;
  hinweis?: string | null;
  firma?: string | null;
  telefon?: string | null;
  terminarten: Terminart[];
};

export type Anfrage = {
  id: number;
  terminart: string;
  Start: string;
  Ende: string;
  vorname: string;
  nachname: string;
  email?: string | null;
  telefon?: string | null;
};

// Uhrzeiten immer in Berliner Zeit, auch wenn das Gerät anders eingestellt ist
const berlin = (iso: string) => {
  const teile = new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const t = (typ: string) => teile.find((p) => p.type === typ)?.value ?? "";
  return {
    tag: `${t("year")}-${t("month")}-${t("day")}`,
    uhrzeit: `${t("hour")}:${t("minute")}`,
  };
};

export const uhrzeit = (iso: string) => berlin(iso).uhrzeit;

// "Donnerstag, 30. Oktober 2026"
export const tagLang = (tag: string) =>
  dayjs(tag).locale("de").format("dddd, D. MMMM YYYY");

// "Do 30.10."
export const tagKurz = (tag: string) =>
  dayjs(tag).locale("de").format("dd D.M.");

export type Tag = { tag: string; zeiten: string[] };

// freie Startzeiten (ISO) -> Tage mit ihren Uhrzeiten, sortiert
export const nachTagen = (starts: string[]): Tag[] => {
  const tage = new Map<string, string[]>();
  for (const start of [...starts].sort()) {
    const { tag } = berlin(start);
    tage.set(tag, [...(tage.get(tag) ?? []), start]);
  }
  return [...tage].map(([tag, zeiten]) => ({ tag, zeiten }));
};

export const terminText = (a: Pick<Anfrage, "Start">) => {
  const { tag, uhrzeit } = berlin(a.Start);
  return `${tagLang(tag)} um ${uhrzeit} Uhr`;
};

export const bestaetigungText = (a: Anfrage, firma: string) =>
  [
    `Guten Tag ${a.vorname} ${a.nachname},`,
    "",
    `gern bestätigen wir Ihren Termin „${a.terminart}“ am ${terminText(a)}.`,
    "Falls Sie den Termin nicht wahrnehmen können, geben Sie uns bitte kurz Bescheid.",
    "",
    `Ihr Team von ${firma}`,
  ].join("\n");

export const absageText = (a: Anfrage, firma: string) =>
  [
    `Guten Tag ${a.vorname} ${a.nachname},`,
    "",
    `vielen Dank für Ihre Terminanfrage „${a.terminart}“ am ${terminText(a)}.`,
    "Leider können wir den Termin zu dieser Zeit nicht anbieten. Bitte wählen Sie online eine andere Zeit oder rufen Sie uns an.",
    "",
    `Ihr Team von ${firma}`,
  ].join("\n");

// Nachricht der Buchungsseite an die einbettende Website (Höhe anpassen)
export const HOEHE_NACHRICHT = "unicorn-buchung-hoehe";

// Einbau-Code für WordPress (Block "Individuelles HTML")
export const einbauCode = (seitenUrl: string) =>
  `<iframe id="unicorn-buchung" src="${seitenUrl}" title="Termin online anfragen" style="width:100%;height:900px;border:0" loading="lazy"></iframe>
<script>
window.addEventListener("message", function (e) {
  if (e.data && e.data.typ === "${HOEHE_NACHRICHT}") {
    document.getElementById("unicorn-buchung").style.height = e.data.hoehe + "px";
  }
});
</script>`;
