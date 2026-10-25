// Auftragszettel (Kategorie "Auftragszettel"), nachgebaut nach der
// Papiervorlage "Auftragszettel_A5.pdf": A5 hochkant, vorne der Auftrag
// (Kunde, Werte, Glas, Fassung, Preise, Auftragsbedingungen und
// Unterschrift), hinten der Anamnesebogen, den der Kunde selbst ausfüllt.
//
// Wahlweise leer zum Ausfüllen von Hand oder mit den Daten des Auftrags
// vorausgefüllt. Kreuze sind Vorschläge aus den gespeicherten Daten und
// lassen sich in der Vorschau vor dem Druck ändern (kaestchen()). Was es in
// den Daten nicht gibt (z. B. Hausarzt und alle Anamnese-Fragen), bleibt
// zum Ausfüllen leer.
import dayjs from "dayjs";
import type {
  DocumentMergeEntities,
  MergeSource,
} from "./documentTemplateEngine";
import {
  RECHNUNG_ABSENDER,
  buildRechnungPositionen,
  escapeHtml,
} from "./rechnungTemplate";
import {
  buildWerkstattauftragSummen,
  formatDatum,
  formatEuro,
  formatWert,
  text,
} from "./werkstattauftragTemplate";
import { KAESTCHEN_STYLES, kaestchen } from "./formularVorschlaege";
import { MITARBEITER, mitarbeiterAnzeige } from "./mitarbeiterNamen";

export type AuftragszettelDaten = {
  entities: DocumentMergeEntities;
  // true = leerer Zettel zum Ausfüllen von Hand (ohne Kunden-/Auftragsdaten)
  leer?: boolean;
};

export type Werte = {
  sph: string;
  cyl: string;
  achse: string;
  add: string;
  pd: string;
  nh: string;
  prisma: string;
  visus: string;
};

type Preis = { einzel: string; paar: string };

export type AuftragszettelFelder = {
  auftragsNr: string;
  datum: string;
  auftragsart: Set<string>;
  name: string;
  vorname: string;
  strasse: string;
  wohnort: string;
  geburtsdatum: string;
  telefon: string;
  email: string;
  werte: { R: Werte; L: Werte; Ralt: Werte; Lalt: Werte };
  // "refraktion" | "verordnung" | "altbrille"
  werteAus: Set<string>;
  glastyp: Set<string>;
  // Hersteller und Bezeichnung des Glases (neben den Glastyp-Kästchen)
  glasBezeichnung: string;
  material: Set<string>;
  index: string;
  veredelung: Set<string>;
  veredelungFrei: string;
  toenung: Set<string>;
  farbe: string;
  prozent: string;
  polarisation: Set<string>;
  preise: Record<
    "glastyp" | "material" | "veredelung" | "toenung" | "polarisation",
    Preis
  >;
  fassung: { hersteller: string; modell: string; farbe: string; preis: string };
  sonstiges: {
    refraktion: string;
    einschleifen: string;
    bohren: string;
    // weitere Positionen, Rabatt und Kassenanteil als eigene Zeilen
    weitere: { label: string; preis: string }[];
  };
  gesamtpreis: string;
  anzahlung: string;
  restbetrag: string;
  abholung: string;
  meldung: Set<string>;
  ortDatum: string;
  kuerzel: string;
  beruf: string;
};

const zahl = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const runde = (wert: number) => Math.round(wert * 100) / 100;

const LEERE_WERTE: Werte = {
  sph: "",
  cyl: "",
  achse: "",
  add: "",
  pd: "",
  nh: "",
  prisma: "",
  visus: "",
};

// Werte eines Glases wie auf dem Werkstattauftrag; NH ist die Einschleif-
// höhe (y_h), Prisma mit Basis ("1,50 / 270")
export const werteAusGlas = (glas: MergeSource): Werte => {
  if (!glas) return LEERE_WERTE;
  const prisma = zahl(glas.Pr);
  return {
    sph: formatWert(glas.Sph, "dioptrie"),
    cyl: formatWert(glas.Cyl, "dioptrie"),
    achse: formatWert(glas.A, "achse"),
    add: formatWert(glas.Add, "dioptrie"),
    pd: formatWert(glas.PD, "frei"),
    nh: formatWert(glas.y_h, "frei"),
    prisma: prisma
      ? [formatWert(prisma, "zwei"), formatWert(glas.B, "frei")]
          .filter(Boolean)
          .join(" / ")
      : "",
    visus: formatWert(glas.Vis, "visus"),
  };
};

// "Werte aus": aus "Refraktion durch" des Auftrags (eigene Mitarbeiter,
// Augenärzte/Praxen oder übernommene Werte)
export const werteQuelle = (brille: MergeSource): string | null => {
  const refraktion = mitarbeiterAnzeige(brille?.Refraktion).trim();
  const wert = refraktion.toLowerCase();
  if (/altbrille|übernahme|scheitel/.test(wert)) return "altbrille";
  if (/dr\.|praxis|arzt|ärzt|verordnung|rezept|klinik|uni\b/.test(wert))
    return "verordnung";
  if (
    /optometrisch|messung|refraktion|sehtest/.test(wert) ||
    MITARBEITER.some((name) => wert.startsWith(name.toLowerCase()))
  )
    return "refraktion";
  if (!refraktion && text(brille?.VerordnenderArzt)) return "verordnung";
  return null;
};

// Glastyp aus der Brillenart; "Profi" für Arbeitsplatz-/Bildschirmgläser
export const glastypAusBrillenart = (brillenArt: unknown): string | null => {
  const art = text(brillenArt).toLowerCase();
  if (!art) return null;
  if (/gleitsicht|progressiv/.test(art)) return "GS";
  if (/bifokal|trifokal|zweistärken/.test(art)) return "Bifo";
  if (/bildschirm|arbeitsplatz|office|raum|nahkomfort/.test(art))
    return "Profi";
  if (/refraktion|sehhilfe|lupe|kontaktlinse/.test(art)) return null;
  return "Mono";
};

