// Kassenanteil (KK-Anteil) einer Brille nach der Preisvereinbarung
// Brillengläser, Anhang 1 zum Rahmenvertrag über die Versorgung mit
// Sehhilfen vdek - ZVA vom 1. September 2024. Je Auge wird die
// Hilfsmittelposition aus den Glaswerten bestimmt; die Vertragspreise sind
// netto, der Kassenanteil enthält 19 % Mehrwertsteuer.
//
// - Stärken in Pluszylinder-Schreibweise wie im Vertrag (Minuszylinder wird
//   umgerechnet); maßgeblich ist der Betrag der Sphäre (Fernteil).
// - Mehrstärkenglas, wenn eine Addition eingetragen ist.
// - Zylinder über +4,0 dpt: Position für cyl ≤ +4,0 dpt plus Zuschlag.
// - Positionen mit Kostenvoranschlag (KV, genehmigungspflichtig) werden nicht
//   berechnet, sondern als Hinweis ausgegeben.
// - Brillenglasbestimmung (25.99.99.0001) ist bei augenärztlicher
//   Verordnung nicht abrechenbar (Anlage 1, § 3 Abs. 5 des Vertrags).
// - Zuschläge, die sich nicht aus den Werten ergeben (Kantenfilter, Folien,
//   Brillenglasbestimmung), stehen in ZUSAETZE und werden im Dialog
//   angehakt.

export const MWST = 0.19;

type Glaswerte = Record<string, unknown> | undefined;

export type KassenPosition = {
  seite: "R" | "L";
  nummer: string;
  bezeichnung: string;
  netto: number;
};

export type Kassenanteil = {
  positionen: KassenPosition[];
  netto: number;
  // Kassenanteil inkl. MwSt.
  brutto: number;
  // Positionen ohne Festpreis (Kostenvoranschlag) o. Ä.
  hinweise: string[];
};

type Stufe = {
  nummer: string;
  bezeichnung: string;
  // obere Grenze für |sph| und ob sie eingeschlossen ist
  bis: number;
  einschliesslich: boolean;
  netto: number | null; // null = Kostenvoranschlag
};

// Einstärkengläser 25.21.01, Zylinder bis +4,0 dpt (≤ ±6,0 dpt sph nach
// Zylinder unterteilt, siehe einstaerkenStufe)
const EINSTAERKEN: Stufe[] = [
  {
    nummer: "25.21.01.2900",
    bezeichnung: "Einstärkenglas sph > ±6,0 < ±10,0 dpt",
    bis: 10,
    einschliesslich: false,
    netto: 29.14,
  },
  {
    nummer: "25.21.01.3900",
    bezeichnung: "Einstärkenglas hochbrechend sph ≥ ±10,0 ≤ ±12,0 dpt",
    bis: 12,
    einschliesslich: true,
    netto: 61.56,
  },
  {
    nummer: "25.21.01.4900",
    bezeichnung: "Einstärkenglas hochbrechend sph > ±12,0 ≤ ±14,0 dpt",
    bis: 14,
    einschliesslich: true,
    netto: 87.71,
  },
  {
    nummer: "25.21.01.5900",
    bezeichnung: "Einstärkenglas hochbrechend sph > ±14,0 ≤ ±16,0 dpt",
    bis: 16,
    einschliesslich: true,
    netto: 125.06,
  },
  {
    nummer: "25.21.01.6900",
    bezeichnung: "Einstärkenglas hochbrechend sph > ±16,0 ≤ ±20,0 dpt",
    bis: 20,
    einschliesslich: true,
    netto: null,
  },
  {
    nummer: "25.21.01.7900",
    bezeichnung: "Einstärkenglas hochbrechend sph > ±20,0 dpt",
    bis: Infinity,
    einschliesslich: true,
    netto: null,
  },
];

