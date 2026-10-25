// Glasassistent (#51) im Aufbau des Prisma-Glasassistenten: oben die Werte
// R/L des Auftrags, links der Baum der Auswahlschritte (Vorgaben,
// Glaslieferanten, Grundglas, Durchmesser, Farbe, Entspiegelung,
// Hartschicht/Sonstiges), in der Mitte die Liste des gewählten Schritts und
// rechts die laufende Auswahl mit Gesamtpreis. "Zurück zu Auftrag" übernimmt
// die Auswahl als glastyp-Datensatz und - nach Rückfrage, falls schon Preise
// eingetragen sind - die Preise in die glass-Datensätze des Auftrags.
import { ReactNode, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  FormControlLabel,
  IconButton,
  Radio,
  RadioGroup,
  TextField as MuiTextField,
  Typography,
} from "@mui/material";
import { Theme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import {
  RaRecord,
  useDataProvider,
  useGetList,
  useGetMany,
  useGetOne,
  useNotify,
  useRecordContext,
} from "react-admin";
import { useFormContext, useWatch } from "react-hook-form";
import {
  VORGABEN,
  Vorgabe,
  durchmesserListe,
  grundglasPreis,
  optionKategorie,
  passtZuVorgaben,
} from "./glasassistentRegeln";

type Glashersteller = RaRecord & { code: string; name: string };
type Glaskatalog = RaRecord & {
  glashersteller_id: string;
  esd_code: string;
  bezeichnung: string;
  brechungsindex: number | null;
  basispreis: number | null;
  glasart: number | null;
  material: number | null;
  durchmesser: Record<string, number> | null;
  aktiv: boolean;
};
type GlaskatalogOption = RaRecord & {
  glashersteller_id: string;
  code: string;
  bezeichnung: string;
  typ: "beschichtung" | "farbe";
  preis: number | null;
};
type GlaskatalogHatOption = RaRecord & {
  glaskatalog_id: string;
  glaskatalog_option_id: string;
};
type Glastyp = RaRecord & {
  Bezeichnung?: string;
  Hersteller?: string;
  Verguetung?: string;
  Farbe?: string;
  GlasGroesse?: string;
  Sonstiges?: string;
  Bestellstatus?: string;
  glaskatalog_id?: string | null;
};

type Auge = "links" | "rechts" | "beide";
type Identifier = string | number;
type Schritt =
  | "vorgaben"
  | "lieferant"
  | "grundglas"
  | "durchmesser"
  | "farbe"
  | "entspiegelung"
  | "hartschicht";

const SCHRITTE: { id: Schritt; name: string }[] = [
  { id: "vorgaben", name: "Vorgaben" },
  { id: "lieferant", name: "Glaslieferanten" },
  { id: "grundglas", name: "Grundglas" },
  { id: "durchmesser", name: "Durchmesser" },
  { id: "farbe", name: "Farbe" },
  { id: "entspiegelung", name: "Entspiegelung" },
  { id: "hartschicht", name: "Hartschicht/Sonstiges" },
];

const naechsterSchritt = (schritt: Schritt): Schritt => {
  const i = SCHRITTE.findIndex((s) => s.id === schritt);
  return SCHRITTE[Math.min(i + 1, SCHRITTE.length - 1)].id;
};

const preis = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const preisText = (wert: number | null | undefined) =>
  wert ? preis.format(wert) : "";

const dioptrie = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const wertText = (wert: unknown, ganz?: boolean) => {
  if (wert === null || wert === undefined || wert === "") return "";
  const n = Number(wert);
  if (!Number.isFinite(n)) return "";
  return ganz ? String(Math.round(n)) : dioptrie.format(n);
};

// "R 65 / L 70" bzw. "65" aus glastyp.GlasGroesse
const leseGroesse = (text?: string) => {
  const roh = (text ?? "").trim();
  const getrennt = /^R\s*(\S+)\s*\/\s*L\s*(\S+)$/i.exec(roh);
  if (getrennt) return { rechts: getrennt[1], links: getrennt[2] };
  return { rechts: roh || null, links: roh || null };
};

const panelFarbe = (theme: Theme) =>
  theme.palette.mode === "dark" ? "rgba(120,160,210,0.12)" : "#dde6f1";
const kopfFarbe = (theme: Theme) =>
  theme.palette.mode === "dark" ? "rgba(255,255,255,0.05)" : "#eef0f3";

// Zeile in der mittleren Liste wie in Prisma: gewählte Einträge grau
// hinterlegt, "(weiter)" blau
const Eintrag = ({
  text,
  preis: betrag,
  gewaehlt,
  weiter,
  onClick,
}: {
  text: ReactNode;
  preis?: number | null;
  gewaehlt?: boolean;
  weiter?: boolean;
  onClick: () => void;
}) => (
  <Box
    role="option"
    aria-selected={Boolean(gewaehlt)}
    tabIndex={0}
    onClick={onClick}
    onKeyDown={(e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onClick();
      }
    }}
    sx={{
      display: "flex",
      gap: 2,
      px: 0.75,
      py: "2px",
      my: "1px",
      cursor: "pointer",
      fontSize: "0.875rem",
      lineHeight: 1.45,
      borderRadius: "2px",
      color: weiter || gewaehlt ? "#fff" : "text.primary",
      bgcolor: weiter ? "#3478c6" : gewaehlt ? "grey.600" : "transparent",
      "&:hover": {
        bgcolor: weiter ? "#2c67ab" : gewaehlt ? "grey.700" : "action.hover",
      },
      "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main" },
    }}
  >
    <Box sx={{ flex: 1, minWidth: 0 }}>{text}</Box>
    {betrag ? (
      <Box sx={{ whiteSpace: "nowrap", opacity: 0.8 }}>{preisText(betrag)}</Box>
    ) : null}
  </Box>
);

