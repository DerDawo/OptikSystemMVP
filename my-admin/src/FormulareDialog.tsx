// Formulare-Dialog (#58): aus der Brillenkartei (BrilleShow/BrilleEdit)
// aufrufbarer Dialog, der verfügbare Dokumentvorlagen (gruppiert nach
// Kategorie) auflistet, die Auswahl mit den Daten des aktuellen
// Auftrags/Kunden befüllt und Seitenansicht/PDF/Druck anbietet.
//
// Bewusst generisch gehalten: #56 (Rechnungen) und #57 (Mahnungen) sollen
// hierauf aufsetzen, indem sie lediglich weitere `dokumentvorlage`-Datensätze
// mit Kategorie "Rechnung"/"Mahnung" anlegen - an dieser Dialog-/Render-Logik
// muss dafür nichts geändert werden.
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Tooltip,
  Typography,
  TextField,
  CircularProgress,
  MenuItem,
} from "@mui/material";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import CloseIcon from "@mui/icons-material/Close";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DescriptionIcon from "@mui/icons-material/Description";
import ReceiptIcon from "@mui/icons-material/Receipt";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import VisibilityIcon from "@mui/icons-material/Visibility";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import PrintIcon from "@mui/icons-material/Print";
import EditNoteIcon from "@mui/icons-material/EditNote";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import BuildIcon from "@mui/icons-material/Build";
import EmailIcon from "@mui/icons-material/Email";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import {
  Confirm,
  RaRecord,
  useDataProvider,
  useGetList,
  useGetMany,
  useGetOne,
  useNotify,
  useRecordContext,
  useRefresh,
} from "react-admin";
import { supabase } from "./utils";
import {
  buildDocumentMergeValues,
  renderDocumentTemplate,
  type DocumentMergeEntities,
} from "./documentTemplateEngine";
import {
  buildKostenvoranschlagPreviewHtml,
  buildKostenvoranschlagPrintHtml,
  buildRechnungPreviewHtml,
  buildRechnungPrintHtml,
} from "./rechnungTemplate";
import {
  buildBerechtigungsscheinPreviewHtml,
  buildBerechtigungsscheinPrintHtml,
} from "./berechtigungsscheinTemplate";
import {
  buildWerkstattauftragPreviewHtml,
  buildWerkstattauftragPrintHtml,
} from "./werkstattauftragTemplate";
import {
  type AntragArt,
  buildAntragPreviewHtml,
  buildAntragPrintHtml,
} from "./antragTemplate";
import {
  buildAokBerechtigungsscheinPreviewHtml,
  buildAokBerechtigungsscheinPrintHtml,
} from "./aokBerechtigungsscheinTemplate";
import { heuteIso } from "./AuftragsstatusLeiste";
import { PDF_VORLAGEN, fuellePdfVorlage, ladePdfVorlage } from "./pdfFormulare";
import { belegAlsPdf, belegVersenden } from "./belegPdf";
import { choosePhoneNumberForMessaging } from "./messaging";
import { KI_FORMULARE, begruendungVorschlagen } from "./kiBegruendung";
import {
  buildErprobungsprotokollPreviewHtml,
  buildErprobungsprotokollPrintHtml,
} from "./erprobungsprotokollTemplate";
import {
  buildAnamnesePreviewHtml,
  buildAnamnesePrintHtml,
} from "./anamneseTemplate";
import {
  buildRezeptanfragePreviewHtml,
  buildRezeptanfragePrintHtml,
} from "./rezeptanfrageTemplate";
import {
  buildOptometrischeVerordnungPreviewHtml,
  buildOptometrischeVerordnungPrintHtml,
  buildVerordnungKurzPreviewHtml,
  buildVerordnungKurzPrintHtml,
} from "./optometrischeVerordnungTemplate";

// Kategorie, unter der die Rechnungsvorlage(n) in `dokumentvorlage` angelegt
// werden (siehe DOKUMENTVORLAGE_KATEGORIEN in dokumentvorlage.tsx und die
// Seed-Migration 20260831020100_seed_dokumentvorlage_rechnung.sql).
const RECHNUNG_KATEGORIE = "Rechnung";

// Kategorie, die "Berechtigungsschein erstellen" öffnet: das Original des
// ZVA (AOK-Vertrag Sehhilfen, Anlage 4) als ausfüllbares PDF (pdfFormulare.ts)
const BERECHTIGUNGSSCHEIN_KATEGORIE = "Berechtigungsschein GKV";

// Anamnesebogen (anamneseTemplate.ts), auch direkt von der Kundenseite
const ANAMNESE_KATEGORIE = "Anamnesebogen";

// Kategorie des Werkstattauftrags (Seed-Migration
// 20260831010100_seed_dokumentvorlage.sql, Vorlage "Werkstattkarte"); das
// Layout kommt aus werkstattauftragTemplate.ts.
const WERKSTATTKARTE_KATEGORIE = "Werkstattkarte";

// Weitere Formulare mit Layout im Code (Seed-Migration
// 20261011120000_seed_dokumentvorlage_antraege.sql)
const BERECHTIGUNGSSCHEIN_AOK_KATEGORIE = "Berechtigungsschein AOK";
const VERORDNUNG_KATEGORIE = "Optometrische Verordnung";
const VERORDNUNG_GKV_KATEGORIE = "Optometrische Verordnung GKV";
// Kostenvoranschlag im Rechnungsdesign (rechnungTemplate.ts)
const KOSTENVORANSCHLAG_KATEGORIE = "Kostenvoranschlag";

// Knöpfe im Auswahlfenster wie in Prisma: dunkelblau, weiße fette Schrift
const PRISMA_KNOPF = {
  bgcolor: "#1d4e8f",
  "&:hover": { bgcolor: "#173f74" },
  color: "#fff",
  fontWeight: 700,
  textTransform: "none",
  fontSize: "1rem",
  borderRadius: "4px",
  py: 1,
} as const;

type LayoutDaten = {
  entities: DocumentMergeEntities;
  betrieb?: RaRecord;
  rechnungsnummer: string;
  begruendung?: string;
};

