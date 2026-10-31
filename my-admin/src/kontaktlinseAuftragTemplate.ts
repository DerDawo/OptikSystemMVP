import logoSehzentrum from "./assets/logo-sehzentrum.jpg?inline";
import {
  RECHNUNG_ABSENDER,
  escapeHtml as e,
  type Absender,
} from "./rechnungTemplate";
import {
  formatDatum,
  formatEuro,
  formatWert,
  text,
} from "./werkstattauftragTemplate";

/*
 * Kontaktlinsen-Auftragskartei zum Drucken (A4, Symbol "Drucken" der
 * CL-Kartei): Kunde, Anpassung, Linsenparameter R/L, Linsen und
 * Lieferdaten, Pflegemittel, Leistungen und Beträge, Notizen sowie
 * Unterschrift des Kunden für Einweisung in Handhabung und Pflege.
 */

type Datensatz = Record<string, unknown>;

export type KontaktlinseAuftragDaten = {
  cl: Datensatz;
  kunde?: Datensatz | null;
  absender?: Absender;
};

const AUGEN = [
  { seite: "R", endung: "Rechts" },
  { seite: "L", endung: "Links" },
] as const;

const PARAMETER = [
  { feld: "Sph", titel: "Sph", format: "dioptrie" },
  { feld: "Cyl", titel: "Cyl", format: "dioptrie" },
  { feld: "Achse", titel: "Achse", format: "achse" },
  { feld: "Add", titel: "Add", format: "dioptrie" },
  { feld: "Radius", titel: "BC (mm)", format: "zwei" },
  { feld: "Durchmesser", titel: "DM (mm)", format: "frei" },
  { feld: "Vis", titel: "Visus", format: "visus" },
] as const;

const LINSE = [
  { feld: "Hersteller", titel: "Hersteller" },
  { feld: "Linsentyp", titel: "Linsentyp" },
  { feld: "Material", titel: "Material" },
  { feld: "Tragemodus", titel: "Tragemodus" },
] as const;

const LIEFERUNG = [
  { feld: "Lagernummer", titel: "Lagernr." },
  { feld: "LieferscheinNr", titel: "Lieferschein-Nr." },
  { feld: "LieferscheinDatum", titel: "Lieferschein vom", datum: true },
  { feld: "LotNr", titel: "LOT-Nr." },
  { feld: "Status", titel: "Status" },
] as const;

const zahl = (wert: unknown) => {
  if (wert === null || wert === undefined || wert === "") return null;
  const n = Number(wert);
  return Number.isFinite(n) ? n : null;
};

const euro = (wert: number | null) =>
  wert === null ? "" : `${formatEuro(wert)} €`;

const angabe = (titel: string, wert: string) =>
  `<div class="angabe"><span class="t">${e(titel)}</span><span class="w">${e(wert) || "&nbsp;"}</span></div>`;

const augenTabelle = (
  spalten: readonly { feld: string; titel: string }[],
  wert: (feld: string, spalte: (typeof spalten)[number]) => string,
) =>
  `<table class="werte"><thead><tr><th></th>${spalten
    .map((s) => `<th>${e(s.titel)}</th>`)
    .join("")}</tr></thead><tbody>${AUGEN.map(
    (a) =>
      `<tr><th>${a.seite}</th>${spalten
        .map((s) => `<td>${e(wert(`${s.feld}${a.endung}`, s))}</td>`)
        .join("")}</tr>`,
  ).join("")}</tbody></table>`;

