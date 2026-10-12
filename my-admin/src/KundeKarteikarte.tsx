import { ReactNode, useState } from "react";
import {
  useDataProvider,
  useNotify,
  useRecordContext,
  useRefresh,
} from "react-admin";
import {
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Select,
  Tooltip,
} from "@mui/material";
import { Theme } from "@mui/material/styles";
import PhoneIcon from "@mui/icons-material/Phone";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import { Auswahl, Eingabe, Speichern } from "./KarteiEingabe";
import { HINWEISE } from "./KundeFelder";
import { kontaktAktionen } from "./kontaktLinks";
import { NachrichtHandy, NachrichtKanal } from "./NachrichtHandy";

/*
 * Kundenkartei im Aufbau der Prisma-Kundenmaske: links kursive Beschriftungen,
 * helle Felder zum direkten Anklicken und Tippen (gespeichert beim Verlassen
 * des Feldes), rechts daneben Knöpfe (SMS, eMail, Kasse). Ohne Werbung und
 * Werbeaktionen.
 */

type Datensatz = Record<string, unknown> & { id: number };

const ANREDEN = ["Frau", "Herr", "Dr.", "Prof.", "Prof. Dr."].map((a) => ({
  id: a,
  name: a,
}));

// Bevorzugter Kontaktweg (Spalte kunde."Kontaktweg")
const KONTAKTWEGE = ["Handy", "SMS", "WhatsApp", "eMail", "Telefon"].map(
  (k) => ({ id: k, name: k }),
);

const VERSICHERUNGSARTEN = [
  "Gesetzlich Krankenversichert",
  "Privat Krankenversichert",
  "Unbekannt",
].map((v) => ({ id: v, name: v }));

const feldFarbe = (theme: Theme) =>
  theme.palette.mode === "dark" ? "rgba(255,255,255,0.08)" : "#e8eef6";
const aktivesFeld = (theme: Theme) => ({
  boxShadow: `inset 0 0 0 2px ${theme.palette.primary.main}`,
});

const Beschriftung = ({
  children,
  rechts,
}: {
  children: ReactNode;
  rechts?: boolean;
}) => (
  <Box
    sx={{
      alignSelf: "center",
      fontStyle: "italic",
      fontSize: "0.85rem",
      color: "text.secondary",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textAlign: rechts ? "right" : "left",
      pr: rechts ? 1 : 0,
    }}
  >
    {children}
  </Box>
);

// Helles Feld; Kinder füllen es aus (Eingabe, Auswahl, Text)
const Feld = ({
  children,
  mehrzeilig,
  grau,
}: {
  children?: ReactNode;
  mehrzeilig?: boolean;
  grau?: boolean;
}) => (
  <Box
    sx={(theme) => ({
      bgcolor: grau
        ? theme.palette.mode === "dark"
          ? "rgba(255,255,255,0.12)"
          : "#e6e6e6"
        : feldFarbe(theme),
      minHeight: mehrzeilig ? 56 : 34,
      minWidth: 0,
      px: "6px",
      py: mehrzeilig ? "4px" : 0,
      display: "flex",
      alignItems: mehrzeilig ? "flex-start" : "center",
      fontSize: "1rem",
      borderRadius: "4px",
      whiteSpace: mehrzeilig ? "pre-wrap" : "nowrap",
      overflow: "hidden",
      "&:focus-within": aktivesFeld(theme),
    })}
  >
    {children}
  </Box>
);

// Dunkelblauer Knopf rechts neben den Feldern wie in Prisma
const PrismaKnopf = ({
  children,
  onClick,
  href,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
}) => (
  <Button
    variant="contained"
    disableElevation
    disabled={disabled}
    onClick={onClick}
    {...(href ? { component: "a", href } : {})}
    sx={{
      bgcolor: "#1d4e8f",
      "&:hover": { bgcolor: "#173f74", transform: "none" },
      color: "#fff",
      fontWeight: 700,
      borderRadius: "4px",
      minHeight: 34,
      py: 0,
      width: "100%",
    }}
  >
    {children}
  </Button>
);