// Mehrstärkengläser 25.21.02, Zylinder bis +4,0 dpt
const MEHRSTAERKEN: Stufe[] = [
  {
    nummer: "25.21.02.0900",
    bezeichnung: "Mehrstärkenglas sph ≤ ±6,0 dpt",
    bis: 6,
    einschliesslich: true,
    netto: 81.08,
  },
  {
    nummer: "25.21.02.1900",
    bezeichnung: "Mehrstärkenglas sph > ±6,0 < ±10,0 dpt",
    bis: 10,
    einschliesslich: false,
    netto: 101.68,
  },
  {
    nummer: "25.21.02.2900",
    bezeichnung: "Mehrstärkenglas hochbrechend sph ≥ ±10,0 ≤ ±12,0 dpt",
    bis: 12,
    einschliesslich: true,
    netto: 140.81,
  },
  {
    nummer: "25.21.02.3900",
    bezeichnung: "Mehrstärkenglas hochbrechend sph > ±12,0 ≤ ±14,0 dpt",
    bis: 14,
    einschliesslich: true,
    netto: 159.81,
  },
  {
    nummer: "25.21.02.4900",
    bezeichnung: "Mehrstärkenglas hochbrechend sph > ±14,0 ≤ ±16,0 dpt",
    bis: 16,
    einschliesslich: true,
    netto: 198.02,
  },
  {
    nummer: "25.21.02.5900",
    bezeichnung: "Mehrstärkenglas hochbrechend sph > ±16,0 ≤ ±20,0 dpt",
    bis: 20,
    einschliesslich: true,
    netto: null,
  },
  {
    nummer: "25.21.02.6900",
    bezeichnung: "Mehrstärkenglas hochbrechend sph > ±20,0 dpt",
    bis: Infinity,
    einschliesslich: true,
    netto: null,
  },
];

// Zuschläge Zylinder 25.21.11 (über +4,0 dpt)
const ZYLINDER_ZUSCHLAG: Stufe[] = [
  {
    nummer: "25.21.11.0001",
    bezeichnung: "Zuschlag cyl > +4,0 ≤ +6,0 dpt",
    bis: 6,
    einschliesslich: true,
    netto: 24.96,
  },
  {
    nummer: "25.21.11.1001",
    bezeichnung: "Zuschlag cyl > +6,0 ≤ +8,0 dpt",
    bis: 8,
    einschliesslich: true,
    netto: 35.16,
  },
  {
    nummer: "25.21.11.2001",
    bezeichnung: "Zuschlag cyl > +8,0 dpt",
    bis: Infinity,
    einschliesslich: true,
    netto: null,
  },
];

// Zuschläge Prisma 25.21.12 (cm/m)
const PRISMA_ZUSCHLAG: Stufe[] = [
  {
    nummer: "25.21.12.0001",
    bezeichnung: "Zuschlag Prisma > 0 ≤ 3 cm/m",
    bis: 3,
    einschliesslich: true,
    netto: 14.0,
  },
  {
    nummer: "25.21.12.1001",
    bezeichnung: "Zuschlag Prisma > 3 ≤ 6 cm/m",
    bis: 6,
    einschliesslich: true,
    netto: 35.0,
  },
  {
    nummer: "25.21.12.2900",
    bezeichnung: "Zuschlag Prisma > 6 ≤ 15 cm/m (Sonderanfertigung)",
    bis: 15,
    einschliesslich: true,
    netto: 46.9,
  },
  {
    nummer: "25.21.12.3900",
    bezeichnung: "Zuschlag Prisma > 15 cm/m",
    bis: Infinity,
    einschliesslich: true,
    netto: null,
  },
];

const zahl = (wert: unknown) => {
  if (wert === null || wert === undefined || wert === "") return null;
  const n = Number(wert);
  return Number.isFinite(n) ? n : null;
};

const rund = (wert: number) => Math.round(wert * 100) / 100;