type Layout = {
  title: string;
  preview: (daten: LayoutDaten) => string;
  print: (daten: LayoutDaten) => string;
  // Formulare mit anklickbaren Kästchen: gedruckt wird der Stand der
  // Vorschau (vorgeschlagene Kreuze lassen sich dort noch ändern)
  ausVorschau?: boolean;
};

// Vorschau samt angeklickter Kästchen als eigenständiges HTML
const vorschauAlsHtml = (doc: Document) => {
  doc
    .querySelectorAll<HTMLInputElement>('input[type="checkbox"]')
    .forEach((box) => box.toggleAttribute("checked", box.checked));
  return `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`;
};

const antragLayout = (art: AntragArt): Layout => ({
  title: "Antrag-Vorschau",
  ausVorschau: true,
  preview: (d) => buildAntragPreviewHtml(art, d),
  print: (d) => buildAntragPrintHtml(art, d),
});

// Kategorie in `dokumentvorlage` -> code-basiertes Layout
const LAYOUTS: Record<string, Layout> = {
  [RECHNUNG_KATEGORIE]: {
    title: "Rechnungsvorschau",
    preview: buildRechnungPreviewHtml,
    print: buildRechnungPrintHtml,
  },
  [KOSTENVORANSCHLAG_KATEGORIE]: {
    title: "Kostenvoranschlag-Vorschau",
    preview: buildKostenvoranschlagPreviewHtml,
    print: buildKostenvoranschlagPrintHtml,
  },
  [BERECHTIGUNGSSCHEIN_KATEGORIE]: {
    title: "Berechtigungsschein-Vorschau",
    preview: buildBerechtigungsscheinPreviewHtml,
    print: buildBerechtigungsscheinPrintHtml,
  },
  [BERECHTIGUNGSSCHEIN_AOK_KATEGORIE]: {
    ausVorschau: true,
    title: "Berechtigungsschein-Vorschau",
    preview: buildAokBerechtigungsscheinPreviewHtml,
    print: buildAokBerechtigungsscheinPrintHtml,
  },
  [WERKSTATTKARTE_KATEGORIE]: {
    title: "Werkstattauftrag-Vorschau",
    preview: buildWerkstattauftragPreviewHtml,
    print: buildWerkstattauftragPrintHtml,
  },
  "Antrag Zuschuss": antragLayout("zuschuss"),
  "Antrag Sozialamt": antragLayout("sozialamt"),
  "Antrag Jugendamt": antragLayout("jugendamt"),
  [VERORDNUNG_KATEGORIE]: {
    ausVorschau: true,
    title: "Verordnung-Vorschau",
    preview: buildVerordnungKurzPreviewHtml,
    print: buildVerordnungKurzPrintHtml,
  },
  [VERORDNUNG_GKV_KATEGORIE]: {
    ausVorschau: true,
    title: "Verordnung-Vorschau",
    preview: buildOptometrischeVerordnungPreviewHtml,
    print: buildOptometrischeVerordnungPrintHtml,
  },
  Erprobungsprotokoll: {
    ausVorschau: true,
    title: "Erprobungsprotokoll-Vorschau",
    preview: buildErprobungsprotokollPreviewHtml,
    print: buildErprobungsprotokollPrintHtml,
  },
  [ANAMNESE_KATEGORIE]: {
    ausVorschau: true,
    title: "Anamnesebogen-Vorschau",
    preview: buildAnamnesePreviewHtml,
    print: buildAnamnesePrintHtml,
  },
  "Rezeptanfrage Augenarzt": {
    ausVorschau: true,
    title: "Rezeptanfrage-Vorschau",
    preview: buildRezeptanfragePreviewHtml,
    print: buildRezeptanfragePrintHtml,
  },
};

// Kategorie und Zuordnung Mahnstufe -> Vorlagenname für die Mahnvorlagen
// (#57, Seed-Migration 20260831030100_seed_dokumentvorlage_mahnung.sql). Es
// gibt mehrere aktive Vorlagen der Kategorie "Mahnung" (eine je Stufe), daher
// reicht die generische "genau ein Treffer"-Auswahl unten nicht aus - der
// Name der zur aktuellen Mahnstufe passenden Vorlage wird explizit über
// `initialVorlageName` vorgegeben.
const MAHNUNG_KATEGORIE = "Mahnung";

// Formulare, auf die eine Genehmigung des Kostenträgers folgt: Drucken, PDF
// oder Versand merkt sich das Datum am Auftrag ("KVVersendet"); ohne Haken
// "genehmigt" erscheint der Auftrag nach 14 Tagen im Dashboard
export const KV_KATEGORIEN = [
  "Kostenvoranschlag",
  "Antrag BAP",
  "Antrag Zuschuss",
  "Antrag Sozialamt",
  "Antrag Jugendamt",
  "Berechtigungsschein",
  "Berechtigungsschein AOK",
  "Berechtigungsschein GKV",
];

// Formulararten, die eigene Knöpfe öffnen (Rechnung, Mahnung,
// Berechtigungsschein, Werkstattauftrag): die letzte aktive Vorlage einer
// solchen Art lässt sich nicht ausblenden
const UNVERZICHTBARE_KATEGORIEN = [
  RECHNUNG_KATEGORIE,
  MAHNUNG_KATEGORIE,
  BERECHTIGUNGSSCHEIN_KATEGORIE,
  WERKSTATTKARTE_KATEGORIE,
];
const MAHNUNG_VORLAGE_NACH_STUFE: Record<number, string> = {
  1: "Zahlungserinnerung",
  2: "2. Mahnung",
  3: "3. Mahnung (Inkasso-Ankündigung)",
};

type Dokumentvorlage = RaRecord & {
  Name: string;
  Kategorie: string;
  Vorlagentext: string;
  Aktiv: boolean;
};

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const buildPrintHtml = (title: string, body: string) => `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; padding: 2.5cm 2cm; color: #111; }
  h1 { font-size: 1.1rem; margin: 0 0 1.5em; }
  pre { font-family: inherit; font-size: 0.95rem; line-height: 1.6; white-space: pre-wrap; word-break: break-word; margin: 0; }
  @page { margin: 2cm; }
</style>
</head>
<body>
<h1>${escapeHtml(title)}</h1>
<pre>${escapeHtml(body)}</pre>
</body>
</html>`;

