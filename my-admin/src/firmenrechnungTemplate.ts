// Honorar- bzw. Firmenrechnung (Seite "Firmenrechnung", z. B. Gesundheitstag
// bei einer Firma) im Rechnungsdesign: Empfänger, Auftragsangaben,
// Positionen mit Zeitaufwand, Fahrkosten nach Kilometern und MwSt.
// Unabhängig von Kunde und Auftrag. Ohne React, damit es sich testen lässt.
import dayjs from "dayjs";
import {
  RECHNUNG_ABSENDER,
  belegSeite,
  briefkopfHtml,
  escapeHtml,
  formatEuro,
  fusszeileHtml,
} from "./rechnungTemplate";

export type HonorarPosition = {
  zeitaufwand: string;
  aktivitaet: string;
  // netto in Euro, als Eingabetext ("1000,00")
  betrag: string;
};

export type Firmenrechnung = {
  rechnungsnummer: string;
  rechnungsdatum: string; // JJJJ-MM-TT
  empfaenger: string; // mehrzeilig
  auftragsnummer: string;
  leistungsdatum: string; // JJJJ-MM-TT oder leer
  zeit: string;
  ort: string;
  ansprechpartner: string;
  aktivitaet: string;
  beschreibung: string;
  positionen: HonorarPosition[];
  kilometer: string;
  kmSatz: string;
  mwstSatz: number;
  bemerkung: string;
};

// Vorbelegung der Bemerkung, in der Seite änderbar
export const DANKESTEXT =
  "Vielen Dank für Ihren Auftrag und das entgegengebrachte Vertrauen. Es war uns eine Freude, Ihre Mitarbeitenden rund um das Thema Augen und gutes Sehen zu unterstützen. Für Rückfragen und weitere Aktionstage stehen wir Ihnen jederzeit gern zur Verfügung.";

export const leereFirmenrechnung = (heute: string): Firmenrechnung => ({
  rechnungsnummer: "",
  rechnungsdatum: heute,
  empfaenger: "",
  auftragsnummer: "",
  leistungsdatum: heute,
  zeit: "",
  ort: "",
  ansprechpartner: "",
  aktivitaet: "",
  beschreibung: "",
  positionen: [{ zeitaufwand: "ganztägig", aktivitaet: "", betrag: "" }],
  kilometer: "",
  kmSatz: "0,30",
  mwstSatz: RECHNUNG_ABSENDER.mwstSatz,
  bemerkung: DANKESTEXT,
});

const runde = (n: number) => Math.round(n * 100) / 100;

/** "1.000,50", "1000.5" und "13,8" werden zur Zahl, leer oder ungültig zu 0. */
export const betrag = (wert: string): number => {
  const t = wert.trim().replace(/\s|€/g, "");
  if (!t) return 0;
  const normal = t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t;
  const n = Number(normal);
  return Number.isFinite(n) ? n : 0;
};

export const summen = (r: Firmenrechnung) => {
  const honorar = runde(r.positionen.reduce((s, p) => s + betrag(p.betrag), 0));
  const fahrkosten = runde(betrag(r.kilometer) * betrag(r.kmSatz));
  const netto = runde(honorar + fahrkosten);
  const mwst = runde((netto * r.mwstSatz) / 100);
  return { honorar, fahrkosten, netto, mwst, brutto: runde(netto + mwst) };
};

/** Text einer Position; ohne eigenen Text die Aktivität der Rechnung. */
export const positionText = (p: HonorarPosition, r: Firmenrechnung) =>
  p.aktivitaet.trim() || r.aktivitaet.trim();

// Positionen, die auf der Rechnung erscheinen
const sichtbarePositionen = (r: Firmenrechnung) =>
  r.positionen.filter((p) => p.aktivitaet.trim() || betrag(p.betrag) > 0);

/** Was vor dem Anlegen noch fehlt; leer = Rechnung kann gestellt werden. */
export const fehlendeAngaben = (r: Firmenrechnung): string[] => {
  const fehlt: string[] = [];
  if (!r.empfaenger.trim()) fehlt.push("Empfänger");
  if (!r.rechnungsdatum) fehlt.push("Rechnungsdatum");
  if (!r.positionen.some((p) => betrag(p.betrag) > 0))
    fehlt.push("mindestens eine Position mit Betrag");
  r.positionen.forEach((p, i) => {
    if (betrag(p.betrag) > 0 && !positionText(p, r))
      fehlt.push(`Aktivität bei Position ${i + 1}`);
  });
  if (summen(r).netto <= 0) fehlt.push("Betrag");
  return fehlt;
};

