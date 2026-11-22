// OPTICA-Abrechnungen (Tabellen optica_abrechnung, optica_absetzung,
// optica_ekv): Datensätze aus gelesenen Läufen bilden und Auswertungen
// rechnen. Ohne React und ohne Datenbank, damit es sich testen lässt.

import type { Kassenrezept } from "./kassenrezept";
import { zahl } from "./kassenrezept";
import type {
  Kassenrechnung,
  OpticaDokumentArt,
  OpticaLauf,
  OpticaRezept,
  Steuersatz,
  Umsatzstatistik,
} from "./opticaParser";

type Betrag = number | string | null;

export type OpticaDatei = {
  name: string;
  pfad: string;
  art: OpticaDokumentArt;
  groesse?: number;
};

export type OpticaAbrechnung = {
  id: number;
  Abrechnungsmonat: string;
  Abrechnungsdatum: string | null;
  Rechnungsnummer: string | null;
  Rechnungsdatum: string | null;
  Brutto: Betrag;
  Netto: Betrag;
  MwSt: Betrag;
  Zuzahlung: Betrag;
  Forderung: Betrag;
  Absetzungen: Betrag;
  Gebuehren: Betrag;
  GebuehrenRezepte: Betrag;
  GebuehrenEkv: Betrag;
  Zahlungen: Betrag;
  AuszahlungMonat: Betrag;
  SaldoVormonat: Betrag;
  Auszahlung: Betrag;
  RezepteEingesendet: number | null;
  RezepteAbgerechnet: number | null;
  RezepteZurueck: number | null;
  Steuersaetze: Steuersatz[] | null;
  Kassenrechnungen: Kassenrechnung[] | null;
  Umsatzstatistik: Umsatzstatistik | null;
  Dateien: OpticaDatei[] | null;
  Bemerkung: string | null;
};

export type OpticaAbsetzung = {
  id: number;
  abrechnung_id: number;
  Abrechnungsmonat: string;
  Lfd: number;
  Kostentraeger: string | null;
  Grund: string | null;
  Rechnungsnummer: string | null;
  Belegnummer: string | null;
  MwStSatz: Betrag;
  Betrag: Betrag;
  kassenrezept_id: number | null;
  kunde_id: number | null;
  Erledigt: boolean;
  Notiz: string | null;
};

export type OpticaEkv = {
  id: number;
  abrechnung_id: number;
  Abrechnungsmonat: string;
  KvNummer: string;
  Kasse: string | null;
  KvDatum: string | null;
  Genehmigt: string | null;
  Genehmigungsnummer: string | null;
  Teilgenehmigt: boolean;
  Gebuehr: Betrag;
  Zuzahlung: Betrag;
  Beantragt: Betrag;
  Erstattung: Betrag;
  Versichertennummer: string | null;
  Nachname: string | null;
  Vorname: string | null;
  Geburtsdatum: string | null;
  kunde_id: number | null;
};

const runde = (n: number) => Math.round(n * 100) / 100;

// ---------------------------------------------------------------------------
// Datensätze aus einem gelesenen Lauf

/** Zeile für optica_abrechnung (ohne id und Dateien). */
export const abrechnungAusLauf = (l: OpticaLauf) => {
  const n = l.nachweis;
  return {
    Abrechnungsmonat: l.monat,
    Abrechnungsdatum: l.abrechnungsdatum,
    Rechnungsnummer: n?.rechnungsnummer ?? l.gebuehren?.rechnungsnummer ?? null,
    Rechnungsdatum: l.gebuehren?.rechnungsdatum ?? null,
    Brutto: n?.brutto ?? 0,
    Netto: n?.netto ?? 0,
    MwSt: n?.mwst ?? 0,
    Zuzahlung: n?.zuzahlung ?? 0,
    Forderung: n?.forderung ?? l.konto?.forderung ?? 0,
    Absetzungen: n?.absetzungen ?? l.konto?.absetzungenSumme ?? 0,
    Gebuehren: n?.gebuehren ?? l.gebuehren?.summe ?? 0,
    GebuehrenRezepte: l.gebuehren?.rezepte ?? 0,
    GebuehrenEkv: l.gebuehren?.ekv ?? 0,
    Zahlungen: n?.zahlungen ?? 0,
    AuszahlungMonat: n?.auszahlungMonat ?? 0,
    SaldoVormonat: n?.saldoVormonat ?? 0,
    Auszahlung: n?.auszahlung ?? 0,
    RezepteEingesendet: l.konto?.rezepteEingesendet ?? null,
    RezepteAbgerechnet:
      l.konto?.rezepteAbgerechnet ?? (l.rezepte.length || null),
    RezepteZurueck: l.konto?.rezepteZurueck ?? null,
    Steuersaetze: n?.steuersaetze ?? [],
    Kassenrechnungen: l.konto?.kassenrechnungen ?? [],
    Umsatzstatistik: l.umsatz,
    updated_at: new Date().toISOString(),
  };
};

