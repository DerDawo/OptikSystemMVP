// Bescheinigung über die Untersuchung des Arztes oder eines
// Augenoptikerbetriebs nach Anlage 6 Nummer 2.1 FeV (Kategorie
// "Sehvermögen Klasse C/D"; Lkw/Bus und Fahrgastbeförderung). Wortlaut und
// Aufbau unverändert nach dem amtlichen Muster der FeV (gesetze-im-internet.de,
// Stand 18.08.2026, Seiten 102–104): Seite 1 = Teil 1 (Vorderseite, verbleibt
// im Betrieb), Seite 2 = Teil 2 (Rückseite, dem Bewerber auszuhändigen).
// Augenoptikerbetriebe dürfen sie ausstellen (§ 12 Abs. 6, § 67 Abs. 4 FeV).
//
// Ausgefüllt wird nur Teil 1 in der Vorschau, Teil 2 übernimmt die Eingaben
// und hat zusätzlich die Nummer des Personalausweises. Automatisch
// übernommen: Personalien, Datum, Visus ohne/mit Korrektur aus dem Auftrag,
// Bearbeiter, Betrieb, Stempel und Unterschrift. Die Grenzwerte (je Auge 0,8,
// beidäugig 1,0, höchstens +8,0 dpt sphärisches Äquivalent) prüft die
// Vorschau beim Eintippen und schlägt das Ergebnis vor; Hinweise und Prüfung
// erscheinen nur am Bildschirm, gedruckt wird nur das Muster.
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
import { buildMerkblattSehtestLkwPrintHtml } from "./merkblattSehtestLkwTemplate";

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
const kopie = (feld: string, wert = "") =>
  `<span class="eingabe kopie" data-kopie="${feld}">${e(wert)}</span>`;

// Kästchen; in Teil 1 umschaltbar, in Teil 2 Kopie
const box = (feld: string, teil: 1 | 2) =>
  teil === 1
    ? `<input type="checkbox" class="kaestchen" data-feld="${feld}" />`
    : `<input type="checkbox" class="kaestchen" data-kopie="${feld}" tabindex="-1" />`;

// Kopf und Einleitung wie im Muster (Teil 1 und Teil 2 unterscheiden sich
// im Muster geringfügig in der Aufzählung der Klassen)
const KOPF = `
  <div class="muster">Muster</div>
  <div class="titel">Bescheinigung über die Untersuchung des Arztes oder eines Augenoptikerbetriebs<br />(Anlage 6 Nummer 2.1 der Fahrerlaubnis-Verordnung)</div>`;
const EINLEITUNG_TEIL1 =
  "von Bewerbern um die Erteilung oder Verlängerung einer Fahrerlaubnis der Klassen C, C1, CE, C1E, D, D1, DE, D1E oder der Fahrerlaubnis zur Fahrgastbeförderung nach § 12 Absatz 6 und § 48 Absatz 4 Nummer 4 und Absatz 5 Nummer 2 der Fahrerlaubnis-Verordnung";
const EINLEITUNG_TEIL2 =
  "von Bewerbern um die Erteilung oder Verlängerung einer Fahrerlaubnis der Klassen C, C1, CE, C1E, D, D1, DE oder D1E oder der Fahrerlaubnis zur Fahrgastbeförderung nach § 12 Absatz 6 und § 48 Absatz 4 Nummer 4 und Absatz 5 Nummer 2 der Fahrerlaubnis-Verordnung";
const ARZT_TEXT =
  "Name, Facharztbezeichnung, ggf. Gebiets- oder Zusatzbezeichnung des Arztes, ggf. Angabe über Tätigkeit bei einer Begutachtungsstelle für Fahreignung oder über Stellung als Arzt der öffentlichen Verwaltung, Anschrift";

const punkt = (nummer: string, titel: string, inhalt = "") =>
  `<div class="punkt"><span class="nr">${nummer}</span><div class="inhalt"><b>${titel}</b>${inhalt}</div></div>`;

const zeile = (label: string, wert: string) =>
  `<div class="zeile"><span class="label">${label}</span> ${wert}</div>`;

type Werte = {
  betrieb: string;
  optiker: string;
  name: string;
  geburt: string;
  wohnort: string;
  strasse: string;
  datum: string;
  heute: string;
  ort: string;
  scR: string;
  scL: string;
  ccR: string;
  ccL: string;
};