// zwei oder mehr Felder in einer Zeile
const Teile = ({
  spalten,
  children,
}: {
  spalten: string;
  children: ReactNode;
}) => (
  <Box
    sx={{
      display: "grid",
      gridTemplateColumns: spalten,
      gap: "8px",
      alignItems: "center",
      minWidth: 0,
    }}
  >
    {children}
  </Box>
);

// Feld | Beschriftung + Feld in einer Zeile; reicht der Platz nicht, rutscht
// der rechte Teil geschlossen in die nächste Zeile, statt zu schrumpfen
const Umbruch = ({
  links,
  beschriftung,
  rechts,
}: {
  links: ReactNode;
  beschriftung: string;
  rechts: ReactNode;
}) => (
  <Box
    sx={{
      display: "flex",
      flexWrap: "wrap",
      gap: "6px 8px",
      alignItems: "center",
    }}
  >
    <Box sx={{ flex: "1 1 120px", minWidth: 120 }}>{links}</Box>
    <Box
      sx={{
        flex: "1 1 250px",
        display: "flex",
        gap: "8px",
        alignItems: "center",
      }}
    >
      <Beschriftung>{beschriftung}</Beschriftung>
      <Box sx={{ flex: 1, minWidth: 130 }}>{rechts}</Box>
    </Box>
  </Box>
);