// Leichte, im Browser lauffähige "PDF"-Lösung ohne zusätzliche Bibliothek:
// ein separates Fenster mit druckoptimiertem CSS, dessen Druckdialog der
// Nutzer entweder an einen Drucker schickt oder als PDF speichert.
const openDocumentWindow = (html: string, autoPrint: boolean): boolean => {
  const documentWindow = window.open("", "_blank", "width=850,height=1100");
  if (!documentWindow) {
    return false;
  }
  documentWindow.document.open();
  documentWindow.document.write(html);
  documentWindow.document.close();
  documentWindow.focus();
  if (autoPrint) {
    documentWindow.print();
  }
  return true;
};

interface FormulareDialogProps {
  brille: RaRecord;
  onClose: () => void;
  // Beschränkt die Vorlagenauswahl auf eine Kategorie und wählt sie bei
  // genau einem Treffer automatisch aus (Rechnung erstellen, #56).
  initialKategorie?: string;
  // Wählt innerhalb von `initialKategorie` gezielt die Vorlage mit diesem
  // Namen aus, falls es dort mehrere aktive Vorlagen gibt (Mahnung
  // erstellen, #57: eine Vorlage je Mahnstufe).
  initialVorlageName?: string;
}

const FormulareDialog = ({
  brille,
  onClose,
  initialKategorie,
  initialVorlageName,
}: FormulareDialogProps) => {
  const notify = useNotify();
  const [selectedVorlage, setSelectedVorlage] =
    useState<Dokumentvorlage | null>(null);
  // "liste" = Auswahlfenster wie in Prisma, "vorschau" = Seitenansicht
  const [ansicht, setAnsicht] = useState<"liste" | "vorschau">("liste");
  const [typ, setTyp] = useState<string>("");

  const {
    data: vorlagen,
    isPending: vorlagenLoading,
    refetch: vorlagenNeuLaden,
  } = useGetList<Dokumentvorlage>("dokumentvorlage", {
    pagination: { page: 1, perPage: 200 },
    sort: { field: "Kategorie", order: "ASC" },
    filter: { Aktiv: true },
  });

  // Formular aus der Liste ausblenden ("Aktiv" aus) - nicht löschen; wieder
  // einblenden unter Einstellungen -> Dokumentvorlagen
  const dataProvider = useDataProvider();
  const [ausblendenFrage, setAusblendenFrage] = useState(false);
  const letzteIhrerArt =
    selectedVorlage != null &&
    UNVERZICHTBARE_KATEGORIEN.includes(selectedVorlage.Kategorie) &&
    (vorlagen ?? []).filter((v) => v.Kategorie === selectedVorlage.Kategorie)
      .length <= 1;
  const ausblenden = async () => {
    setAusblendenFrage(false);
    if (!selectedVorlage) return;
    try {
      await dataProvider.update("dokumentvorlage", {
        id: selectedVorlage.id,
        data: { Aktiv: false },
        previousData: selectedVorlage,
      });
      notify(
        `„${selectedVorlage.Name}“ ausgeblendet. Wieder einblenden: Einstellungen → Dokumentvorlagen („Aktiv“).`,
        { type: "success" },
      );
      setSelectedVorlage(null);
      vorlagenNeuLaden();
    } catch {
      notify("Formular konnte nicht ausgeblendet werden.", { type: "error" });
    }
  };

  useEffect(() => {
    if (!initialKategorie || vorlagenLoading || selectedVorlage) {
      return;
    }
    const treffer = (vorlagen ?? []).filter(
      (vorlage) => vorlage.Kategorie === initialKategorie,
    );
    const passende = initialVorlageName
      ? treffer.filter((vorlage) => vorlage.Name === initialVorlageName)
      : treffer;
    if (passende.length === 1) {
      setSelectedVorlage(passende[0]);
      setAnsicht("vorschau");
    } else if (initialVorlageName && treffer.length === 1) {
      setSelectedVorlage(treffer[0]);
      setAnsicht("vorschau");
    }
  }, [
    initialKategorie,
    initialVorlageName,
    vorlagenLoading,
    vorlagen,
    selectedVorlage,
  ]);

  const zusatzleistungIds: number[] = (brille.ZusatzleistungIDs ?? []).filter(
    (id: number | null | undefined) => id !== null && id !== undefined,
  );
  const { data: katalogLeistungen } = useGetMany(
    "zusatzleistung",
    { ids: zusatzleistungIds },
    { enabled: zusatzleistungIds.length > 0 },
  );
  // Preis je Auftrag (brille_hat_zusatzleistungen.Betrag) statt Katalogpreis
  const { data: zuordnungen } = useGetList(
    "brille_hat_zusatzleistungen",
    {
      filter: { BrillenID: brille.id },
      pagination: { page: 1, perPage: 100 },
      sort: { field: "id", order: "ASC" },
    },
    { enabled: brille.id != null && zusatzleistungIds.length > 0 },
  );
  const zusatzleistungen = useMemo(
    () =>
      (katalogLeistungen ?? []).map((leistung) => {
        const zuordnung = (zuordnungen ?? []).find(
          (z) => z.ZusatzleistungID === leistung.id,
        );
        return zuordnung?.Betrag != null
          ? { ...leistung, Betrag: zuordnung.Betrag }
          : leistung;
      }),
    [katalogLeistungen, zuordnungen],
  );

  const { data: kunde } = useGetOne(
    "kunde",
    { id: brille.kunde_id },
    { enabled: Boolean(brille.kunde_id) },
  );
  const { data: glasLinks } = useGetOne(
    "glass",
    { id: brille.GlasLinks },
    { enabled: Boolean(brille.GlasLinks) },
  );
  const { data: glasRechts } = useGetOne(
    "glass",
    { id: brille.GlasRechts },
    { enabled: Boolean(brille.GlasRechts) },
  );
  const { data: fassung } = useGetOne(
    "fassung",
    { id: brille.Fassung },
    { enabled: Boolean(brille.Fassung) },
  );
  const { data: glastyp } = useGetOne(
    "glastyp",
    { id: brille.Glastyp },
    { enabled: Boolean(brille.Glastyp) },
  );
  const { data: betrieb } = useGetOne("betrieb", { id: 1 });

  // Vorherige Brille desselben Kunden (bisherige Werte, Veränderung der
  // Sehstärke): der jüngste Auftrag vor diesem
  const { data: vorherigeBrillen } = useGetList(
    "brille",
    {
      pagination: { page: 1, perPage: 1 },
      sort: { field: brille.Datum ? "Datum" : "id", order: "DESC" },
      filter: {
        kunde_id: brille.kunde_id,
        ...(brille.Datum
          ? { "Datum@lt": brille.Datum }
          : { "id@lt": brille.id }),
      },
    },
    // ohne Auftrag (Anamnesebogen von der Kundenseite) gibt es keinen Vorgänger
    { enabled: Boolean(brille.kunde_id) && brille.id != null },
  );
  const vorherigeBrille = vorherigeBrillen?.[0];
  const { data: vorherigesGlasRechts } = useGetOne(
    "glass",
    { id: vorherigeBrille?.GlasRechts },
    { enabled: Boolean(vorherigeBrille?.GlasRechts) },
  );
  const { data: vorherigesGlasLinks } = useGetOne(
    "glass",
    { id: vorherigeBrille?.GlasLinks },
    { enabled: Boolean(vorherigeBrille?.GlasLinks) },
  );

  const mergeEntities: DocumentMergeEntities = useMemo(
    () => ({
      kunde,
      brille,
      glasLinks,
      glasRechts,
      fassung,
      glastyp,
      zusatzleistungen,
      vorherigeBrille,
      vorherigesGlasRechts,
      vorherigesGlasLinks,
    }),
    [
      kunde,
      brille,
      glasLinks,
      glasRechts,
      fassung,
      glastyp,
      zusatzleistungen,
      vorherigeBrille,
      vorherigesGlasRechts,
      vorherigesGlasLinks,
    ],
  );

  const mergeValues = useMemo(
    () => buildDocumentMergeValues(mergeEntities),
    [mergeEntities],
  );

  const renderedText = selectedVorlage
    ? renderDocumentTemplate(selectedVorlage.Vorlagentext ?? "", mergeValues)
    : "";

  // Kategorien mit eigenem, code-basiertem Layout (Rechnung #88,
  // Berechtigungsschein #90, Werkstattauftrag, Anträge, ...) statt des
  // generischen {{platzhalter}}-Fließtexts; der Vorlagentext dieser
  // Datensätze wird nicht gerendert.
  // Begründung (Anträge, Erprobungsprotokoll): frei eintippen oder per KI
  // vorschlagen lassen; gilt nur für die gerade gewählte Vorlage
  const kiFormular = selectedVorlage
    ? KI_FORMULARE[selectedVorlage.Kategorie]
    : undefined;
  // Formulare mit Begründungsfeld ohne KI-Vorschlag
  const mitBegruendung =
    Boolean(kiFormular) || selectedVorlage?.Kategorie === "Antrag Jugendamt";
  const [begruendung, setBegruendung] = useState("");
  const [kiLaeuft, setKiLaeuft] = useState(false);
  useEffect(() => {
    setBegruendung("");
  }, [selectedVorlage?.id]);
  const kiVorschlagHolen = async () => {
    if (!kiFormular) return;
    setKiLaeuft(true);
    try {
      setBegruendung(await begruendungVorschlagen(kiFormular, mergeEntities));
    } catch (error) {
      notify(error instanceof Error ? error.message : String(error), {
        type: "warning",
      });
    } finally {
      setKiLaeuft(false);
    }
  };

  const layoutDaten: LayoutDaten = useMemo(
    () => ({
      entities: mergeEntities,
      betrieb,
      rechnungsnummer: brille.Rechnungsnummer ?? "",
      begruendung,
    }),
    [mergeEntities, betrieb, brille.Rechnungsnummer, begruendung],
  );
  const layoutDef = selectedVorlage
    ? LAYOUTS[selectedVorlage.Kategorie]
    : undefined;
  const layout = layoutDef
    ? {
        title: layoutDef.title,
        preview: layoutDef.preview(layoutDaten),
        print: layoutDef.print(layoutDaten),
      }
    : null;

  // Ausfüllbare PDF-Vorlagen (Beobachtungsbogen, Antrag BAP): das PDF wird im
  // Browser vorausgefüllt und als Objekt-URL angezeigt bzw. geöffnet
  const pdfVorlage = selectedVorlage
    ? PDF_VORLAGEN[selectedVorlage.Kategorie]
    : undefined;
  const vorschauRef = useRef<HTMLIFrameElement>(null);
  // Angeklickte Kästchen überstehen das Neuladen der Vorschau (z. B. beim
  // Tippen der Begründung); null = noch nichts geändert, Vorschläge gelten
  const kaestchenStand = useRef<boolean[] | null>(null);
  useEffect(() => {
    kaestchenStand.current = null;
  }, [selectedVorlage?.id]);
  const vorschauGeladen = () => {
    const doc = vorschauRef.current?.contentDocument;
    if (!doc) return;
    const boxen = [
      ...doc.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'),
    ];
    const stand = kaestchenStand.current;
    if (stand && stand.length === boxen.length) {
      boxen.forEach((box, i) => (box.checked = stand[i]));
    }
    doc.addEventListener("change", () => {
      kaestchenStand.current = boxen.map((box) => box.checked);
    });
  };
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfFehler, setPdfFehler] = useState<string | null>(null);
  useEffect(() => {
    if (!pdfVorlage) {
      return;
    }
    let abgebrochen = false;
    let url: string | null = null;
    ladePdfVorlage(pdfVorlage)
      .then((bytes) => fuellePdfVorlage(pdfVorlage, bytes, mergeEntities))
      .then((pdf) => {
        if (abgebrochen) return;
        url = URL.createObjectURL(
          new Blob([pdf as BlobPart], { type: "application/pdf" }),
        );
        setPdfUrl(url);
        setPdfFehler(null);
      })
      .catch((error) => {
        console.error("PDF-Vorlage konnte nicht erstellt werden", error);
        if (!abgebrochen) {
          const grund = error instanceof Error ? error.message : String(error);
          setPdfFehler(`Das PDF konnte nicht erstellt werden: ${grund}`);
        }
      });
    return () => {
      abgebrochen = true;
      if (url) URL.revokeObjectURL(url);
      setPdfUrl(null);
    };
  }, [pdfVorlage, mergeEntities]);

  const auswahlVorlagen = useMemo(
    () =>
      (vorlagen ?? []).filter(
        (vorlage) =>
          !initialKategorie || vorlage.Kategorie === initialKategorie,
      ),
    [vorlagen, initialKategorie],
  );
  const typen = useMemo(
    () =>
      [...new Set(auswahlVorlagen.map((v) => v.Kategorie))].sort((x, y) =>
        x.localeCompare(y, "de"),
      ),
    [auswahlVorlagen],
  );
  const listenVorlagen = useMemo(
    () =>
      auswahlVorlagen
        .filter((v) => !typ || v.Kategorie === typ)
        .sort((x, y) => x.Name.localeCompare(y.Name, "de")),
    [auswahlVorlagen, typ],
  );
  const textAenderbar = Boolean(selectedVorlage) && !layout && !pdfVorlage;

  // HTML für Druck und PDF (bei Anträgen samt angeklickter Kästchen)
  const druckHtml = () => {
    const vorschau = vorschauRef.current?.contentDocument;
    return layoutDef?.ausVorschau && vorschau
      ? vorschauAlsHtml(vorschau)
      : (layout?.print ??
          buildPrintHtml(selectedVorlage?.Name ?? "", renderedText));
  };

  // Jedes Formular als PDF per E-Mail oder WhatsApp an den Kunden;
  // ausfüllbare PDF-Vorlagen gehen vorausgefüllt raus, alle anderen werden
  // aus dem Druck-HTML erzeugt
  const versendbar = Boolean(selectedVorlage);
  const [versendet, setVersendet] = useState<"email" | "whatsapp" | null>(null);
  const versenden = async (kanal: "email" | "whatsapp") => {
    if (!selectedVorlage) return;
    if (pdfVorlage && !pdfUrl) {
      notify(
        "Das PDF wird noch erstellt – bitte gleich noch einmal versuchen.",
        {
          type: "warning",
        },
      );
      return;
    }
    setVersendet(kanal);
    try {
      const beleg =
        selectedVorlage.Kategorie === RECHNUNG_KATEGORIE ||
        selectedVorlage.Kategorie === MAHNUNG_KATEGORIE;
      const nummer = beleg ? String(brille.Rechnungsnummer ?? "").trim() : "";
      const art =
        selectedVorlage.Kategorie === RECHNUNG_KATEGORIE
          ? "Rechnung"
          : selectedVorlage.Name;
      const dateiname = `${art}${nummer ? `-${nummer}` : ""}.pdf`.replace(
        /[^\w.\-äöüÄÖÜß]+/g,
        "-",
      );
      const datei =
        pdfVorlage && pdfUrl
          ? new File([await (await fetch(pdfUrl)).blob()], dateiname, {
              type: "application/pdf",
            })
          : await belegAlsPdf(druckHtml(), dateiname);
      const nachname = String(kunde?.Nachname ?? "").trim();
      const anrede = String(kunde?.Anrede ?? "").trim();
      const gruss =
        anrede === "Frau" && nachname
          ? `Sehr geehrte Frau ${nachname}`
          : anrede === "Herr" && nachname
            ? `Sehr geehrter Herr ${nachname}`
            : "Guten Tag";
      const firma = String(betrieb?.Firmenname ?? "").trim();
      const ergebnis = await belegVersenden(
        kanal,
        datei,
        {
          an:
            kanal === "email"
              ? String(kunde?.Email ?? "").trim()
              : choosePhoneNumberForMessaging([
                  kunde?.Handy,
                  kunde?.TelefonnummerPrivat,
                ]),
          betreff: `${art}${nummer ? ` ${nummer}` : ""}`,
          text: `${gruss},\n\nanbei erhalten Sie ${
            beleg
              ? `Ihre ${art}${nummer ? ` Nr. ${nummer}` : ""}`
              : `das Formular „${art}“`
          } als PDF.\n\nMit freundlichen Grüßen\n${firma}`,
        },
        (adresse) =>
          notify(
            `E-Mail-Adresse ${adresse} kopiert – in Outlook bei „An“ mit Strg+V einfügen.`,
            { type: "info", autoHideDuration: 15000 },
          ),
      );
      if (ergebnis !== "abgebrochen") kvMerken();
      if (ergebnis === "heruntergeladen") {
        notify(
          kanal === "email"
            ? `PDF „${datei.name}“ gespeichert und E-Mail geöffnet – bitte das PDF dort anhängen.`
            : `PDF „${datei.name}“ gespeichert und WhatsApp geöffnet – bitte das PDF dort anhängen.`,
          { type: "info" },
        );
      }
    } catch {
      notify("PDF konnte nicht erstellt werden.", { type: "error" });
    } finally {
      setVersendet(null);
    }
  };

  // Kostenvoranschlag/Antrag gedruckt oder verschickt: Datum am Auftrag
  // merken (nur Brillenaufträge; Fehler hier stören den Druck nicht)
  const refresh = useRefresh();
  const kvMerken = () => {
    if (
      !selectedVorlage ||
      !KV_KATEGORIEN.includes(selectedVorlage.Kategorie) ||
      typeof brille.id !== "number"
    )
      return;
    dataProvider
      .update("brille", {
        id: brille.id,
        data: { KVVersendet: heuteIso() },
        previousData: brille,
      })
      .then(() => refresh())
      .catch(() => undefined);
  };

  const handleAction = (
    autoPrint: boolean,
    successMessage: string,
    blockedMessage: string,
  ) => {
    if (!selectedVorlage) {
      return;
    }
    if (autoPrint) kvMerken();
    if (pdfVorlage) {
      // Druck und Speichern übernimmt der PDF-Viewer des Browsers
      const opened = pdfUrl ? window.open(pdfUrl, "_blank") : null;
      notify(
        !pdfUrl
          ? "Das PDF wird noch erstellt – bitte gleich noch einmal versuchen."
          : opened
            ? "PDF geöffnet – Drucken oder Speichern im PDF-Viewer."
            : blockedMessage,
        { type: opened ? "success" : "warning" },
      );
      return;
    }
    const opened = openDocumentWindow(druckHtml(), autoPrint);
    notify(opened ? successMessage : blockedMessage, {
      type: opened ? "success" : "warning",
    });
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {initialKategorie === WERKSTATTKARTE_KATEGORIE
          ? "Werkstattauftrag"
          : initialKategorie
            ? `${initialKategorie} erstellen`
            : "Formulare"}
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {ansicht === "liste" ? (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "minmax(0, 1fr) 230px" },
              gap: { xs: 2, sm: 3 },
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontStyle: "italic", mb: 0.5 }}>
                Name
              </Typography>
              <Box
                role="listbox"
                aria-label="Formulare"
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  height: { xs: 300, sm: 360 },
                  overflowY: "auto",
                  p: "2px",
                  bgcolor: "background.paper",
                }}
              >
                {vorlagenLoading && (
                  <Typography color="text.secondary" sx={{ p: 1 }}>
                    Lade Vorlagen…
                  </Typography>
                )}
                {!vorlagenLoading && listenVorlagen.length === 0 && (
                  <Typography color="text.secondary" sx={{ p: 1 }}>
                    Keine aktiven Dokumentvorlagen. Vorlagen können unter
                    „Dokumentvorlagen“ angelegt werden.
                  </Typography>
                )}
                {listenVorlagen.map((vorlage) => {
                  const gewaehlt = vorlage.id === selectedVorlage?.id;
                  return (
                    <Box
                      key={vorlage.id}
                      role="option"
                      aria-selected={gewaehlt}
                      tabIndex={0}
                      onClick={() => setSelectedVorlage(vorlage)}
                      onDoubleClick={() => {
                        setSelectedVorlage(vorlage);
                        setAnsicht("vorschau");
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          setSelectedVorlage(vorlage);
                          setAnsicht("vorschau");
                        }
                      }}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        px: 0.75,
                        py: "3px",
                        cursor: "pointer",
                        color: gewaehlt ? "#fff" : "text.primary",
                        bgcolor: gewaehlt ? "#0a63d6" : "transparent",
                        "&:hover": {
                          bgcolor: gewaehlt ? "#0a58bf" : "action.hover",
                        },
                        "&:focus-visible": {
                          outline: "1px dotted",
                          outlineColor: "text.primary",
                        },
                      }}
                    >
                      <InsertDriveFileOutlinedIcon sx={{ fontSize: 18 }} />
                      <Box
                        component="span"
                        sx={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {vorlage.Name}
                      </Box>
                    </Box>
                  );
                })}
              </Box>
              <Typography sx={{ fontStyle: "italic", mt: 2, mb: 0.5 }}>
                Typ
              </Typography>
              <TextField
                select
                size="small"
                fullWidth
                hiddenLabel
                value={typ}
                onChange={(event) => setTyp(event.target.value)}
                SelectProps={{ displayEmpty: true }}
              >
                <MenuItem value="">Alle Formulare</MenuItem>
                {typen.map((t) => (
                  <MenuItem key={t} value={t}>
                    {t}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 1.5,
                pt: { sm: 3.5 },
              }}
            >
              {[
                {
                  text: "Drucken",
                  onClick: () =>
                    handleAction(
                      true,
                      "Druckdialog geöffnet.",
                      "Dokument konnte nicht gedruckt werden (Pop-up blockiert?).",
                    ),
                  aus: !selectedVorlage,
                },
                { text: "Abbrechen", onClick: onClose, aus: false },
                {
                  text: "Seitenansicht",
                  onClick: () => setAnsicht("vorschau"),
                  aus: !selectedVorlage,
                },
                {
                  text: "PDF erstellen",
                  onClick: () =>
                    handleAction(
                      true,
                      "Druckdialog geöffnet – bitte „Als PDF speichern“ als Ziel wählen.",
                      "PDF konnte nicht erstellt werden (Pop-up blockiert?).",
                    ),
                  aus: !selectedVorlage,
                },
                {
                  text:
                    versendet === "email"
                      ? "PDF wird erstellt …"
                      : "Per E-Mail",
                  onClick: () => versenden("email"),
                  aus: !versendbar || versendet !== null,
                },
                {
                  text:
                    versendet === "whatsapp"
                      ? "PDF wird erstellt …"
                      : "Per WhatsApp",
                  onClick: () => versenden("whatsapp"),
                  aus: !versendbar || versendet !== null,
                },
              ].map((knopf) => (
                <Button
                  key={knopf.text}
                  variant="contained"
                  disableElevation
                  disabled={knopf.aus}
                  onClick={knopf.onClick}
                  sx={PRISMA_KNOPF}
                >
                  {knopf.text}
                </Button>
              ))}
              <Button
                variant="contained"
                disableElevation
                disabled={!textAenderbar}
                component={Link}
                to={`/dokumentvorlage/${selectedVorlage?.id ?? ""}`}
                target="_blank"
                sx={PRISMA_KNOPF}
              >
                Text ändern
              </Button>
              <Button
                variant="contained"
                disableElevation
                disabled={!selectedVorlage}
                onClick={() =>
                  letzteIhrerArt
                    ? notify(
                        `„${selectedVorlage?.Name}“ wird für den Knopf „${selectedVorlage?.Kategorie}“ gebraucht und kann nicht ausgeblendet werden.`,
                        { type: "warning" },
                      )
                    : setAusblendenFrage(true)
                }
                sx={PRISMA_KNOPF}
              >
                Ausblenden
              </Button>
              <Confirm
                isOpen={ausblendenFrage}
                title={`„${selectedVorlage?.Name ?? ""}“ ausblenden?`}
                content="Das Formular erscheint dann nicht mehr in dieser Liste. Es wird nicht gelöscht und lässt sich unter Einstellungen → Dokumentvorlagen („Aktiv“ anhaken) wieder einblenden."
                confirm="Ausblenden"
                cancel="Abbrechen"
                onConfirm={ausblenden}
                onClose={() => setAusblendenFrage(false)}
              />
            </Box>
          </Box>
        ) : !selectedVorlage ? null : (
          <>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => setAnsicht("liste")}
              sx={{ mb: 2 }}
            >
              Zurück zur Auswahl
            </Button>
            <Box
              sx={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 1,
                mb: 1,
              }}
            >
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {selectedVorlage.Name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedVorlage.Kategorie}
                </Typography>
              </Box>
              {!layout && !pdfVorlage && (
                <Button
                  size="small"
                  startIcon={<EditNoteIcon />}
                  component={Link}
                  to={`/dokumentvorlage/${selectedVorlage.id}`}
                  target="_blank"
                >
                  Text ändern
                </Button>
              )}
            </Box>
            {pdfVorlage ? (
              pdfUrl ? (
                <Box
                  component="iframe"
                  title={pdfVorlage.titel}
                  src={pdfUrl}
                  sx={{
                    width: "100%",
                    height: 480,
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 1,
                  }}
                />
              ) : pdfFehler ? (
                <Alert severity="error">{pdfFehler}</Alert>
              ) : (
                <Typography color="text.secondary">
                  PDF wird erstellt…
                </Typography>
              )
            ) : layout ? (
              <>
                {mitBegruendung && (
                  <Box sx={{ mb: 1.5 }}>
                    <TextField
                      label="Begründung (erscheint im Formular)"
                      value={begruendung}
                      onChange={(event) => setBegruendung(event.target.value)}
                      multiline
                      minRows={3}
                      fullWidth
                    />
                    {kiFormular && (
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1.5,
                          mt: 0.5,
                        }}
                      >
                        <Button
                          size="small"
                          startIcon={
                            kiLaeuft ? (
                              <CircularProgress size={14} />
                            ) : (
                              <AutoAwesomeIcon />
                            )
                          }
                          onClick={kiVorschlagHolen}
                          disabled={kiLaeuft}
                        >
                          Mit KI vorschlagen
                        </Button>
                        <Typography variant="caption" color="text.secondary">
                          Übertragen werden nur Alter, Brillenart, Messwerte,
                          Diagnose und Beruf – keine Namen, Adressen,
                          Geburtsdaten oder Versichertennummern. Text vor dem
                          Druck prüfen.
                        </Typography>
                      </Box>
                    )}
                  </Box>
                )}
                {layoutDef?.ausVorschau && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    component="p"
                    sx={{ mb: 0.5 }}
                  >
                    Kreuze sind Vorschläge aus den gespeicherten Daten –
                    Kästchen in der Vorschau anklicken, um sie vor dem Druck zu
                    ändern.
                  </Typography>
                )}
                <Box
                  component="iframe"
                  ref={vorschauRef}
                  onLoad={vorschauGeladen}
                  title={layout.title}
                  srcDoc={layout.preview}
                  sx={{
                    width: "100%",
                    height: 480,
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 1,
                  }}
                />
              </>
            ) : (
              <Box
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                  p: 2,
                  maxHeight: 420,
                  overflowY: "auto",
                  whiteSpace: "pre-wrap",
                  overflowWrap: "break-word",
                  fontFamily: "inherit",
                }}
              >
                {renderedText || "(Vorlage ist leer)"}
              </Box>
            )}
          </>
        )}
      </DialogContent>
      {ansicht === "vorschau" && (
        <DialogActions sx={{ flexWrap: "wrap", gap: 1 }}>
          {selectedVorlage && (
            <>
              <Button
                startIcon={<VisibilityIcon />}
                onClick={() =>
                  handleAction(
                    false,
                    "Seitenansicht geöffnet.",
                    "Seitenansicht konnte nicht geöffnet werden (Pop-up blockiert?).",
                  )
                }
              >
                Seitenansicht
              </Button>
              <Button
                startIcon={<PictureAsPdfIcon />}
                onClick={() =>
                  handleAction(
                    true,
                    "Druckdialog geöffnet – bitte „Als PDF speichern“ als Ziel wählen.",
                    "PDF konnte nicht erstellt werden (Pop-up blockiert?).",
                  )
                }
              >
                PDF erstellen
              </Button>
              <Button
                variant="contained"
                startIcon={<PrintIcon />}
                onClick={() =>
                  handleAction(
                    true,
                    "Druckdialog geöffnet.",
                    "Dokument konnte nicht gedruckt werden (Pop-up blockiert?).",
                  )
                }
              >
                Drucken
              </Button>
              {versendbar && (
                <>
                  <Button
                    startIcon={<EmailIcon />}
                    disabled={versendet !== null}
                    onClick={() => versenden("email")}
                  >
                    {versendet === "email"
                      ? "PDF wird erstellt …"
                      : "Per E-Mail"}
                  </Button>
                  <Button
                    startIcon={<WhatsAppIcon />}
                    disabled={versendet !== null}
                    onClick={() => versenden("whatsapp")}
                    sx={{ color: "#1da851" }}
                  >
                    {versendet === "whatsapp"
                      ? "PDF wird erstellt …"
                      : "Per WhatsApp"}
                  </Button>
                </>
              )}
            </>
          )}
          <Box sx={{ flex: 1 }} />
          <Button onClick={onClose}>Schließen</Button>
        </DialogActions>
      )}
    </Dialog>
  );
};

