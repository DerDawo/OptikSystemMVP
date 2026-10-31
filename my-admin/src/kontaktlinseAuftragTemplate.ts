import dayjs from "dayjs";
import { RECHNUNG_ABSENDER, escapeHtml as e } from "./rechnungTemplate";
import { mitarbeiterAnzeige } from "./mitarbeiterNamen";
import {
  EINPASSEN,
  WERKSTATTAUFTRAG_STYLES,
  angaben,
  formatDatum,
  formatEuro,
  formatWert,
  preisTabelle,
  text,
  type WerkstattauftragSummen,
} from "./werkstattauftragTemplate";

/*
 * Kontaktlinsenauftrag zum Drucken (Symbol "Auftrag drucken" der CL-Kartei),
 * genauso aufgebaut wie der Werkstattauftrag, damit er gleich gefaltet in die
 * Auftragstüte passt: oben links die Auftragskarte (Kunde, Linsenwerte,
 * Linsen, Lieferung, Bemerkungen), oben rechts Preise und Auftragserteilung,
 * unten zum Abtrennen der Kundenabschnitt mit Pflegetipps und Preisen.
 */

type Datensatz = Record<string, unknown>;

export type KontaktlinseAuftragDaten = {
  cl: Datensatz;
  kunde?: Datensatz | null;
};

const AUGEN = [
  { seite: "R", endung: "Rechts" },
  { seite: "L", endung: "Links" },
] as const;

type Spalte = {
  feld: string;
  titel: string;
  format?: Parameters<typeof formatWert>[1];
  datum?: boolean;
};

const PARAMETER: Spalte[] = [
  { feld: "Sph", titel: "Sph", format: "dioptrie" },
  { feld: "Cyl", titel: "Cyl", format: "dioptrie" },
  { feld: "Achse", titel: "A", format: "achse" },
  { feld: "Add", titel: "Add", format: "dioptrie" },
  { feld: "Radius", titel: "BC", format: "zwei" },
  { feld: "Durchmesser", titel: "DM", format: "frei" },
  { feld: "Vis", titel: "Vis", format: "visus" },
];

const LINSE: Spalte[] = [
  { feld: "Hersteller", titel: "Hersteller" },
  { feld: "Linsentyp", titel: "Linse" },
  { feld: "Material", titel: "Material" },
  { feld: "Tragemodus", titel: "Tragemodus" },
];

const LIEFERUNG: Spalte[] = [
  { feld: "Lagernummer", titel: "Lagernr." },
  { feld: "LieferscheinNr", titel: "Lieferschein" },
  { feld: "LieferscheinDatum", titel: "vom", datum: true },
  { feld: "LotNr", titel: "LOT" },
  { feld: "Status", titel: "Status" },
];

const zahl = (wert: unknown) => {
  if (wert === null || wert === undefined || wert === "") return null;
  const n = Number(wert);
  return Number.isFinite(n) ? n : null;
};

const round2 = (wert: number) => Math.round(wert * 100) / 100;

// Tabelle R/L im Stil der Werte-Tabelle des Werkstattauftrags
const augenTabelle = (cl: Datensatz, spalten: Spalte[], textSpalten = false) =>
  `<table class="werte${textSpalten ? " text" : ""}"><thead><tr><th></th>${spalten
    .map((s) => `<th>${e(s.titel)}</th>`)
    .join("")}</tr></thead><tbody>${AUGEN.map(
    (a) =>
      `<tr><th>${a.seite}</th>${spalten
        .map((s) => {
          const wert = cl[`${s.feld}${a.endung}`];
          const inhalt = s.datum
            ? formatDatum(wert)
            : s.format
              ? formatWert(wert, s.format)
              : text(wert);
          return `<td>${e(inhalt)}</td>`;
        })
        .join("")}</tr>`,
  ).join("")}</tbody></table>`;

