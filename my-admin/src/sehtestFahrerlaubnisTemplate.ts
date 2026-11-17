// Bescheinigung über die Untersuchung des Sehvermögens für die Klassen C, C1,
// CE, C1E, D, D1, DE, D1E und die Fahrgastbeförderung (Lkw/Bus) nach
// Anlage 6 Nr. 2.1 FeV (Kategorie "Sehvermögen Klasse C/D"), aufgebaut nach
// dem Muster der Anlage 6. Augenoptikerbetriebe dürfen sie ausstellen
// (§ 12 Abs. 6 FeV, § 67 Abs. 4 FeV).
//
// Seite 1 ist Teil 1 (bleibt im Betrieb), Seite 2 Teil 2 (bekommt der Kunde
// für die Fahrerlaubnisbehörde). Ausgefüllt wird nur Teil 1 in der Vorschau,
// Teil 2 übernimmt alle Eingaben automatisch und hat zusätzlich die Nummer
// des Personalausweises.
//
// Automatisch übernommen: Personalien, Datum der Untersuchung, Visus ohne
// und mit Korrektur aus dem Auftrag, Bearbeiter und Betrieb; Stempel und
// Unterschrift aus den Einstellungen. Die Grenzwerte (je Auge 0,8,
// beidäugig 1,0, Korrektur höchstens +8,0 dpt sphärisches Äquivalent) prüft
// die Vorschau beim Eintippen und schlägt das Ergebnis vor; gedruckt wird
// der Stand der Vorschau.
import dayjs from "dayjs";
import type {
  DocumentMergeEntities,
  MergeSource,
} from "./documentTemplateEngine";
import { RECHNUNG_ABSENDER, escapeHtml } from "./rechnungTemplate";
import { formatDatum, formatWert, text } from "./werkstattauftragTemplate";
import { mitarbeiterAnzeige } from "./mitarbeiterNamen";
import {
  type BetriebBilder,
  betriebBilder,
  bildUrl,
} from "./betriebBilderCache";
import { KAESTCHEN_STYLES } from "./formularVorschlaege";

export type SehtestFahrerlaubnisDaten = {
  entities: DocumentMergeEntities;
  // Stempel/Unterschrift; ohne Angabe die privat gespeicherten Bilder
  bilder?: BetriebBilder;
};

/** Grenzwerte nach Anlage 6 Nr. 2.1.1 FeV. */
export const GRENZWERTE_C_D = {
  jedesAuge: 0.8,
  beidaeugig: 1.0,
  // höchstes zulässiges sphärisches Äquivalent der Brillenkorrektur (dpt);
  // gilt nicht für Intraokularlinsen und Kontaktlinsen
  maxSphaerischesAequivalent: 8,
} as const;

/** Visus aus einer Eingabe wie "0,8", "1.0" oder "1"; sonst null. */
export const visusZahl = (eingabe: unknown): number | null => {
  const s = text(eingabe).replace(",", ".").trim();
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  const zahl = Number(s);
  return Number.isFinite(zahl) ? zahl : null;
};

export type Sehschaerfe = {
  rechts?: unknown;
  links?: unknown;
  beidaeugig?: unknown;
};

/**
 * Prüft die Tagessehschärfe gegen Anlage 6 Nr. 2.1.1: "erreicht",
 * "nicht erreicht" oder "unvollständig" (ein Wert fehlt), dazu die
 * Unterschreitungen im Klartext.
 */
export const pruefeSehschaerfe = (
  werte: Sehschaerfe,
): {
  ergebnis: "erreicht" | "nicht erreicht" | "unvollständig";
  maengel: string[];
} => {
  const g = GRENZWERTE_C_D;
  const pruefungen: [string, unknown, number][] = [
    ["rechts", werte.rechts, g.jedesAuge],
    ["links", werte.links, g.jedesAuge],
    ["beidäugig", werte.beidaeugig, g.beidaeugig],
  ];
  const maengel: string[] = [];
  let fehlt = false;
  for (const [seite, wert, grenze] of pruefungen) {
    const zahl = visusZahl(wert);
    if (zahl === null) fehlt = true;
    else if (zahl < grenze)
      maengel.push(
        `${seite} ${formatWert(zahl, "visus")} (mindestens ${formatWert(grenze, "visus")})`,
      );
  }
  return {
    ergebnis: maengel.length
      ? "nicht erreicht"
      : fehlt
        ? "unvollständig"
        : "erreicht",
    maengel,
  };
};

