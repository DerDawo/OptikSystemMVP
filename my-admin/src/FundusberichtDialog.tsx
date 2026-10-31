import { useEffect, useState } from "react";
import { useNotify } from "react-admin";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import dayjs from "dayjs";
import {
  AUGEN,
  BEREICHE,
  BILDQUALITAET,
  STATUS,
  erkenneAuge,
  erstelleFundusberichtPdf,
  fehlendeAngaben,
  leererAugenbefund,
  type Auge,
  type Augenbefund,
  type BereichId,
  type Bild,
  type Bildqualitaet,
  type FundusberichtDaten,
  type Status,
} from "./fundusbericht";
import { DOKUMENT_BUCKET, speicherPfad } from "./kundeDokumenteSpeicher";
import { RECHNUNG_ABSENDER } from "./rechnungTemplate";
import { supabase } from "./utils";

/*
 * Fundusbericht aus den Fundusaufnahmen der Kundenkartei: Aufnahmen je Auge
 * wählen (Vorauswahl aus dem Dateinamen), Befund eintragen, prüfen und
 * freigeben. Das PDF landet als "Befund" in den Dokumenten des Kunden.
 * Bewusst nur echte Aufnahmen und keine automatische Auswertung.
 */

export type FundusAufnahme = {
  id: number;
  Name: string;
  Pfad: string;
  Typ: string | null;
  Datum: string;
};

type Kunde = {
  Vorname?: string | null;
  Nachname?: string | null;
  Geburtsdatum?: string | null;
  KundenNummer?: string | number | null;
};

const PDF_TYPEN = ["image/jpeg", "image/png"];