export const buildKontaktlinseAuftragSummen = (
  cl: Datensatz,
): WerkstattauftragSummen => {
  const positionen = [
    ...AUGEN.map((a) => ({
      label: `Kontaktlinse ${a.seite}.${
        text(cl[`Linsentyp${a.endung}`])
          ? ` – ${text(cl[`Linsentyp${a.endung}`])}`
          : ""
      }`,
      betrag: zahl(cl[`Preis${a.endung}`]),
    })),
    ...[1, 2, 3].map((i) => ({
      label: text(cl[`Zusatzleistung${i}`]) || "Zusatzleistung",
      betrag: zahl(cl[`Zusatzbetrag${i}`]),
    })),
  ].flatMap((p) => (p.betrag === null ? [] : [{ ...p, betrag: p.betrag }]));
  const gesamt =
    zahl(cl.Summe) ?? round2(positionen.reduce((s, p) => s + p.betrag, 0));
  const kassenanteil = zahl(cl.KKAnteil) ?? 0;
  const anzahlung = zahl(cl.Anzahlung) ?? 0;
  const endpreis = round2(gesamt - kassenanteil);
  const netto = round2(gesamt / (1 + RECHNUNG_ABSENDER.mwstSatz / 100));
  return {
    positionen,
    gesamt,
    kassenanteil,
    endpreis,
    netto,
    mwst: round2(gesamt - netto),
    anzahlung,
    offen: round2(endpreis - anzahlung),
  };
};

const PFLEGETIPPS = [
  "Vor jedem Einsetzen und Herausnehmen die Hände gründlich waschen und mit einem fusselfreien Tuch abtrocknen.",
  "Linsen nur mit dem empfohlenen Pflegemittel reinigen und aufbewahren – niemals mit Leitungswasser oder Speichel.",
  "Die Aufbewahrungslösung täglich erneuern, den Behälter ausspülen, an der Luft trocknen und regelmäßig austauschen.",
  "Tragezeit und Austauschrhythmus der Linsen einhalten, nicht mit Linsen schlafen, sofern nicht ausdrücklich vereinbart.",
  "Beim Schwimmen, Duschen und in der Sauna die Linsen herausnehmen oder eine Schwimmbrille tragen.",
  "Bei Rötung, Schmerzen, Lichtempfindlichkeit oder Sehverschlechterung die Linsen sofort herausnehmen und uns oder einen Augenarzt aufsuchen.",
];

// Auftragserteilung wie beim Werkstattauftrag, ergänzt um die Einweisung in
// Handhabung und Pflege
const auftragserteilung = (endpreis: number) => {
  const firma = e(RECHNUNG_ABSENDER.firma);
  return `<div class="auftragserteilung">
      <p><b>Auftragserteilung</b><br />
      Ich beauftrage ${firma} mit der Anpassung und Lieferung der oben beschriebenen Kontaktlinsen zum Endpreis von ${e(formatEuro(endpreis))} € inkl. MwSt.
      Der Betrag ist bei Abholung fällig; bis zur vollständigen Bezahlung bleiben die Linsen Eigentum von ${firma}.
      Übernimmt ein Kostenträger seinen Anteil nicht, zahle ich diesen selbst.
      Ich wurde in das Einsetzen, Herausnehmen und die Pflege der Linsen eingewiesen; Tragezeiten und Nachkontrollen wurden mit mir besprochen.
      Meine gesetzlichen Gewährleistungsrechte bleiben unberührt.</p>
      <div class="unterschriften">
        <div class="unterschrift">${e(RECHNUNG_ABSENDER.ort)}, Datum</div>
        <div class="unterschrift">Unterschrift Kunde/Kundin</div>
      </div>
    </div>`;
};

// Zum Abhaken im Laden, neben den Kontaktdaten
const LADEN_HAKEN = `<div class="haken">
  <span class="kasten"></span><span>Linsen bestellt</span><span class="datum">Datum</span><span class="linie"></span>
  <span class="kasten"></span><span>Linsen da</span><span class="datum">Datum</span><span class="linie"></span>
  <span class="kasten"></span><span>Sonstiges</span><span class="linie lang"></span>
</div>`;