const e = escapeHtml;
const datum = (w: string) => (w ? dayjs(w).format("DD.MM.YYYY") : "");
const zahl1 = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 });

const angabe = (label: string, wert: string) =>
  wert.trim()
    ? `<tr><td class="fr-label">${e(label)}</td><td>${e(wert)}</td></tr>`
    : "";

export const buildFirmenrechnungBodyHtml = (r: Firmenrechnung): string => {
  const s = summen(r);
  const a = RECHNUNG_ABSENDER;
  const anschrift = r.empfaenger
    .split("\n")
    .map((z) => z.trim())
    .filter(Boolean)
    .map((z) => `<div>${e(z)}</div>`)
    .join("");
  const positionen = sichtbarePositionen(r);
  const km = betrag(r.kilometer);
  return `
<div class="beleg">
  ${briefkopfHtml(
    undefined,
    [
      ["Rech.-Datum", datum(r.rechnungsdatum)],
      ["Rech.-Nr.", r.rechnungsnummer || "wird vergeben"],
      ["USt.ID.", a.ustId],
    ],
    "HONORARRECHNUNG",
    anschrift,
  )}
  <div class="inhalt fr-inhalt">
    <div class="inhalt-block">
      <table class="fr-angaben">
        ${angabe("Auftrag Nr.", r.auftragsnummer)}
        ${angabe("Leistungsdatum", datum(r.leistungsdatum))}
        ${angabe("Zeit", r.zeit)}
        ${angabe("Ort", r.ort)}
        ${angabe("Ansprechpartner", r.ansprechpartner)}
        ${angabe("Aktivität", r.aktivitaet)}
      </table>
      ${r.beschreibung.trim() ? `<div class="fr-beschreibung"><strong>Beschreibung des Auftrags:</strong><br />${e(r.beschreibung).replace(/\n/g, "<br />")}</div>` : ""}
      <table class="fr-posten">
        <tr><th>Zeitaufwand</th><th>Aktivität</th><th class="fr-betrag">Betrag</th></tr>
        ${positionen
          .map(
            (p) =>
              `<tr><td>${e(p.zeitaufwand)}</td><td>${e(positionText(p, r))}</td><td class="fr-betrag">${e(formatEuro(betrag(p.betrag)))}</td></tr>`,
          )
          .join("")}
        ${km > 0 ? `<tr><td></td><td>Fahrkosten: ${e(zahl1.format(km))} km × ${e(formatEuro(betrag(r.kmSatz)))}</td><td class="fr-betrag">${e(formatEuro(s.fahrkosten))}</td></tr>` : ""}
      </table>
      <div class="fr-summen">
        <div><span>Nettobetrag</span><span>${e(formatEuro(s.netto))}</span></div>
        <div><span>zzgl. ${e(zahl1.format(r.mwstSatz))} % MwSt</span><span>${e(formatEuro(s.mwst))}</span></div>
      </div>
      <div class="summenbalken"><span>Rechnungsbetrag</span><span>${e(formatEuro(s.brutto))}</span></div>
      ${r.bemerkung.trim() ? `<div class="fr-bemerkung">${e(r.bemerkung).replace(/\n/g, "<br />")}</div>` : ""}
      <div class="hinweise">
        Bitte überweisen Sie den Rechnungsbetrag innerhalb von ${a.zahlungszielTage} Tagen unter Angabe der Rechnungsnummer auf unser Konto:<br />
        ${e(a.bankName)} · IBAN ${e(a.iban)} · BIC ${e(a.bic)}
      </div>
    </div>
  </div>
  ${fusszeileHtml(false)}
</div>`;
};

const FIRMENRECHNUNG_STYLES = `<style>
  .beleg .fr-angaben { border-collapse: collapse; margin-bottom: 4mm; }
  .beleg .fr-angaben td { padding: 0.6mm 0; vertical-align: top; }
  .beleg .fr-label { width: 38mm; color: #333; }
  .beleg .fr-beschreibung { margin-bottom: 5mm; line-height: 1.45; }
  .beleg .fr-posten { width: 100%; border-collapse: collapse; margin-bottom: 3mm; }
  .beleg .fr-posten th { text-align: left; font-weight: normal; color: #555; border-bottom: 0.25mm solid #999; padding: 0 0 1mm; }
  .beleg .fr-posten td { padding: 1.4mm 0; vertical-align: top; }
  .beleg .fr-posten td:first-child, .beleg .fr-posten th:first-child { width: 34mm; }
  .beleg .fr-betrag, .beleg .fr-posten th.fr-betrag { text-align: right; white-space: nowrap; }
  .beleg .fr-summen { border-top: 0.25mm solid #999; padding-top: 1.4mm; }
  .beleg .fr-summen > div { display: flex; justify-content: space-between; padding: 0.4mm 0; }
  .beleg .fr-bemerkung { margin-top: 5mm; font-size: 9pt; line-height: 1.45; }
  .beleg .fr-inhalt { overflow: hidden; font-size: 10pt; }
  .beleg .fr-inhalt .hinweise { margin-top: 4mm; }
</style>`;

