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
  buildWerkstattauftragSummen,
  formatDatum,
  formatEuro,
  formatWert,
  text,
} from "./werkstattauftragTemplate";
import {
  alterVorherigeBrille,
  anzahlGlaeser,
  brillenartKategorie,
  sehstaerkeVeraendert,
} from "./formularVorschlaege";
import { verteileWerte } from "./aokBerechtigungsscheinTemplate";
import { MWST, abrechnungsZeilen } from "./kassenanteil";
import { mitarbeiterAnzeige } from "./mitarbeiterNamen";

// Textfelder bekommen einen Text, Kästchen true (angekreuzt)
export type PdfFeldwerte = Record<string, string | boolean>;

export type PdfVorlage = {
  datei: string;
  titel: string;
  felder: (entities: DocumentMergeEntities) => PdfFeldwerte;
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
  const glastyp: Record<string, unknown> = entities.glastyp ?? {};
  const fassung: Record<string, unknown> = entities.fassung ?? {};
  const { glasRechts: r, glasLinks: l } = entities;
  const summen = buildWerkstattauftragSummen(entities);
  const zusatzleistungen = (entities.zusatzleistungen ?? []).filter(Boolean);
  const messdatum = formatDatum(brille.Datum) || dayjs().format("DD.MM.YYYY");
  const a = RECHNUNG_ABSENDER;

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
  // Kopfzeile der Protokollseiten 3-5: Untersuchungsdatum, Untersucher/in,
  // Kunden-Nr. (Protokoll-Nr. und Uhrzeit bleiben frei)
  const kopf = (start: number) => ({
    [`hd_${start + 1}`]: messdatum,
    [`hd_${start + 3}`]: text(mitarbeiterAnzeige(brille.Berater)),
    [`hd_${start + 4}`]: text(k.KundenNummer),
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
  // Kästchen "Art der Brille": Fern, Nah, Bifokal, Gleitsicht, Office
  const art = (brillenArt: unknown, felder: Record<string, string>) => {
    const kategorie = brillenartKategorie(brillenArt);
    return kategorie && felder[kategorie] ? { [felder[kategorie]]: true } : {};
  };
  const veraendert = sehstaerkeVeraendert(entities) === true;
  const alter = alterVorherigeBrille(entities);
  const addAlt = Number(entities.vorherigesGlasRechts?.Add) || 0;
  const addNeu = Number(r?.Add) || 0;
  const glasart = brillenartKategorie(brille.BrillenArt);

  return {
    f_4: [text(k.Nachname), text(k.Vorname)].filter(Boolean).join(", "),
    f_5: formatDatum(k.Geburtsdatum),
    f_8: text(k.Tätigkeit),
    f_9: [telefon(k), text(k.Email)].filter(Boolean).join(" / "),
    f_29: `${a.firma}, ${a.strasseLang}, ${a.plz} ${a.ort}`,
    f_30: messdatum,
    ...bescheinigung(r, 31),
    ...bescheinigung(l, 37),
    f_48: [fassung.Hersteller, fassung.Bezeichnung]
      .map(text)
      .filter(Boolean)
      .join(" "),
    f_49: betrag(Number(fassung.Betrag) || 0),
    f_50: [glastyp.Bezeichnung, glastyp.Verguetung]
      .map(text)
      .filter(Boolean)
      .join(", "),
    f_51: betrag((Number(r?.Betrag) || 0) + (Number(l?.Betrag) || 0)),
    f_52: zusatzleistungen.map((z) => text(z?.Bezeichnung)).join(", "),
    f_53: betrag(
      zusatzleistungen.reduce((sum, z) => sum + (Number(z?.Betrag) || 0), 0),
    ),
    f_54: betrag(summen.gesamt),
    ...kopf(61),
    ...kopf(129),
    ...kopf(207),
    f_66: text(k.Nachname),
    f_67: text(k.Vorname),
    f_68: formatDatum(k.Geburtsdatum),
    ...messung(r, 110),
    ...messung(l, 118),
    ...neueBrille(r, 225),
    ...neueBrille(l, 233),
    // vorhandene Brille (vorheriger Auftrag)
    ...vorhanden(entities.vorherigesGlasRechts, 85),
    ...vorhanden(entities.vorherigesGlasLinks, 94),
    ...art(entities.vorherigeBrille?.BrillenArt, {
      Fernbrille: "cb_77",
      Nahbrille: "cb_78",
      Bifokalbrille: "cb_79",
      Gleitsichtbrille: "cb_80",
      Officebrille: "cb_81",
    }),
    // "ist ca. __ Jahre alt; Glasstärken entsprechen nicht mehr dem Bedarf"
    ...(veraendert && alter !== null
      ? { tb_103: true, tbf_104: String(alter) }
      : {}),
    // fortschreitende Presbyopie: Addition gegenüber der alten Brille gestiegen
    ...(addAlt > 0 && addNeu > addAlt ? { tb_105: true } : {}),
    // Empfohlene Glasart (Seite 2) und Art der neuen Brille (Seite 5)
    ...(glasart === "Officebrille" ? { cb_44: true } : {}),
    ...(glasart === "Gleitsichtbrille" ? { cb_45: true } : {}),
    ...(glasart === "Bifokalbrille" ? { cb_46: true } : {}),
    ...(glasart === "Fernbrille" || glasart === "Nahbrille"
      ? { cb_43: true }
      : {}),
    ...art(brille.BrillenArt, {
      Fernbrille: "cb_217",
      Nahbrille: "cb_218",
      Bifokalbrille: "cb_219",
      Gleitsichtbrille: "cb_220",
      Officebrille: "cb_221",
    }),
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
  // Kostenabrechnung: Hilfsmittelpositionen netto, dazu eine Zeile MwSt.,
  // damit die Spalte den Rechnungsbetrag (KK-Anteil inkl. MwSt.) ergibt
  const abrechnung = abrechnungsZeilen({
    augen: [
      { seite: "R", glas: entities.glasRechts ?? undefined },
      { seite: "L", glas: entities.glasLinks ?? undefined },
    ],
    kkAnteil: kassenanteil,
    gespeichert: brille.KassenPositionen,
  });
  const zeilen = [
    ...abrechnung.zeilen.map((z) => ({
      hmv: z.nummer,
      faktor: String(z.faktor),
      betrag: formatWert(z.betrag, "zwei"),
    })),
    ...(abrechnung.zeilen.length > 0
      ? [
          {
            hmv: `zzgl. ${Math.round(MWST * 100)} % MwSt.`,
            faktor: "",
            betrag: formatWert(abrechnung.mwst, "zwei"),
          },
        ]
      : []),
  ].slice(0, 9);
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
    rechnungsbetrag: kassenanteil > 0 ? formatWert(kassenanteil, "zwei") : "",
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
  const { PDFCheckBox, PDFDocument, PDFDropdown, PDFTextField } =
    await import("pdf-lib");
  const pdf = await PDFDocument.load(pdfBytes);
  const form = pdf.getForm();
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
          feld.acroField.setDefaultAppearance("/Helv 10 Tf 0 g");
        }
      } else if (feld instanceof PDFDropdown) {
        // Werte außerhalb der Liste schaltet pdf-lib als freie Eingabe frei
        feld.select(fuerPdfSchrift(wert));
      }
    } catch (error) {
      console.warn(`PDF-Feld "${name}" konnte nicht gesetzt werden`, error);
    }
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