// Material und Brechungsindex aus der Glasbezeichnung ("Matrix Pro 1.60")
export const materialAusGlas = (
  glastyp: MergeSource,
): { material: Set<string>; index: string } => {
  const bezeichnung = [glastyp?.Bezeichnung, glastyp?.Sonstiges]
    .map(text)
    .join(" ");
  const material = new Set<string>();
  const treffer = bezeichnung.match(/(?:^|[^\d.,])(1[.,][4-9]\d{0,2})(?!\d)/);
  const indexText = treffer ? treffer[1].replace(".", ",") : "";
  const index = treffer ? Number(treffer[1].replace(",", ".")) : null;
  const mineralisch = /silikat|mineral|\bmin\b/i.test(bezeichnung);
  const polycarbonat =
    /polycarbonat|\bpc\b|trivex/i.test(bezeichnung) ||
    (index !== null && Math.abs(index - 1.59) < 0.005);
  const cr39 =
    /cr[\s-]?39/i.test(bezeichnung) ||
    (!mineralisch && !polycarbonat && index !== null && index < 1.51);
  if (mineralisch) material.add("Silkt.");
  if (cr39) material.add("CR 39");
  if (polycarbonat) material.add("PC");
  // Standardindex steckt schon im Material (CR 39 1,5, PC 1,59, Silikat 1,525)
  const standard =
    index !== null &&
    ((cr39 && index < 1.51) ||
      (polycarbonat && Math.abs(index - 1.59) < 0.005) ||
      (mineralisch && index < 1.53));
  if (indexText && !standard) material.add("Index");
  return { material, index: indexText && !standard ? indexText : "" };
};

const VEREDELUNG_MUSTER: [string, RegExp][] = [
  ["HSET", /hset|entspieg|\bar\b|antireflex|reflexfrei/i],
  ["Lotus", /lotus|clean|hydrophob|schmutzabweis|wasserabweis/i],
  ["HART", /hart|kratz/i],
];

// Vergütung des Glastyps auf die Kästchen; Unbekanntes steht im freien Feld
export const veredelungAusText = (
  verguetung: unknown,
): { veredelung: Set<string>; frei: string } => {
  const roh = text(verguetung);
  const veredelung = new Set<string>();
  if (!roh || /^(ohne|keine?|-+)$/i.test(roh)) return { veredelung, frei: "" };
  VEREDELUNG_MUSTER.forEach(([kaestchen, muster]) => {
    if (muster.test(roh)) veredelung.add(kaestchen);
  });
  // HSET enthält die Hartschicht schon
  if (veredelung.has("HSET") && !/\bhart\b|hartschicht/i.test(roh))
    veredelung.delete("HART");
  const blau = /blau|blue/i.test(roh);
  if (veredelung.size === 0 && !blau) {
    veredelung.add("frei");
    return { veredelung, frei: roh };
  }
  if (blau) veredelung.add("frei");
  return { veredelung, frei: blau ? "Blaufilter" : "" };
};

// Tönung des Glastyps: Farbe, Prozent und Verlauf ("braun 85 % Verlauf")
export const toenungAusText = (
  farbeRoh: unknown,
): { toenung: Set<string>; farbe: string; prozent: string } => {
  const roh = text(farbeRoh);
  const toenung = new Set<string>();
  if (!roh || /^(ohne|keine?|farblos|klar|nein|-+)$/i.test(roh))
    return { toenung, farbe: "", prozent: "" };
  const prozent = roh.match(/(\d{1,3})\s*%/)?.[1] ?? "";
  const verlauf = /verlauf|\bvl\b/i.test(roh);
  const farbe = roh
    .replace(/\d{1,3}\s*%/g, "")
    .replace(/verlaufs?(tönung)?|\bvl\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s,/-]+|[\s,/-]+$/g, "")
    .trim();
  if (farbe) toenung.add("Farbe");
  if (prozent) toenung.add("Prozent");
  if (verlauf) toenung.add("VL");
  return { toenung, farbe, prozent };
};

// Positionen des Auftrags (Rechnungspositionen ohne Fassung und Gläser)
// den Zeilen des Zettels zuordnen
type Ziel =
  | "veredelung"
  | "toenung"
  | "polarisation"
  | "refraktion"
  | "einschleifen"
  | "bohren";

const POSITION_ZIELE: [Ziel, RegExp][] = [
  ["polarisation", /polar/i],
  ["toenung", /tönung|toenung|selbsttön|transitions|phototrop|färbung/i],
  ["veredelung", /entspieg|hartschicht|kratzfest|blaulicht|blue|lotus|clean/i],
  ["refraktion", /refraktion|sehtest|sehstärkenbestimmung|optometr/i],
  ["einschleifen", /einschl|einschliff|formänd|formaend|einarbeit/i],
  ["bohren", /bohr/i],
];

export const zielDerPosition = (label: string): Ziel | null =>
  POSITION_ZIELE.find(([, muster]) => muster.test(label))?.[0] ?? null;

const initialen = (name: string) =>
  name
    .split(/\s+/)
    .filter((teil) => /^\p{L}/u.test(teil))
    .map((teil) => teil.charAt(0).toUpperCase())
    .join("");

const euro = (betrag: number | null) =>
  betrag === null ? "" : formatEuro(betrag);

