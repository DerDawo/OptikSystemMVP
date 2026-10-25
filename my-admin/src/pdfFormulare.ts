// Ausfüllbare PDF-Vorlagen (public/formulare/*.pdf): Beobachtungsbogen und
// Antrag auf eine Bildschirmarbeitsplatzbrille. Anders als die HTML-Layouts
// sind das die Original-Formulare mit Formularfeldern. Das Programm füllt die
// bekannten Felder mit Kunden- und Auftragsdaten vor und öffnet das PDF; alle
// Felder bleiben im PDF-Viewer ausfüllbar. Die PDFs sind leer (ohne Werte,
// Stempel oder Unterschrift) und wurden aus den bisherigen Vorlagen erzeugt.
import type {
  DocumentMergeEntities,
  MergeSource,
} from "./documentTemplateEngine";
import { RECHNUNG_ABSENDER } from "./rechnungTemplate";
import dayjs from "dayjs";
import {
  formatDatum,
  formatEuro,
  formatWert,
  text,
} from "./werkstattauftragTemplate";
import {
  anzahlGlaeser,
  brillenartKategorie,
  sehstaerkeVeraendert,
} from "./formularVorschlaege";
import { verteileWerte } from "./aokBerechtigungsscheinTemplate";
import { bruttoZeilenEinzeln } from "./kassenanteil";
import { mitarbeiterAnzeige } from "./mitarbeiterNamen";
import { betriebBilder, bildUrl } from "./betriebBilderCache";

// Textfelder bekommen einen Text, Kästchen true (angekreuzt)
export type PdfFeldwerte = Record<string, string | boolean>;

export type BildKasten = {
  seite: number; // 1-basiert, -1 = letzte
  x: number;
  oben: number;
  breite: number;
  hoehe: number;
};

export type PdfVorlage = {
  datei: string;
  titel: string;
  felder: (entities: DocumentMergeEntities) => PdfFeldwerte;
  // Vorlage ist vorausgefüllt: Viewer sollen die gespeicherten Darstellungen
  // der Felder zeigen und nicht neu berechnen (sonst erscheinen
  // vorbelegte Felder in manchen Viewern leer)
  vorbelegt?: boolean;
  // Betriebsstempel und Unterschrift (privat gespeichert, Einstellungen) in
  // diese Kästen (pt, Abstand vom oberen Rand) setzen; Bild passt sich ein
  stempelUnterschrift?: {
    stempel: BildKasten;
    unterschrift: BildKasten;
  };
  // Eintragungen (Felder und Ort/Datum) in Courier schreiben
  courier?: boolean;
  // Text "Ort, Datum" und Stellen (Seite 1-basiert, -1 = letzte; Abstand der
  // Textgrundlinie vom oberen Seitenrand in pt), an die er gedruckt wird
  ortDatum?: {
    text: (entities: DocumentMergeEntities) => string;
    stellen: { seite: number; oben: number }[];
  };
};

// Auswahllisten im Beobachtungsbogen schreiben positive Werte ohne "+"
const ohnePlus = (wert: string) => wert.replace(/^\+/, "");

const kunde = (entities: DocumentMergeEntities): Record<string, unknown> =>
  entities.kunde ?? {};

const telefon = (k: Record<string, unknown>) =>
  text(k.Handy) || text(k.TelefonnummerPrivat);

