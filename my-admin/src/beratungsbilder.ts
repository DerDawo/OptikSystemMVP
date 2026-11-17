/*
 * Beratungsbilder: eigene, schematische Zeichnungen für das
 * Kundengespräch (iPad). Hier stehen die Themen, die Texte für den Kunden
 * und die Geometrie des Strahlengangs. Die Zeichnungen selbst liegen in
 * BeratungsbilderSeite.tsx.
 *
 * Das Auge ist stark vereinfacht: Lichtbrechung findet an einer Stelle
 * (Linse) statt, die Netzhaut ist die Rückseite des Augapfels.
 */

export type Punkt = [number, number];

// Augapfel und Linse in der Zeichenfläche 800 × 400
export const AUGE = { cx: 520, cy: 200, r: 150 } as const;
export const LINSE_X = 412;
export const NETZHAUT_X = AUGE.cx + AUGE.r; // 670
export const GLAS_X = 250; // Brillenglas
export const KONTAKTLINSE_X = 346; // auf der Hornhaut
const NAH_PUNKT: Punkt = [120, AUGE.cy];

export type Korrektur = "minus" | "plus" | "torisch" | null;

export type Szenario = {
  // Licht aus der Ferne (parallel) oder von einem nahen Gegenstand
  quelle: "fern" | "nah";
  // Brennpunkt (x) ohne Netzhaut; 670 = genau auf der Netzhaut
  fokus: number;
  // bei Hornhautverkrümmung: Brennpunkt des zweiten Hauptschnitts
  fokus2?: number;
  korrektur: Korrektur;
  // Brille oder Kontaktlinse
  traeger?: "brille" | "kontaktlinse";
};

export type Unschaerfe = {
  fern: number;
  nah: number;
  // Hornhautverkrümmung: Verzerrung in eine Richtung
  verzerrt?: boolean;
};

export type Zustand = {
  id: string;
  name: string;
  szenario: Szenario;
  unschaerfe: Unschaerfe;
  hinweis: string;
};

export type Thema = {
  id: string;
  titel: string;
  untertitel: string;
  art: "strahlen" | "anatomie" | "gleitsicht";
  text: string[];
  zustaende: Zustand[];
  // Strahlenkranz-Test (Hornhautverkrümmung)
  strahlenkranz?: boolean;
};

export type Strahl = {
  punkte: Punkt[];
  // zweiter Hauptschnitt (Hornhautverkrümmung) in anderer Farbe
  zweite?: boolean;
  // gedachte Fortsetzung hinter der Netzhaut bis zum Brennpunkt
  gedacht?: Punkt[];
};

const ABSTAENDE = [-36, -18, 18, 36];
const ABSTAENDE_2 = [-28, -9, 9, 28];

/**
 * Wo trifft der Strahl von p in Richtung f auf die Netzhaut (Rückseite des
 * Augapfels)? Schnittpunkt der Geraden mit dem Kreis, weiter hinten.
 */
export const aufNetzhaut = (p: Punkt, f: Punkt): Punkt => {
  const [px, py] = p;
  const dx = f[0] - px;
  const dy = f[1] - py;
  const ox = px - AUGE.cx;
  const oy = py - AUGE.cy;
  const a = dx * dx + dy * dy;
  const b = 2 * (ox * dx + oy * dy);
  const c = ox * ox + oy * oy - AUGE.r * AUGE.r;
  const t = (-b + Math.sqrt(Math.max(0, b * b - 4 * a * c))) / (2 * a);
  return [px + t * dx, py + t * dy];
};

const runde = ([x, y]: Punkt): Punkt => [
  Math.round(x * 10) / 10,
  Math.round(y * 10) / 10,
];

/**
 * Strahlengang eines Szenarios: je Strahl die Punkte von der Lichtquelle
 * über Brillenglas/Kontaktlinse und Linse bis zur Netzhaut.
 */