// Abschnitt im Auswahl-Panel: fette Überschrift, darunter eingerückte Werte
const AuswahlZeile = ({
  titel,
  werte,
}: {
  titel: string;
  werte: { text: string; preis?: number | null }[];
}) => (
  <Box sx={{ mb: 0.75 }}>
    <Typography sx={{ fontWeight: 700, fontSize: "0.85rem" }}>
      {titel}:
    </Typography>
    {werte.map((w, i) => (
      <Box
        key={i}
        sx={{
          display: "flex",
          gap: 2,
          pl: 1,
          fontSize: "0.85rem",
          color: "text.secondary",
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>{w.text}</Box>
        <Box sx={{ whiteSpace: "nowrap" }}>{preisText(w.preis)}</Box>
      </Box>
    ))}
  </Box>
);

interface GlasassistentDialogProps {
  onClose: () => void;
  glastypId?: Identifier | null;
  glasLinksId?: Identifier | null;
  glasRechtsId?: Identifier | null;
  // Außerhalb eines Formulars (Brillenkartei): die neuen Verweise (Glastyp,
  // GlasRechts, GlasLinks) direkt am Auftrag speichern
  direktSpeichern?: (verweise: Record<string, Identifier>) => Promise<void>;
}

export const GlasassistentDialog = ({
  onClose,
  glastypId,
  glasLinksId,
  glasRechtsId,
  direktSpeichern,
}: GlasassistentDialogProps) => {
  const dataProvider = useDataProvider();
  const notify = useNotify();
  // im Bearbeiten-Formular vorhanden, in der Brillenkartei nicht
  const formular = useFormContext() as ReturnType<typeof useFormContext> | null;

  const [schritt, setSchritt] = useState<Schritt>("vorgaben");
  const [vorgaben, setVorgaben] = useState<Set<Vorgabe>>(new Set());
  const [herstellerId, setHerstellerId] = useState<Identifier | null>(null);
  const [grundglasId, setGrundglasId] = useState<Identifier | null>(null);
  const [durchmesserR, setDurchmesserR] = useState<string | null>(null);
  const [durchmesserL, setDurchmesserL] = useState<string | null>(null);
  const [farbeId, setFarbeId] = useState<Identifier | null>(null);
  const [entspiegelungId, setEntspiegelungId] = useState<Identifier | null>(
    null,
  );
  const [hartschichtIds, setHartschichtIds] = useState<Set<Identifier>>(
    new Set(),
  );
  const [auge, setAuge] = useState<Auge>(
    glasLinksId && glasRechtsId ? "beide" : glasRechtsId ? "rechts" : "beide",
  );
  const [suche, setSuche] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [preisFrage, setPreisFrage] = useState(false);
  const [vorbelegt, setVorbelegt] = useState(false);
  const [optionenVorbelegt, setOptionenVorbelegt] = useState(false);

  const rlGetrennt = vorgaben.has("rlDurchmesser");

  // Bereits gewählten Glastyp laden, um bei erneutem Aufruf die letzte
  // Auswahl vorzubelegen und zu entscheiden, ob er aktualisiert werden kann.
  const { data: bestehenderGlastyp } = useGetOne<Glastyp>(
    "glastyp",
    { id: glastypId as Identifier },
    { enabled: Boolean(glastypId) },
  );
  const { data: bestehendesGrundglas } = useGetOne<Glaskatalog>(
    "glaskatalog",
    { id: bestehenderGlastyp?.glaskatalog_id as string },
    { enabled: Boolean(bestehenderGlastyp?.glaskatalog_id) },
  );

  useEffect(() => {
    if (vorbelegt || !bestehendesGrundglas) return;
    setHerstellerId(bestehendesGrundglas.glashersteller_id);
    setGrundglasId(bestehendesGrundglas.id);
    const groesse = leseGroesse(bestehenderGlastyp?.GlasGroesse);
    setDurchmesserR(groesse.rechts);
    setDurchmesserL(groesse.links);
    if (groesse.rechts !== groesse.links)
      setVorgaben((v) => new Set(v).add("rlDurchmesser"));
    setVorbelegt(true);
  }, [bestehendesGrundglas, bestehenderGlastyp, vorbelegt]);

  const { data: glasLinksRecord } = useGetOne(
    "glass",
    { id: glasLinksId as Identifier },
    { enabled: Boolean(glasLinksId) },
  );
  const { data: glasRechtsRecord } = useGetOne(
    "glass",
    { id: glasRechtsId as Identifier },
    { enabled: Boolean(glasRechtsId) },
  );

  const { data: hersteller } = useGetList<Glashersteller>("glashersteller", {
    pagination: { page: 1, perPage: 200 },
    sort: { field: "name", order: "ASC" },
  });

  const { data: grundglaeser, isPending: grundglaeserLaden } =
    useGetList<Glaskatalog>(
      "glaskatalog",
      {
        pagination: { page: 1, perPage: 5000 },
        sort: { field: "bezeichnung", order: "ASC" },
        filter: { glashersteller_id: herstellerId, aktiv: true },
      },
      { enabled: Boolean(herstellerId) },
    );

  const { data: hatOptionen } = useGetList<GlaskatalogHatOption>(
    "glaskatalog_hat_option",
    {
      pagination: { page: 1, perPage: 1000 },
      filter: { glaskatalog_id: grundglasId },
    },
    { enabled: Boolean(grundglasId) },
  );
  const optionIds = useMemo(
    () => (hatOptionen ?? []).map((row) => row.glaskatalog_option_id),
    [hatOptionen],
  );
  const { data: optionen } = useGetMany<GlaskatalogOption>(
    "glaskatalog_option",
    { ids: optionIds },
    { enabled: optionIds.length > 0 },
  );

  const selectedHersteller = hersteller?.find((h) => h.id === herstellerId);
  const selectedGrundglas = grundglaeser?.find((g) => g.id === grundglasId);

  const { farben, entspiegelungen, hartschichten } = useMemo(() => {
    const sortiert = [...(optionen ?? [])].sort((a, b) =>
      a.bezeichnung.localeCompare(b.bezeichnung, "de"),
    );
    return {
      farben: sortiert.filter((o) => optionKategorie(o) === "farbe"),
      entspiegelungen: sortiert.filter(
        (o) => optionKategorie(o) === "entspiegelung",
      ),
      hartschichten: sortiert.filter(
        (o) => optionKategorie(o) === "hartschicht",
      ),
    };
  }, [optionen]);

  const selectedFarbe = farben.find((o) => o.id === farbeId);
  const selectedEntspiegelung = entspiegelungen.find(
    (o) => o.id === entspiegelungId,
  );
  const selectedHartschichten = hartschichten.filter((o) =>
    hartschichtIds.has(o.id),
  );

  // Letzte Farbe/Vergütung/Sonstiges (Freitext auf glastyp) den
  // Katalogoptionen zuordnen, sobald diese geladen sind.
  useEffect(() => {
    if (optionenVorbelegt || !bestehenderGlastyp || !optionen?.length) return;
    if (bestehenderGlastyp.glaskatalog_id !== grundglasId) return;
    const name = (o: GlaskatalogOption) => o.bezeichnung;
    setFarbeId(
      farben.find((o) => name(o) === bestehenderGlastyp.Farbe)?.id ?? null,
    );
    setEntspiegelungId(
      entspiegelungen.find((o) => name(o) === bestehenderGlastyp.Verguetung)
        ?.id ?? null,
    );
    const sonstiges = (bestehenderGlastyp.Sonstiges ?? "")
      .split(",")
      .map((s) => s.trim());
    setHartschichtIds(
      new Set(
        hartschichten
          .filter((o) => sonstiges.includes(name(o)))
          .map((o) => o.id),
      ),
    );
    setOptionenVorbelegt(true);
  }, [
    optionenVorbelegt,
    bestehenderGlastyp,
    optionen,
    grundglasId,
    farben,
    entspiegelungen,
    hartschichten,
  ]);

  const durchmesser = durchmesserListe(selectedGrundglas);
  const dRechts = durchmesserR;
  const dLinks = rlGetrennt ? durchmesserL : durchmesserR;

  const aufpreise =
    (selectedFarbe?.preis ?? 0) +
    (selectedEntspiegelung?.preis ?? 0) +
    selectedHartschichten.reduce((s, o) => s + (o.preis ?? 0), 0);
  const preisRechts = grundglasPreis(selectedGrundglas, dRechts) + aufpreise;
  const preisLinks = grundglasPreis(selectedGrundglas, dLinks) + aufpreise;

  const begriff = suche.trim().toLowerCase();
  const gefilterteHersteller = (hersteller ?? []).filter(
    (h) => !begriff || h.name.toLowerCase().includes(begriff),
  );
  const gefilterteGrundglaeser = (grundglaeser ?? []).filter(
    (g) =>
      passtZuVorgaben(g, vorgaben) &&
      (!begriff ||
        g.bezeichnung.toLowerCase().includes(begriff) ||
        g.esd_code.toLowerCase().includes(begriff)),
  );

  const geheZu = (ziel: Schritt) => {
    setSchritt(ziel);
    setSuche("");
  };
  const weiter = () => geheZu(naechsterSchritt(schritt));

  const toggleVorgabe = (v: Vorgabe) =>
    setVorgaben((alt) => {
      const neu = new Set(alt);
      if (neu.has(v)) neu.delete(v);
      else neu.add(v);
      return neu;
    });

  const waehleHersteller = (id: Identifier) => {
    if (id !== herstellerId) {
      setHerstellerId(id);
      setGrundglasId(null);
      setFarbeId(null);
      setEntspiegelungId(null);
      setHartschichtIds(new Set());
    }
    geheZu("grundglas");
  };

  const waehleGrundglas = (g: Glaskatalog) => {
    if (g.id !== grundglasId) {
      setGrundglasId(g.id);
      setFarbeId(null);
      setEntspiegelungId(null);
      setHartschichtIds(new Set());
      const verfuegbar = Object.keys(g.durchmesser ?? {});
      if (durchmesserR && !verfuegbar.includes(durchmesserR))
        setDurchmesserR(null);
      if (durchmesserL && !verfuegbar.includes(durchmesserL))
        setDurchmesserL(null);
    }
    geheZu("durchmesser");
  };

  const uebernehmen = async (preiseUeberschreiben: boolean) => {
    if (!selectedGrundglas || !selectedHersteller) return;
    setPreisFrage(false);
    setSubmitting(true);
    const neueVerweise: Record<string, Identifier> = {};
    const setze = (feld: string, id: Identifier) => {
      if (direktSpeichern) neueVerweise[feld] = id;
      else formular?.setValue(feld, id, { shouldDirty: true });
    };
    try {
      const groesse =
        rlGetrennt && dRechts !== dLinks
          ? `R ${dRechts ?? "-"} / L ${dLinks ?? "-"}`
          : (dRechts ?? "");
      const payload = {
        Bezeichnung: selectedGrundglas.bezeichnung,
        Hersteller: selectedHersteller.name,
        Verguetung: selectedEntspiegelung?.bezeichnung ?? "",
        Farbe: selectedFarbe?.bezeichnung ?? "",
        GlasGroesse: groesse,
        Sonstiges: selectedHartschichten.map((o) => o.bezeichnung).join(", "),
        Bestellstatus: bestehenderGlastyp?.Bestellstatus || "zu bestellen",
        glaskatalog_id: selectedGrundglas.id,
      };

      let resolvedGlastypId: Identifier | undefined = bestehenderGlastyp?.id;
      if (
        resolvedGlastypId &&
        bestehenderGlastyp?.glaskatalog_id === selectedGrundglas.id
      ) {
        await dataProvider.update("glastyp", {
          id: resolvedGlastypId,
          data: payload,
          previousData: bestehenderGlastyp,
        });
      } else {
        const { data } = await dataProvider.create("glastyp", {
          data: payload,
        });
        resolvedGlastypId = data.id;
      }
      if (resolvedGlastypId != null) setze("Glastyp", resolvedGlastypId);

      const aufAuge = async (
        feld: "GlasLinks" | "GlasRechts",
        aktuelleId: Identifier | null | undefined,
        aktuellerRecord: RaRecord | undefined,
        betrag: number,
      ) => {
        if (aktuelleId) {
          if (!preiseUeberschreiben) return;
          await dataProvider.update("glass", {
            id: aktuelleId,
            data: { Betrag: betrag },
            previousData: aktuellerRecord ?? { id: aktuelleId },
          });
        } else {
          const { data } = await dataProvider.create("glass", {
            data: {
              Betrag: betrag,
              Seite: feld === "GlasRechts" ? "Rechts" : "Links",
            },
          });
          setze(feld, data.id);
        }
      };

      if (auge === "rechts" || auge === "beide") {
        await aufAuge(
          "GlasRechts",
          glasRechtsId,
          glasRechtsRecord,
          preisRechts,
        );
      }
      if (auge === "links" || auge === "beide") {
        await aufAuge("GlasLinks", glasLinksId, glasLinksRecord, preisLinks);
      }

      if (direktSpeichern) {
        await direktSpeichern(neueVerweise);
        notify("Glasauswahl übernommen.", { type: "success" });
      } else {
        notify("Glasauswahl übernommen. Bitte den Auftrag speichern.", {
          type: "success",
        });
      }
      onClose();
    } catch {
      notify("Glasauswahl konnte nicht übernommen werden", { type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  // Wie in Prisma: Rückfrage, wenn bereits Glaspreise eingetragen sind
  const zurueckZuAuftrag = () => {
    const betroffene = [
      auge !== "links" ? glasRechtsRecord : undefined,
      auge !== "rechts" ? glasLinksRecord : undefined,
    ];
    const hatPreise = betroffene.some(
      (g) => g?.Betrag !== null && g?.Betrag !== undefined && Number(g.Betrag),
    );
    if (hatPreise) setPreisFrage(true);
    else uebernehmen(true);
  };

  const werteZeilen = [
    { seite: "R", glas: glasRechtsRecord },
    { seite: "L", glas: glasLinksRecord },
  ];

  const liste = (() => {
    switch (schritt) {
      case "vorgaben":
        return (
          <>
            <Eintrag text="(weiter)" weiter onClick={weiter} />
            {VORGABEN.map((v) => (
              <Eintrag
                key={v.id}
                text={v.name}
                gewaehlt={vorgaben.has(v.id)}
                onClick={() => toggleVorgabe(v.id)}
              />
            ))}
          </>
        );
      case "lieferant":
        return (
          <>
            <Eintrag text="(weiter)" weiter onClick={weiter} />
            {gefilterteHersteller.map((h) => (
              <Eintrag
                key={h.id}
                text={h.name}
                gewaehlt={h.id === herstellerId}
                onClick={() => waehleHersteller(h.id)}
              />
            ))}
          </>
        );
      case "grundglas":
        if (!herstellerId)
          return <Hinweis>Bitte zuerst einen Glaslieferanten wählen.</Hinweis>;
        return (
          <>
            <Eintrag text="(weiter)" weiter onClick={weiter} />
            {gefilterteGrundglaeser.map((g) => (
              <Eintrag
                key={g.id}
                text={g.bezeichnung}
                preis={g.basispreis}
                gewaehlt={g.id === grundglasId}
                onClick={() => waehleGrundglas(g)}
              />
            ))}
            {!grundglaeserLaden && gefilterteGrundglaeser.length === 0 && (
              <Hinweis>
                Keine Grundgläser zu diesen Vorgaben. Vorgaben oder Filter
                ändern.
              </Hinweis>
            )}
          </>
        );
      case "durchmesser": {
        if (!selectedGrundglas)
          return <Hinweis>Bitte zuerst ein Grundglas wählen.</Hinweis>;
        if (durchmesser.length === 0)
          return (
            <>
              <Eintrag text="(weiter)" weiter onClick={weiter} />
              <Hinweis>
                Der Katalog nennt für dieses Glas keine Durchmesser, es gilt der
                Basispreis.
              </Hinweis>
            </>
          );
        const spalte = (
          wert: string | null,
          setzen: (d: string) => void,
          weiterNach: boolean,
        ) =>
          durchmesser.map((d) => (
            <Eintrag
              key={d.durchmesser}
              text={d.durchmesser}
              preis={d.preis}
              gewaehlt={d.durchmesser === wert}
              onClick={() => {
                setzen(d.durchmesser);
                if (weiterNach) geheZu("farbe");
              }}
            />
          ));
        return (
          <>
            <Eintrag text="(weiter)" weiter onClick={weiter} />
            {rlGetrennt ? (
              <Box
                sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}
              >
                <Box>
                  <Spaltenkopf>Rechts</Spaltenkopf>
                  {spalte(durchmesserR, setDurchmesserR, false)}
                </Box>
                <Box>
                  <Spaltenkopf>Links</Spaltenkopf>
                  {spalte(durchmesserL, setDurchmesserL, false)}
                </Box>
              </Box>
            ) : (
              spalte(durchmesserR, setDurchmesserR, true)
            )}
          </>
        );
      }
      case "farbe":
        return (
          <OptionenListe
            ohne="(ohne Farbe)"
            optionen={farben}
            gewaehlt={farbeId}
            onWahl={(id) => {
              setFarbeId(id);
              geheZu("entspiegelung");
            }}
            onWeiter={weiter}
            bereit={Boolean(selectedGrundglas)}
          />
        );
      case "entspiegelung":
        return (
          <OptionenListe
            ohne="(ohne Entspiegelung)"
            optionen={entspiegelungen}
            gewaehlt={entspiegelungId}
            onWahl={(id) => {
              setEntspiegelungId(id);
              geheZu("hartschicht");
            }}
            onWeiter={weiter}
            bereit={Boolean(selectedGrundglas)}
          />
        );
      case "hartschicht":
        if (!selectedGrundglas)
          return <Hinweis>Bitte zuerst ein Grundglas wählen.</Hinweis>;
        return (
          <>
            <Eintrag
              text="(ohne Hartschicht/Sonstiges)"
              gewaehlt={hartschichtIds.size === 0}
              onClick={() => setHartschichtIds(new Set())}
            />
            {hartschichten.map((o) => (
              <Eintrag
                key={o.id}
                text={o.bezeichnung}
                preis={o.preis}
                gewaehlt={hartschichtIds.has(o.id)}
                onClick={() =>
                  setHartschichtIds((alt) => {
                    const neu = new Set(alt);
                    if (neu.has(o.id)) neu.delete(o.id);
                    else neu.add(o.id);
                    return neu;
                  })
                }
              />
            ))}
          </>
        );
    }
  })();

  const mitFilter = schritt === "lieferant" || schritt === "grundglas";
  const groessenText = rlGetrennt
    ? [`R ${dRechts ?? "–"}`, `L ${dLinks ?? "–"}`]
    : dRechts
      ? [dRechts]
      : [];
  const gesamt =
    selectedGrundglas &&
    (rlGetrennt && preisRechts !== preisLinks
      ? [
          { text: "Rechts", preis: preisRechts },
          { text: "Links", preis: preisLinks },
        ]
      : [{ text: "", preis: preisRechts }]);

  return (
    <Dialog
      open
      onClose={submitting ? undefined : onClose}
      fullWidth
      maxWidth="lg"
      aria-label="Glasassistent"
      PaperProps={{ sx: { height: { md: "86vh" }, borderRadius: 1 } }}
    >
      {/* Kopf: Werte des Auftrags und Titel */}
      <Box
        sx={(theme) => ({
          bgcolor: kopfFarbe(theme),
          px: 2,
          py: 1.25,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 2,
          position: "relative",
          borderBottom: 1,
          borderColor: "divider",
        })}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1.5em repeat(5, minmax(3.5em, 4.5em))",
            columnGap: 1.5,
            fontSize: "0.8rem",
            color: "text.secondary",
            textAlign: "right",
          }}
        >
          <span />
          {["Sphäre", "Cylinder", "Achse", "Addition", "Prisma"].map((t) => (
            <Box key={t} sx={{ textAlign: "center" }}>
              {t}
            </Box>
          ))}
          {werteZeilen.map(({ seite, glas }) => [
            <Box key={`${seite}-s`} sx={{ textAlign: "left" }}>
              {seite}
            </Box>,
            <span key={`${seite}-sph`}>{wertText(glas?.Sph)}</span>,
            <span key={`${seite}-cyl`}>{wertText(glas?.Cyl)}</span>,
            <span key={`${seite}-a`}>{wertText(glas?.A, true)}</span>,
            <span key={`${seite}-add`}>{wertText(glas?.Add)}</span>,
            <span key={`${seite}-pr`}>{wertText(glas?.Pr)}</span>,
          ])}
        </Box>
        <Typography
          component="h2"
          sx={{ fontSize: "1.6rem", color: "text.secondary", lineHeight: 1 }}
        >
          Glasassistent
        </Typography>
        <IconButton
          onClick={onClose}
          disabled={submitting}
          size="small"
          aria-label="Schließen"
          sx={{ position: "absolute", top: 4, right: 4 }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 0, display: "flex", minHeight: 0 }}>
        <Box
          sx={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "minmax(170px, 0.75fr) minmax(0, 1fr) minmax(0, 1fr)",
            },
            minHeight: 0,
          }}
        >
          {/* Baum der Schritte */}
          <Box
            sx={{
              borderRight: { md: 1 },
              borderBottom: { xs: 1, md: 0 },
              borderColor: "divider",
              p: 1,
              fontSize: "0.85rem",
              overflowY: "auto",
            }}
          >
            <Typography sx={{ fontWeight: 700, fontSize: "0.85rem", mb: 0.25 }}>
              ⊟ Glasauswahl
            </Typography>
            <Box
              sx={{
                ml: 1,
                pl: 1.5,
                borderLeft: "1px dotted",
                borderColor: "text.disabled",
              }}
            >
              {SCHRITTE.map((s) => (
                <Box
                  key={s.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => geheZu(s.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") geheZu(s.id);
                  }}
                  sx={{
                    px: 0.75,
                    py: "2px",
                    my: "1px",
                    cursor: "pointer",
                    fontWeight: 600,
                    borderRadius: "2px",
                    color: schritt === s.id ? "#fff" : "text.primary",
                    bgcolor: schritt === s.id ? "grey.600" : "transparent",
                    "&:hover": {
                      bgcolor: schritt === s.id ? "grey.700" : "action.hover",
                    },
                  }}
                >
                  {s.name}
                </Box>
              ))}
            </Box>
          </Box>

          {/* Liste des Schritts */}
          <Box
            sx={{
              borderRight: { md: 1 },
              borderBottom: { xs: 1, md: 0 },
              borderColor: "divider",
              display: "flex",
              flexDirection: "column",
              minHeight: { xs: 240, md: 0 },
            }}
          >
            {mitFilter && (
              <MuiTextField
                size="small"
                placeholder="Filter"
                value={suche}
                onChange={(e) => setSuche(e.target.value)}
                sx={{ m: 1, mb: 0.5 }}
                autoFocus
              />
            )}
            <Box
              sx={{ flex: 1, overflowY: "auto", p: 1, pt: 0.5 }}
              role="listbox"
            >
              {liste}
            </Box>
          </Box>

          {/* Auswahl */}
          <Box sx={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
            <Box
              sx={{
                bgcolor: "grey.600",
                color: "#fff",
                textAlign: "center",
                fontWeight: 700,
                py: 0.5,
              }}
            >
              Auswahl
            </Box>
            <Box
              sx={(theme) => ({
                flex: 1,
                overflowY: "auto",
                bgcolor: panelFarbe(theme),
                p: 1,
                display: "flex",
                flexDirection: "column",
              })}
            >
              <AuswahlZeile
                titel="Vorgaben"
                werte={VORGABEN.filter((v) => vorgaben.has(v.id)).map((v) => ({
                  text: v.name,
                }))}
              />
              {selectedGrundglas && (
                <AuswahlZeile
                  titel="Glastyp"
                  werte={[
                    { text: selectedHersteller?.name ?? "" },
                    {
                      text: selectedGrundglas.bezeichnung,
                      preis: grundglasPreis(selectedGrundglas, dRechts),
                    },
                  ]}
                />
              )}
              <AuswahlZeile
                titel="Größe"
                werte={groessenText.map((text) => ({ text }))}
              />
              <AuswahlZeile
                titel="Farbe"
                werte={
                  selectedFarbe
                    ? [
                        {
                          text: selectedFarbe.bezeichnung,
                          preis: selectedFarbe.preis,
                        },
                      ]
                    : []
                }
              />
              <AuswahlZeile
                titel="Vergütung"
                werte={
                  selectedEntspiegelung
                    ? [
                        {
                          text: selectedEntspiegelung.bezeichnung,
                          preis: selectedEntspiegelung.preis,
                        },
                      ]
                    : []
                }
              />
              <AuswahlZeile
                titel="Hartschicht/Sonstiges"
                werte={selectedHartschichten.map((o) => ({
                  text: o.bezeichnung,
                  preis: o.preis,
                }))}
              />
              {gesamt && <AuswahlZeile titel="Gesamtpreis" werte={gesamt} />}
              <Box sx={{ flex: 1 }} />
              <Typography
                sx={{ fontSize: "0.75rem", color: "text.secondary", mb: 0.5 }}
              >
                EDV-Code: {selectedGrundglas?.esd_code ?? ""}
              </Typography>
              <RadioGroup
                row
                value={auge}
                onChange={(e) => setAuge(e.target.value as Auge)}
                sx={{ "& .MuiFormControlLabel-label": { fontSize: "0.85rem" } }}
              >
                <FormControlLabel
                  value="beide"
                  control={<Radio size="small" />}
                  label="Beide Gläser"
                />
                <FormControlLabel
                  value="rechts"
                  control={<Radio size="small" />}
                  label="Nur rechts"
                />
                <FormControlLabel
                  value="links"
                  control={<Radio size="small" />}
                  label="Nur links"
                />
              </RadioGroup>
            </Box>
            <Box
              sx={{
                display: "flex",
                gap: 1,
                justifyContent: "flex-end",
                p: 1,
                borderTop: 1,
                borderColor: "divider",
              }}
            >
              <Button onClick={onClose} disabled={submitting}>
                Abbrechen
              </Button>
              <Button
                variant="contained"
                startIcon={<AutoFixHighIcon />}
                disabled={submitting || !selectedGrundglas}
                onClick={zurueckZuAuftrag}
              >
                Zurück zu Auftrag
              </Button>
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <Dialog open={preisFrage} onClose={() => setPreisFrage(false)}>
        <DialogContent>
          <DialogContentText>
            Sollen die Glaspreise überschrieben werden?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => uebernehmen(true)}>
            Ja
          </Button>
          <Button onClick={() => uebernehmen(false)}>Nein</Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};

const Hinweis = ({ children }: { children: ReactNode }) => (
  <Typography
    sx={{ color: "text.secondary", fontSize: "0.85rem", p: 1 }}
    component="div"
  >
    {children}
  </Typography>
);

const Spaltenkopf = ({ children }: { children: ReactNode }) => (
  <Typography
    sx={{
      fontWeight: 700,
      fontSize: "0.8rem",
      color: "text.secondary",
      px: 0.75,
    }}
  >
    {children}
  </Typography>
);

const OptionenListe = ({
  ohne,
  optionen,
  gewaehlt,
  onWahl,
  onWeiter,
  bereit,
}: {
  ohne: string;
  optionen: GlaskatalogOption[];
  gewaehlt: Identifier | null;
  onWahl: (id: Identifier | null) => void;
  onWeiter: () => void;
  bereit: boolean;
}) => {
  if (!bereit) return <Hinweis>Bitte zuerst ein Grundglas wählen.</Hinweis>;
  return (
    <>
      <Eintrag text="(weiter)" weiter onClick={onWeiter} />
      <Eintrag
        text={ohne}
        gewaehlt={gewaehlt === null}
        onClick={() => onWahl(null)}
      />
      {optionen.map((o) => (
        <Eintrag
          key={o.id}
          text={o.bezeichnung}
          preis={o.preis}
          gewaehlt={o.id === gewaehlt}
          onClick={() => onWahl(o.id)}
        />
      ))}
    </>
  );
};

// Button für die Brillenkartei (BrilleEdit), der den Glasassistenten öffnet.
// Liest die aktuellen (ggf. noch ungespeicherten) Formularwerte für
// Glastyp/GlasLinks/GlasRechts, damit der Assistent eine bestehende Auswahl
// vorbelegen und die richtigen glass-Datensätze aktualisieren kann.
export const GlasassistentButton = () => {
  const record = useRecordContext();
  const [open, setOpen] = useState(false);
  const glastypId = useWatch({ name: "Glastyp" });
  const glasLinksId = useWatch({ name: "GlasLinks" });
  const glasRechtsId = useWatch({ name: "GlasRechts" });

  if (!record) return null;

  return (
    <>
      <Button
        variant="outlined"
        startIcon={<AutoFixHighIcon />}
        onClick={() => setOpen(true)}
      >
        Glasassistent
      </Button>
      {open && (
        <GlasassistentDialog
          onClose={() => setOpen(false)}
          glastypId={glastypId}
          glasLinksId={glasLinksId}
          glasRechtsId={glasRechtsId}
        />
      )}
    </>
  );
};