export const buildAuftragszettelFelder = (
  entities: DocumentMergeEntities,
): AuftragszettelFelder => {
  const kunde: Record<string, unknown> = entities.kunde ?? {};
  const brille = entities.brille;
  const b: Record<string, unknown> = brille ?? {};
  const glastyp = entities.glastyp;
  const g: Record<string, unknown> = glastyp ?? {};
  const fassung = entities.fassung;
  const glaeser = [entities.glasRechts, entities.glasLinks].filter(
    (glas): glas is Record<string, unknown> => Boolean(glas),
  );

  const datum = brille
    ? formatDatum(b.Datum) || dayjs().format("DD.MM.YYYY")
    : "";

  // Positionen: Fassung und Gläser haben eigene Zeilen
  const positionen = brille
    ? buildRechnungPositionen(entities).filter(
        (p) =>
          p.betrag !== null &&
          !["Fassung :", "Glas rechts :", "Glas links :"].includes(p.label),
      )
    : [];
  const summeJeZiel: Partial<Record<Ziel, number>> = {};
  const zielLabels: Partial<Record<Ziel, string[]>> = {};
  const weitere: { label: string; preis: string }[] = [];
  positionen.forEach((p) => {
    const betrag = p.betrag ?? 0;
    const ziel = betrag >= 0 ? zielDerPosition(p.label) : null;
    if (ziel) {
      summeJeZiel[ziel] = runde((summeJeZiel[ziel] ?? 0) + betrag);
      zielLabels[ziel] = [...(zielLabels[ziel] ?? []), p.label];
    } else {
      weitere.push({ label: p.label, preis: formatEuro(betrag) });
    }
  });
  const summen = brille ? buildWerkstattauftragSummen(entities) : null;
  if (summen && summen.kassenanteil > 0) {
    weitere.push({
      label: "abzügl. Kassenanteil",
      preis: formatEuro(-summen.kassenanteil),
    });
  }

  // Auftragsart: Reparatur/Reklamation nur, wenn die Brillenart oder die
  // Leistungen (Kategorie "Reparaturen") darauf hinweisen
  const auftragsart = new Set<string>();
  if (brille) {
    const art = text(b.BrillenArt).toLowerCase();
    const reparaturLeistung = (entities.zusatzleistungen ?? []).some(
      (z) => text(z?.Kategorie) === "Reparaturen",
    );
    if (/reklamation|garantie|gewährleistung/.test(art))
      auftragsart.add("Reklamation");
    else if (/reparatur/.test(art) || (reparaturLeistung && !glaeser.length))
      auftragsart.add("Reparatur");
    else auftragsart.add("Neuauftrag");
  }

  const werteAus = new Set<string>();
  const quelle = brille && glaeser.length ? werteQuelle(brille) : null;
  if (quelle) werteAus.add(quelle);

  const glastypWahl = new Set<string>();
  const typ =
    glaeser.length || glastyp ? glastypAusBrillenart(b.BrillenArt) : null;
  if (typ) glastypWahl.add(typ);

  const { material, index } = materialAusGlas(glastyp);

  const { veredelung, frei: veredelungTextFrei } = veredelungAusText(
    g.Verguetung,
  );
  let veredelungFrei = veredelungTextFrei;
  (zielLabels.veredelung ?? []).forEach((label) => {
    if (/entspieg/i.test(label)) veredelung.add("HSET");
    if (/hart|kratz/i.test(label)) veredelung.add("HART");
    if (/lotus|clean/i.test(label)) veredelung.add("Lotus");
    if (/blau|blue/i.test(label) && !veredelungFrei) {
      veredelung.add("frei");
      veredelungFrei = "Blaufilter";
    }
  });

  const { toenung, farbe: farbeText, prozent } = toenungAusText(g.Farbe);
  let farbe = farbeText;
  (zielLabels.toenung ?? []).forEach((label) => {
    toenung.add("Farbe");
    if (!farbe && /selbsttön|transitions|phototrop/i.test(label))
      farbe = "selbsttönend";
  });

  const polarisation = new Set<string>();
  const polarisiert =
    [g.Bezeichnung, g.Farbe, g.Verguetung, g.Sonstiges].some((wert) =>
      /polar/i.test(text(wert)),
    ) || summeJeZiel.polarisation !== undefined;
  if (polarisiert) polarisation.add("Ja");
  else if (glastyp) polarisation.add("Nein");

  // Glaspreise: Einzelpreis je Glas (bei unterschiedlichen Preisen R und L
  // untereinander), Paarpreis = beide Gläser
  const glasPreise = glaeser
    .map((glas) => zahl(glas.Betrag))
    .filter((p): p is number => p !== null);
  const rechtsPreis = zahl(entities.glasRechts?.Betrag);
  const linksPreis = zahl(entities.glasLinks?.Betrag);
  const einzel =
    rechtsPreis !== null && linksPreis !== null && rechtsPreis !== linksPreis
      ? `R ${formatEuro(rechtsPreis)}\nL ${formatEuro(linksPreis)}`
      : glasPreise.length
        ? formatEuro(glasPreise[0])
        : "";
  const paar = glasPreise.length
    ? formatEuro(runde(glasPreise.reduce((s, p) => s + p, 0)))
    : "";

  const zusatzPreis = (ziel: Ziel): Preis => ({
    einzel: "",
    paar: euro(summeJeZiel[ziel] ?? null),
  });

  const modell = [text(fassung?.Bezeichnung), text(fassung?.Groesse)]
    .filter(Boolean)
    .join(" · ");

  const telefon =
    text(kunde.Handy) ||
    text(kunde.TelefonnummerPrivat) ||
    text(kunde.TelefonnummerGeschaeftlich);

  const kontaktweg = text(kunde.Kontaktweg).toLowerCase();
  const meldung = new Set<string>();
  if (kontaktweg === "email") meldung.add("E-Mail");
  else if (kontaktweg) meldung.add("Tel.");

  const anzahlung = summen?.anzahlung ?? 0;
  const mitSumme =
    summen !== null && (summen.gesamt !== 0 || summen.positionen.length > 0);

  return {
    auftragsNr: text(b.id),
    datum,
    auftragsart,
    name: text(kunde.Nachname),
    vorname: text(kunde.Vorname),
    strasse: [kunde.Straße, kunde.Hausnummer]
      .map(text)
      .filter(Boolean)
      .join(" "),
    wohnort: [kunde.Postleitzahl, kunde.Stadt]
      .map(text)
      .filter(Boolean)
      .join(" "),
    geburtsdatum: formatDatum(kunde.Geburtsdatum),
    telefon,
    email: text(kunde.Email),
    werte: {
      R: werteAusGlas(entities.glasRechts),
      L: werteAusGlas(entities.glasLinks),
      Ralt: werteAusGlas(entities.vorherigesGlasRechts),
      Lalt: werteAusGlas(entities.vorherigesGlasLinks),
    },
    werteAus,
    glastyp: glastypWahl,
    glasBezeichnung: [g.Hersteller, g.Bezeichnung]
      .map(text)
      .filter(Boolean)
      .join(" "),
    material,
    index,
    veredelung,
    veredelungFrei,
    toenung,
    farbe,
    prozent,
    polarisation,
    preise: {
      glastyp: { einzel, paar },
      material: { einzel: "", paar: "" },
      veredelung: zusatzPreis("veredelung"),
      toenung: zusatzPreis("toenung"),
      polarisation: zusatzPreis("polarisation"),
    },
    fassung: {
      hersteller:
        text(fassung?.Hersteller) ||
        (!fassung && glaeser.length ? "eigene Fassung" : ""),
      modell,
      farbe: text(fassung?.Farbe),
      preis: euro(fassung ? (zahl(fassung.Betrag) ?? 0) : null),
    },
    sonstiges: {
      refraktion: euro(summeJeZiel.refraktion ?? null),
      einschleifen: euro(summeJeZiel.einschleifen ?? null),
      bohren: euro(summeJeZiel.bohren ?? null),
      weitere,
    },
    gesamtpreis: mitSumme && summen ? formatEuro(summen.endpreis) : "",
    anzahlung: anzahlung > 0 ? formatEuro(anzahlung) : "",
    restbetrag: mitSumme && summen ? formatEuro(summen.offen) : "",
    abholung: formatDatum(b.Abholung),
    meldung,
    ortDatum: datum ? `${RECHNUNG_ABSENDER.ort}, ${datum}` : "",
    kuerzel: initialen(mitarbeiterAnzeige(b.Berater)),
    beruf: text(kunde.Tätigkeit),
  };
};