/** Sphärisches Äquivalent Sph + Cyl/2 eines Glases; null ohne Sphäre. */
export const sphaerischesAequivalent = (glas: MergeSource): number | null => {
  const sph = Number(glas?.Sph);
  if (glas?.Sph === undefined || glas?.Sph === null || !Number.isFinite(sph))
    return null;
  const cyl = Number(glas?.Cyl);
  return sph + (Number.isFinite(cyl) ? cyl / 2 : 0);
};

/** Augen, deren Korrektur das zulässige sphärische Äquivalent übersteigt. */
export const zuStarkeKorrektur = (
  rechts: MergeSource,
  links: MergeSource,
): string[] =>
  (
    [
      ["rechts", rechts],
      ["links", links],
    ] as const
  )
    .filter(([, glas]) => {
      const se = sphaerischesAequivalent(glas);
      return se !== null && se > GRENZWERTE_C_D.maxSphaerischesAequivalent;
    })
    .map(([seite]) => seite);

const e = escapeHtml;

// Eingabefeld in Teil 1; `feld` verbindet es mit der Kopie in Teil 2
const eingabe = (feld: string, wert = "", hinweis = "", klasse = "") =>
  `<span class="eingabe ${klasse}" contenteditable="true" data-feld="${feld}" data-hinweis="${e(hinweis)}">${e(wert)}</span>`;

// Kopie eines Feldes aus Teil 1 in Teil 2 (nicht editierbar)
const kopie = (feld: string, wert = "", klasse = "") =>
  `<span class="eingabe kopie ${klasse}" data-kopie="${feld}">${e(wert)}</span>`;

// Kästchen; in Teil 1 umschaltbar, in Teil 2 Kopie
const box = (feld: string, teil: 1 | 2, angekreuzt = false) =>
  teil === 1
    ? `<input type="checkbox" class="kaestchen" data-feld="${feld}"${angekreuzt ? " checked" : ""} />`
    : `<input type="checkbox" class="kaestchen" data-kopie="${feld}" tabindex="-1"${angekreuzt ? " checked" : ""} />`;

const feldOderKopie = (teil: 1 | 2) =>
  teil === 1
    ? (feld: string, wert = "", hinweis = "", klasse = "") =>
        eingabe(feld, wert, hinweis, klasse)
    : (feld: string, wert = "", ...rest: string[]) =>
        kopie(feld, wert, rest[1] ?? "");

// übrige Sehfunktionen nach Anlage 6 Nr. 2.1.2: Feld, Bezeichnung,
// vorgeschlagenes Prüfverfahren
const SEHFUNKTIONEN: [string, string, string][] = [
  ["farbe", "Farbensehen", "Ishihara-Tafeln"],
  ["gesichtsfeld", "Gesichtsfeld", "automatisches Halbkugelperimeter"],
  ["stereo", "Stereosehen", "Random-Dot-Test"],
  ["kontrast", "Kontrast- oder Dämmerungssehen", ""],
];

const ERGEBNISSE: [string, string][] = [
  ["ohne", "erreicht, ohne Sehhilfe"],
  ["mit", "erreicht, mit Sehhilfe"],
  ["nicht", "nicht erreicht"],
];