export const buildKontaktlinseAuftragBodyHtml = ({
  cl,
  kunde,
}: KontaktlinseAuftragDaten): string => {
  const k = kunde ?? {};
  const summen = buildKontaktlinseAuftragSummen(cl);
  const anrede = /^keine angabe$/i.test(text(k.Anrede)) ? "" : text(k.Anrede);
  const name = [k.Vorname, k.Nachname].map(text).filter(Boolean);
  const strasse = [k.Straße, k.Hausnummer].map(text).filter(Boolean);
  const ort = [k.Postleitzahl, k.Stadt].map(text).filter(Boolean);
  const auftragsdatum = formatDatum(cl.Datum) || dayjs().format("DD.MM.YYYY");
  const fertigBis = formatDatum(cl.Abholung, true);

  const kundeninfo: [string, string][] = [
    ["Geburtsdatum", formatDatum(k.Geburtsdatum)],
    ["Krankenkasse", text(k.KrankenversicherungsTyp)],
    ["Anpasser", text(mitarbeiterAnzeige(cl.Berater))],
    ["Anpassgrund", text(cl.Anpassgrund)],
    ["Nachkontrolle", formatDatum(cl.Nachkontrolltermin, true)],
    ["Abo-Lieferung", cl.AboLieferung ? "ja" : "nein"],
    ["Pflegemittel", text(cl.Pflegemittel)],
  ];

  const firma = RECHNUNG_ABSENDER.firma;
  const kontakt = `${firma} · ${RECHNUNG_ABSENDER.strasseLang} · ${RECHNUNG_ABSENDER.plz} ${RECHNUNG_ABSENDER.ort} · Tel. ${RECHNUNG_ABSENDER.telefon}`;

  return `
<div class="blatt">
  <section class="haelfte">
    <div class="spalte">
      <div class="titelzeile"><span>Kontaktlinsenauftrag</span><span>${e(auftragsdatum)}</span></div>
      <div class="kundenbox">
        <div>
          <div>${e(anrede)}</div>
          <div class="fett">${e(name.join(" "))}</div>
          <div>${e(strasse.join(" "))}</div>
          <div>${e(ort.join(" "))}</div>
        </div>
        <div class="nummern">
          <div>Kd.-Nr. <b>${e(text(k.KundenNummer) || text(k.id))}</b></div>
          <div>Auftrag <b>${e(text(cl.id))}</b></div>
          <div>Fertig bis <b>${e(fertigBis)}</b></div>
        </div>
      </div>
      <div class="kontaktzeile">
        ${angaben([
          ["Telefon", text(k.TelefonnummerPrivat)],
          ["Mobil", text(k.Handy)],
          ["E-Mail", text(k.Email)],
        ])}
        ${LADEN_HAKEN}
      </div>
      <div class="balken">${e(text(cl.Linsenart) || "Kontaktlinsen")}</div>
      ${augenTabelle(cl, PARAMETER)}
      <div class="balken">Linsen</div>
      ${augenTabelle(cl, LINSE, true)}
      <div class="balken">Lieferung</div>
      ${augenTabelle(cl, LIEFERUNG, true)}
      <div class="balken"><span>Bemerkungen</span><span>Offen: ${e(formatEuro(summen.offen))} €</span></div>
      <div class="notizen">${e(text(cl.Notizen))}</div>
      ${text(k.Notizen) ? `<div class="notizen"><b>Kunde:</b> ${e(text(k.Notizen))}</div>` : ""}
      <div class="schreiblinie"></div>
      <div class="schreiblinie"></div>
    </div>
    <div class="spalte">
      ${angaben(kundeninfo)}
      ${preisTabelle(summen, false)}
      ${auftragserteilung(summen.endpreis)}
    </div>
  </section>

  <div class="schnitt"><span>✂ Kundenabschnitt</span></div>

  <section class="haelfte">
    <div class="spalte">
      <div class="titelzeile"><span>Pflegetipps für Ihre Kontaktlinsen</span></div>
      <p>Richtige Pflege schützt Ihre Augen und sorgt für angenehmes Tragen und gleichbleibend gute Sicht.</p>
      <ul class="tipps">${PFLEGETIPPS.map((tipp) => `<li>${e(tipp)}</li>`).join("")}</ul>
      <p>Bitte nehmen Sie Ihre Nachkontrolltermine wahr. Für Fragen sprechen Sie uns einfach an.</p>
      <p>Ihr ${e(firma)}</p>
    </div>
    <div class="spalte">
      <div class="titelzeile"><span>Ihr Auftrag ${e(text(cl.id))}</span><span>${e(auftragsdatum)}</span></div>
      ${angaben([
        ["Kunde", [anrede, ...name].filter(Boolean).join(" ")],
        ["Fertig bis", fertigBis],
        ...kundeninfo.slice(2, 6),
      ])}
      ${preisTabelle(summen, true)}
      <p class="kontakt">${e(kontakt)}</p>
    </div>
  </section>
</div>`;
};

export const buildKontaktlinseAuftragPrintHtml = (
  daten: KontaktlinseAuftragDaten,
): string => `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8" />
<title>${e(`Kontaktlinsenauftrag ${text(daten.cl.id)}`)}</title>
<style>
  ${WERKSTATTAUFTRAG_STYLES}
  .werte.text td { text-align: left; }
  @page { size: A4; margin: 0; }
</style>
</head>
<body>
${buildKontaktlinseAuftragBodyHtml(daten)}
${EINPASSEN}
</body>
</html>`;