// Leerer Zettel: dieselbe Zuordnung ohne Daten
export const leereAuftragszettelFelder = () => buildAuftragszettelFelder({});

const e = escapeHtml;

const box = (label: string, an = false) =>
  `<label class="option">${kaestchen(an)}<span>${e(label)}</span></label>`;

const kreis = (label: string) =>
  `<label class="option">${kaestchen(false, "kaestchen kreis")}<span>${e(label)}</span></label>`;

// Schreiblinie im Text ("Index: _____"), bei Daten mit dem Wert darauf
const luecke = (wert: string, breite: number) =>
  `<span class="luecke" style="min-width:${breite}mm">${e(wert)}</span>`;

const preis = (wert: string) =>
  `${wert ? `<span class="betrag">${e(wert).replace("\n", "<br />")}</span> ` : ""}€`;

// Feld mit Beschriftung auf durchgehender Linie ("Name: ______")
const feld = (label: string, wert: string, anteil: number) =>
  `<div class="feld" style="flex:${anteil} 1 0"><span class="lbl">${e(label)}</span><span class="wert${wert.length > 34 ? " eng" : ""}">${e(wert)}</span></div>`;

const WERTE_SPALTEN: [keyof Werte, string][] = [
  ["sph", "sph"],
  ["cyl", "cyl"],
  ["achse", "Achse"],
  ["add", "ADD"],
  ["pd", "PD"],
  ["nh", "NH"],
  ["prisma", "Prisma"],
  ["visus", "Visus"],
];

const werteZeile = (seite: string, werte: Werte, klasse: string) =>
  `<tr class="${klasse}"><th>${e(seite)}</th>${WERTE_SPALTEN.map(
    ([schluessel]) =>
      `<td${werte[schluessel].length > 10 ? ' class="eng"' : ""}>${e(werte[schluessel])}</td>`,
  ).join("")}</tr>`;

const glasZeile = (titel: string, inhalt: string, p: Preis) =>
  `<tr><th>${e(titel)}</th><td><div class="wahl">${inhalt}</div></td><td class="preis${p.einzel.includes("\n") ? " zweizeilig" : ""}">${preis(p.einzel)}</td><td class="preis">${preis(p.paar)}</td></tr>`;

const sonstigesZeile = (label: string, wert: string) =>
  `<tr><td>${e(label)}</td><td class="preis">${preis(wert)}</td></tr>`;

const vorderseite = (f: AuftragszettelFelder) => {
  const a = RECHNUNG_ABSENDER;
  const w = f.werte;
  return `
<div class="blatt vorne">
 <div class="inhalt">
  <header class="kopf">
    <div class="logo">
      <div class="marke">optik ulm</div>
      <div class="zusatz">AUGENOPTIK ·<br />FACHBETRIEB · ${e(a.ort.toUpperCase())}</div>
    </div>
    <div class="titel">
      <div class="haupt">Kompetenz-Zentrum für Augenoptik</div>
      <div class="art">AUFTRAG</div>
    </div>
    <div class="nummern">
      <div class="nr"><span class="lbl">Auftrags-Nr.:</span><span class="wert">${e(f.auftragsNr)}</span></div>
      <div class="nr"><span class="lbl">Datum:</span><span class="wert">${e(f.datum)}</span></div>
    </div>
  </header>

  <div class="auftragsart">
    ${["Neuauftrag", "Reklamation", "Reparatur"].map((art) => box(art, f.auftragsart.has(art))).join("")}
  </div>

  <section class="rahmen kunde">
    <div class="reihe">${feld("Name:", f.name, 1)}${feld("Vorname:", f.vorname, 1)}</div>
    <div class="reihe">${feld("Straße:", f.strasse, 1)}${feld("Wohnort:", f.wohnort, 1)}</div>
    <div class="reihe">${feld("Geb.-Datum:", f.geburtsdatum, 349)}${feld("Telefon:", f.telefon, 390)}${feld("E-Mail:", f.email, 505)}</div>
  </section>

  <table class="tab werte">
    <thead><tr><th></th>${WERTE_SPALTEN.map(([, titel]) => `<th>${e(titel)}</th>`).join("")}</tr></thead>
    <tbody>
      ${werteZeile("R", w.R, "neu")}
      ${werteZeile("L", w.L, "neu")}
      ${werteZeile("R alt", w.Ralt, "alt")}
      ${werteZeile("L alt", w.Lalt, "alt")}
    </tbody>
  </table>

  <div class="werteaus">
    <b>Werte aus:</b>
    ${box(`Refraktion ${a.firma}`, f.werteAus.has("refraktion"))}
    ${box("augenärztliche Verordnung", f.werteAus.has("verordnung"))}
    ${box("Altbrille / Übernahme", f.werteAus.has("altbrille"))}
  </div>

  <table class="tab glas">
    <thead><tr><th></th><th class="links">Bezeichnung</th><th>Einzelpreis</th><th>Paarpreis</th></tr></thead>
    <tbody>
      ${glasZeile(
        "Glastyp",
        `${["Mono", "Bifo", "GS", "Profi"]
          .map((t) => box(t, f.glastyp.has(t)))
          .join("")}<span class="glasname">${e(f.glasBezeichnung)}</span>`,
        f.preise.glastyp,
      )}
      ${glasZeile(
        "Material",
        `${["Silkt.", "CR 39", "PC"].map((m) => box(m, f.material.has(m))).join("")}<label class="option">${kaestchen(f.material.has("Index"))}<span>Index:</span>${luecke(f.index, 6.8)}</label>`,
        f.preise.material,
      )}
      ${glasZeile(
        "Veredelung",
        `${["HSET", "Lotus", "HART"].map((v) => box(v, f.veredelung.has(v))).join("")}<label class="option">${kaestchen(f.veredelung.has("frei"))}${luecke(f.veredelungFrei, 7)}</label>`,
        f.preise.veredelung,
      )}
      ${glasZeile(
        "Tönung",
        `<label class="option">${kaestchen(f.toenung.has("Farbe"))}<span>Farbe:</span>${luecke(f.farbe, 9)}</label><label class="option">${kaestchen(f.toenung.has("Prozent"))}${luecke(f.prozent, 5)}<span>%</span></label>${box("VL", f.toenung.has("VL"))}`,
        f.preise.toenung,
      )}
      ${glasZeile(
        "Polarisation",
        ["Ja", "Nein"].map((p) => box(p, f.polarisation.has(p))).join(""),
        f.preise.polarisation,
      )}
    </tbody>
  </table>

  <table class="tab fassung">
    <thead><tr><th>Hersteller</th><th>Modell</th><th>Farbe</th><th class="mitte">Preis</th></tr></thead>
    <tbody><tr><td>${e(f.fassung.hersteller)}</td><td>${e(f.fassung.modell)}</td><td>${e(f.fassung.farbe)}</td><td class="preis">${preis(f.fassung.preis)}</td></tr></tbody>
  </table>

  <table class="tab sonstiges">
    <thead><tr><th class="schwarz">Sonstiges</th><th class="mitte">Preis</th></tr></thead>
    <tbody>
      ${sonstigesZeile("Refraktion", f.sonstiges.refraktion)}
      ${sonstigesZeile("Einschleifen, Formänd.", f.sonstiges.einschleifen)}
      ${sonstigesZeile("Bohren", f.sonstiges.bohren)}
      ${f.sonstiges.weitere.map((z) => sonstigesZeile(z.label, z.preis)).join("")}
    </tbody>
  </table>

  <div class="gesamt">
    <span class="titel">GESAMTPREIS</span>
    <span class="strich">${e(f.gesamtpreis)}</span>
    <span class="eur">€</span>
  </div>

  <div class="rahmen zahlung">
    <span>Anzahlung: ${luecke(f.anzahlung, 6.5)} €</span>
    <span>Restbetrag: ${luecke(f.restbetrag, 6.5)} €</span>
    <span>Abholung ca.: ${luecke(f.abholung, 8.5)}</span>
    <span class="meldung">Meldung per ${box("Tel.", f.meldung.has("Tel."))}${box("E-Mail", f.meldung.has("E-Mail"))}</span>
  </div>

  <section class="rahmen bedingungen">
    <div class="ueberschrift">AUFTRAGSBEDINGUNGEN &amp; EINWILLIGUNG</div>
    ${auftragsbedingungen(a.firma)}
  </section>

  <div class="unterschriften">
    <div class="u schmal"><div class="vor">${e(f.ortDatum)}</div><div class="lbl">Ort, Datum</div></div>
    <div class="u breit"><div class="vor"></div><div class="lbl">Unterschrift Kunde / Auftraggeber</div></div>
    <div class="u schmal"><div class="vor">${e(f.kuerzel)}</div><div class="lbl">Mitarbeiter (Kürzel)</div></div>
  </div>
 </div>
</div>`;
};