export const strahlengang = (s: Szenario): Strahl[] => {
  const mitte = AUGE.cy;
  const korrX =
    s.traeger === "kontaktlinse" ? KONTAKTLINSE_X : s.korrektur ? GLAS_X : null;
  // Ablenkung durch das Korrekturglas: Minus zerstreut, Plus sammelt
  const faktor =
    s.korrektur === "minus" ? 1.22 : s.korrektur === "plus" ? 0.84 : 1;

  const einStrahl = (abstand: number, fokus: number, zweite: boolean) => {
    const punkte: Punkt[] = [];
    if (s.quelle === "fern") {
      punkte.push([20, mitte + abstand]);
      if (korrX != null) punkte.push([korrX, mitte + abstand]);
    } else {
      punkte.push(NAH_PUNKT);
      if (korrX != null) {
        const anteil = (korrX - NAH_PUNKT[0]) / (LINSE_X - NAH_PUNKT[0]);
        punkte.push([korrX, mitte + abstand * anteil]);
      }
    }
    // an der Linse: ohne Korrektur unverändert, sonst abgelenkt
    const yLinse =
      korrX != null && s.korrektur !== "torisch"
        ? mitte + abstand * faktor
        : mitte + abstand;
    const linse: Punkt = [LINSE_X, yLinse];
    punkte.push(linse);
    const brennpunkt: Punkt = [fokus, mitte];
    const ende = aufNetzhaut(linse, brennpunkt);
    // Brennpunkt vor der Netzhaut: Strahlen kreuzen sich und laufen wieder
    // auseinander; dahinter: sie treffen vorher auf
    if (fokus < ende[0] - 0.5) punkte.push(brennpunkt);
    punkte.push(ende);
    const strahl: Strahl = { punkte: punkte.map(runde), zweite };
    if (fokus > ende[0] + 0.5) strahl.gedacht = [runde(ende), brennpunkt];
    return strahl;
  };

  const erste = ABSTAENDE.map((a) => einStrahl(a, s.fokus, false));
  if (s.fokus2 == null) return erste;
  return [...erste, ...ABSTAENDE_2.map((a) => einStrahl(a, s.fokus2!, true))];
};

/** Größe des Unschärfekreises auf der Netzhaut (für Texte/Tests). */
export const unschaerfekreis = (strahlen: Strahl[]) => {
  const ys = strahlen.map((s) => s.punkte[s.punkte.length - 1][1]);
  return Math.round((Math.max(...ys) - Math.min(...ys)) * 10) / 10;
};

const SCHARF: Unschaerfe = { fern: 0, nah: 0 };
const N = NETZHAUT_X;

