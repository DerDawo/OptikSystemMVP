// Mahnungen (Kategorie "Mahnung": Zahlungserinnerung und Mahnungen) im
// Briefkopf der Rechnung (rechnungTemplate.ts): Logo, Absender, Anschrift,
// Datenbox, grauer Titelbalken und Fußzeile mit Bankverbindung.
//
// Der Brieftext kommt aus der Dokumentvorlage und lässt sich unter
// "Dokumentvorlagen" ändern: Die erste Zeile ist die Überschrift im grauen
// Balken, der Rest der Brief. Platzhalter wie {{rechnung.nummer}} werden mit
// den Daten des Auftrags gefüllt - zusätzlich zu denen der Vorlagen-Engine
// (documentTemplateEngine.ts) gibt es hier Briefanrede, Rechnungsdatum,
// Fälligkeit, offenen Betrag und die Betriebsdaten.
import dayjs, { type Dayjs } from "dayjs";
import {
  buildDocumentMergeValues,
  renderDocumentTemplate,
  type DocumentMergeEntities,
  type MergeSource,
} from "./documentTemplateEngine";
import {
  RECHNUNG_ABSENDER,
  belegSeite,
  briefkopfHtml,
  escapeHtml,
  fusszeileHtml,
} from "./rechnungTemplate";
import {
  buildWerkstattauftragSummen,
  formatEuro,
  text,
} from "./werkstattauftragTemplate";
import { leistungsText } from "./leistungenAusNotizen";

export type MahnungDaten = {
  entities: DocumentMergeEntities;
  rechnungsnummer: string;
  // Text der gewählten Dokumentvorlage (erste Zeile = Überschrift)
  vorlagentext?: string;
};

// Ohne Vorlagentext (z. B. leere Vorlage): die Zahlungserinnerung
export const ZAHLUNGSERINNERUNG_TEXT = `Freundliche Zahlungserinnerung

{{kunde.briefanrede}},

bei der Durchsicht unserer Zahlungseingänge haben wir festgestellt, dass die Rechnung {{rechnung.nummer}} vom {{rechnung.datum}} über {{mahnung.betrag}} € noch offen ist. Vielleicht ist die Zahlung im Alltag einfach untergegangen.

Wir bitten Sie, den offenen Betrag bis zum {{mahnung.frist}} auf das unten angegebene Konto zu überweisen. Falls Sie die Zahlung bereits veranlasst haben, betrachten Sie dieses Schreiben bitte als erledigt.

Sollte die Zahlung momentan nicht möglich sein oder Sie Fragen zur Rechnung haben, nehmen Sie bitte Kontakt mit uns auf. Gemeinsam finden wir sicher eine passende Lösung.

Vielen Dank für Ihre Rückmeldung und Ihr Vertrauen.

Mit freundlichen Grüßen
{{betrieb.name}}
{{betrieb.kontakt}}`;

const tag = (wert: unknown): Dayjs | null => {
  const roh = text(wert);
  if (!roh) return null;
  // aus Prisma übernommen: "TT.MM.JJJJ"
  const deutsch = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(roh);
  const datum = deutsch
    ? dayjs(
        new Date(
          Number(deutsch[3]),
          Number(deutsch[2]) - 1,
          Number(deutsch[1]),
        ),
      )
    : /^\d{4}-\d{2}-\d{2}/.test(roh)
      ? dayjs(roh)
      : null;
  return datum?.isValid() ? datum.startOf("day") : null;
};

// Rechnungsdatum: bei aus Prisma übernommenen Aufträgen "Rechnungsdatum: …",
// sonst der Abholtag (Rechnungsdatum ist Liefer-/Leistungsdatum), sonst das
// Auftragsdatum. Ein gespeichertes Rechnungsdatum gibt es (noch) nicht.
export const rechnungsdatum = (brille: MergeSource): Dayjs | null => {
  const prisma = /^Rechnungsdatum:\s*(.+)$/m.exec(leistungsText(brille));
  const ausPrisma = tag(prisma?.[1]?.trim());
  if (ausPrisma) return ausPrisma;
  const abholung = tag(brille?.Abholung);
  if (abholung && !abholung.isAfter(dayjs(), "day")) return abholung;
  return tag(brille?.Datum);
};

// "Sehr geehrte Frau Muster", sonst "Sehr geehrte Damen und Herren"
export const briefanrede = (kunde: MergeSource): string => {
  const nachname = text(kunde?.Nachname);
  const anrede = text(kunde?.Anrede);
  if (nachname && anrede === "Frau") return `Sehr geehrte Frau ${nachname}`;
  if (nachname && anrede === "Herr") return `Sehr geehrter Herr ${nachname}`;
  return "Sehr geehrte Damen und Herren";
};