// Viel Inhalt (lange Beschreibung, viele Positionen, Bemerkung): der Block
// wird verkleinert, statt in die Fußzeile zu laufen (transform, damit auch
// Druck und PDF stimmen)
const FIRMENRECHNUNG_EINPASSEN = `<script>
(function () {
  document.querySelectorAll(".beleg .fr-inhalt").forEach(function (rahmen) {
    var block = rahmen.querySelector(".inhalt-block");
    if (!block) return;
    var faktor = 1;
    while (block.offsetHeight * faktor > rahmen.clientHeight + 1 && faktor > 0.6) {
      faktor = Math.round((faktor - 0.02) * 100) / 100;
      block.style.transformOrigin = "top left";
      block.style.transform = "scale(" + faktor + ")";
      block.style.width = 100 / faktor + "%";
    }
  });
})();
</script>`;

export const buildFirmenrechnungHtml = (
  r: Firmenrechnung,
  vorschau: boolean,
): string =>
  belegSeite(
    `Rechnung ${r.rechnungsnummer}`.trim(),
    FIRMENRECHNUNG_STYLES +
      buildFirmenrechnungBodyHtml(r) +
      FIRMENRECHNUNG_EINPASSEN,
    vorschau,
  );

/** Zeile für firmenrechnung_anlegen (Beträge auf Cent gerundet). */
export const alsDatensatz = (r: Firmenrechnung) => {
  const s = summen(r);
  return {
    Rechnungsdatum: r.rechnungsdatum,
    Empfaenger: r.empfaenger.trim(),
    Auftragsnummer: r.auftragsnummer.trim(),
    Leistungsdatum: r.leistungsdatum,
    Zeit: r.zeit.trim(),
    Ort: r.ort.trim(),
    Ansprechpartner: r.ansprechpartner.trim(),
    Aktivitaet: r.aktivitaet.trim(),
    Beschreibung: r.beschreibung.trim(),
    Positionen: sichtbarePositionen(r).map((p) => ({
      zeitaufwand: p.zeitaufwand.trim(),
      aktivitaet: positionText(p, r),
      betrag: runde(betrag(p.betrag)),
    })),
    Kilometer: betrag(r.kilometer),
    KmSatz: betrag(r.kmSatz),
    MwStSatz: r.mwstSatz,
    Netto: s.netto,
    MwSt: s.mwst,
    Brutto: s.brutto,
    Bemerkung: r.bemerkung.trim(),
  };
};

type Zeile = ReturnType<typeof alsDatensatz> & {
  Rechnungsnummer: string;
  Positionen: { zeitaufwand: string; aktivitaet: string; betrag: number }[];
};

const deZahl = (n: number) =>
  n.toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/** Gespeicherte Rechnung wieder als Formularstand (zum erneuten Drucken). */
export const ausDatensatz = (z: Zeile): Firmenrechnung => ({
  rechnungsnummer: z.Rechnungsnummer,
  rechnungsdatum: z.Rechnungsdatum,
  empfaenger: z.Empfaenger ?? "",
  auftragsnummer: z.Auftragsnummer ?? "",
  leistungsdatum: z.Leistungsdatum ?? "",
  zeit: z.Zeit ?? "",
  ort: z.Ort ?? "",
  ansprechpartner: z.Ansprechpartner ?? "",
  aktivitaet: z.Aktivitaet ?? "",
  beschreibung: z.Beschreibung ?? "",
  positionen: (z.Positionen ?? []).map((p) => ({
    zeitaufwand: p.zeitaufwand ?? "",
    aktivitaet: p.aktivitaet ?? "",
    betrag: deZahl(Number(p.betrag) || 0),
  })),
  kilometer: Number(z.Kilometer) ? String(z.Kilometer).replace(".", ",") : "",
  kmSatz: deZahl(Number(z.KmSatz) || 0),
  mwstSatz: Number(z.MwStSatz) || 0,
  bemerkung: z.Bemerkung ?? "",
});