export type Zusatz = {
  id: string;
  nummer: string;
  bezeichnung: string;
  netto: number;
  // je versorgtem Auge (sonst einmal je Auftrag)
  jeAuge: boolean;
  gruppe: "Zuschläge" | "Vergrößernde Sehhilfen";
};

export const ZUSAETZE: Zusatz[] = [
  {
    id: "glasbestimmung",
    nummer: "25.99.99.0001",
    bezeichnung: "Brillenglasbestimmung (binokular)",
    netto: 13.44,
    jeAuge: false,
    gruppe: "Zuschläge",
  },
  {
    id: "lichtschutz",
    nummer: "25.21.15.0001",
    bezeichnung: "Zuschlag Lichtschutzgläser",
    netto: 9.9,
    jeAuge: true,
    gruppe: "Zuschläge",
  },
  {
    id: "uvKantenfilter400",
    nummer: "25.21.15.1001",
    bezeichnung: "Zuschlag UV-Kantenfilter 400 nm",
    netto: 46.0,
    jeAuge: true,
    gruppe: "Zuschläge",
  },
  {
    id: "kantenfilter450",
    nummer: "25.21.15.2001",
    bezeichnung: "Zuschlag Kantenfilter 450 nm (Bandpassfilter)",
    netto: 49.9,
    jeAuge: true,
    gruppe: "Zuschläge",
  },
  {
    id: "kantenfilter500",
    nummer: "25.21.15.3001",
    bezeichnung: "Zuschlag Kantenfilter > 500 nm (Langpassfilter)",
    netto: 49.9,
    jeAuge: true,
    gruppe: "Zuschläge",
  },
  {
    id: "okklusionsfolie",
    nummer: "25.21.20.1900",
    bezeichnung: "Okklusionsfolie",
    netto: 10.06,
    jeAuge: true,
    gruppe: "Zuschläge",
  },
  {
    id: "prismenfolie",
    nummer: "25.21.40.2900",
    bezeichnung: "Prismenfolie",
    netto: 34.5,
    jeAuge: true,
    gruppe: "Zuschläge",
  },
  {
    id: "linsenfolie",
    nummer: "25.21.40.3900",
    bezeichnung: "Linsenfolie für Addition",
    netto: 35.9,
    jeAuge: true,
    gruppe: "Zuschläge",
  },
  // Vergrößernde Sehhilfen 25.21.81 / 25.21.86
  {
    id: "einschlaglupe",
    nummer: "25.21.81.0900",
    bezeichnung: "Einschlaglupe",
    netto: 16.15,
    jeAuge: false,
    gruppe: "Vergrößernde Sehhilfen",
  },
  {
    id: "handlupe",
    nummer: "25.21.81.1900",
    bezeichnung: "Handlupe ohne Beleuchtung",
    netto: 36.9,
    jeAuge: false,
    gruppe: "Vergrößernde Sehhilfen",
  },
  {
    id: "handlupeLicht",
    nummer: "25.21.81.2900",
    bezeichnung: "Handlupe mit Beleuchtung",
    netto: 49.5,
    jeAuge: false,
    gruppe: "Vergrößernde Sehhilfen",
  },
  {
    id: "standlupe",
    nummer: "25.21.81.3900",
    bezeichnung: "Stand-/Klemmlupe ohne Beleuchtung",
    netto: 55.95,
    jeAuge: false,
    gruppe: "Vergrößernde Sehhilfen",
  },
  {
    id: "standlupeLicht",
    nummer: "25.21.81.4900",
    bezeichnung: "Stand-/Klemmlupe mit Beleuchtung",
    netto: 64.95,
    jeAuge: false,
    gruppe: "Vergrößernde Sehhilfen",
  },
  {
    id: "elektronischeLupe",
    nummer: "25.21.86.0",
    bezeichnung: "Elektronische Lupe 4,3–5 Zoll (genehmigungspflichtig)",
    netto: 464.0,
    jeAuge: false,
    gruppe: "Vergrößernde Sehhilfen",
  },
];