/** Zeile für kassenrezept aus einem Rezept der Rezeptübersicht. */
export const kassenrezeptAusOptica = (
  r: OpticaRezept,
  monat: string,
  abrechnungsdatum: string | null,
  kundeId: number | null,
) => ({
  kunde_id: kundeId,
  Abrechnungsmonat: monat,
  Abrechnungsdatum: abrechnungsdatum,
  Belegnummer: r.belegnummer,
  Nachname: r.nachname,
  Vorname: r.vorname,
  Geburtsdatum: r.geburtsdatum,
  Versichertennummer: r.versichertennummer,
  Krankenkasse: r.krankenkasse,
  Rezeptdatum: r.rezeptdatum,
  Leistungen: r.leistungen,
  Netto: r.netto,
  MwSt: r.mwst,
  Brutto: r.brutto,
  Zuzahlung: r.zuzahlung,
});

export type KundeTreffer = {
  id: number;
  Nachname: string | null;
  Vorname: string | null;
  Geburtsdatum: string | null;
  VersichertenNummer: string | null;
};

const norm = (t: string | null | undefined) =>
  (t ?? "")
    .toLocaleLowerCase("de")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]/g, "");

/**
 * Kunden zu einer Person finden: zuerst über die Versichertennummer, sonst
 * über Nachname, Vorname und Geburtsdatum. Nur eindeutige Treffer zählen.
 */
export const findeKunde = (
  person: {
    versichertennummer: string | null;
    nachname: string | null;
    vorname: string | null;
    geburtsdatum: string | null;
  },
  kunden: KundeTreffer[],
): number | null => {
  const vnr = norm(person.versichertennummer);
  if (vnr) {
    const t = kunden.filter((k) => norm(k.VersichertenNummer) === vnr);
    if (t.length === 1) return t[0].id;
  }
  if (person.nachname && person.geburtsdatum) {
    const t = kunden.filter(
      (k) =>
        norm(k.Nachname) === norm(person.nachname) &&
        k.Geburtsdatum?.slice(0, 10) === person.geburtsdatum &&
        (!person.vorname ||
          norm(k.Vorname).startsWith(norm(person.vorname).slice(0, 3))),
    );
    if (t.length === 1) return t[0].id;
  }
  return null;
};

// ---------------------------------------------------------------------------
// Auswertungen

export type JahresSummen = {
  laeufe: number;
  rezepte: number;
  brutto: number;
  zuzahlung: number;
  forderung: number;
  absetzungen: number; // positiv
  gebuehren: number;
  auszahlung: number; // Summe "Auszahlungsbetrag lfd. Monat"
  absetzungsquote: number; // in % der Forderung
  gebuehrenquote: number; // in % der Forderung
};

export const jahresSummen = (laeufe: OpticaAbrechnung[]): JahresSummen => {
  let rezepte = 0;
  let brutto = 0;
  let zuzahlung = 0;
  let forderung = 0;
  let absetzungen = 0;
  let gebuehren = 0;
  let auszahlung = 0;
  for (const l of laeufe) {
    rezepte += l.RezepteAbgerechnet ?? 0;
    brutto += zahl(l.Brutto);
    zuzahlung += zahl(l.Zuzahlung);
    forderung += zahl(l.Forderung);
    absetzungen += -zahl(l.Absetzungen);
    gebuehren += zahl(l.Gebuehren);
    auszahlung += zahl(l.AuszahlungMonat);
  }
  const quote = (x: number) =>
    forderung > 0 ? runde((x / forderung) * 100) : 0;
  return {
    laeufe: laeufe.length,
    rezepte,
    brutto: runde(brutto),
    zuzahlung: runde(zuzahlung),
    forderung: runde(forderung),
    absetzungen: runde(absetzungen),
    gebuehren: runde(gebuehren),
    auszahlung: runde(auszahlung),
    absetzungsquote: quote(absetzungen),
    gebuehrenquote: quote(gebuehren),
  };
};

/** Jahre, für die Läufe vorliegen, absteigend. */
export const jahreDerLaeufe = (laeufe: OpticaAbrechnung[]) =>
  [...new Set(laeufe.map((l) => l.Abrechnungsmonat.slice(0, 4)))]
    .sort()
    .reverse();

/**
 * Abgleich Rezepte ↔ Abrechnungsnachweis: weicht die Summe der Rezepte
 * eines Monats vom Brutto des Laufs ab, fehlen Rezepte oder sind zu viele da.
 */