// Auftragsbedingungen wie auf der Papiervorlage; der Firmenname kommt aus
// den Betriebsdaten
const auftragsbedingungen = (firmaRoh: string) => {
  const firma = e(firmaRoh);
  const punkte: [string, string][] = [
    [
      "1. Auftrag.",
      `Ich beauftrage ${firma} mit der Anfertigung bzw. Lieferung der oben bezeichneten Sehhilfe (oder der angegebenen Reparatur/Nacharbeit) zu den genannten Preisen inkl. gesetzl. MwSt. Der Vertrag kommt mit meiner Unterschrift zustande.`,
    ],
    [
      "2. Individuelle Anfertigung.",
      `Gläser und Fassungsarbeiten werden nach meinen persönlichen Werten und Wünschen gefertigt. Nach Beginn der Anfertigung ist eine Stornierung nur mit Zustimmung von ${firma} möglich; bereits entstandene Kosten sind zu ersetzen.`,
    ],
    [
      "3. Sehwerte.",
      "Die Werte stammen aus der oben angekreuzten Quelle. Für die Richtigkeit übernommener Werte (Verordnung, Altbrille) wird nicht gehaftet. Meine Angaben im Anamnesebogen sind vollständig und wahrheitsgemäß.",
    ],
    [
      "4. Zahlung &amp; Eigentum.",
      `Der Restbetrag ist bei Abholung fällig. Bis zur vollständigen Zahlung bleibt die Ware Eigentum von ${firma}. Fertige Arbeiten werden nach Benachrichtigung 3 Monate aufbewahrt.`,
    ],
    [
      "5. Eingewöhnung &amp; Gewährleistung.",
      "Bei Gleitsicht-/Mehrstärkengläsern ist eine Eingewöhnung üblich und kein Mangel; Beschwerden bitte zeitnah (innerhalb von 4 Wochen) melden, wir prüfen dann eine Nachbesserung. Gesetzliche Gewährleistungsrechte bleiben unberührt.",
    ],
    [
      "6. Straßenverkehr.",
      "Ich wurde darauf hingewiesen, dass getönte Gläser in der Dämmerung und bei Nacht für das Fahren ungeeignet sind und ich mich vor der Teilnahme am Straßenverkehr an die neue Sehhilfe gewöhnen muss.",
    ],
    [
      "7. Datenschutz.",
      "Ich willige ein, dass meine Daten einschließlich Gesundheitsdaten (Sehwerte, Anamnese) zur Auftragsabwicklung verarbeitet und gespeichert werden (Art. 6 Abs. 1 lit. b, Art. 9 Abs. 2 lit. a DSGVO). Widerruf jederzeit möglich; die Datenschutzhinweise liegen im Geschäft aus.",
    ],
  ];
  return `${punkte.map(([titel, inhalt]) => `<p><b>${titel}</b> ${inhalt}</p>`).join("")}
    <p class="schluss">Mit meiner Unterschrift erteile ich den Auftrag und erkenne diese Bedingungen sowie die Einwilligung (Ziff. 7) an.</p>`;
};