const teil1Html = (w: Werte) => `
<div class="seite teil1">
  ${KOPF}
  <p class="einleitung">${EINLEITUNG_TEIL1}</p>
  <div class="seitenangabe">– Vorderseite –</div>
  <p><b>Teil 1</b> (verbleibt beim Arzt)</p>
  ${punkt("1.", "Angaben über den untersuchenden Arzt oder Augenoptikerbetrieb", `<br />${ARZT_TEXT}`)}
  ${punkt("1.1", "Angaben über den untersuchenden Arzt", `<br />${ARZT_TEXT} oder`)}
  ${punkt(
    "1.2",
    "Angaben über den untersuchenden Augenoptikerbetrieb",
    `<br />Name und Anschrift des Augenoptikerbetriebs, Name des die Untersuchung durchführenden Augenoptikers.
    <div class="angabe">${eingabe("betrieb", w.betrieb, "Name und Anschrift des Betriebs", "lang")}<br />${eingabe("optiker", w.optiker, "Name des Augenoptikers", "lang")}</div>`,
  )}
  ${punkt(
    "2.",
    "Personalien des Bewerbers",
    `<div class="liste">
      ${zeile("Familienname, Vornamen:", eingabe("name", w.name, ".........."))}
      ${zeile("Tag der Geburt:", eingabe("geburt", w.geburt, ".........."))}
      ${zeile("Ort der Geburt:", eingabe("geburtsort", "", ".........."))}
      ${zeile("Wohnort:", eingabe("wohnort", w.wohnort, ".........."))}
      ${zeile("Straße/Hausnummer:", eingabe("strasse", w.strasse, ".........."))}
    </div>`,
  )}
  ${punkt(
    "3.",
    `Untersuchungsbefund vom</b> ${eingabe("datum", w.datum, "..........")}<b>`,
    `<div class="liste">
      ${zeile(
        "Zentrale Tagessehschärfe nach DIN 58220",
        `<span class="visus">ohne Sehhilfe: R ${eingabe("sc_r", w.scR, "…", "zahl")} L ${eingabe("sc_l", w.scL, "…", "zahl")} bds. ${eingabe("sc_b", "", "…", "zahl")} &nbsp;·&nbsp; mit Sehhilfe: R ${eingabe("cc_r", w.ccR, "…", "zahl")} L ${eingabe("cc_l", w.ccL, "…", "zahl")} bds. ${eingabe("cc_b", "", "…", "zahl")}</span>`,
      )}
      ${zeile("Farbensehen", eingabe("farbe", "", "z. B. normal (Ishihara)"))}
      ${zeile("Gesichtsfeld", eingabe("gesichtsfeld", "", "z. B. normal (Halbkugelperimeter)"))}
      ${zeile("Stereosehen", eingabe("stereo", "", "z. B. vorhanden (Random-Dot-Test)"))}
      ${zeile("Kontrast- oder Dämmerungssehen", eingabe("kontrast", "", "z. B. ausreichend (Verfahren)"))}
    </div>`,
  )}
  <p>Aufgrund der oben angeführten Untersuchung wurden die Anforderungen nach Anlage 6 Nummer 2.1 der Fahrerlaubnis-Verordnung</p>
  <div class="kreuze">
    <label>${box("ergebnis_ohne", 1)} erreicht, ohne Sehhilfe</label>
    <label>${box("ergebnis_mit", 1)} erreicht, mit Sehhilfe</label>
    <label>${box("ergebnis_nicht", 1)} nicht erreicht</label>
  </div>
  <p>Eine augenärztliche Zusatzuntersuchung nach Anlage 6 Nummer 2.2 der Fahrerlaubnis-Verordnung ist erforderlich:</p>
  <div class="kreuze nebeneinander"><label>${box("zusatz_ja", 1)} ja</label><label>${box("zusatz_nein", 1)} nein</label></div>
  <div class="seitenangabe unten">– Rückseite –</div>
</div>`;