export const buildKontaktlinseAuftragBodyHtml = ({
  cl,
  kunde,
  absender = RECHNUNG_ABSENDER,
}: KontaktlinseAuftragDaten) => {
  const k = kunde ?? {};
  const name = [text(k.Anrede), text(k.Vorname), text(k.Nachname)]
    .filter((t) => t && !/^keine angabe$/i.test(t))
    .join(" ");
  const anschrift = [
    [text(k.Straße), text(k.Hausnummer)].filter(Boolean).join(" "),
    [text(k.Postleitzahl), text(k.Stadt)].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");
  const telefon = text(k.Handy) || text(k.TelefonnummerPrivat);

  const zusatz = [1, 2, 3]
    .map((i) => ({
      titel: text(cl[`Zusatzleistung${i}`]),
      betrag: zahl(cl[`Zusatzbetrag${i}`]),
    }))
    .filter((z) => z.titel || z.betrag !== null);
  const posten = [
    ...AUGEN.map((a) => ({
      titel: `Kontaktlinse ${a.seite === "R" ? "rechts" : "links"}${
        text(cl[`Linsentyp${a.endung}`])
          ? ` – ${text(cl[`Linsentyp${a.endung}`])}`
          : ""
      }`,
      betrag: zahl(cl[`Preis${a.endung}`]),
    })).filter((p) => p.betrag !== null),
    ...zusatz,
  ];
  const summe = zahl(cl.Summe);
  const kk = zahl(cl.KKAnteil);
  const anzahlung = zahl(cl.Anzahlung);
  const rest = summe === null ? null : summe - (kk ?? 0) - (anzahlung ?? 0);
  const rabatt = zahl(cl.RabattProzent);

  const betraege = [
    ...posten.map((p) => [p.titel, euro(p.betrag)]),
    ...(rabatt
      ? [
          [
            `Rabatt ${text(cl.RabattBezeichnung)} ${formatWert(rabatt, "frei")} %`.replace(
              /\s+/g,
              " ",
            ),
            "",
          ],
        ]
      : []),
    ["Summe", euro(summe)],
    ...(kk ? [["abzgl. Anteil Krankenkasse", euro(kk)]] : []),
    ...(anzahlung ? [["abzgl. Anzahlung", euro(anzahlung)]] : []),
    ...(kk || anzahlung ? [["Restbetrag", euro(rest)]] : []),
  ];

  return `
<div class="seite">
  <div class="kopf">
    <img src="${logoSehzentrum}" alt="" />
    <div class="firma">
      <b>${e(absender.marke)}</b><br />
      ${e(absender.firma)} · ${e(absender.strasseLang)} · ${e(`${absender.plz} ${absender.ort}`)}<br />
      Tel. ${e(absender.telefon)} · ${e(absender.email)}
    </div>
    <div class="titel">
      <h1>Kontaktlinsen-Auftrag</h1>
      <div>Auftrag ${e(text(cl.id))}${text(cl.Rechnungsnummer) ? ` · Rechnung ${e(text(cl.Rechnungsnummer))}` : ""}</div>
      <div>vom ${e(formatDatum(cl.Datum))}</div>
    </div>
  </div>

  <h2>Kunde</h2>
  <div class="raster">
    ${angabe("Name", name)}
    ${angabe("Kunden-Nr.", text(k.KundenNummer) || text(k.id))}
    ${angabe("Anschrift", anschrift)}
    ${angabe("Geburtsdatum", formatDatum(k.Geburtsdatum))}
    ${angabe("Telefon", telefon)}
    ${angabe("E-Mail", text(k.Email))}
  </div>

  <h2>Anpassung</h2>
  <div class="raster">
    ${angabe("Linsenart", text(cl.Linsenart))}
    ${angabe("Anpassgrund", text(cl.Anpassgrund))}
    ${angabe("Anpasser", text(cl.Berater))}
    ${angabe("Abo-Lieferung", cl.AboLieferung ? "ja" : "nein")}
    ${angabe("Nachkontrolle", formatDatum(cl.Nachkontrolltermin))}
    ${angabe("Abholung", formatDatum(cl.Abholung))}
  </div>

  <h2>Linsenparameter</h2>
  ${augenTabelle(PARAMETER, (feld, s) => formatWert(cl[feld], (s as (typeof PARAMETER)[number]).format))}

  <h2>Linsen</h2>
  ${augenTabelle(LINSE, (feld) => text(cl[feld]))}

  <h2>Lieferung</h2>
  ${augenTabelle(LIEFERUNG, (feld, s) =>
    "datum" in s && s.datum ? formatDatum(cl[feld]) : text(cl[feld]),
  )}

  <div class="zwei">
    <div>
      <h2>Pflegemittel</h2>
      <div class="kasten">${e(text(cl.Pflegemittel)) || "&nbsp;"}</div>
      <h2>Notizen</h2>
      <div class="kasten notizen">${e(text(cl.Notizen)) || "&nbsp;"}</div>
    </div>
    <div>
      <h2>Leistungen und Beträge</h2>
      <table class="betraege">${betraege
        .map(
          ([t, w]) =>
            `<tr${/^(Summe|Restbetrag)$/.test(t) ? ' class="summe"' : ""}><td>${e(t)}</td><td>${e(w)}</td></tr>`,
        )
        .join("")}</table>
      ${text(cl.Zahlungsstatus) ? `<div class="zahlung">Zahlungsstatus: ${e(text(cl.Zahlungsstatus))}${cl.Zahlungsdatum ? ` am ${e(formatDatum(cl.Zahlungsdatum))}` : ""}</div>` : ""}
    </div>
  </div>

  <div class="hinweis">
    Ich wurde in das Einsetzen, Herausnehmen und die Pflege der Kontaktlinsen
    eingewiesen. Die Tragezeiten und Nachkontrolltermine wurden mit mir
    besprochen. Bei Rötung, Schmerzen oder Sehverschlechterung nehme ich die
    Linsen heraus und melde mich.
  </div>
  <div class="unterschrift">
    <div><div class="strich"></div>Ort, Datum</div>
    <div><div class="strich"></div>Unterschrift Kunde</div>
    <div><div class="strich"></div>Unterschrift Anpasser</div>
  </div>
</div>`;
};

const STYLES = `
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #1f2937; font-size: 9pt; line-height: 1.3; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .seite { width: 210mm; min-height: 297mm; padding: 12mm 14mm; background: #fff; }
  .kopf { display: flex; gap: 4mm; align-items: center; border-bottom: 0.4mm solid #1d4e8f; padding-bottom: 3mm; }
  .kopf img { width: 22mm; height: 17mm; object-fit: contain; }
  .kopf .firma { flex: 1; font-size: 8pt; color: #4b5563; }
  .kopf .firma b { font-size: 10pt; color: #1e2b4a; }
  .kopf .titel { text-align: right; font-size: 8.5pt; }
  h1 { font-size: 15pt; margin: 0 0 1mm; color: #1e2b4a; }
  h2 { font-size: 9.5pt; color: #1d4e8f; margin: 4mm 0 1.2mm; text-transform: uppercase; letter-spacing: 0.04em; }
  .raster { display: grid; grid-template-columns: 1fr 1fr; gap: 1mm 6mm; }
  .angabe { display: flex; gap: 2mm; border-bottom: 0.2mm solid #e5e7eb; padding: 0.6mm 0; }
  .angabe .t { width: 28mm; flex: none; color: #6b7280; }
  .angabe .w { flex: 1; }
  table { border-collapse: collapse; width: 100%; }
  table.werte th, table.werte td { border: 0.25mm solid #cbd5e1; padding: 1mm 1.2mm; text-align: center; }
  table.werte thead th { background: #eef3fa; font-size: 7.8pt; }
  table.werte tbody th { width: 8mm; background: #eef3fa; }
  table.werte td { font-size: 9.5pt; height: 6mm; }
  .zwei { display: grid; grid-template-columns: 1fr 1fr; gap: 6mm; }
  .kasten { border: 0.25mm solid #cbd5e1; min-height: 9mm; padding: 1.2mm 1.5mm; white-space: pre-wrap; }
  .kasten.notizen { min-height: 22mm; }
  table.betraege td { padding: 0.9mm 0; border-bottom: 0.2mm solid #e5e7eb; }
  table.betraege td:last-child { text-align: right; white-space: nowrap; padding-left: 3mm; }
  table.betraege tr.summe td { font-weight: bold; border-bottom: 0.3mm solid #1f2937; }
  .zahlung { margin-top: 1.5mm; font-size: 8.5pt; color: #4b5563; }
  .hinweis { margin-top: 6mm; font-size: 8pt; color: #374151; border: 0.25mm solid #cbd5e1; background: #f8fafc; padding: 2mm 2.5mm; }
  .unterschrift { display: flex; gap: 8mm; margin-top: 13mm; font-size: 8pt; color: #4b5563; }
  .unterschrift > div { flex: 1; }
  .strich { border-top: 0.25mm solid #6b7280; margin-bottom: 1mm; }
`;

export const buildKontaktlinseAuftragPrintHtml = (
  daten: KontaktlinseAuftragDaten,
): string => `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8" />
<title>Kontaktlinsen-Auftrag ${e(text(daten.cl.id))}</title>
<style>
  ${STYLES}
  @page { size: A4; margin: 0; }
</style>
</head>
<body>
${buildKontaktlinseAuftragBodyHtml(daten)}
</body>
</html>`;