// Button für die Brillenkartei (BrilleShow/BrilleEdit), der den
// Formulare-Dialog für den aktuellen Auftrag öffnet.
export const FormulareButton = ({
  label = "Formulare",
  symbol,
}: { label?: string; symbol?: boolean } = {}) => {
  const record = useRecordContext();
  const [open, setOpen] = useState(false);

  if (!record) {
    return null;
  }

  return (
    <>
      <KnopfOderSymbol
        symbol={symbol}
        titel={label}
        icon={<DescriptionIcon />}
        onClick={() => setOpen(true)}
        variant="outlined"
      />
      {open && (
        <FormulareDialog brille={record} onClose={() => setOpen(false)} />
      )}
    </>
  );
};

// "Rechnung erstellen"-Button für die Brillenkartei (#56): vergibt bei Bedarf
// zuerst die fortlaufende Rechnungsnummer (RPC `assign_rechnungsnummer`,
// siehe Migration 20260831020000_rechnungsnummer_vergabe.sql) und öffnet
// anschließend den Formulare-Dialog, auf die Kategorie "Rechnung" gefiltert.
// Knopf mit Beschriftung oder - in der Symbolleiste der Karteikarte - nur
// als Symbol mit Tooltip
const KnopfOderSymbol = ({
  symbol,
  titel,
  icon,
  onClick,
  disabled,
  variant,
}: {
  symbol?: boolean;
  titel: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant: "contained" | "outlined";
}) =>
  symbol ? (
    <Tooltip title={titel} placement="left">
      <span>
        <IconButton
          onClick={onClick}
          disabled={disabled}
          aria-label={titel}
          sx={{ color: "inherit" }}
        >
          {icon}
        </IconButton>
      </span>
    </Tooltip>
  ) : (
    <Button
      variant={variant}
      startIcon={icon}
      onClick={onClick}
      disabled={disabled}
    >
      {titel}
    </Button>
  );

