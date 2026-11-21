// OPTICA-Unterlagen einlesen und speichern: PDFs lesen, Läufe bilden,
// Original-PDFs im Speicher "optica-abrechnung" ablegen und die Daten in
// optica_abrechnung, optica_absetzung, optica_ekv und kassenrezept schreiben.
// Erneutes Einlesen desselben Monats aktualisiert, ohne Doppelte anzulegen.

import { supabase } from "./utils";
import {
  type OpticaDokument,
  type OpticaLauf,
  dokumentAusZeilen,
  laeufeAusDokumenten,
} from "./opticaParser";
import {
  type KundeTreffer,
  type OpticaDatei,
  abrechnungAusLauf,
  dateiPfad,
  findeKunde,
  kassenrezeptAusOptica,
} from "./optica";

export const OPTICA_BUCKET = "optica-abrechnung";
const SEITE = 1000;

export type GeleseneUnterlagen = {
  laeufe: OpticaLauf[];
  /** Dateien je Abrechnungsmonat, zum Ablegen. */
  dateien: Map<string, File[]>;
  /** Dateien, die keine OPTICA-Unterlage sind (kein Abrechnungsmonat). */
  uebersprungen: string[];
  /** Dateien, die nicht gelesen werden konnten, mit Grund. */
  fehler: { name: string; grund: string }[];
};

const fehlerText = (err: unknown) =>
  err instanceof Error ? `${err.name}: ${err.message}` : String(err);

/** Ausgewählte PDFs lesen und nach Abrechnungsmonat zu Läufen bündeln. */
export const liesUnterlagen = async (
  dateien: File[],
  fortschritt?: (fertig: number, gesamt: number) => void,
): Promise<GeleseneUnterlagen> => {
  const { pdfTextZeilen } = await import("./pdfText");
  const pdfs = dateien.filter((d) => /\.pdf$/i.test(d.name));
  const dokumente: { doc: OpticaDokument; datei: File }[] = [];
  const uebersprungen = dateien
    .filter((d) => !/\.pdf$/i.test(d.name) && !d.name.startsWith("."))
    .map((d) => d.name);
  const fehler: GeleseneUnterlagen["fehler"] = [];
  let fertig = 0;
  for (const datei of pdfs) {
    try {
      let zeilen: string[];
      try {
        zeilen = await pdfTextZeilen(await datei.arrayBuffer());
      } catch {
        // Ein zweiter Versuch hilft, wenn pdf.js kurz hängt
        zeilen = await pdfTextZeilen(await datei.arrayBuffer());
      }
      const doc = dokumentAusZeilen(datei.name, zeilen);
      if (doc.kopf) dokumente.push({ doc, datei });
      else uebersprungen.push(datei.name);
    } catch (err) {
      console.error("PDF konnte nicht gelesen werden", datei.name, err);
      fehler.push({ name: datei.name, grund: fehlerText(err) });
    }
    fortschritt?.(++fertig, pdfs.length);
  }
  const dateienJeMonat = new Map<string, File[]>();
  for (const { doc, datei } of dokumente) {
    const monat = doc.kopf!.monat;
    const liste = dateienJeMonat.get(monat) ?? [];
    // Gleicher Dateiname im selben Monat (z. B. Kopie im Ordner REZEPTE): nur einmal
    if (!liste.some((d) => d.name === datei.name)) liste.push(datei);
    dateienJeMonat.set(monat, liste);
  }
  return {
    laeufe: laeufeAusDokumenten(dokumente.map((d) => d.doc)),
    dateien: dateienJeMonat,
    uebersprungen,
    fehler,
  };
};

export const ladeSeitenweise = async <T>(
  abfrage: (
    von: number,
    bis: number,
  ) => PromiseLike<{ data: unknown[] | null; error: unknown }>,
): Promise<T[]> => {
  const alle: T[] = [];
  for (let von = 0; ; von += SEITE) {
    const { data, error } = await abfrage(von, von + SEITE - 1);
    if (error) throw error;
    alle.push(...((data ?? []) as T[]));
    if (!data || data.length < SEITE) break;
  }
  return alle;
};

export const ladeKundenFuerAbgleich = () =>
  ladeSeitenweise<KundeTreffer>((von, bis) =>
    supabase
      .from("kunde")
      .select('id, "Nachname", "Vorname", "Geburtsdatum", "VersichertenNummer"')
      .order("id")
      .range(von, bis),
  );

export type SpeicherErgebnis = {
  monat: string;
  rezepteNeu: number;
  rezepteVorhanden: number;
  rezepteZugeordnet: number;
  absetzungen: number;
  absetzungenVerknuepft: number;
  ekv: number;
  dateien: number;
};

const belegeLaden = async (belege: string[]) => {
  const m = new Map<string, { id: number; kunde_id: number | null }>();
  for (let i = 0; i < belege.length; i += 200) {
    const { data, error } = await supabase
      .from("kassenrezept")
      .select('id, kunde_id, "Belegnummer"')
      .in("Belegnummer", belege.slice(i, i + 200));
    if (error) throw error;
    for (const r of data ?? [])
      m.set(r.Belegnummer, { id: r.id, kunde_id: r.kunde_id });
  }
  return m;
};