// Netto-Summe -> Kassenanteil inkl. MwSt.
export const mitMwst = (netto: number) => rund(netto * (1 + MWST));

// Rechenungenauigkeiten (z. B. -2,25 + 0,25) nicht über eine Grenze kippen
const EPS = 1e-9;

const stufeFuer = (stufen: Stufe[], wert: number) =>
  stufen.find((s) =>
    s.einschliesslich ? wert <= s.bis + EPS : wert < s.bis - EPS,
  );

// Minuszylinder in Pluszylinder umrechnen (Vertrag: cyl ≤ +4,0 dpt)
export const pluszylinder = (sph: number, cyl: number) =>
  cyl < 0 ? { sph: sph + cyl, cyl: -cyl } : { sph, cyl };

const einstaerkenStufe = (sph: number, cyl: number): Stufe | undefined => {
  if (sph <= 6 + EPS)
    return cyl <= 2 + EPS
      ? {
          nummer: "25.21.01.0900",
          bezeichnung: "Einstärkenglas sph ≤ ±6,0 dpt, cyl ≤ +2,0 dpt",
          bis: 6,
          einschliesslich: true,
          netto: 16.23,
        }
      : {
          nummer: "25.21.01.1900",
          bezeichnung: "Einstärkenglas sph ≤ ±6,0 dpt, cyl > +2,0 ≤ +4,0 dpt",
          bis: 6,
          einschliesslich: true,
          netto: 30.44,
        };
  return stufeFuer(EINSTAERKEN, sph);
};

export const berechneKassenanteil = (
  augen: { seite: "R" | "L"; glas: Glaswerte }[],
): Kassenanteil => {
  const positionen: KassenPosition[] = [];
  const hinweise: string[] = [];

  const uebernimm = (seite: "R" | "L", stufe: Stufe | undefined) => {
    if (!stufe) return;
    if (stufe.netto === null) {
      hinweise.push(
        `${seite}: ${stufe.nummer} ${stufe.bezeichnung} – Kostenvoranschlag/Genehmigung nötig, nicht berechnet`,
      );
      return;
    }
    positionen.push({
      seite,
      nummer: stufe.nummer,
      bezeichnung: stufe.bezeichnung,
      netto: stufe.netto,
    });
  };

  for (const { seite, glas } of augen) {
    const sphRoh = zahl(glas?.Sph);
    const cylRoh = zahl(glas?.Cyl);
    if (sphRoh === null && cylRoh === null) continue;
    const { sph, cyl } = pluszylinder(sphRoh ?? 0, cylRoh ?? 0);
    const sphBetrag = Math.abs(sph);
    const mehrstaerken = (zahl(glas?.Add) ?? 0) > 0;

    uebernimm(
      seite,
      mehrstaerken
        ? stufeFuer(MEHRSTAERKEN, sphBetrag)
        : einstaerkenStufe(sphBetrag, cyl),
    );
    if (cyl > 4 + EPS) uebernimm(seite, stufeFuer(ZYLINDER_ZUSCHLAG, cyl));
    const prisma = Math.abs(zahl(glas?.Pr) ?? 0);
    if (prisma > 0) uebernimm(seite, stufeFuer(PRISMA_ZUSCHLAG, prisma));
  }

  const netto = rund(positionen.reduce((s, p) => s + p.netto, 0));
  return { positionen, netto, brutto: mitMwst(netto), hinweise };
};

// Beim Übernehmen im KK-Rechner gespeicherte Positionen
// (brille."KassenPositionen"), Grundlage für die Kostenabrechnung im
// Berechtigungsschein
export type GespeichertePosition = {
  nummer: string;
  bezeichnung: string;
  faktor: number;
  // Nettopreis je Stück
  netto: number;
};

export type AbrechnungsZeile = {
  nummer: string;
  faktor: number;
  // netto, Faktor × Stückpreis
  betrag: number;
};