const teilHtml = (
  teil: 1 | 2,
  { entities, bilder = betriebBilder() }: SehtestFahrerlaubnisDaten,
) => {
  const k: Record<string, unknown> = entities.kunde ?? {};
  const brille: Record<string, unknown> = entities.brille ?? {};
  const { glasRechts: r, glasLinks: l } = entities;
  const a = RECHNUNG_ABSENDER;
  const f = feldOderKopie(teil);
  const visus = (wert: unknown) => formatWert(wert, "visus");
  const datum = text(brille.Datum)
    ? formatDatum(brille.Datum)
    : dayjs().format("DD.MM.YYYY");
  const stempel = bildUrl(bilder.stempel);
  const unterschrift = bildUrl(bilder.unterschrift);
  const anschrift = [
    [k.Straße, k.Hausnummer].map(text).filter(Boolean).join(" "),
    [k.Postleitzahl, k.Stadt].map(text).filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");

  return `
<div class="seite teil${teil}">
  <div class="teil">Teil ${teil} &nbsp;–&nbsp; ${
    teil === 1
      ? "verbleibt bei der untersuchenden Stelle"
      : "zur Vorlage bei der Fahrerlaubnisbehörde"
  }</div>
  <h1>Bescheinigung über die Untersuchung des Sehvermögens</h1>
  <div class="unter">nach Anlage 6 Nummer 2.1 der Fahrerlaubnis-Verordnung (FeV) &nbsp;·&nbsp; Klassen C, C1, CE, C1E, D, D1, DE, D1E und Fahrerlaubnis zur Fahrgastbeförderung</div>

  <h2>Untersuchende Stelle</h2>
  <table class="raster">
    <tr><td class="lbl">Augenoptikerbetrieb</td><td>${e(a.firma)}${a.marke ? ` (${e(a.marke)})` : ""}, ${e(a.strasseLang)}, ${e(a.plz)} ${e(a.ort)}</td></tr>
    <tr><td class="lbl">Untersuchender Augenoptiker</td><td>${f("optiker", text(mitarbeiterAnzeige(brille.Berater)) || a.inhaber, "Vor- und Nachname")}</td></tr>
  </table>

  <h2>Personalien</h2>
  <table class="raster">
    <tr><td class="lbl">Name, Vorname</td><td>${f("name", [text(k.Nachname), text(k.Vorname)].filter(Boolean).join(", "), "Name, Vorname")}</td></tr>
    <tr><td class="lbl">Geburtsdatum</td><td>${f("geburt", formatDatum(k.Geburtsdatum), "TT.MM.JJJJ")}</td></tr>
    <tr><td class="lbl">Anschrift</td><td>${f("anschrift", anschrift, "Straße Nr., PLZ Ort")}</td></tr>
    ${
      teil === 2
        ? `<tr><td class="lbl">Nr. des Personalausweises / Passes</td><td>${eingabe("ausweis", "", "Ausweisnummer")}</td></tr>`
        : ""
    }
    <tr><td class="lbl">Datum des Untersuchungsbefundes</td><td>${f("datum", datum, "TT.MM.JJJJ")}</td></tr>
  </table>

  <h2>Befund</h2>
  <table class="befund">
    <tr><th>Zentrale Tagessehschärfe (DIN 58220 Teil 6)</th><th>rechts</th><th>links</th><th>beidäugig</th></tr>
    <tr><td>ohne Sehhilfe</td><td>${f("sc_r", visus(r?.VisSC), "Visus", "zahl")}</td><td>${f("sc_l", visus(l?.VisSC), "Visus", "zahl")}</td><td>${f("sc_b", "", "Visus", "zahl")}</td></tr>
    <tr><td>mit Sehhilfe</td><td>${f("cc_r", visus(r?.Vis), "Visus", "zahl")}</td><td>${f("cc_l", visus(l?.Vis), "Visus", "zahl")}</td><td>${f("cc_b", "", "Visus", "zahl")}</td></tr>
    <tr><td colspan="4" class="klein">Anforderung: jedes Auge mindestens 0,8, beidäugig mindestens 1,0. Korrektur mit Gläsern von mehr als +8,0 dpt (sphärisches Äquivalent) ist nicht zulässig; dies gilt nicht für intraokulare Linsen oder Kontaktlinsen.</td></tr>
  </table>
  <table class="befund">
    <tr><th>Übrige Sehfunktionen</th><th>Prüfverfahren</th><th class="mitte">normal / ausreichend</th><th class="mitte">nicht ausreichend</th></tr>
    ${SEHFUNKTIONEN.map(
      ([feld, name, verfahren]) =>
        `<tr><td>${e(name)}</td><td>${f(`${feld}_verfahren`, verfahren, "Prüfverfahren")}</td><td class="mitte">${box(`${feld}_ok`, teil)}</td><td class="mitte">${box(`${feld}_nein`, teil)}</td></tr>`,
    ).join("")}
  </table>

  <h2>Ergebnis</h2>
  <div class="ergebnis">
    <div>Die Anforderungen an das Sehvermögen nach Anlage 6 Nummer 2.1 FeV wurden</div>
    <div class="wahl">${ERGEBNISSE.map(
      ([feld, name]) =>
        `<label>${box(`ergebnis_${feld}`, teil)} ${e(name)}</label>`,
    ).join("")}</div>
    <div>Augenärztliche Zusatzuntersuchung nach Anlage 6 Nummer 2.2 FeV erforderlich:</div>
    <div class="wahl">
      <label>${box("zusatz_ja", teil)} ja</label>
      <label>${box("zusatz_nein", teil)} nein</label>
    </div>
  </div>
  ${
    teil === 2
      ? `<div class="vermerk"><div>Das Zeugnis ist zwei Jahre gültig.</div><div>Die Identität des Untersuchten wurde geprüft.</div></div>`
      : ""
  }

  <div class="unterschrift">
    <div class="stempelfeld">${
      unterschrift
        ? `<img class="unterschrift-bild" src="${unterschrift}" alt="" />`
        : ""
    }${stempel ? `<img class="stempel-bild" src="${stempel}" alt="" />` : ""}</div>
    <div class="linie">Ort, Datum &nbsp;·&nbsp; Stempel des Augenoptikerbetriebs und Unterschrift des Augenoptikers</div>
  </div>
</div>`;
};

// Hinweise nur am Bildschirm (werden nicht gedruckt)
const hinweisHtml = (entities: DocumentMergeEntities) => {
  const zuStark = zuStarkeKorrektur(entities.glasRechts, entities.glasLinks);
  return `
<div class="hinweise" data-nur-vorschau>
  <b>Nur Teil 1 ausfüllen</b> – Teil 2 (Seite 2) übernimmt alle Eingaben; dort nur noch die Ausweisnummer eintragen. Das Ergebnis wird aus den Werten vorgeschlagen und lässt sich durch Anklicken ändern.
  ${
    zuStark.length
      ? `<div class="warnung">Korrektur im Auftrag ${zuStark.join(" und ")} über +8,0 dpt sphärisches Äquivalent: mit dieser Brille ist die Anforderung nicht erfüllbar (außer Kontaktlinsen/Intraokularlinse).</div>`
      : ""
  }
  <div class="warnung" id="visus-warnung" hidden></div>
</div>`;
};

// Vorschau-Logik: Teil 2 spiegelt Teil 1, Grenzwerte prüfen, Ergebnis
// vorschlagen. Steht im <script data-nur-vorschau> und wird nicht gedruckt.
const vorschauSkript = () => `
<script data-nur-vorschau>
(function () {
  var G = ${JSON.stringify(GRENZWERTE_C_D)};
  var d = document;
  var teil1 = function (feld) { return d.querySelector('.teil1 [data-feld="' + feld + '"]'); };
  var zahl = function (feld) {
    var el = teil1(feld);
    var s = el ? el.textContent.replace(",", ".").trim() : "";
    return /^\\d+(\\.\\d+)?$/.test(s) ? Number(s) : null;
  };
  var setze = function (feld, an) { var b = teil1(feld); if (b) b.checked = an; };
  var paare = [["zusatz_ja", "zusatz_nein"]];
  ["farbe", "gesichtsfeld", "stereo", "kontrast"].forEach(function (f) { paare.push([f + "_ok", f + "_nein"]); });
  var ergebnisse = ["ergebnis_ohne", "ergebnis_mit", "ergebnis_nicht"];

  var spiegeln = function () {
    d.querySelectorAll("[data-kopie]").forEach(function (k) {
      var q = teil1(k.getAttribute("data-kopie"));
      if (!q) return;
      if (k.type === "checkbox") k.checked = q.checked; else k.textContent = q.textContent;
    });
  };

  // Sehschärfe gegen die Grenzwerte: true erfüllt, false nicht, null offen
  var reihe = function (p) {
    var w = [zahl(p + "_r"), zahl(p + "_l"), zahl(p + "_b")];
    var g = [G.jedesAuge, G.jedesAuge, G.beidaeugig];
    var mangel = false, fehlt = false;
    ["_r", "_l", "_b"].forEach(function (s, i) {
      var el = teil1(p + s);
      var zuNiedrig = w[i] !== null && w[i] < g[i];
      if (el) el.classList.toggle("unter-grenze", zuNiedrig);
      if (zuNiedrig) mangel = true;
      if (w[i] === null) fehlt = true;
    });
    return mangel ? false : fehlt ? null : true;
  };

  var auswerten = function () {
    var ohne = reihe("sc");
    var mit = reihe("cc");
    var funktionenOk = true, funktionenOffen = false;
    paare.slice(1).forEach(function (p) {
      var ok = teil1(p[0]).checked, nein = teil1(p[1]).checked;
      if (nein) funktionenOk = false;
      if (!ok && !nein) funktionenOffen = true;
    });
    var warnung = d.getElementById("visus-warnung");
    var sehschaerfeNicht = ohne !== true && mit === false;
    if (warnung) {
      warnung.hidden = !sehschaerfeNicht;
      warnung.textContent = "Tagessehschärfe unter dem Grenzwert (jedes Auge 0,8, beidäugig 1,0): Anforderung nicht erreicht, augenärztliche Zusatzuntersuchung nach Nr. 2.2 nötig.";
    }
    var ergebnis = null;
    if (sehschaerfeNicht || !funktionenOk) ergebnis = "ergebnis_nicht";
    else if (!funktionenOffen && ohne === true) ergebnis = "ergebnis_ohne";
    else if (!funktionenOffen && mit === true) ergebnis = "ergebnis_mit";
    if (ergebnis) {
      ergebnisse.forEach(function (f) { setze(f, f === ergebnis); });
      setze("zusatz_ja", ergebnis === "ergebnis_nicht");
      setze("zusatz_nein", ergebnis !== "ergebnis_nicht");
    }
  };

  var meldet = false;
  var aktualisieren = function (ausgeloest) {
    var feld = ausgeloest && ausgeloest.getAttribute && ausgeloest.getAttribute("data-feld");
    // Kästchenpaare und Ergebnis schließen sich gegenseitig aus
    if (feld && ausgeloest.checked) {
      paare.concat([ergebnisse]).forEach(function (gruppe) {
        if (gruppe.indexOf(feld) >= 0)
          gruppe.forEach(function (f) { if (f !== feld) setze(f, false); });
      });
    }
    // Werte und Befunde schlagen das Ergebnis vor, ein Klick aufs Ergebnis nicht
    if (!feld || feld.indexOf("ergebnis_") !== 0 && feld.indexOf("zusatz_") !== 0) auswerten();
    spiegeln();
    // Stand der Kästchen an das Formularfenster melden
    if (!meldet) { meldet = true; d.body.dispatchEvent(new Event("change", { bubbles: true })); meldet = false; }
  };

  d.addEventListener("input", function (ev) { aktualisieren(ev.target); });
  d.addEventListener("change", function (ev) { if (!meldet && ev.target !== d.body) aktualisieren(ev.target); });
  // Teil-2-Kästchen nicht direkt umschaltbar
  d.addEventListener("click", function (ev) {
    if (ev.target.hasAttribute && ev.target.hasAttribute("data-kopie")) ev.preventDefault();
  });
  window.addEventListener("load", function () { setTimeout(function () { spiegeln(); auswerten(); spiegeln(); }, 50); });
  auswerten();
  spiegeln();
})();
</script>`;

export const buildSehtestFahrerlaubnisBodyHtml = (
  daten: SehtestFahrerlaubnisDaten,
): string => `${teilHtml(1, daten)}${teilHtml(2, daten)}`;

const STYLES = `
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #222; font-size: 9.5pt; line-height: 1.35; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .seite { position: relative; width: 210mm; height: 296mm; padding: 14mm 18mm 12mm; overflow: hidden; background: #fff; page-break-after: always; }
  .seite:last-child { page-break-after: auto; }
  .teil { font-size: 8pt; font-weight: bold; color: #666; text-transform: uppercase; letter-spacing: 0.2mm; border-bottom: 0.3mm solid #222; padding-bottom: 1mm; margin-bottom: 4mm; }
  h1 { font-size: 14pt; margin: 0 0 1mm; }
  .unter { font-size: 8.5pt; color: #444; margin-bottom: 4mm; }
  h2 { font-size: 10.5pt; margin: 4.5mm 0 1.5mm; }
  table { width: 100%; border-collapse: collapse; }
  .raster td { border: 0.2mm solid #555; padding: 1.2mm 2mm; vertical-align: middle; }
  .raster td.lbl { width: 62mm; background: #f2f2f2; font-weight: bold; font-size: 8.8pt; }
  .befund { margin-bottom: 2.5mm; }
  .befund th { background: #e6e6e6; text-align: left; font-size: 8.8pt; padding: 1.2mm 2mm; border: 0.2mm solid #555; }
  .befund td { border: 0.2mm solid #555; padding: 1.2mm 2mm; }
  .befund td:first-child { width: 62mm; }
  .befund .mitte { text-align: center; width: 30mm; }
  .klein { font-size: 7.6pt; color: #444; }
  .eingabe { display: inline-block; min-width: 100%; min-height: 1.3em; outline: none; white-space: pre-wrap; }
  .eingabe.zahl { text-align: center; }
  .kaestchen { width: 4.4mm; height: 4.4mm; margin: 0; border: 0.3mm solid #222; vertical-align: -0.8mm; }
  .ergebnis > div { margin: 1.5mm 0; }
  .wahl { display: flex; gap: 9mm; padding-left: 4mm; }
  .wahl label { display: inline-flex; gap: 2mm; align-items: center; }
  .vermerk { margin-top: 5mm; font-weight: bold; }
  .vermerk div { margin: 1mm 0; }
  .unterschrift { position: absolute; left: 18mm; right: 18mm; bottom: 16mm; }
  .stempelfeld { position: relative; height: 30mm; }
  .unterschrift-bild { position: absolute; left: 60mm; bottom: 0; height: 14mm; max-width: 40mm; object-fit: contain; }
  .stempel-bild { position: absolute; left: 100mm; bottom: -2mm; height: 28mm; max-width: 60mm; object-fit: contain; }
  .linie { border-top: 0.25mm solid #222; padding-top: 1mm; font-size: 8.5pt; }
  ${KAESTCHEN_STYLES}
`;

// nur am Bildschirm: Eingabefelder markieren, Grenzwertverletzungen rot
const BILDSCHIRM_STYLES = `
  @media screen {
    .teil1 .eingabe { background: #f3f8ff; border-radius: 2px; cursor: text; }
    .teil1 .eingabe:focus { background: #e3efff; }
    .teil2 [data-feld] { background: #f3f8ff; border-radius: 2px; cursor: text; }
    .eingabe:empty::before { content: attr(data-hinweis); color: #9aa8bb; font-style: italic; }
    .eingabe.unter-grenze { background: #fde2e2 !important; color: #a40000; font-weight: bold; }
    .teil2 input[data-kopie] { cursor: default; }
    .hinweise { width: 210mm; margin: 12px auto 0; padding: 8px 12px; background: #fff8e1; border: 1px solid #f0c36d; border-radius: 4px; font-size: 9.5pt; }
    .warnung { margin-top: 6px; color: #a40000; font-weight: bold; }
  }
`;

const html = (inhalt: string, extra: string) => `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8" />
<title>Bescheinigung Sehvermögen Klasse C/D</title>
<style>
  ${STYLES}
  ${extra}
  @page { size: A4; margin: 0; }
</style>
</head>
<body>
${inhalt}
</body>
</html>`;

export const buildSehtestFahrerlaubnisPrintHtml = (
  daten: SehtestFahrerlaubnisDaten,
): string => html(buildSehtestFahrerlaubnisBodyHtml(daten), "");

export const buildSehtestFahrerlaubnisPreviewHtml = (
  daten: SehtestFahrerlaubnisDaten,
): string =>
  html(
    `${hinweisHtml(daten.entities)}${buildSehtestFahrerlaubnisBodyHtml(daten)}${vorschauSkript()}`,
    `${BILDSCHIRM_STYLES}
  html { background: #eee; }
  .seite { margin: 12px auto; box-shadow: 0 1px 6px rgba(0, 0, 0, 0.2); }
  @media print { html { background: none; } .seite { margin: 0; box-shadow: none; } .hinweise { display: none; } }`,
  );