export const RechnungErstellenButton = ({
  symbol,
}: { symbol?: boolean } = {}) => {
  const record = useRecordContext();
  const notify = useNotify();
  const refresh = useRefresh();
  const [open, setOpen] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [rechnungsBrille, setRechnungsBrille] = useState<RaRecord | null>(null);

  if (!record) {
    return null;
  }

  const handleClick = async () => {
    if (record.Rechnungsnummer) {
      setRechnungsBrille(record);
      setOpen(true);
      return;
    }
    setAssigning(true);
    try {
      const { data, error } = await supabase.rpc("assign_rechnungsnummer", {
        p_brille_id: record.id,
      });
      if (error) {
        throw error;
      }
      setRechnungsBrille({ ...record, Rechnungsnummer: data as string });
      notify(`Rechnungsnummer ${data} vergeben.`, { type: "success" });
      refresh();
      setOpen(true);
    } catch {
      notify("Rechnungsnummer konnte nicht vergeben werden.", {
        type: "error",
      });
    } finally {
      setAssigning(false);
    }
  };

  return (
    <>
      <KnopfOderSymbol
        symbol={symbol}
        titel="Rechnung erstellen"
        icon={<ReceiptIcon />}
        onClick={handleClick}
        disabled={assigning}
        variant="contained"
      />
      {open && rechnungsBrille && (
        <FormulareDialog
          brille={rechnungsBrille}
          initialKategorie={RECHNUNG_KATEGORIE}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
};

// "Mahnung erstellen"-Button für die Brillenkartei und die
// Mahnungen-Übersicht (#57): zählt zuerst die Mahnstufe des Auftrags hoch
// (RPC `increment_mahnstufe`, siehe Migration 20260831030000_mahnungen.sql)
// und öffnet anschließend den Formulare-Dialog mit der zur neuen Mahnstufe
// passenden Vorlage aus der Kategorie "Mahnung".
export const MahnungErstellenButton = () => {
  const record = useRecordContext();
  const notify = useNotify();
  const refresh = useRefresh();
  const [open, setOpen] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [mahnungsBrille, setMahnungsBrille] = useState<RaRecord | null>(null);

  if (!record) {
    return null;
  }

  const handleClick = async () => {
    setAssigning(true);
    try {
      const { data, error } = await supabase.rpc("increment_mahnstufe", {
        p_brille_id: record.id,
      });
      if (error) {
        throw error;
      }
      setMahnungsBrille({ ...record, Mahnstufe: data as number });
      notify(`Mahnstufe ${data} vergeben.`, { type: "success" });
      refresh();
      setOpen(true);
    } catch {
      notify("Mahnstufe konnte nicht aktualisiert werden.", {
        type: "error",
      });
    } finally {
      setAssigning(false);
    }
  };

  return (
    <>
      <Button
        variant="contained"
        color="warning"
        startIcon={<WarningAmberIcon />}
        onClick={handleClick}
        disabled={assigning}
      >
        Mahnung erstellen
      </Button>
      {open && mahnungsBrille && (
        <FormulareDialog
          brille={mahnungsBrille}
          initialKategorie={MAHNUNG_KATEGORIE}
          initialVorlageName={
            MAHNUNG_VORLAGE_NACH_STUFE[Number(mahnungsBrille.Mahnstufe) || 1]
          }
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
};

// "Berechtigungsschein erstellen"-Button für die Brillenkartei (#90): öffnet
// den Formulare-Dialog direkt auf die Kategorie "Berechtigungsschein"
// gefiltert. Anders als bei Rechnung/Mahnung gibt es hier keine fortlaufende
// Nummer/Stufe zu vergeben, daher ohne vorgeschalteten RPC-Aufruf.
export const BerechtigungsscheinErstellenButton = () => {
  const record = useRecordContext();
  const [open, setOpen] = useState(false);

  if (!record) {
    return null;
  }

  return (
    <>
      <Button
        variant="outlined"
        startIcon={<FactCheckIcon />}
        onClick={() => setOpen(true)}
      >
        Berechtigungsschein erstellen
      </Button>
      {open && (
        <FormulareDialog
          brille={record}
          initialKategorie={BERECHTIGUNGSSCHEIN_KATEGORIE}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
};

// "Werkstattauftrag"-Button für die Brillenkartei: öffnet den Formulare-Dialog
// direkt mit dem Werkstattauftrag (Kategorie "Werkstattkarte") zum Drucken.
export const WerkstattauftragButton = ({
  symbol,
}: { symbol?: boolean } = {}) => {
  const record = useRecordContext();
  const [open, setOpen] = useState(false);

  if (!record) {
    return null;
  }

  return (
    <>
      <KnopfOderSymbol
        symbol={symbol}
        titel="Werkstattauftrag"
        icon={<BuildIcon />}
        onClick={() => setOpen(true)}
        variant="outlined"
      />
      {open && (
        <FormulareDialog
          brille={record}
          initialKategorie={WERKSTATTKARTE_KATEGORIE}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
};