const zusammenfassen = (positionen: GespeichertePosition[]) => {
  const zeilen = new Map<string, AbrechnungsZeile>();
  for (const p of positionen) {
    const vorhanden = zeilen.get(p.nummer);
    if (vorhanden) {
      vorhanden.faktor += p.faktor;
      vorhanden.betrag = rund(vorhanden.betrag + p.netto * p.faktor);
    } else {
      zeilen.set(p.nummer, {
        nummer: p.nummer,
        faktor: p.faktor,
        betrag: rund(p.netto * p.faktor),
      });
    }
  }
  return [...zeilen.values()];
};

export const alsGespeichertePositionen = (
  positionen: KassenPosition[],
): GespeichertePosition[] =>
  positionen.map((p) => ({
    nummer: p.nummer,
    bezeichnung: p.bezeichnung,
    faktor: 1,
    netto: p.netto,
  }));

// Zuschläge, deren Summe genau `rest` ergibt - nur wenn eindeutig (z. B.
// Brillenglasbestimmung 13,44); gleich teure Alternativen wie die beiden
// Kantenfilter bleiben offen.
const eindeutigeZusaetze = (
  rest: number,
  anzahlAugen: number,
): GespeichertePosition[] | null => {
  const kandidaten = ZUSAETZE.map((z) => ({
    nummer: z.nummer,
    bezeichnung: z.bezeichnung,
    faktor: z.jeAuge ? anzahlAugen : 1,
    netto: z.netto,
  })).filter((z) => z.faktor > 0);
  const treffer: GespeichertePosition[][] = [];
  const suche = (
    start: number,
    auswahl: GespeichertePosition[],
    summe: number,
  ) => {
    if (Math.abs(summe - rest) < 0.005) treffer.push(auswahl);
    if (auswahl.length === 3 || summe > rest) return;
    for (let i = start; i < kandidaten.length; i++) {
      const k = kandidaten[i];
      suche(i + 1, [...auswahl, k], rund(summe + k.netto * k.faktor));
    }
  };
  suche(0, [], 0);
  const echte = treffer.filter((t) => t.length > 0);
  return echte.length === 1 ? echte[0] : null;
};

// Zeilen für die Kostenabrechnung im Berechtigungsschein: gespeicherte
// Positionen aus dem KK-Rechner; bei älteren Aufträgen ohne gespeicherte
// Positionen die Glaspositionen aus den Werten, ergänzt um eindeutig aus
// dem KK-Anteil ableitbare Zuschläge.
export const abrechnungsZeilen = ({
  augen,
  kkAnteil,
  gespeichert,
}: {
  augen: { seite: "R" | "L"; glas: Record<string, unknown> | undefined }[];
  kkAnteil: number;
  gespeichert?: unknown;
}): { zeilen: AbrechnungsZeile[]; netto: number; mwst: number } => {
  let positionen: GespeichertePosition[];
  if (Array.isArray(gespeichert) && gespeichert.length > 0) {
    positionen = (gespeichert as GespeichertePosition[]).filter(
      (p) => p && typeof p.nummer === "string" && Number.isFinite(p.netto),
    );
  } else {
    const ergebnis = berechneKassenanteil(augen);
    positionen = alsGespeichertePositionen(ergebnis.positionen);
    if (kkAnteil > 0) {
      const rest = rund(rund(kkAnteil / (1 + MWST)) - ergebnis.netto);
      if (rest > 0.004) {
        const anzahlAugen = new Set(ergebnis.positionen.map((p) => p.seite))
          .size;
        positionen.push(...(eindeutigeZusaetze(rest, anzahlAugen) ?? []));
      }
    }
  }
  const zeilen = zusammenfassen(positionen);
  const netto = rund(zeilen.reduce((s, z) => s + z.betrag, 0));
  return { zeilen, netto, mwst: rund(mitMwst(netto) - netto) };
};