const adresse = (k: Record<string, unknown>) =>
  [
    [k.Straße, k.Hausnummer].map(text).filter(Boolean).join(" "),
    [k.Postleitzahl, k.Stadt].map(text).filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");

const prismaBasis = (glas: MergeSource) =>
  [formatWert(glas?.Pr, "zwei"), formatWert(glas?.B, "frei")]
    .filter(Boolean)
    .join(" / ");

const betrag = (value: number) => (value ? formatEuro(value) : "");

const beobachtungsbogenFelder = (entities: DocumentMergeEntities) => {
  const k = kunde(entities);
  const brille: Record<string, unknown> = entities.brille ?? {};
  // suffix "" = Refraktion (neue Brille), " ALT" = bisherige Korrektur
  const werte = (glas: MergeSource, auge: "OD" | "OS", suffix = "") => ({
    [`SPH ${auge}${suffix}`]: ohnePlus(formatWert(glas?.Sph, "dioptrie")),
    [`CYL ${auge}${suffix}`]: ohnePlus(formatWert(glas?.Cyl, "dioptrie")),
    [`AXE ${auge}${suffix}`]: formatWert(glas?.A, "achse"),
    [`ADD ${auge}${suffix}`]: formatWert(glas?.Add, "zwei"),
    [`VCC ${auge}${suffix}`]: formatWert(glas?.Vis, "zwei"),
  });
  return {
    Name: text(k.Nachname),
    Vorname: text(k.Vorname),
    Adresse: adresse(k),
    Telefon: telefon(k),
    Geburtstag: formatDatum(k.Geburtsdatum),
    Mitarbeiter: text(mitarbeiterAnzeige(brille.Berater)),
    Datum: dayjs().format("DD.MM.YYYY"),
    ...werte(entities.glasRechts, "OD"),
    ...werte(entities.glasLinks, "OS"),
    ...werte(entities.vorherigesGlasRechts, "OD", " ALT"),
    ...werte(entities.vorherigesGlasLinks, "OS", " ALT"),
  };
};

// Feldnamen des BAP-Formulars sind durchnummeriert (f_4, rx_31, pr_110 ...);
// die Zuordnung stammt aus der Lage der Felder unter den Beschriftungen.
const bapFelder = (entities: DocumentMergeEntities) => {
  const k = kunde(entities);
  const brille: Record<string, unknown> = entities.brille ?? {};
  const messdatum = formatDatum(brille.Datum) || dayjs().format("DD.MM.YYYY");
  const { glasRechts: r, glasLinks: l } = entities;

  // Abschnitt 6 (Seite 2): Sphäre, Zylinder, Achse, Addition, Prisma/Basis, PD
  const bescheinigung = (glas: MergeSource, start: number) => {
    const werte = [
      formatWert(glas?.Sph, "dioptrie"),
      formatWert(glas?.Cyl, "dioptrie"),
      formatWert(glas?.A, "achse"),
      formatWert(glas?.Add, "dioptrie"),
      prismaBasis(glas),
      formatWert(glas?.PD, "frei"),
    ];
    return Object.fromEntries(werte.map((w, i) => [`rx_${start + i}`, w]));
  };
  // B b) Messung (Seite 3): Sph, Cyl, Achse, Prisma, Basis, Visus cc, Add, PD
  const messung = (glas: MergeSource, start: number) => {
    const werte = [
      formatWert(glas?.Sph, "dioptrie"),
      formatWert(glas?.Cyl, "dioptrie"),
      formatWert(glas?.A, "achse"),
      formatWert(glas?.Pr, "zwei"),
      formatWert(glas?.B, "frei"),
      formatWert(glas?.Vis, "visus"),
      formatWert(glas?.Add, "dioptrie"),
      formatWert(glas?.PD, "frei"),
    ];
    return Object.fromEntries(werte.map((w, i) => [`pr_${start + i}`, w]));
  };
  // Werte der anzufertigenden Brille (Seite 5): Sph, Cyl, Achse, HSA, MA,
  // DEG, Add, NZ-Add - MA, DEG und NZ-Add kennt das Programm nicht
  const neueBrille = (glas: MergeSource, start: number) => ({
    [`pr_${start}`]: formatWert(glas?.Sph, "dioptrie"),
    [`pr_${start + 1}`]: formatWert(glas?.Cyl, "dioptrie"),
    [`pr_${start + 2}`]: formatWert(glas?.A, "achse"),
    [`pr_${start + 3}`]: formatWert(glas?.HSA, "frei"),
    [`pr_${start + 6}`]: formatWert(glas?.Add, "dioptrie"),
  });
  // B a) Werte der vorhandenen Brille (Seite 3): Sph, Cyl, Achse, Visus,
  // HSA, MA, NZ, Add, NZ-Add - MA, NZ und NZ-Add kennt das Programm nicht
  const vorhanden = (glas: MergeSource, start: number) => ({
    [`pr_${start}`]: formatWert(glas?.Sph, "dioptrie"),
    [`pr_${start + 1}`]: formatWert(glas?.Cyl, "dioptrie"),
    [`pr_${start + 2}`]: formatWert(glas?.A, "achse"),
    [`pr_${start + 3}`]: formatWert(glas?.Vis, "visus"),
    [`pr_${start + 4}`]: formatWert(glas?.HSA, "frei"),
    [`pr_${start + 7}`]: formatWert(glas?.Add, "dioptrie"),
  });

  // Die Vorlage (public/formulare/antrag-bap.pdf) ist komplett vorbelegt;
  // Stempel und Unterschrift kommen aus den Einstellungen (nicht im PDF). Das Programm trägt nur die
  // Personendaten (Name, Geburtsdatum, Telefon/E-Mail, Kunden-Nr.), das
  // Messdatum und die Dioptrienwerte ein; alle Texte bleiben wie in der Vorlage.
  return {
    f_4: [text(k.Nachname), text(k.Vorname)].filter(Boolean).join(", "),
    f_5: formatDatum(k.Geburtsdatum),
    f_30: messdatum,
    hd_62: messdatum,
    hd_130: messdatum,
    hd_208: messdatum,
    hd_65: text(k.KundenNummer),
    hd_133: text(k.KundenNummer),
    hd_211: text(k.KundenNummer),
    f_9: [telefon(k), text(k.Email)].filter(Boolean).join(" / "),
    ...bescheinigung(r, 31),
    ...bescheinigung(l, 37),
    f_66: text(k.Nachname),
    f_67: text(k.Vorname),
    f_68: formatDatum(k.Geburtsdatum),
    ...messung(r, 110),
    ...messung(l, 118),
    ...neueBrille(r, 225),
    ...neueBrille(l, 233),
    ...vorhanden(entities.vorherigesGlasRechts, 85),
    ...vorhanden(entities.vorherigesGlasLinks, 94),
  };
};

// Berechtigungsschein GKV: Original des ZVA (AOK-Vertrag Sehhilfen,
// Anlage 4) mit nachträglich gesetzten Feldern
// (scripts/berechtigungsschein-gkv-felder.mjs). Vorausgefüllt wie bisher
// beim nachgebauten AOK-Schein: Versichertendaten, IK, Datum,
// Rechnungsnummer, Werte F/N je Auge, bei Sehstärkenänderung das Kreuz und
// die Glasanzahl, die Hilfsmittelpositionen (kassenanteil.ts) und als
// Rechnungsbetrag der Kassenanteil. Unfall und Unterschriften bleiben frei.
const berechtigungsscheinGkvFelder = (entities: DocumentMergeEntities) => {
  const k = kunde(entities);
  const brille: Record<string, unknown> = entities.brille ?? {};
  const veraendert = sehstaerkeVeraendert(entities) === true;
  const rechts = verteileWerte(brille.BrillenArt, entities.glasRechts);
  const links = verteileWerte(brille.BrillenArt, entities.glasLinks);
  const werte = (
    zeile: string,
    w: ReturnType<typeof verteileWerte>["ferne"],
  ) => ({
    [`${zeile}_sph`]: formatWert(w.Sph, "dioptrie"),
    [`${zeile}_cyl`]: formatWert(w.Cyl, "dioptrie"),
    [`${zeile}_achse`]: formatWert(w.A, "achse"),
    [`${zeile}_prisma`]: formatWert(w.Pr, "zwei"),
    [`${zeile}_basis`]: formatWert(w.B, "frei"),
    [`${zeile}_hsa`]: formatWert(w.HSA, "frei"),
  });
  const kassenanteil = Number(brille.KKAnteil) || 0;
  // Kostenabrechnung: jedes Glas (jede Hilfsmittelposition) einzeln mit
  // Faktor 1 und Bruttopreis; die Zeilen ergeben den Rechnungsbetrag
  // (KK-Anteil inkl. MwSt.)
  const abrechnung = bruttoZeilenEinzeln({
    augen: [
      { seite: "R", glas: entities.glasRechts ?? undefined },
      { seite: "L", glas: entities.glasLinks ?? undefined },
    ],
    kkAnteil: kassenanteil,
    gespeichert: brille.KassenPositionen,
  });
  const zeilen = abrechnung.zeilen
    .map((z) => ({
      hmv: z.nummer,
      faktor: String(z.faktor),
      betrag: formatWert(z.betrag, "zwei"),
    }))
    .slice(0, 9);
  const abrechnungsFelder = Object.fromEntries(
    zeilen.flatMap((z, i) => [
      [`abr${i + 1}_hmv`, z.hmv],
      [`abr${i + 1}_faktor`, z.faktor],
      [`abr${i + 1}_betrag`, z.betrag],
    ]),
  );
  return {
    krankenkasse: text(k.Krankenkasse),
    name: [text(k.Nachname), text(k.Vorname)].filter(Boolean).join(", "),
    geburtsdatum: formatDatum(k.Geburtsdatum),
    anschrift: adresse(k),
    kassennr: text(k.KrankenkassenNummer),
    versichertennr: text(k.VersichertenNummer),
    status: text(k.Versichertenstatus),
    ik: RECHNUNG_ABSENDER.ik,
    vk_gueltig: formatDatum(k.VersichertenkarteGueltigBis),
    datum: dayjs().format("DD.MM.YYYY"),
    rechnungsnummer: text(brille.Rechnungsnummer),
    ...(veraendert
      ? {
          cb_veraenderung: true,
          cb_augenglasbestimmung: true,
          anzahl_glaeser: anzahlGlaeser(entities),
        }
      : {}),
    ...werte("FR", rechts.ferne),
    ...werte("FL", links.ferne),
    ...werte("NR", rechts.naehe),
    ...werte("NL", links.naehe),
    ...abrechnungsFelder,
    // Summe der Zeilen (je Position gerundet), wenn sie bis auf Rundungscents
    // zum KK-Anteil passt; sonst (Zeilen unvollständig) der KK-Anteil
    rechnungsbetrag: formatWert(
      abrechnung.zeilen.length > 0 &&
        (kassenanteil === 0 ||
          Math.abs(abrechnung.summe - kassenanteil) <= 0.025)
        ? abrechnung.summe
        : kassenanteil || "",
      "zwei",
    ),
  };
};

// Optometrische Verordnung als Vordruck (Felder siehe
// scripts/verordnung-optometrist-felder.mjs, mit Firmenstempel und
// Unterschrift im Vordruck): Versicherter und Kasse aus der Kundenkartei,
// Refraktion Ferne/Nähe aus dem Auftrag, Erklärung (Veränderung, Anzahl der
// Gläser) wie beim Berechtigungsschein. Kostenrechnung und weitere Kästchen
// trägt der Optiker im PDF ein.
const KASSEN_KUERZEL: [string, RegExp][] = [
  ["aok", /\baok\b/i],
  ["lkk", /\blkk\b|landwirtschaft/i],
  ["bkk", /\bbkk\b|betriebskrankenkasse/i],
  ["ikk", /\bikk\b|innungskrankenkasse/i],
  ["vdak", /\bvdak\b/i],
  ["knappschaft", /knappschaft/i],
];

const verordnungOptometristFelder = (entities: DocumentMergeEntities) => {
  const k = kunde(entities);
  const brille: Record<string, unknown> = entities.brille ?? {};
  const veraendert = sehstaerkeVeraendert(entities) === true;
  const rechts = verteileWerte(brille.BrillenArt, entities.glasRechts);
  const links = verteileWerte(brille.BrillenArt, entities.glasLinks);
  const werte = (
    zeile: string,
    w: ReturnType<typeof verteileWerte>["ferne"],
  ) => ({
    [`${zeile}_sph`]: formatWert(w.Sph, "dioptrie"),
    [`${zeile}_cyl`]: formatWert(w.Cyl, "dioptrie"),
    [`${zeile}_achse`]: formatWert(w.A, "achse"),
    [`${zeile}_prisma`]: formatWert(w.Pr, "zwei"),
    [`${zeile}_basis`]: formatWert(w.B, "frei"),
    [`${zeile}_hsa`]: formatWert(w.HSA, "frei"),
  });
  const kasse = text(k.Krankenkasse);
  const kassenFeld = KASSEN_KUERZEL.find(([, muster]) => muster.test(kasse));
  const heute = dayjs().format("DD.MM.YYYY");
  return {
    ...(kassenFeld ? { [`kasse_${kassenFeld[0]}`]: "X" } : {}),
    name: [text(k.Nachname), text(k.Vorname)].filter(Boolean).join(", "),
    geburtsdatum: formatDatum(k.Geburtsdatum),
    kassennr: text(k.KrankenkassenNummer),
    versichertennr: text(k.VersichertenNummer),
    status: text(k.Versichertenstatus),
    vk_gueltig: formatDatum(k.VersichertenkarteGueltigBis),
    datum: heute,
    ausgestellt_am: heute,
    ...(veraendert
      ? { cb_veraenderung: true, anzahl_glaeser: anzahlGlaeser(entities) }
      : {}),
    ...(brillenartKategorie(brille.BrillenArt) === "Officebrille"
      ? { cb_bildschirm: true }
      : {}),
    ...werte("FR", rechts.ferne),
    ...werte("FL", links.ferne),
    ...werte("NR", rechts.naehe),
    ...werte("NL", links.naehe),
  };
};

// Erprobungsbericht elektronische Lupe (Vorbereitung Muster 8A, Felder siehe
// scripts/erprobungsbericht-lupe-felder.mjs): Patient, Kasse/IK, Fernvisus
// mit Korrektur aus dem Auftrag, Ort/Datum. Messwerte, Kreuze und Gerät
// trägt der Optiker im PDF ein.
const erprobungsberichtLupeFelder = (entities: DocumentMergeEntities) => {
  const k = kunde(entities);
  return {
    name: [text(k.Nachname), text(k.Vorname)].filter(Boolean).join(", "),
    geburtsdatum: formatDatum(k.Geburtsdatum),
    kasse_ik: [text(k.Krankenkasse), text(k.KrankenkassenNummer)]
      .filter(Boolean)
      .join(" / "),
    fern_od: formatWert(entities.glasRechts?.Vis, "zwei"),
    fern_os: formatWert(entities.glasLinks?.Vis, "zwei"),
    ort_datum: `${RECHNUNG_ABSENDER.ort}, ${dayjs().format("DD.MM.YYYY")}`,
  };
};

// Abholbestätigung mit Schuldanerkenntnis (Felder siehe
// scripts/abholbestaetigung-felder.mjs): Kunde, Auftrag und Beträge aus dem
// Auftrag; Zahlungsziel, IBAN, Ratenzahlung und Ausweis trägt der Optiker
// im PDF ein.
const abholbestaetigungFelder = (entities: DocumentMergeEntities) => {
  const k = kunde(entities);
  const brille: Record<string, unknown> = entities.brille ?? {};
  const zahl = (wert: unknown) => Number(wert) || 0;
  const summe = zahl(brille.Summe);
  const kassenanteil = zahl(brille.KKAnteil);
  const anzahlung = zahl(brille.Anzahlung);
  const offen = Math.round((summe - kassenanteil - anzahlung) * 100) / 100;
  const fassung = [entities.fassung?.Hersteller, entities.fassung?.Bezeichnung]
    .map(text)
    .filter(Boolean)
    .join(" ");
  return {
    name: [text(k.Nachname), text(k.Vorname)].filter(Boolean).join(", "),
    geburtsdatum: formatDatum(k.Geburtsdatum),
    anschrift: adresse(k),
    telefon_email: [telefon(k), text(k.Email)].filter(Boolean).join(" / "),
    auftragsnummer: [text(brille.id), text(brille.Rechnungsnummer)]
      .filter(Boolean)
      .join(" / "),
    auftragsdatum: formatDatum(brille.Datum),
    abgabedatum: dayjs().format("DD.MM.YYYY"),
    leistung: [
      text(brille.BrillenArt),
      fassung && `Fassung ${fassung}`,
      text(entities.glastyp?.Bezeichnung),
    ]
      .filter(Boolean)
      .join(", "),
    gesamtpreis: betrag(summe),
    kassenanteil: betrag(kassenanteil),
    anzahlung: betrag(anzahlung),
    offener_betrag: summe ? formatEuro(offen) : "",
    ort_datum: dayjs().format("DD.MM.YYYY"),
  };
};

// Kategorie in `dokumentvorlage` -> PDF-Vorlage
export const PDF_VORLAGEN: Record<string, PdfVorlage> = {
  Beobachtungsbogen: {
    datei: "beobachtungsbogen.pdf",
    titel: "Beobachtungsbogen",
    felder: beobachtungsbogenFelder,
  },
  "Antrag BAP": {
    datei: "antrag-bap.pdf",
    titel: "Antrag Bildschirmarbeitsplatzbrille",
    felder: bapFelder,
    vorbelegt: true,
    courier: true,
    // Stempel und Unterschrift (Einstellungen) im Untersuchungsprotokoll
    // (letzte Seite): Stempel im gestrichelten Kasten, Unterschrift auf der
    // Unterschriftszeile
    stempelUnterschrift: {
      stempel: { seite: -1, x: 358, oben: 727, breite: 184, hoehe: 48 },
      unterschrift: { seite: -1, x: 150, oben: 724, breite: 110, hoehe: 40 },
    },
    // "Ort, Datum" der Bescheinigung (Seite 2, Abschnitt 6) und des
    // Untersuchungsprotokolls (letzte Seite); Ort ist immer Gera
    ortDatum: {
      text: (entities) =>
        `Gera, ${formatDatum(entities.brille?.Datum) || dayjs().format("DD.MM.YYYY")}`,
      stellen: [
        { seite: 2, oben: 249 },
        { seite: -1, oben: 733 },
      ],
    },
  },
  "Optometrische Verordnung Vordruck": {
    datei: "verordnung-optometrist.pdf",
    titel: "Optometrische Verordnung (Vordruck)",
    felder: verordnungOptometristFelder,
    // Kasten "Firmenstempel": Stempel links, Unterschrift rechts daneben
    stempelUnterschrift: {
      stempel: { seite: 1, x: 122, oben: 650, breite: 92, hoehe: 50 },
      unterschrift: { seite: 1, x: 222, oben: 664, breite: 68, hoehe: 33 },
    },
  },
  "Berechtigungsschein GKV": {
    datei: "berechtigungsschein-gkv.pdf",
    titel: "Berechtigungsschein (GKV)",
    felder: berechtigungsscheinGkvFelder,
  },
  // Ältere Vorlagen der Kategorie "Berechtigungsschein" (z. B.
  // "Berechtigungsschein", "Berechtigungsschein Kassenbrille") füllen
  // ebenfalls das Original aus - der frühere Nachbau ist abgelöst.
  Berechtigungsschein: {
    datei: "berechtigungsschein-gkv.pdf",
    titel: "Berechtigungsschein (GKV)",
    felder: berechtigungsscheinGkvFelder,
  },
  Abholbestätigung: {
    datei: "abholbestaetigung.pdf",
    titel: "Abholbestätigung mit Schuldanerkenntnis",
    felder: abholbestaetigungFelder,
  },
  "Erprobungsbericht Lupe": {
    datei: "erprobungsbericht-lupe.pdf",
    titel: "Erprobungsbericht elektronische Lupe",
    felder: erprobungsberichtLupeFelder,
  },
};

// Felder mit begrenzter Länge (z. B. "Mitarbeiter" im Beobachtungsbogen)
// bekommen bei Namen die Initialen ("Robert Ulm" -> "RU"), sonst gekürzt.
export const passeAnFeldlaenge = (wert: string, max?: number) => {
  if (!max || wert.length <= max) return wert;
  const teile = wert.trim().split(/\s+/);
  const initialen = teile.map((teil) => teil.charAt(0).toUpperCase()).join("");
  return teile.length > 1 && initialen.length <= max
    ? initialen
    : wert.slice(0, max);
};

// Die Standardschrift der PDF-Formulare (WinAnsi) kennt z. B. das
// typografische Minus, Pfeile oder Vergleichszeichen nicht; pdf-lib bricht
// sonst das Speichern des ganzen PDFs ab. Solche Zeichen werden ersetzt.
const WINANSI_ERSATZ: Record<string, string> = {
  "\u2212": "-",
  "\u2010": "-",
  "\u2011": "-",
  "\u2192": "->",
  "\u2190": "<-",
  "\u2265": ">=",
  "\u2264": "<=",
  "\u00a0": " ",
};
const WINANSI_EXTRA = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";

export const fuerPdfSchrift = (wert: string): string =>
  [...wert]
    .map((zeichen) => {
      if (WINANSI_ERSATZ[zeichen] !== undefined) return WINANSI_ERSATZ[zeichen];
      const code = zeichen.charCodeAt(0);
      if (zeichen === "\n" || zeichen === "\r" || zeichen === "\t") return " ";
      if ((code >= 32 && code <= 126) || (code >= 160 && code <= 255)) {
        return zeichen;
      }
      return WINANSI_EXTRA.includes(zeichen) ? zeichen : "";
    })
    .join("");

// Lädt die Vorlage, setzt die Werte und gibt das weiterhin ausfüllbare PDF
// zurück. pdf-lib wird erst hier geladen, damit es nicht im Haupt-Bundle liegt.
export const fuellePdfVorlage = async (
  vorlage: PdfVorlage,
  pdfBytes: ArrayBuffer | Uint8Array,
  entities: DocumentMergeEntities,
): Promise<Uint8Array> => {
  const { PDFCheckBox, PDFDocument, PDFDropdown, PDFTextField, StandardFonts } =
    await import("pdf-lib");
  const pdf = await PDFDocument.load(pdfBytes);
  const form = pdf.getForm();
  const courier = vorlage.courier
    ? await pdf.embedFont(StandardFonts.Courier)
    : undefined;
  for (const [name, wert] of Object.entries(vorlage.felder(entities))) {
    if (!wert) continue;
    const feld = form.getFieldMaybe(name);
    try {
      if (wert === true) {
        if (feld instanceof PDFCheckBox) feld.check();
        continue;
      }
      if (feld instanceof PDFTextField) {
        feld.setText(
          passeAnFeldlaenge(fuerPdfSchrift(wert), feld.getMaxLength()),
        );
        // feste Größe statt "automatisch" (füllt sonst die ganze Feldhöhe);
        // Felder ohne eigene Schriftangabe bekommen eine
        try {
          feld.setFontSize(10);
        } catch {
          feld.acroField.setDefaultAppearance(
            `/${courier ? "Cour" : "Helv"} 10 Tf 0 g`,
          );
        }
        if (courier) feld.updateAppearances(courier);
      } else if (feld instanceof PDFDropdown) {
        // Werte außerhalb der Liste schaltet pdf-lib als freie Eingabe frei
        feld.select(fuerPdfSchrift(wert));
      }
    } catch (error) {
      console.warn(`PDF-Feld "${name}" konnte nicht gesetzt werden`, error);
    }
  }
  if (vorlage.stempelUnterschrift) {
    const bilder = betriebBilder();
    const seiten = pdf.getPages();
    const zeichne = async (url: string | undefined, kasten: BildKasten) => {
      const daten = bildUrl(url);
      if (!daten) return;
      const [kopf, base64] = daten.split(",");
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      // pdf-lib kann PNG und JPEG; WebP wird übersprungen
      const bild = kopf.includes("png")
        ? await pdf.embedPng(bytes)
        : kopf.includes("jpeg")
          ? await pdf.embedJpg(bytes)
          : null;
      if (!bild) return;
      const s =
        seiten[
          kasten.seite < 0 ? seiten.length + kasten.seite : kasten.seite - 1
        ];
      const faktor = Math.min(
        kasten.breite / bild.width,
        kasten.hoehe / bild.height,
      );
      const breite = bild.width * faktor;
      const hoehe = bild.height * faktor;
      s.drawImage(bild, {
        x: kasten.x + (kasten.breite - breite) / 2,
        y: s.getHeight() - kasten.oben - hoehe - (kasten.hoehe - hoehe) / 2,
        width: breite,
        height: hoehe,
      });
    };
    await zeichne(bilder.stempel, vorlage.stempelUnterschrift.stempel);
    await zeichne(
      bilder.unterschrift,
      vorlage.stempelUnterschrift.unterschrift,
    );
  }
  if (vorlage.ortDatum && courier) {
    const seiten = pdf.getPages();
    const text = fuerPdfSchrift(vorlage.ortDatum.text(entities));
    for (const { seite, oben } of vorlage.ortDatum.stellen) {
      const s = seiten[seite < 0 ? seiten.length + seite : seite - 1];
      s.drawText(text, {
        x: 52,
        y: s.getHeight() - oben,
        size: 10,
        font: courier,
      });
    }
  }
  if (vorlage.vorbelegt) {
    const { PDFBool, PDFDict, PDFName } = await import("pdf-lib");
    pdf.catalog
      .lookup(PDFName.of("AcroForm"), PDFDict)
      .set(PDFName.of("NeedAppearances"), PDFBool.False);
  }
  return pdf.save();
};

export const ladePdfVorlage = async (vorlage: PdfVorlage) => {
  const antwort = await fetch(
    `${import.meta.env.BASE_URL}formulare/${vorlage.datei}`,
  );
  if (!antwort.ok) {
    throw new Error(`Vorlage ${vorlage.datei} nicht gefunden`);
  }
  const bytes = await antwort.arrayBuffer();
  // Browser-Erweiterungen (z. B. PDF-Viewer) fangen PDF-Abrufe teils ab und
  // liefern stattdessen eine HTML-Seite.
  const kopf = new TextDecoder().decode(new Uint8Array(bytes.slice(0, 5)));
  if (kopf !== "%PDF-") {
    throw new Error(
      `Die Vorlage ${vorlage.datei} kam nicht als PDF an. Bitte PDF-Erweiterungen im Browser (z. B. Adobe Acrobat) für diese Seite deaktivieren.`,
    );
  }
  return bytes;
};