const datum = (wert: Dayjs | null) => (wert ? wert.format("DD.MM.YYYY") : "");

// Platzhalter der Mahnung (zusätzlich zu buildDocumentMergeValues)
export const mahnungPlatzhalter = ({
  entities,
  rechnungsnummer,
}: MahnungDaten): Record<string, string> => {
  const a = RECHNUNG_ABSENDER;
  const rechnungVom = rechnungsdatum(entities.brille);
  const frist = dayjs().add(a.zahlungszielTage, "day");
  return {
    ...buildDocumentMergeValues(entities),
    "kunde.briefanrede": briefanrede(entities.kunde),
    "rechnung.nummer":
      rechnungsnummer || text(entities.brille?.Rechnungsnummer),
    "rechnung.datum": datum(rechnungVom),
    // fällig nach dem Zahlungsziel der Rechnung
    "rechnung.faellig": datum(
      rechnungVom ? rechnungVom.add(a.zahlungszielTage, "day") : null,
    ),
    "mahnung.betrag": formatEuro(buildWerkstattauftragSummen(entities).offen),
    "mahnung.frist": datum(frist),
    "betrieb.name": a.firma,
    "betrieb.kontakt": `Tel. ${a.telefon} · ${a.email}`,
    "betrieb.bank": `${a.bankName} · IBAN ${a.iban} · BIC ${a.bic}`,
  };
};

// Überschrift (erste Zeile) und Brieftext mit gefüllten Platzhaltern
export const mahnungText = (
  daten: MahnungDaten,
): { titel: string; absaetze: string[] } => {
  const vorlage = text(daten.vorlagentext) || ZAHLUNGSERINNERUNG_TEXT;
  const gefuellt = renderDocumentTemplate(vorlage, mahnungPlatzhalter(daten));
  const [titel = "", ...rest] = gefuellt.trim().split(/\r?\n/);
  const absaetze = rest
    .join("\n")
    .trim()
    .split(/\n\s*\n/)
    .map((absatz) => absatz.trim())
    .filter(Boolean);
  return { titel: titel.trim(), absaetze };
};

const e = escapeHtml;

export const buildMahnungBodyHtml = (daten: MahnungDaten): string => {
  const { titel, absaetze } = mahnungText(daten);
  const kundennummer = text(daten.entities.kunde?.KundenNummer);
  const datenbox: [string, string][] = [
    ["Datum", dayjs().format("DD.MM.YYYY")],
    ["Rech.-Nr.", mahnungPlatzhalter(daten)["rechnung.nummer"]],
    ...(kundennummer
      ? ([["Kd.-Nr.", kundennummer]] as [string, string][])
      : []),
  ];
  return `
<div class="beleg">
  ${briefkopfHtml(daten.entities.kunde, datenbox, titel)}
  <div class="inhalt brief">
    ${absaetze
      .map((absatz) => `<p>${e(absatz).replace(/\r?\n/g, "<br />")}</p>`)
      .join("")}
  </div>
  ${fusszeileHtml(false)}
</div>`;
};

const BRIEF_STYLES = `
  <style>
    .beleg .brief { font-size: 10.5pt; line-height: 1.4; }
    .beleg .brief p { margin: 0 0 3.6mm; }
  </style>`;

// Wird der Brief zu lang (eigener Text), wird die Schrift stufenweise
// kleiner, statt in die Fußzeile zu laufen
const BRIEF_EINPASSEN = `<script>
(function () {
  var brief = document.querySelector(".brief");
  if (!brief) return;
  var groesse = 10.5;
  while (brief.scrollHeight > brief.clientHeight + 1 && groesse > 8) {
    groesse -= 0.25;
    brief.style.fontSize = groesse + "pt";
  }
})();
</script>`;

const titelDerSeite = (daten: MahnungDaten) => {
  const { titel } = mahnungText(daten);
  const nummer = mahnungPlatzhalter(daten)["rechnung.nummer"];
  return `${titel || "Mahnung"}${nummer ? ` ${nummer}` : ""}`;
};

export const buildMahnungPrintHtml = (daten: MahnungDaten): string =>
  belegSeite(
    titelDerSeite(daten),
    `${BRIEF_STYLES}${buildMahnungBodyHtml(daten)}${BRIEF_EINPASSEN}`,
    false,
  );

export const buildMahnungPreviewHtml = (daten: MahnungDaten): string =>
  belegSeite(
    titelDerSeite(daten),
    `${BRIEF_STYLES}${buildMahnungBodyHtml(daten)}${BRIEF_EINPASSEN}`,
    true,
  );