// Rückseite: Anamnesebogen zum Ausfüllen durch den Kunden
const rueckseite = (f: AuftragszettelFelder) => {
  const a = RECHNUNG_ABSENDER;
  const name = [f.name, f.vorname].filter(Boolean).join(", ");
  const linie = (breite?: number) =>
    `<span class="schreiblinie"${breite ? ` style="flex:0 0 ${breite}mm"` : ""}></span>`;
  const z = (inhalt: string, klasse = "") =>
    `<div class="z${klasse ? ` ${klasse}` : ""}">${inhalt}</div>`;
  const frage = (t: string) => `<b class="frage">${e(t)}</b>`;
  const neinJa = `${kreis("nein")}${kreis("ja")}`;
  return `
<div class="blatt hinten">
 <div class="inhalt">
  <header class="kopf2">
    <h1>Anamnesebogen</h1>
    <div class="marke2">OPTIK ULM · AUGENOPTIK · ${e(a.ort.toUpperCase())}</div>
  </header>
  <div class="reihe kopfzeile">${feld("Name, Vorname:", name, 563)}${feld("Geburtsdatum:", f.geburtsdatum, 375)}${feld("Datum:", f.datum, 328)}</div>
  ${z(`${frage("Tragen oder trugen Sie eine Sehhilfe?")}${kreis("nein")}${kreis("ja:")}${box("Fern-")}${box("Lese-")}${box("Mehrstärkenbrille")}`)}
  ${z(frage("Kennen Sie Ihre alten Werte?"))}
  <table class="tab altwerte">
    <thead><tr><th></th><th>sph</th><th>cyl</th><th>A</th><th>Prisma</th><th>Add</th><th>V<sub>cc</sub></th><th>V<sub>cc bin</sub></th></tr></thead>
    <tbody>
      <tr><th>R:</th>${"<td></td>".repeat(7)}</tr>
      <tr><th>L:</th>${"<td></td>".repeat(7)}</tr>
    </tbody>
  </table>
  <hr />
  ${z(frage("Haben Sie als Kind immer mit beiden Augen gleich gut gesehen oder eines schon immer schlechter?"))}
  ${z(`${kreis("beide gleich gut")}${kreis("rechts schlechter")}${kreis("links schlechter")}`, "weit")}
  ${z(`${frage("Haben Sie als Kind oder später geschielt?")}${neinJa}`)}
  <hr />
  ${z(`${frage("Wie heißt Ihr behandelnder Hausarzt?")}${linie()}`)}
  <hr />
  ${z(`${frage("Sind Sie Diabetiker?")}${kreis("nein")}<label class="option">${kaestchen(false, "kaestchen kreis")}<span>ja, seit</span>${luecke("", 9)}</label><span class="rechts">${kreis("Typ I")}${kreis("Typ II")}</span>`)}
  ${z(`<span><b>Wenn ja,</b> sind die Blutzucker-Werte stabil oder stark schwankend?</span>${kreis("stabil")}${kreis("schwankend")}`)}
  ${z(kreis("nicht bekannt"), "weit")}
  ${z(`<span>Wird der Diabetes mit Tabletten und/oder Insulin behandelt?</span><label class="option">${kaestchen(false, "kaestchen kreis")}<span>Tabletten seit</span>${luecke("", 9)}</label><label class="option">${kaestchen(false, "kaestchen kreis")}<span>Insulin seit</span>${luecke("", 9)}</label>`)}
  ${z(`<span>Kennen Sie Ihren HbA1c-Wert (= Blutzucker-Langzeit-Wert)?</span>${kreis("nein")}<label class="option">${kaestchen(false, "kaestchen kreis")}<span>ja, zuletzt am:</span>${luecke("", 9)}</label>`)}
  ${z(`<span>Wert: ${luecke("", 9)}</span>`, "weit")}
  <hr />
  ${z(`${frage("Leiden Sie an Schilddrüsenerkrankungen?")}${neinJa}`)}
  ${z(`<span><b>Wenn ja,</b> an</span>${kreis("Schilddrüsen-Überfunktion")}${kreis("Schilddrüsen-Unterfunktion")}`)}
  ${z(`<span>Nehmen Sie dagegen Medikamente ein?</span>${kreis("nein")}${kreis("ja, welche?")}${linie()}`)}
  <hr />
  ${z(`${frage("Leiden Sie an Rheuma?")}${neinJa}`)}
  ${z(`<span><b>Wenn ja,</b> welche Medikamente nehmen Sie ein?</span>${linie()}`)}
  <hr />
  ${z(`${frage("Haben Sie zu hohen Blutdruck?")}${neinJa}<span class="rechts">${frage("… zu niedrigen Blutdruck?")}${neinJa}</span>`)}
  <hr />
  <div class="abschnitt">BERUF &amp; SEHANFORDERUNGEN</div>
  ${z(`${frage("Beruf / Tätigkeit:")}<span class="schreiblinie mitwert">${e(f.beruf)}</span>`)}
  ${z(`${frage("Bildschirmarbeit?")}${kreis("nein")}<label class="option">${kaestchen(false, "kaestchen kreis")}<span>ja, ca.</span>${luecke("", 5)}<span>Std./Tag</span></label><span>Abstand zum Monitor ca. ${luecke("", 5)} cm</span>`)}
  ${z(`${frage("Hauptsehaufgaben:")}${["Bildschirm", "Lesen/Schreiben", "Handarbeit/Werkstatt", "Ferne/Fahren"].map((t) => box(t)).join("")}`)}
  ${z(`${frage("Besonderes:")}${["Schutz-/Arbeitsbrille", "Staub/Wind/Chemikalien", "Blendung/Kunstlicht", "Nachtfahrten"].map((t) => box(t)).join("")}`)}
  ${z(`<label class="option">${kaestchen()}<span>Sport/Hobby:</span>${luecke("", 13.5)}</label>`, "weit")}
  ${z(`${frage("Bildschirmarbeitsplatzbrille über den Arbeitgeber?")}${neinJa}`)}
  <hr />
  ${z(`${frage("Augenerkrankungen / Augen-OPs")}<span class="grau">(z. B. Grüner/Grauer Star, Makula):</span>${linie()}`)}
  ${z(`${frage("Weitere Medikamente / Allergien:")}${linie()}`)}
  <div class="fusszeile">Ihre Angaben dienen der bestmöglichen Brillenversorgung und werden vertraulich behandelt (siehe Einwilligung Ziff. 7 auf der Vorderseite).</div>
 </div>
</div>`;
};

export const buildAuftragszettelBodyHtml = ({
  entities,
  leer = false,
}: AuftragszettelDaten): string => {
  const felder = leer
    ? leereAuftragszettelFelder()
    : buildAuftragszettelFelder(entities);
  return `${vorderseite(felder)}${rueckseite(felder)}`;
};