const teil2Html = (w: Werte, stempel: string, unterschrift: string) => `
<div class="seite teil2">
  ${KOPF}
  <p class="einleitung">${EINLEITUNG_TEIL2}</p>
  <p><b>Teil 2</b> (dem Bewerber auszuhändigen)</p>
  ${punkt("1.", "Angaben über den untersuchenden Arzt oder Augenoptikerbetrieb")}
  ${punkt("1.1.", "Angaben über den untersuchenden Arzt", `<br />Name des Arztes, Facharztbezeichnung, ggf. Gebiets- oder Zusatzbezeichnung des Arztes, ggf. Angabe über Tätigkeit bei einer Begutachtungsstelle für Fahreignung oder über Stellung als Arzt der öffentlichen Verwaltung, Anschrift oder`)}
  ${punkt(
    "1.2.",
    "Angaben über den untersuchenden Augenoptikerbetrieb",
    `<br />Name und Anschrift des Augenoptikerbetriebs, Name des die Untersuchung durchführenden Augenoptikers
    <div class="angabe">${kopie("betrieb", w.betrieb)}<br />${kopie("optiker", w.optiker)}</div>`,
  )}
  ${punkt(
    "2.",
    "Personalien des Bewerbers",
    `<div class="liste eng">
      ${zeile("Familienname, Vornamen des Bewerbers:", kopie("name", w.name))}
      ${zeile("Tag der Geburt:", kopie("geburt", w.geburt))}
      ${zeile("Ort der Geburt:", kopie("geburtsort"))}
      ${zeile("Wohnort:", kopie("wohnort", w.wohnort))}
      ${zeile("Straße/Hausnummer:", kopie("strasse", w.strasse))}
      ${zeile("Nummer des Personalausweises:", eingabe("ausweis", "", "Ausweisnummer eintragen"))}
    </div>`,
  )}
  ${punkt(
    "3.",
    `Untersuchungsbefund vom</b> ${kopie("datum", w.datum)} <b>über`,
    `<ul class="striche">
      <li>Zentrale Tagessehschärfe nach DIN 58220</li>
      <li>Farbensehen</li>
      <li>Kontrast- oder Dämmerungssehen</li>
      <li>Gesichtsfeld</li>
      <li>Stereosehen</li>
    </ul>`,
  )}
  <p>Aufgrund der von mir nach Teil 1 erhobenen Befunde wurden die in Anlage 6 Nummer 2.1 der Fahrerlaubnis-Verordnung geforderten Anforderungen</p>
  <div class="kreuze">
    <label>${box("ergebnis_ohne", 2)} erreicht, ohne Sehhilfe</label>
    <label>${box("ergebnis_mit", 2)} erreicht, mit Sehhilfe</label>
    <label>${box("ergebnis_nicht", 2)} nicht erreicht</label>
  </div>
  <p>Eine augenärztliche Zusatzuntersuchung nach Anlage 6 Nummer 2.2 der Fahrerlaubnis-Verordnung ist erforderlich:</p>
  <div class="kreuze nebeneinander"><label>${box("zusatz_ja", 2)} ja</label><label>${box("zusatz_nein", 2)} nein</label></div>
  <p>Das Zeugnis ist zwei Jahre gültig.</p>
  <p>Die Identität des Untersuchten wurde geprüft.</p>
  <div class="schluss">
    <div class="ortdatum">${eingabe("ort", w.ort, "Ort")}, den ${eingabe("ausstellung", w.heute, "Datum")}</div>
    <div class="zeichnung">
      <div class="stempelfeld">${
        unterschrift
          ? `<img class="unterschrift-bild" src="${unterschrift}" alt="" />`
          : ""
      }${stempel ? `<img class="stempel-bild" src="${stempel}" alt="" />` : ""}</div>
      <div>Stempel und Unterschrift des Arztes<br />mit den oben stehenden beruflichen Angaben</div>
      <div class="oder">oder</div>
      <div>Stempel des Augenoptikerbetriebs<br />und Unterschrift des die Untersuchung<br />durchführenden und bescheinigenden Augenoptikers</div>
    </div>
  </div>
</div>`;