/** Einen gelesenen Lauf speichern. */
export const speichereLauf = async (
  lauf: OpticaLauf,
  dateien: File[],
  kunden: KundeTreffer[],
): Promise<SpeicherErgebnis> => {
  // 1. Original-PDFs ablegen
  const abgelegt: OpticaDatei[] = [];
  for (const datei of dateien) {
    const pfad = dateiPfad(lauf.monat, datei.name);
    const { error } = await supabase.storage
      .from(OPTICA_BUCKET)
      .upload(pfad, datei, { upsert: true, contentType: "application/pdf" });
    if (error) throw error;
    abgelegt.push({
      name: datei.name,
      pfad,
      art:
        lauf.dokumente.find((d) => d.name === datei.name)?.art ?? "unbekannt",
      groesse: datei.size,
    });
  }

  // 2. Lauf anlegen oder aktualisieren; bereits abgelegte Dateien behalten
  const { data: alt } = await supabase
    .from("optica_abrechnung")
    .select('id, "Dateien"')
    .eq("Abrechnungsmonat", lauf.monat)
    .maybeSingle();
  const bisher = ((alt?.Dateien as OpticaDatei[] | null) ?? []).filter(
    (d) => !abgelegt.some((n) => n.pfad === d.pfad),
  );
  const { data: gespeichert, error: fehlerLauf } = await supabase
    .from("optica_abrechnung")
    .upsert(
      { ...abrechnungAusLauf(lauf), Dateien: [...bisher, ...abgelegt] },
      { onConflict: "Abrechnungsmonat" },
    )
    .select("id")
    .single();
  if (fehlerLauf) throw fehlerLauf;
  const abrechnungId = gespeichert.id as number;

  // 3. Neue Rezepte übernehmen, vorhandene (z. B. schon zugeordnete) bleiben
  const vorhanden = await belegeLaden(lauf.rezepte.map((r) => r.belegnummer));
  const neu = lauf.rezepte
    .filter((r) => !vorhanden.has(r.belegnummer))
    .map((r) =>
      kassenrezeptAusOptica(
        r,
        lauf.monat,
        lauf.abrechnungsdatum,
        findeKunde(r, kunden),
      ),
    );
  if (neu.length) {
    const { error } = await supabase
      .from("kassenrezept")
      .upsert(neu, { onConflict: "Belegnummer", ignoreDuplicates: true });
    if (error) throw error;
  }

  // 4. Absetzungen, mit dem abgesetzten Rezept verknüpft
  const absetzungen = lauf.konto?.absetzungen ?? [];
  const belege = await belegeLaden(
    absetzungen.map((a) => a.belegnummer).filter((b): b is string => !!b),
  );
  if (absetzungen.length) {
    const { error } = await supabase.from("optica_absetzung").upsert(
      absetzungen.map((a) => {
        const rezept = a.belegnummer ? belege.get(a.belegnummer) : undefined;
        return {
          abrechnung_id: abrechnungId,
          Abrechnungsmonat: lauf.monat,
          Lfd: a.lfd,
          Kostentraeger: a.kostentraeger,
          Grund: a.grund,
          Rechnungsnummer: a.rechnungsnummer,
          Belegnummer: a.belegnummer,
          MwStSatz: a.mwstSatz,
          Betrag: a.betrag,
          kassenrezept_id: rezept?.id ?? null,
          kunde_id: rezept?.kunde_id ?? null,
        };
      }),
      { onConflict: "abrechnung_id,Lfd" },
    );
    if (error) throw error;
  }

  // 5. Kostenvoranschläge
  if (lauf.ekv.length) {
    const { error } = await supabase.from("optica_ekv").upsert(
      lauf.ekv.map((e) => ({
        abrechnung_id: abrechnungId,
        Abrechnungsmonat: lauf.monat,
        KvNummer: e.kvNummer,
        Kasse: e.kasse,
        KvDatum: e.kvDatum,
        Genehmigt: e.genehmigt,
        Genehmigungsnummer: e.genehmigungsnummer,
        Teilgenehmigt: e.teilgenehmigt,
        Gebuehr: e.gebuehr,
        Zuzahlung: e.zuzahlung,
        Beantragt: e.beantragt,
        Erstattung: e.erstattung,
        Versichertennummer: e.versichertennummer,
        Nachname: e.nachname,
        Vorname: e.vorname,
        Geburtsdatum: e.geburtsdatum,
        kunde_id: findeKunde(e, kunden),
      })),
      { onConflict: "abrechnung_id,KvNummer" },
    );
    if (error) throw error;
  }

  return {
    monat: lauf.monat,
    rezepteNeu: neu.length,
    rezepteVorhanden: lauf.rezepte.length - neu.length,
    rezepteZugeordnet: neu.filter((r) => r.kunde_id != null).length,
    absetzungen: absetzungen.length,
    absetzungenVerknuepft: absetzungen.filter(
      (a) => a.belegnummer && belege.has(a.belegnummer),
    ).length,
    ekv: lauf.ekv.length,
    dateien: abgelegt.length,
  };
};

/** Signierten Link zum Öffnen eines abgelegten PDFs (1 Stunde gültig). */
export const pdfLink = async (pfad: string) => {
  const { data, error } = await supabase.storage
    .from(OPTICA_BUCKET)
    .createSignedUrl(pfad, 3600);
  if (error) throw error;
  return data.signedUrl;
};