const STYLES = `
  ${KAESTCHEN_STYLES}
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Inter, "Helvetica Neue", Arial, Helvetica, sans-serif; color: #1a1a1a; font-size: 6.6pt; line-height: 1.25; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .blatt { width: 148mm; height: 210mm; padding: 4.6mm 6mm 4.4mm; background: #fff; overflow: hidden; }
  .blatt.hinten { padding: 4.8mm 7mm 4.6mm; }
  .blatt + .blatt { break-before: page; page-break-before: always; }
  .inhalt { display: flex; flex-direction: column; min-height: 100%; }
  b { font-weight: 700; }
  .kaestchen { width: 2.1mm; height: 2.1mm; border: 0.25mm solid #1a1a1a; margin: 0; flex: none; }
  .kaestchen.kreis { border-radius: 50%; }
  .option { display: inline-flex; align-items: center; gap: 1.1mm; white-space: nowrap; }
  .luecke { display: inline-block; border-bottom: 0.2mm solid #333; line-height: 1; padding: 0 0.6mm; text-align: center; font-weight: 600; max-width: 34mm; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: baseline; }
  .option .luecke { height: 2.7mm; line-height: 2.7mm; padding-bottom: 0; }

  .kopf { display: grid; grid-template-columns: 33mm 1fr 33mm; align-items: end; height: 11.8mm; padding-bottom: 1.5mm; border-bottom: 0.6mm solid #111; }
  .logo .marke { font-weight: 700; font-size: 15pt; line-height: 0.95; letter-spacing: -0.03em; color: #111; }
  .logo .zusatz { font-size: 4.5pt; letter-spacing: 0.24em; color: #555; margin-top: 1mm; line-height: 1.4; }
  .titel { text-align: center; padding-bottom: 0.3mm; }
  .titel .haupt { font-weight: 700; font-size: 9.6pt; color: #111; }
  .titel .art { font-size: 6.2pt; letter-spacing: 0.5em; margin-top: 1.2mm; margin-right: -0.5em; }
  .nummern { width: 31mm; justify-self: end; }
  .nr { display: flex; gap: 1mm; border-bottom: 0.25mm solid #333; font-size: 6.2pt; line-height: 1.2; }
  .nr + .nr { margin-top: 1.7mm; }
  .nr .lbl { color: #444; }
  .nr .wert { flex: 1; font-weight: 600; white-space: nowrap; overflow: hidden; }

  .auftragsart { display: flex; height: 6.2mm; align-items: center; font-weight: 600; font-size: 7pt; }
  .auftragsart .option { width: 21.8mm; gap: 1.4mm; }

  .rahmen { border: 0.3mm solid #444; }
  .kunde { height: 15.5mm; padding: 0.4mm 2.1mm 1.4mm; display: flex; flex-direction: column; justify-content: flex-end; gap: 1.3mm; }
  .reihe { display: flex; gap: 3.7mm; }
  .feld { display: flex; align-items: baseline; gap: 1.2mm; border-bottom: 0.25mm solid #333; padding-bottom: 0.25mm; min-width: 0; line-height: 1.15; }
  .feld .lbl { color: #555; white-space: nowrap; }
  .feld .wert { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 600; color: #111; }
  .feld .wert.eng { font-size: 85%; }

  table { border-collapse: collapse; width: 100%; table-layout: fixed; }
  .tab { border: 0.35mm solid #555; }
  .tab th, .tab td { border: 0.2mm solid #777; padding: 0 1.4mm; overflow: hidden; white-space: nowrap; }
  .tab thead th { background: #e6e6e6; font-weight: 600; text-align: center; color: #222; }
  .tab tbody th { background: #e6e6e6; font-weight: 700; text-align: left; color: #222; }
  .tab .links { text-align: left; }
  .tab .mitte { text-align: center; }

  .werte { margin-top: 1.3mm; }
  .werte thead th { height: 4.5mm; font-size: 6.4pt; }
  .werte thead th:first-child { width: 8.9mm; }
  .werte tbody th { text-align: center; font-size: 7pt; padding: 0; }
  .werte tr.neu > * { height: 5mm; }
  .werte tr.alt > * { height: 4.2mm; }
  .werte tr.alt th { font-size: 5.2pt; }
  .werte td { text-align: center; font-size: 6.8pt; font-weight: 600; padding: 0 0.6mm; }
  .werte td.eng { font-size: 5.8pt; }

  .werteaus { display: flex; align-items: center; height: 5.8mm; font-size: 6.4pt; }
  .werteaus b { width: 14.2mm; flex: none; }
  .werteaus .option { width: 33mm; }

  .glas thead th { height: 4.5mm; font-size: 6.4pt; }
  .glas thead th:first-child { width: 16.8mm; }
  .glas thead th:nth-child(3), .glas thead th:nth-child(4) { width: 15.1mm; }
  .glas tbody > tr > * { height: 4.75mm; }
  .glas tbody th { font-size: 6.6pt; }
  .glas .wahl { display: flex; align-items: center; gap: 3.2mm; padding-top: 0.3mm; }
  .glas .glasname { margin-left: auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; font-weight: 600; }
  .preis { text-align: right; }
  .preis .betrag { font-weight: 600; }
  .preis.zweizeilig { font-size: 5pt; line-height: 1.05; }

  .fassung { margin-top: 1.6mm; }
  .fassung thead th { height: 4.3mm; text-align: left; font-size: 6.4pt; }
  .fassung thead th:last-child { width: 14mm; text-align: center; }
  .fassung td { height: 4.6mm; font-weight: 600; text-overflow: ellipsis; }
  .fassung td.preis { font-weight: 400; }

  .sonstiges { margin-top: 2mm; }
  .sonstiges thead th { height: 4.2mm; font-size: 6.4pt; }
  .sonstiges thead th:last-child { width: 14mm; }
  .sonstiges th.schwarz { background: #111; color: #fff; text-align: left; letter-spacing: 0.08em; }
  .sonstiges td { height: 4.5mm; font-size: 6.6pt; text-overflow: ellipsis; }

  .gesamt { display: flex; align-items: center; gap: 2.4mm; height: 7.5mm; margin-top: 1.6mm; padding: 0 2.6mm 0 2.9mm; border: 0.45mm solid #111; background: #f3f3f3; box-shadow: inset 0 0 0 0.35mm #fff; }
  .gesamt .titel { font-weight: 700; font-size: 9.8pt; letter-spacing: 0.03em; color: #111; padding: 0; }
  .gesamt .strich { flex: 1; border-bottom: 0.25mm solid #333; min-height: 4mm; text-align: right; font-weight: 700; font-size: 9pt; line-height: 1.1; padding-right: 1mm; }
  .gesamt .eur { font-weight: 700; font-size: 10pt; }

  .zahlung { display: flex; align-items: center; gap: 3.4mm; height: 4.6mm; margin-top: 1.7mm; padding: 0 2.1mm; font-size: 6.5pt; white-space: nowrap; }
  .zahlung .meldung { display: inline-flex; align-items: center; gap: 1.4mm; margin-left: 1.4mm; }

  .bedingungen { flex: 1 0 auto; margin-top: 1.7mm; padding: 1.7mm 2.1mm 1.4mm; font-size: 5.05pt; line-height: 1.3; }
  .bedingungen .ueberschrift { font-weight: 700; font-size: 5.4pt; letter-spacing: 0.2em; margin-bottom: 0.7mm; color: #222; }
  .bedingungen p { margin: 0 0 0.75mm; }
  .bedingungen .schluss { font-weight: 700; margin-top: 1mm; }

  .unterschriften { display: flex; gap: 3.75mm; padding-top: 4mm; }
  .unterschriften .u { flex: none; }
  .unterschriften .schmal { width: 35.6mm; }
  .unterschriften .breit { width: 57.3mm; }
  .unterschriften .vor { height: 3.4mm; border-bottom: 0.3mm solid #111; font-weight: 600; font-size: 6.6pt; padding: 0 0.5mm; white-space: nowrap; }
  .unterschriften .lbl { font-size: 5.2pt; color: #555; padding-top: 1.1mm; }

  .kopf2 { display: flex; align-items: baseline; justify-content: space-between; border-bottom: 0.5mm solid #111; padding: 1.5mm 0 1.3mm; }
  .kopf2 h1 { margin: 0; font-size: 15.3pt; line-height: 1; letter-spacing: -0.01em; color: #111; }
  .marke2 { font-size: 4.6pt; letter-spacing: 0.24em; color: #555; }
  .hinten { font-size: 6.7pt; }
  .hinten .kopfzeile { margin-top: 3.4mm; }
  .hinten .feld .wert { font-size: 6.9pt; }
  .z { display: flex; align-items: center; gap: 3mm; min-height: 4.85mm; white-space: nowrap; }
  .z.weit { min-height: 6mm; }
  .z .frage { margin-right: 0.8mm; }
  .z .rechts { margin-left: auto; display: inline-flex; align-items: center; gap: 3mm; }
  .z .grau { color: #555; margin-left: -1.6mm; }
  .schreiblinie { flex: 1; align-self: flex-end; border-bottom: 0.25mm solid #333; height: 3.3mm; margin-bottom: 0.6mm; min-width: 10mm; }
  .schreiblinie.mitwert { height: auto; font-weight: 600; padding-left: 1mm; line-height: 1.1; }
  .hinten .kopfzeile + .z { margin-top: 0.8mm; }
  .altwerte { margin: 0.6mm 0 0; }
  .altwerte thead th { height: 4.5mm; font-size: 6.2pt; }
  .altwerte thead th:first-child { width: 6.7mm; }
  .altwerte sub { font-size: 65%; vertical-align: baseline; position: relative; top: 0.1em; margin-left: 0.2mm; }
  .altwerte tbody > tr > * { height: 4.65mm; }
  .altwerte tbody th { text-align: center; padding: 0; }
  .hinten hr { border: 0; border-top: 0.25mm solid #aaa; margin: 1.9mm 0 1.4mm; }
  .abschnitt { font-weight: 700; font-size: 5.4pt; letter-spacing: 0.2em; color: #555; margin: 0.6mm 0 0.4mm; }
  .fusszeile { margin-top: auto; border-top: 0.25mm solid #aaa; padding-top: 1.6mm; font-size: 4.9pt; color: #555; }
`;