export const buildSehtestFahrerlaubnisBodyHtml = ({
  entities,
  bilder = betriebBilder(),
}: SehtestFahrerlaubnisDaten): string => {
  const k: Record<string, unknown> = entities.kunde ?? {};
  const brille: Record<string, unknown> = entities.brille ?? {};
  const { glasRechts: r, glasLinks: l } = entities;
  const a = RECHNUNG_ABSENDER;
  const visus = (wert: unknown) => formatWert(wert, "visus");
  const w: Werte = {
    betrieb: [
      [a.firma, a.marke ? `(${a.marke})` : ""].filter(Boolean).join(" "),
      a.strasseLang,
      `${a.plz} ${a.ort}`,
    ].join(", "),
    optiker: text(mitarbeiterAnzeige(brille.Berater)) || a.inhaber,
    name: [text(k.Nachname), text(k.Vorname)].filter(Boolean).join(", "),
    geburt: formatDatum(k.Geburtsdatum),
    wohnort: [k.Postleitzahl, k.Stadt].map(text).filter(Boolean).join(" "),
    strasse: [k.Straße, k.Hausnummer].map(text).filter(Boolean).join(" "),
    datum: text(brille.Datum)
      ? formatDatum(brille.Datum)
      : dayjs().format("DD.MM.YYYY"),
    heute: dayjs().format("DD.MM.YYYY"),
    ort: a.ort,
    scR: visus(r?.VisSC),
    scL: visus(l?.VisSC),
    ccR: visus(r?.Vis),
    ccL: visus(l?.Vis),
  };
  return `${teil1Html(w)}${teil2Html(w, bildUrl(bilder.stempel), bildUrl(bilder.unterschrift))}`;
};

