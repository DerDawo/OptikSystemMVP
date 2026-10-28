import { DragEvent, useCallback, useEffect, useRef, useState } from "react";
import { useNotify, useRecordContext } from "react-admin";
import {
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  MenuItem,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DownloadIcon from "@mui/icons-material/Download";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import dayjs from "dayjs";
import { supabase } from "./utils";
import {
  DOKUMENT_ARTEN,
  DOKUMENT_BUCKET,
  DokumentArt,
  bildVerkleinern,
  formatGroesse,
  pruefeDatei,
  schlageArtVor,
  speicherPfad,
} from "./kundeDokumenteSpeicher";

/*
 * Bereich "Dokumente" in der Kundenkartei: Befunde, Fundusaufnahmen, Rezepte,
 * Arztbriefe usw. als PDF oder Bild beim Kunden ablegen (Knopf oder Drag &
 * Drop), auflisten, öffnen, herunterladen und löschen. Die Dateien liegen in
 * einem privaten Bucket und werden nur über kurzlebige signierte Links
 * geöffnet (siehe Migration 20261025090000_create_kunde_dokument.sql).
 */

const LINK_GUELTIG_SEKUNDEN = 60;

type Dokument = {
  id: number;
  created_at: string;
  kunde_id: number;
  Name: string;
  Art: DokumentArt;
  Datum: string;
  Pfad: string;
  Typ: string | null;
  Groesse: number | null;
  hochgeladen_von: string | null;
};

type Entwurf = {
  key: string;
  datei: File;
  art: DokumentArt;
  datum: string;
};

const heute = () => dayjs().format("YYYY-MM-DD");

const DateiSymbol = ({ typ }: { typ: string | null }) =>
  typ === "application/pdf" ? (
    <PictureAsPdfIcon fontSize="small" sx={{ color: "#c0392b" }} />
  ) : (
    <ImageOutlinedIcon fontSize="small" sx={{ color: "#2c7fb8" }} />
  );

export const KundeDokumente = () => {
  const kunde = useRecordContext();
  const notify = useNotify();
  const kundeId = kunde?.id as number | undefined;
  const dateiWahl = useRef<HTMLInputElement>(null);
  const [liste, setListe] = useState<Dokument[] | null>(null);
  const [entwuerfe, setEntwuerfe] = useState<Entwurf[]>([]);
  const [laedtHoch, setLaedtHoch] = useState(false);
  const [ziehtDrueber, setZiehtDrueber] = useState(false);
  const [loeschen, setLoeschen] = useState<Dokument | null>(null);
  const [loescht, setLoescht] = useState(false);

  const laden = useCallback(async () => {
    if (kundeId == null) return;
    const { data, error } = await supabase
      .from("kunde_dokument")
      .select("*")
      .eq("kunde_id", kundeId)
      .order("Datum", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) {
      notify("Dokumente konnten nicht geladen werden.", { type: "error" });
      setListe([]);
      return;
    }
    setListe((data ?? []) as Dokument[]);
  }, [kundeId, notify]);

  useEffect(() => {
    setListe(null);
    void laden();
  }, [laden]);

  if (kundeId == null) return null;

  const dateienAnnehmen = (dateien: FileList | File[]) => {
    const neu: Entwurf[] = [];
    for (const datei of Array.from(dateien)) {
      const fehler = pruefeDatei(datei);
      if (fehler) {
        notify(fehler, { type: "warning" });
        continue;
      }
      neu.push({
        key: `${datei.name}-${datei.size}-${datei.lastModified}-${Math.random()}`,
        datei,
        art: schlageArtVor(datei.name),
        datum: heute(),
      });
    }
    if (neu.length > 0) setEntwuerfe((alt) => [...alt, ...neu]);
  };

  const ablegen = async () => {
    setLaedtHoch(true);
    let fehlgeschlagen = 0;
    for (const entwurf of entwuerfe) {
      let pfad: string | null = null;
      try {
        // Fotos verkleinern, PDFs bleiben unverändert
        const datei = await bildVerkleinern(entwurf.datei);
        pfad = speicherPfad(kundeId, datei.name);
        const { error: uploadFehler } = await supabase.storage
          .from(DOKUMENT_BUCKET)
          .upload(pfad, datei, { contentType: datei.type, upsert: false });
        if (uploadFehler) throw uploadFehler;
        const { error: zeileFehler } = await supabase
          .from("kunde_dokument")
          .insert({
            kunde_id: kundeId,
            Name: datei.name,
            Art: entwurf.art,
            Datum: entwurf.datum || heute(),
            Pfad: pfad,
            Typ: datei.type,
            Groesse: datei.size,
          });
        if (zeileFehler) {
          // keine Datei ohne Eintrag zurücklassen
          await supabase.storage.from(DOKUMENT_BUCKET).remove([pfad]);
          throw zeileFehler;
        }
      } catch {
        fehlgeschlagen += 1;
        notify(`${entwurf.datei.name} konnte nicht abgelegt werden.`, {
          type: "error",
        });
      }
    }
    setLaedtHoch(false);
    setEntwuerfe([]);
    const geschafft = entwuerfe.length - fehlgeschlagen;
    if (geschafft > 0) {
      notify(
        geschafft === 1
          ? "Dokument abgelegt."
          : `${geschafft} Dokumente abgelegt.`,
        { type: "success" },
      );
    }
    await laden();
  };

  // Öffnen im neuen Tab bzw. Herunterladen über einen signierten Link, der
  // nur kurz gültig ist. Das Fenster wird sofort geöffnet, damit der
  // Popup-Blocker (Safari) nach dem Warten auf den Link nicht zuschlägt.
  const oeffnen = async (dok: Dokument, herunterladen: boolean) => {
    const fenster = herunterladen ? null : window.open("about:blank", "_blank");
    const { data, error } = await supabase.storage
      .from(DOKUMENT_BUCKET)
      .createSignedUrl(
        dok.Pfad,
        LINK_GUELTIG_SEKUNDEN,
        herunterladen ? { download: dok.Name } : undefined,
      );
    if (error || !data?.signedUrl) {
      fenster?.close();
      notify("Dokument konnte nicht geöffnet werden.", { type: "error" });
      return;
    }
    if (herunterladen) {
      const a = document.createElement("a");
      a.href = data.signedUrl;
      a.download = dok.Name;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } else if (fenster) {
      fenster.location.href = data.signedUrl;
    } else {
      window.location.assign(data.signedUrl);
    }
  };

  const endgueltigLoeschen = async () => {
    if (!loeschen) return;
    setLoescht(true);
    // zuerst die Datei, dann der Eintrag: scheitert das Löschen der Datei,
    // bleibt der Eintrag sichtbar und der Vorgang lässt sich wiederholen
    const { error: dateiFehler } = await supabase.storage
      .from(DOKUMENT_BUCKET)
      .remove([loeschen.Pfad]);
    const { error: zeileFehler } = dateiFehler
      ? { error: dateiFehler }
      : await supabase.from("kunde_dokument").delete().eq("id", loeschen.id);
    setLoescht(false);
    if (dateiFehler || zeileFehler) {
      notify("Dokument konnte nicht gelöscht werden.", { type: "error" });
      return;
    }
    notify(`„${loeschen.Name}“ gelöscht.`, { type: "success" });
    setLoeschen(null);
    await laden();
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setZiehtDrueber(false);
    if (e.dataTransfer.files.length > 0) dateienAnnehmen(e.dataTransfer.files);
  };

  return (
    <Card
      variant="outlined"
      onDragOver={(e) => {
        e.preventDefault();
        setZiehtDrueber(true);
      }}
      onDragLeave={() => setZiehtDrueber(false)}
      onDrop={onDrop}
      sx={{
        p: 1.5,
        width: "100%",
        borderStyle: ziehtDrueber ? "dashed" : "solid",
        borderColor: ziehtDrueber ? "primary.main" : undefined,
        bgcolor: ziehtDrueber ? "action.hover" : undefined,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, flex: 1 }}>
          Dokumente
          {liste && liste.length > 0 ? ` (${liste.length})` : ""}
        </Typography>
        <Button
          size="small"
          variant="outlined"
          startIcon={<UploadFileIcon />}
          onClick={() => dateiWahl.current?.click()}
        >
          Datei hochladen
        </Button>
        <input
          ref={dateiWahl}
          type="file"
          hidden
          multiple
          accept="application/pdf,image/jpeg,image/png,image/webp"
          onChange={(e) => {
            if (e.target.files) dateienAnnehmen(e.target.files);
            e.target.value = "";
          }}
        />
      </Box>

      {liste === null ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
          <CircularProgress size={22} />
        </Box>
      ) : liste.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
          Noch keine Dokumente. PDFs oder Bilder (Befunde, Fundusaufnahmen,
          Rezepte …) hierher ziehen oder über „Datei hochladen“ ablegen.
        </Typography>
      ) : (
        <Box sx={{ overflowX: "auto" }}>
          <Box
            component="table"
            sx={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.9rem",
              "& th": {
                textAlign: "left",
                fontWeight: 600,
                color: "text.secondary",
                p: "4px 8px",
                borderBottom: "1px solid",
                borderColor: "divider",
                whiteSpace: "nowrap",
              },
              "& td": {
                p: "4px 8px",
                borderBottom: "1px solid",
                borderColor: "divider",
                verticalAlign: "middle",
              },
            }}
          >
            <thead>
              <tr>
                <th>Name</th>
                <th>Art</th>
                <th>Datum</th>
                <th>Hochgeladen von</th>
                <th aria-label="Aktionen" />
              </tr>
            </thead>
            <tbody>
              {liste.map((dok) => (
                <tr key={dok.id}>
                  <td>
                    <Box
                      component="button"
                      type="button"
                      onClick={() => void oeffnen(dok, false)}
                      sx={{
                        all: "unset",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 0.75,
                        color: "primary.main",
                        "&:hover": { textDecoration: "underline" },
                      }}
                    >
                      <DateiSymbol typ={dok.Typ} />
                      {dok.Name}
                    </Box>
                    {dok.Groesse != null && (
                      <Typography
                        component="span"
                        variant="caption"
                        color="text.secondary"
                        sx={{ ml: 1 }}
                      >
                        {formatGroesse(dok.Groesse)}
                      </Typography>
                    )}
                  </td>
                  <td>
                    <Chip size="small" label={dok.Art} />
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {dayjs(dok.Datum).format("DD.MM.YYYY")}
                  </td>
                  <td>{dok.hochgeladen_von}</td>
                  <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                    <Tooltip title="Herunterladen">
                      <IconButton
                        size="small"
                        aria-label={`${dok.Name} herunterladen`}
                        onClick={() => void oeffnen(dok, true)}
                      >
                        <DownloadIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Löschen">
                      <IconButton
                        size="small"
                        aria-label={`${dok.Name} löschen`}
                        onClick={() => setLoeschen(dok)}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </td>
                </tr>
              ))}
            </tbody>
          </Box>
        </Box>
      )}

      {/* Art und Datum wählen, bevor die Dateien abgelegt werden */}
      <Dialog
        open={entwuerfe.length > 0}
        onClose={() => !laedtHoch && setEntwuerfe([])}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {entwuerfe.length === 1
            ? "Dokument ablegen"
            : `${entwuerfe.length} Dokumente ablegen`}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {entwuerfe.map((entwurf) => (
              <Box
                key={entwurf.key}
                sx={{
                  display: "flex",
                  gap: 1,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <Typography
                  sx={{
                    flex: "1 1 160px",
                    minWidth: 0,
                    wordBreak: "break-all",
                  }}
                  variant="body2"
                >
                  {entwurf.datei.name}
                </Typography>
                <TextField
                  select
                  size="small"
                  label="Art"
                  value={entwurf.art}
                  disabled={laedtHoch}
                  onChange={(e) =>
                    setEntwuerfe((alt) =>
                      alt.map((x) =>
                        x.key === entwurf.key
                          ? { ...x, art: e.target.value as DokumentArt }
                          : x,
                      ),
                    )
                  }
                  sx={{ width: 160 }}
                >
                  {DOKUMENT_ARTEN.map((art) => (
                    <MenuItem key={art} value={art}>
                      {art}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  type="date"
                  size="small"
                  label="Datum"
                  value={entwurf.datum}
                  disabled={laedtHoch}
                  slotProps={{ inputLabel: { shrink: true } }}
                  onChange={(e) =>
                    setEntwuerfe((alt) =>
                      alt.map((x) =>
                        x.key === entwurf.key
                          ? { ...x, datum: e.target.value }
                          : x,
                      ),
                    )
                  }
                  sx={{ width: 160 }}
                />
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button disabled={laedtHoch} onClick={() => setEntwuerfe([])}>
            Abbrechen
          </Button>
          <Button
            variant="contained"
            disabled={laedtHoch}
            onClick={() => void ablegen()}
            startIcon={
              laedtHoch ? <CircularProgress size={16} /> : <UploadFileIcon />
            }
          >
            {laedtHoch ? "Wird abgelegt …" : "Ablegen"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={loeschen != null}
        onClose={() => !loescht && setLoeschen(null)}
      >
        <DialogTitle>Dokument löschen?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            „{loeschen?.Name}“ wird endgültig gelöscht und kann nicht
            wiederhergestellt werden.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button disabled={loescht} onClick={() => setLoeschen(null)}>
            Abbrechen
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={loescht}
            onClick={() => void endgueltigLoeschen()}
          >
            Löschen
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};