// Passt eine Seite nicht auf A5 (z. B. viele Positionen unter "Sonstiges"),
// wird ihr Inhalt verkleinert statt abgeschnitten (transform statt zoom,
// damit auch das PDF stimmt)
const EINPASSEN = `<script>
(function () {
  document.querySelectorAll(".blatt").forEach(function (blatt) {
    var inhalt = blatt.querySelector(".inhalt");
    if (!inhalt) return;
    var stil = getComputedStyle(blatt);
    var hoehe = blatt.clientHeight - parseFloat(stil.paddingTop) - parseFloat(stil.paddingBottom);
    var faktor = 1;
    while (inhalt.offsetHeight * faktor > hoehe + 1 && faktor > 0.75) {
      faktor = Math.round((faktor - 0.02) * 100) / 100;
      inhalt.style.transformOrigin = "top left";
      inhalt.style.transform = "scale(" + faktor + ")";
      inhalt.style.width = 100 / faktor + "%";
      inhalt.style.minHeight = hoehe / faktor + "px";
    }
  });
})();
</script>`;

const titel = (daten: AuftragszettelDaten) => {
  const nummer = daten.leer ? "" : text(daten.entities.brille?.id);
  return `Auftragszettel${nummer ? ` ${nummer}` : ""}`;
};

export const buildAuftragszettelPrintHtml = (
  daten: AuftragszettelDaten,
): string => `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8" />
<title>${e(titel(daten))}</title>
<style>
  ${STYLES}
  @page { size: A5; margin: 0; }
</style>
</head>
<body>
${buildAuftragszettelBodyHtml(daten)}
${EINPASSEN}
</body>
</html>`;

// Vorschau im Formulare-Dialog; gedruckt wird aus der Vorschau (angeklickte
// Kästchen), daher mit denselben Druckregeln
export const buildAuftragszettelPreviewHtml = (
  daten: AuftragszettelDaten,
): string => `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8" />
<title>${e(titel(daten))}</title>
<style>
  ${STYLES}
  html { background: #eee; }
  .blatt { margin: 12px auto; box-shadow: 0 1px 6px rgba(0, 0, 0, 0.2); }
  @page { size: A5; margin: 0; }
  @media print { html { background: none; } .blatt { margin: 0; box-shadow: none; } }
</style>
</head>
<body>
${buildAuftragszettelBodyHtml(daten)}
${EINPASSEN}
</body>
</html>`;