export const THEMEN: Thema[] = [
  {
    id: "auge",
    titel: "Aufbau des Auges",
    untertitel: "Wie wir sehen",
    art: "anatomie",
    text: [
      "Licht fällt durch die Hornhaut und die Pupille ins Auge. Hornhaut und Linse bündeln es wie ein Objektiv.",
      "Auf der Netzhaut entsteht ein Bild. Am schärfsten sehen wir mit der Makula, dem „gelben Fleck“. Der Sehnerv leitet das Bild ans Gehirn.",
      "Die Iris regelt wie eine Blende, wie viel Licht hereinkommt. Der Ziliarmuskel verändert die Form der Linse, damit wir in der Nähe scharf sehen.",
    ],
    zustaende: [],
  },
  {
    id: "normal",
    titel: "Normalsichtigkeit",
    untertitel: "Das Bild entsteht genau auf der Netzhaut",
    art: "strahlen",
    text: [
      "Beim normalsichtigen Auge passen Länge des Auges und Brechkraft von Hornhaut und Linse genau zusammen.",
      "Das Licht wird genau auf der Netzhaut gebündelt: Ferne und Nähe sind scharf.",
    ],
    zustaende: [
      {
        id: "ohne",
        name: "Normalsichtig",
        szenario: { quelle: "fern", fokus: N, korrektur: null },
        unschaerfe: SCHARF,
        hinweis: "Alles scharf – ohne Brille.",
      },
    ],
  },
  {
    id: "kurzsichtig",
    titel: "Kurzsichtigkeit",
    untertitel: "Myopie – in der Ferne unscharf",
    art: "strahlen",
    text: [
      "Das Auge ist etwas zu lang oder bricht das Licht zu stark. Das Bild entsteht vor der Netzhaut; auf der Netzhaut kommt es unscharf an.",
      "In der Nähe sieht man gut, in der Ferne verschwommen – zum Beispiel Straßenschilder oder der Fernseher.",
      "Ein Minusglas (Zerstreuungsglas) schwächt die Brechkraft ab. So landet das Bild wieder genau auf der Netzhaut.",
    ],
    zustaende: [
      {
        id: "ohne",
        name: "Ohne Korrektur",
        szenario: { quelle: "fern", fokus: 590, korrektur: null },
        unschaerfe: { fern: 5, nah: 0 },
        hinweis: "Das Bild entsteht vor der Netzhaut – die Ferne ist unscharf.",
      },
      {
        id: "brille",
        name: "Mit Brille",
        szenario: {
          quelle: "fern",
          fokus: N,
          korrektur: "minus",
          traeger: "brille",
        },
        unschaerfe: SCHARF,
        hinweis: "Das Minusglas verschiebt das Bild auf die Netzhaut.",
      },
      {
        id: "kontaktlinse",
        name: "Mit Kontaktlinse",
        szenario: {
          quelle: "fern",
          fokus: N,
          korrektur: "minus",
          traeger: "kontaktlinse",
        },
        unschaerfe: SCHARF,
        hinweis: "Die Kontaktlinse sitzt direkt auf der Hornhaut.",
      },
    ],
  },
  {
    id: "weitsichtig",
    titel: "Weitsichtigkeit",
    untertitel: "Hyperopie – das Auge muss ständig nachstellen",
    art: "strahlen",
    text: [
      "Das Auge ist etwas zu kurz oder bricht das Licht zu schwach. Das Bild entsteht gedacht hinter der Netzhaut.",
      "Junge Augen gleichen das mit Anstrengung aus. Das kann zu Kopfschmerzen, müden Augen und Unschärfe in der Nähe führen.",
      "Ein Plusglas (Sammelglas) verstärkt die Brechkraft. Das Auge kann sich entspannen.",
    ],
    zustaende: [
      {
        id: "ohne",
        name: "Ohne Korrektur",
        szenario: { quelle: "fern", fokus: 770, korrektur: null },
        unschaerfe: { fern: 1.5, nah: 5 },
        hinweis:
          "Das Bild läge hinter der Netzhaut – vor allem die Nähe ist unscharf.",
      },
      {
        id: "brille",
        name: "Mit Brille",
        szenario: {
          quelle: "fern",
          fokus: N,
          korrektur: "plus",
          traeger: "brille",
        },
        unschaerfe: SCHARF,
        hinweis: "Das Plusglas bündelt das Licht stärker.",
      },
      {
        id: "kontaktlinse",
        name: "Mit Kontaktlinse",
        szenario: {
          quelle: "fern",
          fokus: N,
          korrektur: "plus",
          traeger: "kontaktlinse",
        },
        unschaerfe: SCHARF,
        hinweis: "Auch mit Kontaktlinsen gut auszugleichen.",
      },
    ],
  },
  {
    id: "astigmatismus",
    titel: "Hornhautverkrümmung",
    untertitel: "Astigmatismus – verzerrt in jeder Entfernung",
    art: "strahlen",
    strahlenkranz: true,
    text: [
      "Die Hornhaut ist nicht rund wie ein Fußball, sondern etwas gewölbt wie ein Rugbyball. In zwei Richtungen bricht sie das Licht unterschiedlich stark.",
      "Statt eines Punktes entstehen zwei Brennlinien. Bilder wirken verzerrt oder „verwischt“ – in der Nähe wie in der Ferne.",
      "Ein torisches Glas hat in den beiden Richtungen unterschiedliche Stärken und gleicht das genau aus. Die Achse wird bei der Messung bestimmt.",
    ],
    zustaende: [
      {
        id: "ohne",
        name: "Ohne Korrektur",
        szenario: {
          quelle: "fern",
          fokus: 600,
          fokus2: 740,
          korrektur: null,
        },
        unschaerfe: { fern: 3, nah: 2, verzerrt: true },
        hinweis: "Zwei Brennpunkte statt einem – das Bild verzerrt.",
      },
      {
        id: "brille",
        name: "Mit torischem Glas",
        szenario: {
          quelle: "fern",
          fokus: N,
          fokus2: N,
          korrektur: "torisch",
          traeger: "brille",
        },
        unschaerfe: SCHARF,
        hinweis: "Beide Richtungen werden auf die Netzhaut gebündelt.",
      },
    ],
  },
  {
    id: "alterssichtig",
    titel: "Alterssichtigkeit",
    untertitel: "Presbyopie – ab etwa 45 wird die Nähe schwierig",
    art: "strahlen",
    text: [
      "Für die Nähe muss sich die Augenlinse stärker wölben. Mit den Jahren wird sie fester und kann das immer weniger.",
      "Ab etwa 45 werden die Arme beim Lesen „zu kurz“. Das betrifft jeden – auch wer bisher keine Brille brauchte.",
      "Eine Lesebrille hilft in der Nähe, macht aber die Ferne unscharf. Gleitsichtgläser verbinden Ferne, Zwischenbereich und Nähe in einem Glas.",
    ],
    zustaende: [
      {
        id: "jung",
        name: "Junges Auge",
        szenario: { quelle: "nah", fokus: N, korrektur: null },
        unschaerfe: SCHARF,
        hinweis: "Die elastische Linse stellt sich auf die Nähe ein.",
      },
      {
        id: "ohne",
        name: "Ab 45 ohne Brille",
        szenario: { quelle: "nah", fokus: 770, korrektur: null },
        unschaerfe: { fern: 0, nah: 5 },
        hinweis:
          "Die Linse kann nicht mehr genug nachstellen – die Nähe verschwimmt.",
      },
      {
        id: "lesebrille",
        name: "Mit Lesebrille",
        szenario: {
          quelle: "nah",
          fokus: N,
          korrektur: "plus",
          traeger: "brille",
        },
        unschaerfe: { fern: 5, nah: 0 },
        hinweis:
          "Nah scharf – aber durch die Lesebrille ist die Ferne unscharf.",
      },
      {
        id: "gleitsicht",
        name: "Mit Gleitsicht",
        szenario: {
          quelle: "nah",
          fokus: N,
          korrektur: "plus",
          traeger: "brille",
        },
        unschaerfe: SCHARF,
        hinweis: "Oben Ferne, unten Nähe – alles mit einer Brille.",
      },
    ],
  },
  {
    id: "gleitsicht",
    titel: "Gleitsichtgläser",
    untertitel: "Ferne, Zwischenbereich und Nähe in einem Glas",
    art: "gleitsicht",
    text: [
      "Oben im Glas liegt die Fernsicht, in der Mitte der Zwischenbereich (z. B. Bildschirm, Armaturenbrett), unten die Nähe zum Lesen.",
      "An den seitlichen Rändern ist das Glas technisch bedingt unschärfer. Deshalb: den Kopf zum Gegenstand drehen, nicht nur die Augen.",
      "Die Eingewöhnung dauert meist einige Tage bis zwei Wochen. Je genauer gemessen und je hochwertiger das Glas, desto breiter die scharfen Bereiche.",
    ],
    zustaende: [],
  },
];

export const themaVon = (id: string) => THEMEN.find((t) => t.id === id);