export const KundeKarteikarte = () => {
  const kunde = useRecordContext<Datensatz>();
  const dataProvider = useDataProvider();
  const refresh = useRefresh();
  const notify = useNotify();
  const [nachricht, setNachricht] = useState<NachrichtKanal | null>(null);
  const [kasseOffen, setKasseOffen] = useState(false);

  if (!kunde) return null;

  const speichere =
    (feld: string): Speichern =>
    async (neu) => {
      await dataProvider.update("kunde", {
        id: kunde.id,
        data: { [feld]: neu },
        previousData: kunde,
      });
      refresh();
    };

  const text = (feld: string, name: string, extra: object = {}) => (
    <Feld>
      <Eingabe
        name={name}
        wert={kunde[feld]}
        speichere={speichere(feld)}
        {...extra}
      />
    </Feld>
  );
  const datum = (feld: string, name: string) =>
    text(feld, name, {
      typ: "datum",
      anzeige: kunde[feld]
        ? new Date(String(kunde[feld])).toLocaleDateString("de-DE")
        : "",
    });

  // Telefonfeld mit Anruf- (und bei Handy WhatsApp-)Symbol im Feld
  const telefon = (feld: string, name: string) => {
    const aktionen = kontaktAktionen(kunde[feld]);
    const anrufen = aktionen.find((a) => a.art === "anrufen");
    const whatsapp = aktionen.some((a) => a.art === "whatsapp");
    return (
      <Feld>
        <Eingabe name={name} wert={kunde[feld]} speichere={speichere(feld)} />
        {anrufen && (
          <Tooltip title="Anrufen">
            <IconButton
              size="small"
              component="a"
              href={anrufen.href}
              aria-label={`${name} anrufen`}
              sx={{ p: 0.4, color: "primary.main" }}
            >
              <PhoneIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        )}
        {whatsapp && (
          <Tooltip title="WhatsApp-Nachricht schreiben">
            <IconButton
              size="small"
              onClick={() => setNachricht("whatsapp")}
              aria-label="WhatsApp-Nachricht schreiben"
              sx={{ p: 0.4, color: "#25D366" }}
            >
              <WhatsAppIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        )}
      </Feld>
    );
  };

  const email = kontaktAktionen(kunde.Email).find((a) => a.art === "email");
  const handyNummer = String(kunde.Handy ?? "");
  const hinweise: string[] = Array.isArray(kunde.Hinweise)
    ? (kunde.Hinweise as string[])
    : [];
  const prismaAngaben = String(kunde.PrismaAngaben ?? "")
    .split(/\r?\n/)
    .map((z) => z.trim())
    .filter(Boolean);

  const zeile = (
    beschriftung: ReactNode,
    feld: ReactNode,
    knopf?: ReactNode,
    abstandOben?: boolean,
  ) => (
    <>
      <Box sx={{ mt: abstandOben ? 2 : 0, display: "contents" }} />
      <Box sx={{ alignSelf: "center", mt: abstandOben ? 2 : 0 }}>
        <Beschriftung>{beschriftung}</Beschriftung>
      </Box>
      <Box sx={{ minWidth: 0, mt: abstandOben ? 2 : 0 }}>{feld}</Box>
      <Box sx={{ mt: abstandOben ? 2 : 0 }}>{knopf}</Box>
    </>
  );

  return (
    <Card
      variant="outlined"
      sx={(theme) => ({
        p: { xs: 1.5, md: 2.5 },
        background:
          theme.palette.mode === "dark"
            ? undefined
            : "linear-gradient(180deg, #ffffff 0%, #f3f4f6 100%)",
      })}
    >
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "108px minmax(0, 1fr) 84px",
            md: "120px minmax(0, 1fr) 104px",
          },
          columnGap: "12px",
          rowGap: "6px",
        }}
      >
        {zeile(
          "Kunden-Nummer",
          <Umbruch
            links={text("KundenNummer", "Kunden-Nummer")}
            beschriftung="Aufnahmedatum"
            rechts={datum("Aufnahmedatum", "Aufnahmedatum")}
          />,
        )}
        {zeile(
          "Anrede",
          <Teile spalten="minmax(0, 0.6fr) minmax(0, 1fr)">
            <Feld>
              <Auswahl
                name="Anrede"
                wert={kunde.Anrede}
                optionen={ANREDEN}
                speichere={speichere("Anrede")}
              />
            </Feld>
            <span />
          </Teile>,
          undefined,
          true,
        )}
        {zeile("Vorname", text("Vorname", "Vorname"))}
        {zeile("Nachname", text("Nachname", "Nachname"))}
        {zeile(
          "Strasse",
          <Teile spalten="minmax(0, 1fr) minmax(70px, 90px)">
            {text("Straße", "Straße")}
            {text("Hausnummer", "Hausnummer")}
          </Teile>,
        )}
        {zeile(
          "PLZ/Ort",
          <Teile spalten="minmax(80px, 100px) minmax(0, 1fr)">
            {text("Postleitzahl", "Postleitzahl")}
            {text("Stadt", "Ort")}
          </Teile>,
        )}
        {zeile("Telefon", telefon("TelefonnummerPrivat", "Telefon"))}
        {zeile(
          "Telefon gesch.",
          telefon("TelefonnummerGeschaeftlich", "Telefon geschäftlich"),
        )}
        {zeile(
          "Handy",
          telefon("Handy", "Handy"),
          <PrismaKnopf
            disabled={
              !kontaktAktionen(kunde.Handy).some((a) => a.art === "sms")
            }
            onClick={() => setNachricht("sms")}
          >
            SMS
          </PrismaKnopf>,
        )}
        {zeile(
          "eMail",
          text("Email", "eMail"),
          <PrismaKnopf disabled={!email} href={email?.href}>
            eMail
          </PrismaKnopf>,
        )}
        {zeile(
          "Geburtsdatum",
          <Umbruch
            links={datum("Geburtsdatum", "Geburtsdatum")}
            beschriftung="bevorzugt"
            rechts={
              <Feld>
                <Auswahl
                  name="bevorzugter Kontaktweg"
                  wert={kunde.Kontaktweg}
                  optionen={KONTAKTWEGE}
                  speichere={speichere("Kontaktweg")}
                />
              </Feld>
            }
          />,
        )}

        {/* Versichertennummer und "Kasse" (Krankenkasse, Kassen-Nr., Status,
            Versicherungsart im Fenster) */}
        {zeile(
          "Versicherten-Nr.",
          <Feld grau>
            <Eingabe
              name="Versicherten-Nr."
              wert={kunde.VersichertenNummer}
              speichere={speichere("VersichertenNummer")}
            />
          </Feld>,
          <PrismaKnopf onClick={() => setKasseOffen(true)}>Kasse</PrismaKnopf>,
          true,
        )}

        {zeile("Beruf", text("Merkmal1", "Beruf"), undefined, true)}

        {/* Hinweise (Auswahl) und medizinische Notizen in einem Feld */}
        {zeile(
          "Med. Hinweise",
          <Feld mehrzeilig>
            <Box
              sx={{ width: "100%", display: "flex", flexDirection: "column" }}
            >
              <Select
                multiple
                variant="standard"
                disableUnderline
                displayEmpty
                fullWidth
                value={hinweise}
                onChange={async (e) => {
                  const neu = e.target.value as string[];
                  try {
                    await speichere("Hinweise")(neu as never);
                  } catch {
                    notify("Hinweise konnten nicht gespeichert werden.", {
                      type: "error",
                    });
                  }
                }}
                renderValue={(werte) =>
                  werte.length === 0 ? (
                    ""
                  ) : (
                    <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                      {werte.map((h) => (
                        <Chip
                          key={h}
                          label={h}
                          size="small"
                          color="warning"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  )
                }
                inputProps={{ "aria-label": "Hinweise" }}
                sx={{ "& .MuiSelect-select": { py: "3px" } }}
              >
                {[
                  ...HINWEISE,
                  ...hinweise.filter((h) => !HINWEISE.includes(h)),
                ].map((h) => (
                  <MenuItem key={h} value={h}>
                    {h}
                  </MenuItem>
                ))}
              </Select>
              <Eingabe
                name="Medizinische Notizen"
                wert={kunde.Notizen}
                speichere={speichere("Notizen")}
                mehrzeilig
              />
            </Box>
          </Feld>,
          undefined,
          true,
        )}
      </Box>

      {prismaAngaben.length > 0 && (
        <Box
          sx={{
            mt: 2,
            fontSize: "0.72rem",
            color: "text.secondary",
            overflowWrap: "anywhere",
          }}
        >
          <Box component="span" sx={{ fontStyle: "italic" }}>
            Angaben aus Prisma:{" "}
          </Box>
          {prismaAngaben.join(" · ")}
        </Box>
      )}

      {nachricht && (
        <NachrichtHandy
          offen
          onClose={() => setNachricht(null)}
          kanal={nachricht}
          nummer={handyNummer}
          kunde={kunde}
        />
      )}

      <Dialog
        open={kasseOffen}
        onClose={() => setKasseOffen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Krankenkasse</DialogTitle>
        <DialogContent>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "150px minmax(0, 1fr)",
              columnGap: "12px",
              rowGap: "8px",
              alignItems: "center",
            }}
          >
            <Beschriftung>Krankenkasse</Beschriftung>
            {text("Krankenkasse", "Krankenkasse")}
            <Beschriftung>Kassen-Nr.</Beschriftung>
            {text("KrankenkassenNummer", "Kassen-Nr.")}
            <Beschriftung>Versicherten-Nr.</Beschriftung>
            {text("VersichertenNummer", "Versicherten-Nr.")}
            <Beschriftung>Status</Beschriftung>
            {text("Versichertenstatus", "Status")}
            <Beschriftung>Versicherungsart</Beschriftung>
            <Feld>
              <Auswahl
                name="Versicherungsart"
                wert={kunde.KrankenversicherungsTyp}
                optionen={VERSICHERUNGSARTEN}
                speichere={speichere("KrankenversicherungsTyp")}
              />
            </Feld>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setKasseOffen(false)}>Schließen</Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};