export const rezeptAbgleich = (
  lauf: OpticaAbrechnung,
  rezepte: Pick<Kassenrezept, "Abrechnungsmonat" | "Brutto">[],
) => {
  const eigene = rezepte.filter(
    (r) => r.Abrechnungsmonat === lauf.Abrechnungsmonat,
  );
  const brutto = runde(eigene.reduce((a, r) => a + zahl(r.Brutto), 0));
  const differenz = runde(brutto - zahl(lauf.Brutto));
  return {
    anzahl: eigene.length,
    brutto,
    differenz,
    passt:
      Math.abs(differenz) < 0.005 &&
      (lauf.RezepteAbgerechnet == null ||
        lauf.RezepteAbgerechnet === eigene.length),
  };
};

/** Absetzungsgründe grob einordnen, damit man sieht, was am häufigsten passiert. */
export const GRUND_KATEGORIEN: { name: string; muster: RegExp }[] = [
  {
    name: "Genehmigung fehlt/abgelaufen",
    muster: /genehmigung|genehm\b|ausgeleistet|höchstsatz|verordnungsmenge/i,
  },
  { name: "Doppelt abgerechnet", muster: /doppelt/i },
  { name: "Kein Vertrag", muster: /vertrag/i },
  { name: "Zuzahlung/Befreiung", muster: /zuzahlung|befrei/i },
  {
    name: "Versicherten-/Kassendaten",
    muster: /versichertennummer|mitgliedschaft|kostenträger falsch/i,
  },
  {
    name: "Formfehler auf dem Rezept",
    muster: /empfangsbestätigung|unterschrift|datum|i\. ?v\.|i\. ?a\./i,
  },
  {
    name: "Betrag/Positionen",
    muster: /nicht in voller höhe|legs|himi|preis|betrag/i,
  },
  { name: "Änderungsschreiben", muster: /änderungsschreiben/i },
];

export const grundKategorie = (grund: string | null) =>
  GRUND_KATEGORIEN.find((k) => k.muster.test(grund ?? ""))?.name ?? "Sonstiges";

export type Gruppe = { name: string; anzahl: number; betrag: number };

const gruppiere = <T>(
  liste: T[],
  schluessel: (x: T) => string,
  wert: (x: T) => number,
): Gruppe[] => {
  const m = new Map<string, Gruppe>();
  for (const x of liste) {
    const k = schluessel(x);
    const g = m.get(k) ?? { name: k, anzahl: 0, betrag: 0 };
    g.anzahl += 1;
    g.betrag = runde(g.betrag + wert(x));
    m.set(k, g);
  }
  return [...m.values()].sort(
    (a, b) => b.betrag - a.betrag || a.name.localeCompare(b.name),
  );
};

/** Absetzungen nach Grund (Beträge positiv). */
export const absetzungenNachGrund = (liste: OpticaAbsetzung[]) =>
  gruppiere(
    liste,
    (a) => grundKategorie(a.Grund),
    (a) => -zahl(a.Betrag),
  );

/** Absetzungen nach Kostenträger (Beträge positiv). */
export const absetzungenNachKasse = (liste: OpticaAbsetzung[]) =>
  gruppiere(
    liste,
    (a) => a.Kostentraeger ?? "unbekannt",
    (a) => -zahl(a.Betrag),
  );

/** Leistungen aller Rezepte nach Positionsnummer (wie die Leistungsstatistik). */
export const leistungenNachPosition = (rezepte: Kassenrezept[]) => {
  const m = new Map<
    string,
    {
      pzn: string;
      text: string;
      anzahl: number;
      brutto: number;
      zuzahlung: number;
    }
  >();
  for (const r of rezepte) {
    for (const l of r.Leistungen ?? []) {
      const k = l.pzn || l.text;
      const g = m.get(k) ?? {
        pzn: l.pzn,
        text: l.text,
        anzahl: 0,
        brutto: 0,
        zuzahlung: 0,
      };
      g.anzahl += zahl(l.faktor) || 1;
      g.brutto = runde(g.brutto + zahl(l.brutto));
      g.zuzahlung = runde(g.zuzahlung + zahl(l.zuzahlung));
      m.set(k, g);
    }
  }
  return [...m.values()].sort((a, b) => b.brutto - a.brutto);
};

/** Absetzungen je Rezept (kassenrezept_id → Summe, positiv). */
export const absetzungJeRezept = (
  liste: Pick<OpticaAbsetzung, "kassenrezept_id" | "Betrag">[],
) => {
  const m = new Map<number, number>();
  for (const a of liste) {
    if (a.kassenrezept_id == null) continue;
    m.set(
      a.kassenrezept_id,
      runde((m.get(a.kassenrezept_id) ?? 0) - zahl(a.Betrag)),
    );
  }
  return m;
};

/** Speicherpfad einer Datei im Bucket optica-abrechnung. */
export const dateiPfad = (monat: string, name: string) =>
  `${monat}/${name
    .normalize("NFC")
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .replace(/_+/g, "_")}`;