// Hinweise nur am Bildschirm (werden nicht gedruckt)
const hinweisHtml = (entities: DocumentMergeEntities) => {
  const zuStark = zuStarkeKorrektur(entities.glasRechts, entities.glasLinks);
  return `
<div class="hinweise" data-nur-vorschau>
  <b>Amtliches Muster nach Anlage 6 Nr. 2.1 FeV.</b> Nur Teil 1 (Seite 1) ausfüllen – Teil 2 (Seite 2, Rückseite) übernimmt die Eingaben; dort nur noch die Ausweisnummer eintragen. Das Ergebnis wird aus den Werten vorgeschlagen und lässt sich durch Anklicken ändern. Doppelseitig drucken.
  <button type="button" id="merkblatt-oeffnen">Merkblatt: Grenzwerte und Ausschlusskriterien</button>
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
  // Merkblatt mit Grenzwerten und Ausschlusskriterien in neuem Fenster
  var merkblatt = ${JSON.stringify(buildMerkblattSehtestLkwPrintHtml()).replace(/<\//g, "<\\/")};
  var knopf = d.getElementById("merkblatt-oeffnen");
  if (knopf) knopf.addEventListener("click", function () {
    var w = window.open("", "_blank");
    if (!w) return;
    w.document.open(); w.document.write(merkblatt); w.document.close();
  });
  var teil1 = function (feld) { return d.querySelector('.teil1 [data-feld="' + feld + '"]'); };
  var zahl = function (feld) {
    var el = teil1(feld);
    var s = el ? el.textContent.replace(",", ".").trim() : "";
    return /^\\d+(\\.\\d+)?$/.test(s) ? Number(s) : null;
  };
  var setze = function (feld, an) { var b = teil1(feld); if (b) b.checked = an; };
  var gruppen = [["zusatz_ja", "zusatz_nein"], ["ergebnis_ohne", "ergebnis_mit", "ergebnis_nicht"]];
  var funktionen = ["farbe", "gesichtsfeld", "stereo", "kontrast"];
  var NEGATIV = /nicht|auff(ä|ae)llig|patholog|ausfall|ausf(ä|ae)lle|fehlt|kein|vermindert|unzureichend|gest(ö|oe)rt|schw(ä|ae)che/i;

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
    funktionen.forEach(function (f) {
      var el = teil1(f);
      var t = el ? el.textContent.trim() : "";
      var schlecht = !!t && NEGATIV.test(t);
      if (el) el.classList.toggle("unter-grenze", schlecht);
      if (!t) funktionenOffen = true;
      if (schlecht) funktionenOk = false;
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
      gruppen[1].forEach(function (f) { setze(f, f === ergebnis); });
      setze("zusatz_ja", ergebnis === "ergebnis_nicht");
      setze("zusatz_nein", ergebnis !== "ergebnis_nicht");
    }
  };

  var meldet = false;
  var aktualisieren = function (ausgeloest) {
    var feld = ausgeloest && ausgeloest.getAttribute && ausgeloest.getAttribute("data-feld");
    // Kästchen einer Gruppe schließen sich gegenseitig aus
    if (feld && ausgeloest.checked) {
      gruppen.forEach(function (gruppe) {
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

const STYLES = `
  * { box-sizing: border-box; }
  body { margin: 0; font-family: "DejaVu Sans", Verdana, Arial, Helvetica, sans-serif; color: #000; font-size: 8.7pt; line-height: 1.3; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .seite { position: relative; width: 210mm; height: 296mm; padding: 10mm 18mm 8mm 20mm; overflow: hidden; background: #fff; page-break-after: always; }
  .seite:last-child { page-break-after: auto; }
  p { margin: 0 0 3mm; }
  .muster { text-align: center; }
  .titel { text-align: center; font-weight: bold; margin-bottom: 5mm; }
  .einleitung { margin-bottom: 3mm; }
  .seitenangabe { text-align: center; font-weight: bold; letter-spacing: 1.2mm; margin: 1mm 0 4mm; }
  .seitenangabe.unten { font-weight: normal; letter-spacing: 0; margin-top: 5mm; }
  .punkt { display: flex; margin: 0 0 2.6mm; }
  .punkt .nr { width: 10mm; flex-shrink: 0; font-weight: bold; }
  .punkt .inhalt { flex: 1; }
  .angabe { margin-top: 1mm; }
  .liste { margin-top: 1.5mm; }
  .liste .zeile { margin: 0 0 2mm; }
  .liste.eng .zeile { margin: 0; }
  .eingabe { display: inline-block; min-width: 25mm; min-height: 1.25em; outline: none; white-space: pre-wrap; border-bottom: 0.2mm dotted #555; }
  .eingabe.lang { min-width: 140mm; }
  .eingabe.zahl { min-width: 9mm; text-align: center; }
  .eingabe.kopie { border-bottom: 0; min-width: 0; }
  ul.striche { list-style: none; margin: 1.5mm 0 0; padding: 0; }
  ul.striche li { margin: 0 0 1.6mm; padding-left: 8mm; position: relative; }
  ul.striche li::before { content: "–"; position: absolute; left: 0; }
  .kreuze { display: flex; flex-direction: column; gap: 1mm; margin: -1mm 0 3.5mm; }
  .kreuze.nebeneinander { flex-direction: row; gap: 40mm; }
  .kreuze label { display: inline-flex; align-items: center; gap: 1.5mm; }
  .kaestchen { width: 3.6mm; height: 3.6mm; margin: 0; border: 0.25mm solid #000; }
  .schluss { display: flex; justify-content: space-between; align-items: flex-start; margin-top: 4mm; }
  .ortdatum { padding-top: 1mm; }
  .ortdatum .eingabe { min-width: 22mm; }
  .zeichnung { width: 95mm; text-align: center; }
  .zeichnung > div { margin-bottom: 1.5mm; }
  .stempelfeld { position: relative; height: 18mm; }
  .unterschrift-bild { position: absolute; left: 4mm; bottom: 0; height: 14mm; max-width: 40mm; object-fit: contain; }
  .stempel-bild { position: absolute; right: 2mm; bottom: -2mm; height: 20mm; max-width: 50mm; object-fit: contain; }
  ${KAESTCHEN_STYLES}
`;

// nur am Bildschirm: Eingabefelder markieren, Grenzwertverletzungen rot
const BILDSCHIRM_STYLES = `
  @media screen {
    [data-feld]:not(input) { background: #f3f8ff; border-radius: 2px; cursor: text; }
    [data-feld]:not(input):focus { background: #e3efff; }
    .eingabe:empty::before { content: attr(data-hinweis); color: #9aa8bb; font-style: italic; }
    .eingabe.unter-grenze { background: #fde2e2 !important; color: #a40000; font-weight: bold; }
    .teil2 input[data-kopie] { cursor: default; }
    .hinweise { width: 210mm; margin: 12px auto 0; padding: 8px 12px; background: #fff8e1; border: 1px solid #f0c36d; border-radius: 4px; font: 9.5pt Arial, sans-serif; }
    #merkblatt-oeffnen { display: block; margin-top: 6px; padding: 4px 10px; font: bold 9pt Arial, sans-serif; color: #fff; background: #1d4e8f; border: 0; border-radius: 4px; cursor: pointer; }
    #merkblatt-oeffnen:hover { background: #173f74; }
    .warnung { margin-top: 6px; color: #a40000; font-weight: bold; }
  }
`;

const html = (inhalt: string, extra: string) => `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8" />
<title>Bescheinigung Anlage 6 Nr. 2.1 FeV</title>
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
