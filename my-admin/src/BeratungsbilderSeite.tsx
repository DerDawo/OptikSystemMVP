// Beratungsbilder (Gehe zu → Beratungsbilder): eigene, schematische
// Zeichnungen für das Kundengespräch, gedacht für das iPad. Je Thema ein
// Strahlengang mit Umschalter (ohne Korrektur, mit Brille, mit
// Kontaktlinse …) und daneben „So sehen Sie“: eine kleine Szene, in der
// Ferne oder Nähe unscharf werden. Alle Grafiken sind hier selbst gezeichnet.
import { ReactNode, useId, useState } from "react";
import { Title } from "react-admin";
import {
  Box,
  Button,
  ButtonBase,
  Card,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import {
  AUGE,
  GLAS_X,
  KONTAKTLINSE_X,
  LINSE_X,
  THEMEN,
  Thema,
  Unschaerfe,
  Zustand,
  strahlengang,
} from "./beratungsbilder";

// Feste, helle Farben: die Bilder sehen auf jedem Gerät gleich aus
const F = {
  papier: "#ffffff",
  linie: "#4a5a6e",
  schrift: "#2b3542",
  leise: "#7a8796",
  augapfel: "#fbfcfe",
  lederhaut: "#d9dee5",
  hornhaut: "#d7eaf7",
  iris: "#56799f",
  linse: "#e4eff8",
  linseRand: "#7aa0c4",
  ziliar: "#d4b2ad",
  aderhaut: "#c0664f",
  netzhaut: "#e8915f",
  makula: "#b5651d",
  nerv: "#efe0b3",
  strahl: "#e09a00",
  strahl2: "#1f9e8f",
  glas: "#bfdcf2",
  glasRand: "#4f88b8",
  scharf: "#d6efe6",
  scharfRand: "#3f9c7d",
};

const A = AUGE;
const R_LEDER = A.r + 7;

// Punkt vorn auf dem Augapfel (Rand der Hornhaut) in Höhe dy
const vorn = (dy: number, r = R_LEDER) => A.cx - Math.sqrt(r * r - dy * dy);

const Zeichenflaeche = ({
  children,
  breite = 800,
  hoehe = 400,
  label,
}: {
  children: ReactNode;
  breite?: number;
  hoehe?: number;
  label: string;
}) => (
  <Box
    component="svg"
    viewBox={`0 0 ${breite} ${hoehe}`}
    role="img"
    aria-label={label}
    sx={{
      width: "100%",
      height: "auto",
      display: "block",
      bgcolor: F.papier,
      borderRadius: 2,
      fontFamily: (t) => t.typography.fontFamily,
    }}
  >
    {children}
  </Box>
);

/** Augapfel mit Hornhaut, Iris, Linse, Netzhaut und Sehnerv. */
const Auge = ({ details = false }: { details?: boolean }) => {
  const hx = vorn(70);
  const netz = (w: number) => {
    const x = A.cx + A.r * Math.cos((w * Math.PI) / 180);
    const y = A.r * Math.sin((w * Math.PI) / 180);
    return [x, y] as const;
  };
  const [nx, ny] = netz(62);
  const [ax, ay] = netz(70);
  return (
    <g>
      {/* Sehnerv hinten, leicht unter der Mitte */}
      <path
        d={`M${A.cx + A.r - 8},${A.cy + 8} L790,${A.cy + 18} L790,${A.cy + 52} L${A.cx + A.r - 14},${A.cy + 40} Z`}
        fill={F.nerv}
        stroke={F.linie}
        strokeWidth={1.5}
      />
      {/* Lederhaut und Augapfel */}
      <circle
        cx={A.cx}
        cy={A.cy}
        r={R_LEDER}
        fill={F.augapfel}
        stroke={F.lederhaut}
        strokeWidth={10}
      />
      <circle
        cx={A.cx}
        cy={A.cy}
        r={R_LEDER + 5}
        fill="none"
        stroke={F.linie}
        strokeWidth={1.5}
      />
      {/* Aderhaut und Netzhaut auf der Rückseite */}
      <path
        d={`M${ax},${A.cy - ay} A${A.r + 3},${A.r + 3} 0 0,1 ${ax},${A.cy + ay}`}
        fill="none"
        stroke={F.aderhaut}
        strokeWidth={2.5}
        transform={`translate(1.5 0)`}
      />
      <path
        d={`M${nx},${A.cy - ny} A${A.r},${A.r} 0 0,1 ${nx},${A.cy + ny}`}
        fill="none"
        stroke={F.netzhaut}
        strokeWidth={5}
      />
      <circle cx={A.cx + A.r - 2} cy={A.cy} r={4} fill={F.makula} />
      {/* Hornhaut */}
      <path
        d={`M${hx},${A.cy - 70} Q324,${A.cy} ${hx},${A.cy + 70} Z`}
        fill={F.hornhaut}
      />
      <path
        d={`M${hx},${A.cy - 70} Q324,${A.cy} ${hx},${A.cy + 70}`}
        fill="none"
        stroke={F.linie}
        strokeWidth={2}
      />
      {/* Iris mit Pupille */}
      <rect x={384} y={A.cy - 74} width={8} height={30} rx={3} fill={F.iris} />
      <rect x={384} y={A.cy + 44} width={8} height={30} rx={3} fill={F.iris} />
      {/* Ziliarmuskel und Linse */}
      <ellipse cx={LINSE_X + 2} cy={A.cy - 60} rx={8} ry={11} fill={F.ziliar} />
      <ellipse cx={LINSE_X + 2} cy={A.cy + 60} rx={8} ry={11} fill={F.ziliar} />
      <ellipse
        cx={LINSE_X}
        cy={A.cy}
        rx={17}
        ry={50}
        fill={F.linse}
        stroke={F.linseRand}
        strokeWidth={2}
      />
      {details && (
        <text
          x={A.cx + 15}
          y={A.cy + 5}
          textAnchor="middle"
          fontSize={15}
          fontStyle="italic"
          fill={F.leise}
        >
          Glaskörper
        </text>
      )}
    </g>
  );
};

const Beschriftung = ({
  text,
  ziel,
  bei,
  anker = "end",
}: {
  text: string;
  ziel: [number, number];
  bei: [number, number];
  anker?: "start" | "end" | "middle";
}) => (
  <g>
    <line
      x1={bei[0] + (anker === "end" ? 6 : anker === "start" ? -6 : 0)}
      y1={bei[1] - 5}
      x2={ziel[0]}
      y2={ziel[1]}
      stroke={F.leise}
      strokeWidth={1.2}
    />
    <circle cx={ziel[0]} cy={ziel[1]} r={3} fill={F.schrift} />
    <text
      x={bei[0]}
      y={bei[1]}
      textAnchor={anker}
      fontSize={17}
      fontWeight={600}
      fill={F.schrift}
    >
      {text}
    </text>
  </g>
);

const Anatomie = () => (
  <Zeichenflaeche label="Aufbau des Auges" hoehe={400}>
    <Auge details />
    <Beschriftung text="Iris" ziel={[388, 140]} bei={[290, 50]} />
    <Beschriftung text="Hornhaut" ziel={[357, 180]} bei={[290, 110]} />
    <Beschriftung text="Pupille" ziel={[388, 200]} bei={[290, 205]} />
    <Beschriftung text="Vorderkammer" ziel={[372, 238]} bei={[290, 290]} />
    <Beschriftung text="Ziliarmuskel" ziel={[414, 262]} bei={[290, 360]} />
    <Beschriftung
      text="Linse"
      ziel={[412, 175]}
      bei={[425, 30]}
      anker="start"
    />
    <Beschriftung
      text="Lederhaut"
      ziel={[560, 46]}
      bei={[540, 22]}
      anker="start"
    />
    <Beschriftung
      text="Aderhaut"
      ziel={[598, 70]}
      bei={[690, 60]}
      anker="start"
    />
    <Beschriftung
      text="Netzhaut"
      ziel={[650, 120]}
      bei={[700, 120]}
      anker="start"
    />
    <Beschriftung
      text="Makula"
      ziel={[668, 200]}
      bei={[700, 175]}
      anker="start"
    />
    <Beschriftung
      text="Sehnerv"
      ziel={[740, 238]}
      bei={[700, 300]}
      anker="start"
    />
  </Zeichenflaeche>
);

const KORREKTUR_NAME: Record<string, string> = {
  minus: "Minusglas",
  plus: "Plusglas",
  torisch: "torisches Glas",
};

const Korrekturglas = ({ zustand }: { zustand: Zustand }) => {
  const { korrektur, traeger } = zustand.szenario;
  if (!korrektur) return null;
  if (traeger === "kontaktlinse") {
    const x = vorn(65, R_LEDER) - 3;
    return (
      <g>
        <path
          d={`M${x},${A.cy - 65} Q${2 * KONTAKTLINSE_X - x},${A.cy} ${x},${A.cy + 65}`}
          fill="none"
          stroke={F.glasRand}
          strokeWidth={4}
          strokeLinecap="round"
        />
        <text
          x={KONTAKTLINSE_X - 20}
          y={A.cy + 105}
          textAnchor="middle"
          fontSize={15}
          fill={F.glasRand}
          fontWeight={600}
        >
          Kontaktlinse
        </text>
      </g>
    );
  }
  const g = GLAS_X;
  const form =
    korrektur === "minus"
      ? `M${g - 15},115 H${g + 15} Q${g + 3},200 ${g + 15},285 H${g - 15} Q${g - 3},200 ${g - 15},115 Z`
      : korrektur === "plus"
        ? `M${g - 4},115 H${g + 4} Q${g + 22},200 ${g + 4},285 H${g - 4} Q${g - 22},200 ${g - 4},115 Z`
        : `M${g - 9},115 H${g + 9} Q${g + 16},200 ${g + 9},285 H${g - 9} Q${g - 16},200 ${g - 9},115 Z`;
  return (
    <g>
      <path
        d={form}
        fill={F.glas}
        fillOpacity={0.75}
        stroke={F.glasRand}
        strokeWidth={2}
      />
      <text
        x={g}
        y={305}
        textAnchor="middle"
        fontSize={15}
        fill={F.glasRand}
        fontWeight={600}
      >
        {KORREKTUR_NAME[korrektur]}
      </text>
    </g>
  );
};

const Strahlenbild = ({ zustand }: { zustand: Zustand }) => {
  const strahlen = strahlengang(zustand.szenario);
  const nah = zustand.szenario.quelle === "nah";
  const pfad = (p: [number, number][]) =>
    p.map(([x, y], i) => `${i ? "L" : "M"}${x},${y}`).join(" ");
  return (
    <Zeichenflaeche label={`Strahlengang: ${zustand.name}`}>
      <Auge />
      <Korrekturglas zustand={zustand} />
      {strahlen.map((s, i) => (
        <g key={i}>
          <path
            d={pfad(s.punkte)}
            fill="none"
            stroke={s.zweite ? F.strahl2 : F.strahl}
            strokeWidth={2.4}
            strokeLinejoin="round"
          />
          {s.gedacht && (
            <path
              d={pfad(s.gedacht)}
              fill="none"
              stroke={s.zweite ? F.strahl2 : F.strahl}
              strokeWidth={1.6}
              strokeDasharray="5 5"
              opacity={0.7}
            />
          )}
        </g>
      ))}
      {nah ? (
        <g>
          <circle cx={120} cy={A.cy} r={6} fill={F.schrift} />
          <text
            x={120}
            y={A.cy + 30}
            textAnchor="middle"
            fontSize={15}
            fill={F.schrift}
          >
            Lesetext (nah)
          </text>
        </g>
      ) : (
        <text x={20} y={120} fontSize={15} fill={F.leise}>
          Licht aus der Ferne
        </text>
      )}
      <text
        x={A.cx + A.r + 10}
        y={92}
        fontSize={15}
        fill={F.netzhaut}
        fontWeight={600}
      >
        Netzhaut
      </text>
      <text
        x={400}
        y={388}
        textAnchor="middle"
        fontSize={17}
        fill={F.schrift}
        fontWeight={600}
      >
        {zustand.hinweis}
      </text>
    </Zeichenflaeche>
  );
};

/** Kleine Szene: Straße mit Schild (Ferne) und Handy (Nähe). */
const Szene = ({ unschaerfe }: { unschaerfe: Unschaerfe }) => {
  const id = useId().replace(/:/g, "");
  const fern = unschaerfe.verzerrt
    ? `${unschaerfe.fern * 1.6} ${unschaerfe.fern * 0.15}`
    : String(unschaerfe.fern);
  const nah = unschaerfe.verzerrt
    ? `${unschaerfe.nah * 1.6} ${unschaerfe.nah * 0.15}`
    : String(unschaerfe.nah);
  return (
    <Zeichenflaeche label="So sehen Sie" breite={400} hoehe={280}>
      <defs>
        <filter id={`fern${id}`} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation={fern} />
        </filter>
        <filter id={`nah${id}`} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation={nah} />
        </filter>
        <linearGradient id={`himmel${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#bfe0f5" />
          <stop offset="1" stopColor="#eaf5fb" />
        </linearGradient>
        <clipPath id={`rahmen${id}`}>
          <rect width={400} height={280} rx={10} />
        </clipPath>
      </defs>
      <g clipPath={`url(#rahmen${id})`}>
        <g filter={`url(#fern${id})`}>
          <rect width={400} height={280} fill={`url(#himmel${id})`} />
          <path d="M0,150 Q90,105 180,140 T400,125 V280 H0 Z" fill="#a9cf8e" />
          <path d="M0,170 Q120,140 240,160 T400,150 V280 H0 Z" fill="#8fbf74" />
          <path d="M185,145 L215,145 L330,280 L70,280 Z" fill="#9aa3ad" />
          <path
            d="M200,150 L200,165 M200,180 L200,200 M200,220 L200,250"
            stroke="#fff"
            strokeWidth={3}
          />
          <circle cx={60} cy={128} r={18} fill="#5d9a4f" />
          <rect x={58} y={140} width={4} height={14} fill="#7a5a3c" />
          <circle cx={350} cy={115} r={22} fill="#5d9a4f" />
          <rect x={348} y={130} width={4} height={18} fill="#7a5a3c" />
          <rect x={262} y={92} width={4} height={60} fill="#6b7480" />
          <rect x={222} y={66} width={84} height={30} rx={3} fill="#1f5fa8" />
          <text
            x={264}
            y={80}
            textAnchor="middle"
            fontSize={11}
            fill="#fff"
            fontWeight={700}
          >
            Bahnhof
          </text>
          <text x={264} y={92} textAnchor="middle" fontSize={9} fill="#fff">
            2 km
          </text>
          <text x={110} y={40} fontSize={13} fill="#fff" fontWeight={700}>
            ☁
          </text>
        </g>
        <g filter={`url(#nah${id})`}>
          <rect
            x={18}
            y={160}
            width={124}
            height={140}
            rx={14}
            fill="#2b3542"
          />
          <rect x={26} y={172} width={108} height={120} rx={6} fill="#ffffff" />
          <rect x={34} y={180} width={74} height={22} rx={8} fill="#e3eef8" />
          <text x={40} y={195} fontSize={10} fill={F.schrift}>
            Hallo! Kaffee
          </text>
          <rect x={52} y={208} width={74} height={22} rx={8} fill="#d6f2dd" />
          <text x={58} y={223} fontSize={10} fill={F.schrift}>
            Gern, um 15 Uhr?
          </text>
          <rect x={34} y={236} width={64} height={22} rx={8} fill="#e3eef8" />
          <text x={40} y={251} fontSize={10} fill={F.schrift}>
            Super, bis dann!
          </text>
        </g>
      </g>
    </Zeichenflaeche>
  );
};

/** Strahlenkranz-Test für Hornhautverkrümmung. */
const Strahlenkranz = ({ verzerrt }: { verzerrt: boolean }) => {
  const winkel = Array.from({ length: 12 }, (_, i) => i * 15);
  return (
    <Zeichenflaeche label="Strahlenkranz-Test" breite={280} hoehe={280}>
      {winkel.map((w) => {
        const rad = (w * Math.PI) / 180;
        const dx = Math.cos(rad) * 115;
        const dy = Math.sin(rad) * 115;
        // mit Hornhautverkrümmung: eine Richtung kräftig, die andere blass
        const kraft = verzerrt ? Math.abs(Math.cos(rad - Math.PI / 6)) : 1;
        return (
          <line
            key={w}
            x1={140 - dx}
            y1={140 - dy}
            x2={140 + dx}
            y2={140 + dy}
            stroke={F.schrift}
            strokeWidth={verzerrt ? 1.5 + 4 * kraft : 3}
            strokeOpacity={verzerrt ? 0.25 + 0.75 * kraft : 1}
            strokeLinecap="round"
          />
        );
      })}
      <circle cx={140} cy={140} r={10} fill={F.papier} />
    </Zeichenflaeche>
  );
};

const Gleitsichtglas = () => {
  const id = useId().replace(/:/g, "");
  return (
    <Zeichenflaeche
      label="Sehbereiche eines Gleitsichtglases"
      breite={760}
      hoehe={360}
    >
      <defs>
        <clipPath id={`glas${id}`}>
          <ellipse cx={280} cy={180} rx={200} ry={150} />
        </clipPath>
        <pattern
          id={`schraffur${id}`}
          width={10}
          height={10}
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width={10} height={10} fill="#eef1f4" />
          <line x1={0} y1={0} x2={0} y2={10} stroke="#c3cad3" strokeWidth={4} />
        </pattern>
      </defs>
      <g transform="translate(100 0)">
        <g clipPath={`url(#glas${id})`}>
          <rect width={560} height={360} fill={`url(#schraffur${id})`} />
          {/* Fernbereich oben */}
          <path
            d="M60,20 H500 V160 Q390,150 300,198 H260 Q170,150 60,160 Z"
            fill={F.scharf}
          />
          {/* Zwischenbereich (Progressionskanal) */}
          <path
            d="M262,196 H298 Q292,225 308,262 H252 Q268,225 262,196 Z"
            fill="#e2f1d5"
          />
          {/* Nahbereich unten */}
          <path
            d="M222,262 H338 Q350,300 330,340 H230 Q210,300 222,262 Z"
            fill="#fbecc9"
          />
        </g>
        <ellipse
          cx={280}
          cy={180}
          rx={200}
          ry={150}
          fill="none"
          stroke={F.linie}
          strokeWidth={3}
        />
        <text
          x={280}
          y={100}
          textAnchor="middle"
          fontSize={22}
          fontWeight={700}
          fill={F.scharfRand}
        >
          Ferne
        </text>
        <text
          x={280}
          y={125}
          textAnchor="middle"
          fontSize={14}
          fill={F.schrift}
        >
          Auto fahren, Fernsehen, Gesichter
        </text>
        <text
          x={280}
          y={300}
          textAnchor="middle"
          fontSize={17}
          fontWeight={700}
          fill="#a8741a"
        >
          Nähe
        </text>
        <text
          x={280}
          y={318}
          textAnchor="middle"
          fontSize={12}
          fill={F.schrift}
        >
          Lesen, Handy
        </text>
        <text x={120} y={250} textAnchor="middle" fontSize={13} fill={F.leise}>
          Randbereich
        </text>
        <text x={120} y={266} textAnchor="middle" fontSize={13} fill={F.leise}>
          (unscharf)
        </text>
        <text x={440} y={250} textAnchor="middle" fontSize={13} fill={F.leise}>
          Randbereich
        </text>
        <text x={440} y={266} textAnchor="middle" fontSize={13} fill={F.leise}>
          (unscharf)
        </text>
      </g>
      <Beschriftung
        text="Zwischenbereich"
        ziel={[400, 228]}
        bei={[600, 205]}
        anker="start"
      />
      <text x={600} y={226} fontSize={14} fill={F.schrift}>
        Bildschirm, Armaturen
      </text>
    </Zeichenflaeche>
  );
};

const Hauptbild = ({ thema, zustand }: { thema: Thema; zustand?: Zustand }) => {
  if (thema.art === "anatomie") return <Anatomie />;
  if (thema.art === "gleitsicht") return <Gleitsichtglas />;
  return <Strahlenbild zustand={zustand ?? thema.zustaende[0]} />;
};

const Uebersicht = ({ waehle }: { waehle: (t: Thema) => void }) => (
  <Box
    sx={{
      display: "grid",
      gap: 2,
      gridTemplateColumns: {
        xs: "1fr",
        sm: "repeat(2, minmax(0, 1fr))",
        lg: "repeat(3, minmax(0, 1fr))",
      },
    }}
  >
    {THEMEN.map((t) => (
      <Card key={t.id} sx={{ overflow: "hidden" }}>
        <ButtonBase
          onClick={() => waehle(t)}
          sx={{ display: "block", width: "100%", textAlign: "left", p: 1.5 }}
        >
          <Box sx={{ pointerEvents: "none" }}>
            <Hauptbild thema={t} />
          </Box>
          <Typography sx={{ fontWeight: 700, fontSize: 17, mt: 1 }}>
            {t.titel}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t.untertitel}
          </Typography>
        </ButtonBase>
      </Card>
    ))}
  </Box>
);

const ThemaAnsicht = ({
  thema,
  zurueck,
}: {
  thema: Thema;
  zurueck: () => void;
}) => {
  const [zustandId, setZustandId] = useState(thema.zustaende[0]?.id);
  const zustand =
    thema.zustaende.find((z) => z.id === zustandId) ?? thema.zustaende[0];
  const mitSzene = thema.art === "strahlen" && zustand;
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Box
        sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}
      >
        <Button startIcon={<ArrowBackIcon />} onClick={zurueck} size="large">
          Alle Bilder
        </Button>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography component="h1" sx={{ fontSize: 24, fontWeight: 700 }}>
            {thema.titel}
          </Typography>
          <Typography color="text.secondary">{thema.untertitel}</Typography>
        </Box>
      </Box>

      {thema.zustaende.length > 1 && (
        <ToggleButtonGroup
          exclusive
          value={zustand?.id}
          onChange={(_, v) => v && setZustandId(v)}
          sx={{ flexWrap: "wrap" }}
        >
          {thema.zustaende.map((z) => (
            <ToggleButton
              key={z.id}
              value={z.id}
              sx={{ px: 2.5, py: 1.25, fontSize: 16, textTransform: "none" }}
            >
              {z.name}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      )}

      <Box
        sx={{
          display: "grid",
          gap: 2,
          alignItems: "start",
          gridTemplateColumns: mitSzene
            ? { xs: "1fr", md: "minmax(0, 2fr) minmax(0, 1fr)" }
            : "1fr",
        }}
      >
        <Card sx={{ p: 1.5 }}>
          <Box sx={{ maxWidth: mitSzene ? undefined : 900, mx: "auto" }}>
            <Hauptbild thema={thema} zustand={zustand} />
          </Box>
        </Card>
        {mitSzene && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Card sx={{ p: 1.5 }}>
              <Typography sx={{ fontWeight: 700, mb: 1 }}>
                So sehen Sie
              </Typography>
              <Szene unschaerfe={zustand.unschaerfe} />
            </Card>
            {thema.strahlenkranz && (
              <Card sx={{ p: 1.5 }}>
                <Typography sx={{ fontWeight: 700, mb: 1 }}>
                  Strahlenkranz-Test
                </Typography>
                <Box sx={{ maxWidth: 260, mx: "auto" }}>
                  <Strahlenkranz
                    verzerrt={Boolean(zustand.unschaerfe.verzerrt)}
                  />
                </Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1 }}
                >
                  Erscheinen manche Linien kräftiger als andere, deutet das auf
                  eine Hornhautverkrümmung hin.
                </Typography>
              </Card>
            )}
          </Box>
        )}
      </Box>

      <Card sx={{ p: 2.5, display: "grid", gap: 1.25 }}>
        {thema.text.map((absatz) => (
          <Typography key={absatz} sx={{ fontSize: 18, lineHeight: 1.55 }}>
            {absatz}
          </Typography>
        ))}
      </Card>
    </Box>
  );
};

export const BeratungsbilderSeite = () => {
  const [thema, setThema] = useState<Thema | null>(null);
  const vollbild = () => {
    const el = document.documentElement;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.().catch(() => undefined);
  };
  return (
    <Box
      sx={{
        p: { xs: 1, md: 2 },
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      <Title title="Beratungsbilder" />
      {!thema && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography sx={{ flex: 1, color: "text.secondary" }}>
            Bilder für das Kundengespräch. Tippen Sie auf ein Thema.
          </Typography>
          <Button startIcon={<FullscreenIcon />} onClick={vollbild}>
            Vollbild
          </Button>
        </Box>
      )}
      {thema ? (
        <ThemaAnsicht
          key={thema.id}
          thema={thema}
          zurueck={() => setThema(null)}
        />
      ) : (
        <Uebersicht waehle={setThema} />
      )}
    </Box>
  );
};