export const FundusberichtDialog = ({
  offen,
  kundeId,
  kunde,
  aufnahmen,
  onSchliessen,
  onAbgelegt,
}: {
  offen: boolean;
  kundeId: number;
  kunde: Kunde;
  aufnahmen: FundusAufnahme[];
  onSchliessen: () => void;
  onAbgelegt: () => void;
}) => {
  const notify = useNotify();
  const [wahl, setWahl] = useState<Record<Auge, number | "">>({
    OS: "",
    OD: "",
  });
  const [befund, setBefund] = useState<Record<Auge, Augenbefund>>({
    OS: leererAugenbefund(),
    OD: leererAugenbefund(),
  });
  const [zeit, setZeit] = useState("");
  const [untersucher, setUntersucher] = useState("");
  const [methode, setMethode] = useState("");
  const [geraet, setGeraet] = useState("");
  const [seitenvergleich, setSeitenvergleich] = useState("");
  const [gesamt, setGesamt] = useState("");
  const [empfehlung, setEmpfehlung] = useState("");
  const [geprueft, setGeprueft] = useState(false);
  const [arbeitet, setArbeitet] = useState(false);

  useEffect(() => {
    if (!offen) return;
    // neueste zuerst; eine unklare Seite bleibt offen statt geraten
    const vorschlag = (auge: Auge) =>
      aufnahmen.find((a) => erkenneAuge(a.Name) === auge)?.id ?? "";
    setWahl({ OS: vorschlag("OS"), OD: vorschlag("OD") });
    setBefund({ OS: leererAugenbefund(), OD: leererAugenbefund() });
    setZeit(dayjs().format("YYYY-MM-DDTHH:mm"));
    setSeitenvergleich("");
    setGesamt("");
    setEmpfehlung("");
    setGeprueft(false);
  }, [offen, aufnahmen]);

  const augen = AUGEN.map((a) => a.id).filter((a) => wahl[a] !== "");
  const fehlt = fehlendeAngaben(augen, befund, untersucher, geprueft);

  const setzeQualitaet = (auge: Auge, qualitaet: Bildqualitaet) =>
    setBefund((alt) => ({ ...alt, [auge]: { ...alt[auge], qualitaet } }));

  const setzeBereich = (
    auge: Auge,
    id: BereichId,
    teil: { status?: Status; text?: string },
  ) =>
    setBefund((alt) => ({
      ...alt,
      [auge]: {
        ...alt[auge],
        bereiche: {
          ...alt[auge].bereiche,
          [id]: { ...alt[auge].bereiche[id], ...teil },
        },
      },
    }));

  const ladeBild = async (id: number | ""): Promise<Bild | undefined> => {
    const aufnahme = aufnahmen.find((a) => a.id === id);
    if (!aufnahme) return undefined;
    const { data, error } = await supabase.storage
      .from(DOKUMENT_BUCKET)
      .download(aufnahme.Pfad);
    if (error || !data) throw new Error(`${aufnahme.Name} nicht lesbar`);
    return {
      bytes: new Uint8Array(await data.arrayBuffer()),
      typ: aufnahme.Typ ?? data.type,
      name: aufnahme.Name,
    };
  };

  const pdfErstellen = async () => {
    const [OS, OD] = await Promise.all([ladeBild(wahl.OS), ladeBild(wahl.OD)]);
    const a = RECHNUNG_ABSENDER;
    const daten: FundusberichtDaten = {
      praxis: {
        firma: a.firma,
        marke: a.marke,
        adresse: `${a.strasseLang}, ${a.plz} ${a.ort}`,
      },
      patientennummer: String(kunde.KundenNummer ?? ""),
      patient: [kunde.Nachname, kunde.Vorname].filter(Boolean).join(", "),
      geburtsdatum: kunde.Geburtsdatum
        ? dayjs(kunde.Geburtsdatum).format("DD.MM.YYYY")
        : "",
      untersuchung: zeit ? dayjs(zeit).format("DD.MM.YYYY HH:mm") : "",
      untersucher,
      methode,
      geraet,
      bilder: { OS, OD },
      befund,
      seitenvergleich,
      gesamtbeurteilung: gesamt,
      empfehlung,
    };
    return erstelleFundusberichtPdf(daten);
  };

  const vorschau = async () => {
    const fenster = window.open("about:blank", "_blank");
    setArbeitet(true);
    try {
      const pdf = await pdfErstellen();
      const url = URL.createObjectURL(
        new Blob([pdf.slice()], { type: "application/pdf" }),
      );
      if (fenster) fenster.location.href = url;
    } catch (fehler) {
      fenster?.close();
      notify(`Vorschau nicht möglich: ${(fehler as Error).message}`, {
        type: "error",
      });
    }
    setArbeitet(false);
  };

  const freigeben = async () => {
    setArbeitet(true);
    try {
      const pdf = await pdfErstellen();
      const name = `Fundusbericht_${kunde.Nachname ?? "Kunde"}_${dayjs(zeit).format("YYYY-MM-DD")}.pdf`;
      const datei = new File([pdf.slice()], name, { type: "application/pdf" });
      const pfad = speicherPfad(kundeId, name);
      const { error: uploadFehler } = await supabase.storage
        .from(DOKUMENT_BUCKET)
        .upload(pfad, datei, { contentType: datei.type, upsert: false });
      if (uploadFehler) throw uploadFehler;
      const { data: dokument, error: zeileFehler } = await supabase
        .from("kunde_dokument")
        .insert({
          kunde_id: kundeId,
          Name: name,
          Art: "Befund",
          Datum: dayjs(zeit).format("YYYY-MM-DD"),
          Pfad: pfad,
          Typ: datei.type,
          Groesse: datei.size,
        })
        .select("id")
        .single();
      if (zeileFehler) {
        await supabase.storage.from(DOKUMENT_BUCKET).remove([pfad]);
        throw zeileFehler;
      }
      // Befund getrennt von Bildern und PDF, für Archiv und Verlauf
      const { error: befundFehler } = await supabase
        .from("fundusbericht")
        .insert({
          kunde_id: kundeId,
          Untersuchung: dayjs(zeit).toISOString(),
          Untersucher: untersucher.trim(),
          Methode: methode.trim() || null,
          Geraet: geraet.trim() || null,
          Bild_OS: wahl.OS || null,
          Bild_OD: wahl.OD || null,
          Bericht: dokument.id,
          Befund: befund,
          Seitenvergleich: seitenvergleich.trim() || null,
          Gesamtbeurteilung: gesamt.trim() || null,
          Empfehlung: empfehlung.trim() || null,
        });
      if (befundFehler) {
        // kein PDF ohne Archiveintrag zurücklassen
        await supabase.from("kunde_dokument").delete().eq("id", dokument.id);
        await supabase.storage.from(DOKUMENT_BUCKET).remove([pfad]);
        throw befundFehler;
      }
      notify("Fundusbericht freigegeben und abgelegt.", { type: "success" });
      onAbgelegt();
    } catch (fehler) {
      notify(
        `Bericht konnte nicht abgelegt werden: ${(fehler as Error).message}`,
        {
          type: "error",
        },
      );
    }
    setArbeitet(false);
  };

  return (
    <Dialog
      open={offen}
      onClose={() => !arbeitet && onSchliessen()}
      fullWidth
      maxWidth="md"
    >
      <DialogTitle>Fundusbericht erstellen</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
            <TextField
              type="datetime-local"
              size="small"
              label="Untersuchung"
              value={zeit}
              onChange={(e) => setZeit(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              size="small"
              required
              label="Untersucher"
              value={untersucher}
              onChange={(e) => setUntersucher(e.target.value)}
            />
            <TextField
              size="small"
              label="Methode"
              value={methode}
              onChange={(e) => setMethode(e.target.value)}
            />
            <TextField
              size="small"
              label="Gerät"
              value={geraet}
              onChange={(e) => setGeraet(e.target.value)}
            />
          </Box>

          {AUGEN.map(({ id: auge, name }) => (
            <Box
              key={auge}
              sx={{
                border: 1,
                borderColor: "divider",
                borderRadius: 2,
                p: 1.5,
              }}
            >
              <Typography sx={{ fontWeight: 700, mb: 1 }}>{name}</Typography>
              <Box
                sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mb: 1.5 }}
              >
                <TextField
                  select
                  size="small"
                  label="Aufnahme"
                  value={wahl[auge]}
                  onChange={(e) =>
                    setWahl((alt) => ({
                      ...alt,
                      [auge]:
                        e.target.value === "" ? "" : Number(e.target.value),
                    }))
                  }
                  sx={{ flex: "1 1 260px" }}
                >
                  <MenuItem value="">Keine Aufnahme</MenuItem>
                  {aufnahmen.map((a) => (
                    <MenuItem
                      key={a.id}
                      value={a.id}
                      disabled={!PDF_TYPEN.includes(a.Typ ?? "")}
                    >
                      {a.Name} ({dayjs(a.Datum).format("DD.MM.YYYY")})
                      {PDF_TYPEN.includes(a.Typ ?? "") ? "" : " – nur JPG/PNG"}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  size="small"
                  label="Bildqualität"
                  value={befund[auge].qualitaet}
                  disabled={wahl[auge] === ""}
                  onChange={(e) =>
                    setzeQualitaet(auge, e.target.value as Bildqualitaet)
                  }
                  sx={{ width: 180 }}
                >
                  {BILDQUALITAET.map((q) => (
                    <MenuItem key={q} value={q}>
                      {q}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
              {wahl[auge] !== "" &&
                BEREICHE.map(({ id, name: bereich, hilfe }) => (
                  <Box
                    key={id}
                    sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mb: 1 }}
                  >
                    <TextField
                      select
                      size="small"
                      required
                      label={bereich}
                      value={befund[auge].bereiche[id].status}
                      onChange={(e) =>
                        setzeBereich(auge, id, {
                          status: e.target.value as Status,
                        })
                      }
                      sx={{ width: 210 }}
                    >
                      {Object.entries(STATUS).map(([wert, { name: n }]) => (
                        <MenuItem key={wert} value={wert}>
                          {n}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      size="small"
                      multiline
                      label="Begründung"
                      placeholder={hilfe}
                      value={befund[auge].bereiche[id].text}
                      onChange={(e) =>
                        setzeBereich(auge, id, { text: e.target.value })
                      }
                      sx={{ flex: "1 1 280px" }}
                    />
                  </Box>
                ))}
            </Box>
          ))}

          {augen.length === 2 && (
            <TextField
              size="small"
              multiline
              minRows={2}
              label="Seitenvergleich"
              value={seitenvergleich}
              onChange={(e) => setSeitenvergleich(e.target.value)}
            />
          )}
          <TextField
            size="small"
            multiline
            minRows={2}
            label="Gesamtbeurteilung"
            value={gesamt}
            onChange={(e) => setGesamt(e.target.value)}
          />
          <TextField
            size="small"
            multiline
            minRows={2}
            label="Empfehlung zur weiteren Abklärung"
            value={empfehlung}
            onChange={(e) => setEmpfehlung(e.target.value)}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={geprueft}
                onChange={(e) => setGeprueft(e.target.checked)}
              />
            }
            label="Ich habe Aufnahmen und Befund geprüft und gebe den Bericht frei."
          />
          {fehlt.length > 0 && (
            <Alert severity="info">Noch offen: {fehlt.join(", ")}</Alert>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button disabled={arbeitet} onClick={onSchliessen}>
          Abbrechen
        </Button>
        <Button
          disabled={arbeitet || augen.length === 0}
          onClick={() => void vorschau()}
        >
          Vorschau
        </Button>
        <Button
          variant="contained"
          disabled={arbeitet || fehlt.length > 0}
          onClick={() => void freigeben()}
          startIcon={arbeitet ? <CircularProgress size={16} /> : undefined}
        >
          Freigeben und ablegen
        </Button>
      </DialogActions>
    </Dialog>
  );
};
