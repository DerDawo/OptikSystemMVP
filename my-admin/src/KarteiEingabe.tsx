import {
  KeyboardEvent,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useDataProvider, useNotify } from "react-admin";
import {
  Autocomplete,
  Box,
  IconButton,
  InputBase,
  MenuItem,
  Select,
} from "@mui/material";
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
import {
  EingabeFehler,
  EingabeTyp,
  eingabeText,
  gleicherWert,
  leseEingabe,
} from "./karteikarteEingabe";
import {
  Komponente,
  speichereAuftrag,
  speichereKomponente,
} from "./karteikarteSpeichern";

/*
 * Direktes Bearbeiten in der Karteikarte wie in Prisma: Feld anklicken (oder
 * mit Tab hineinspringen), tippen, und beim Verlassen des Feldes (Enter, Tab,
 * Klick daneben) wird gespeichert. Esc verwirft die Eingabe. Notizen sind
 * mehrzeilig: Enter macht eine neue Zeile, gespeichert wird beim Verlassen
 * oder mit Strg+Enter.
 */

type Datensatz = Record<string, unknown> & { id: number };
type Wert = string | number | boolean | null;
export type Speichern = (neu: Wert) => Promise<unknown>;

const meldung = (fehler: unknown, name: string) =>
  fehler instanceof EingabeFehler
    ? fehler.message
    : `${name}: Änderung konnte nicht gespeichert werden.`;

export const Eingabe = ({
  wert,
  typ = "text",
  anzeige,
  speichere,
  name,
  vorschlaege,
  mehrzeilig,
  rechts,
}: {
  wert: unknown;
  typ?: EingabeTyp;
  // formatierte Anzeige außerhalb der Bearbeitung (z. B. "+2,25")
  anzeige?: ReactNode;
  speichere: Speichern;
  // Feldname für Bildschirmleser und Fehlermeldungen
  name: string;
  // Vorschläge zum Auswählen beim Tippen (freie Eingabe bleibt möglich)
  vorschlaege?: string[];
  mehrzeilig?: boolean;
  rechts?: boolean;
}) => {
  const notify = useNotify();
  // null = Feld wird gerade nicht bearbeitet
  const [text, setText] = useState<string | null>(null);
  // eingegebener Text, bis der gespeicherte Wert neu geladen ist
  const [vorlaeufig, setVorlaeufig] = useState<string | null>(null);
  const [speichert, setSpeichert] = useState(false);

  useEffect(() => setVorlaeufig(null), [wert]);

  // bei Vorschlägen: Liste zeigt alle Einträge, bis getippt wird
  const [getippt, setGetippt] = useState(false);
  // verhindert doppeltes Speichern (Auswahl aus der Liste + Verlassen)
  const beendet = useRef(false);

  const beginne = () => {
    if (text !== null || speichert) return;
    beendet.current = false;
    setGetippt(false);
    setText(eingabeText(wert, typ));
  };

  const beende = async (
    uebernehmen: boolean,
    weiterBeiFehler = false,
    eingabe: string | null = text,
  ) => {
    if (text === null || eingabe === null || beendet.current) return;
    if (!uebernehmen) {
      beendet.current = true;
      setText(null);
      return;
    }
    let neu: string | number | null;
    try {
      neu = leseEingabe(eingabe, typ);
    } catch (fehler) {
      notify(meldung(fehler, name), { type: "warning" });
      if (!weiterBeiFehler) {
        beendet.current = true;
        setText(null);
      }
      return;
    }
    beendet.current = true;
    setText(null);
    if (gleicherWert(wert, neu, typ)) return;
    setVorlaeufig(eingabe);
    setSpeichert(true);
    try {
      await speichere(neu);
    } catch (fehler) {
      setVorlaeufig(null);
      notify(meldung(fehler, name), { type: "error" });
    } finally {
      setSpeichert(false);
    }
  };

  const taste = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      beende(false);
    } else if (e.key === "Enter" && (!mehrzeilig || e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      beende(true, true);
    }
  };

  // füllt das ganze Feld aus (auch den Innenabstand), damit jeder Klick
  // ins Feld trifft
  const flaeche = {
    flex: 1,
    alignSelf: "stretch",
    minWidth: 0,
    mx: "-6px",
    px: "6px",
    my: mehrzeilig ? "-4px" : 0,
    py: mehrzeilig ? "4px" : 0,
  } as const;

  if (text !== null && vorschlaege) {
    return (
      <Autocomplete
        freeSolo
        openOnFocus
        disableClearable
        options={vorschlaege}
        inputValue={text}
        onInputChange={(_, v, grund) => {
          if (grund === "input") setGetippt(true);
          if (grund !== "reset") setText(v);
        }}
        onChange={(_, v) => {
          if (typeof v === "string") beende(true, false, v);
        }}
        filterOptions={(optionen) =>
          getippt
            ? optionen.filter((o) =>
                o.toLowerCase().includes(text.trim().toLowerCase()),
              )
            : optionen
        }
        sx={{ ...flaeche, display: "flex", alignItems: "center" }}
        // lange Einträge (z. B. Krankenkassen) auch bei schmalem Feld lesbar
        slotProps={{ popper: { sx: { minWidth: 280 } } }}
        renderInput={(params) => (
          <InputBase
            ref={params.InputProps.ref}
            inputProps={{
              ...params.inputProps,
              "aria-label": name,
              autoComplete: "off",
            }}
            autoFocus
            onBlur={() => beende(true)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                beende(false);
              }
            }}
            sx={{
              flex: 1,
              font: "inherit",
              color: "inherit",
              "& input": { p: 0, height: "auto" },
            }}
          />
        )}
      />
    );
  }

  if (text !== null) {
    return (
      <>
        <InputBase
          autoFocus
          value={text}
          multiline={mehrzeilig}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => beende(true)}
          onKeyDown={taste}
          onFocus={(e) => {
            if (!mehrzeilig) e.target.select();
          }}
          inputProps={{
            "aria-label": name,
            autoComplete: "off",
            style: { textAlign: rechts ? "right" : "left" },
          }}
          sx={{
            ...flaeche,
            font: "inherit",
            color: "inherit",
            alignItems: mehrzeilig ? "flex-start" : "center",
            "& input, & textarea": { p: 0, height: "auto" },
          }}
        />
      </>
    );
  }

  return (
    <Box
      tabIndex={0}
      role="textbox"
      aria-label={name}
      onFocus={beginne}
      onClick={beginne}
      sx={{
        ...flaeche,
        display: "flex",
        alignItems: mehrzeilig ? "flex-start" : "center",
        justifyContent: rechts ? "flex-end" : "flex-start",
        cursor: "text",
        outline: "none",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "inherit",
        opacity: speichert ? 0.55 : 1,
        "&:hover": { bgcolor: "action.hover" },
      }}
    >
      {vorlaeufig ?? anzeige ?? eingabeText(wert, typ)}
    </Box>
  );
};

// Kästchen (z. B. "Liefern"), Klick schaltet um und speichert
export const Haken = ({
  an,
  speichere,
  name,
}: {
  an: boolean;
  speichere: Speichern;
  name: string;
}) => {
  const notify = useNotify();
  const [vorlaeufig, setVorlaeufig] = useState<boolean | null>(null);
  useEffect(() => setVorlaeufig(null), [an]);
  const zeigt = vorlaeufig ?? an;
  return (
    <IconButton
      size="small"
      aria-label={name}
      aria-pressed={zeigt}
      sx={{ p: 0.25 }}
      onClick={async () => {
        setVorlaeufig(!zeigt);
        try {
          await speichere(!zeigt);
        } catch (fehler) {
          setVorlaeufig(null);
          notify(meldung(fehler, name), { type: "error" });
        }
      }}
    >
      {zeigt ? (
        <CheckBoxIcon fontSize="small" />
      ) : (
        <CheckBoxOutlineBlankIcon
          fontSize="small"
          sx={{ color: "text.disabled" }}
        />
      )}
    </IconButton>
  );
};

// Feste Auswahl (z. B. Zahlungsstatus offen/bezahlt). `rechts`: schmales
// Wertefeld (z. B. Vis) - rechtsbündig, ohne Pfeil, leer statt "–".
export const Auswahl = ({
  wert,
  optionen,
  speichere,
  name,
  rechts,
}: {
  wert: unknown;
  optionen: { id: string; name: string }[];
  speichere: Speichern;
  name: string;
  rechts?: boolean;
}) => {
  const notify = useNotify();
  const [vorlaeufig, setVorlaeufig] = useState<string | null>(null);
  useEffect(() => setVorlaeufig(null), [wert]);
  const aktuell = vorlaeufig ?? (wert == null ? "" : String(wert));
  const liste =
    aktuell && !optionen.some((o) => o.id === aktuell)
      ? [...optionen, { id: aktuell, name: aktuell }]
      : optionen;
  return (
    <Select
      variant="standard"
      disableUnderline
      displayEmpty
      fullWidth
      value={aktuell}
      onChange={async (e) => {
        const neu = String(e.target.value);
        setVorlaeufig(neu);
        try {
          await speichere(neu === "" ? null : neu);
        } catch (fehler) {
          setVorlaeufig(null);
          notify(meldung(fehler, name), { type: "error" });
        }
      }}
      inputProps={{ "aria-label": name }}
      IconComponent={rechts ? () => null : undefined}
      renderValue={
        rechts ? (v) => liste.find((o) => o.id === v)?.name ?? "" : undefined
      }
      sx={{
        mx: "-6px",
        px: "6px",
        alignSelf: "stretch",
        font: "inherit",
        "& .MuiSelect-select": {
          py: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: rechts ? "flex-end" : "flex-start",
          height: "100%",
          ...(rechts ? { pr: "0 !important" } : {}),
        },
      }}
    >
      <MenuItem value="">
        <em>–</em>
      </MenuItem>
      {liste.map((o) => (
        <MenuItem key={o.id} value={o.id}>
          {o.name}
        </MenuItem>
      ))}
    </Select>
  );
};

/*
 * Speichert Eingaben eines Auftrags nacheinander (eine Änderung wartet auf
 * die vorige), damit schnelles Weitertippen mit Tab keinen Datensatz doppelt
 * anlegt. Neu angelegte bzw. kopierte Glas-/Glastyp-/Fassungsdatensätze
 * werden gemerkt, bis der Auftrag neu geladen ist.
 */
export const useKarteiSpeichern = (
  brille: Datensatz | undefined,
  nachher: () => void,
  beiNeuerVerknuepfung?: (verweis: string, id: number) => void,
) => {
  const dataProvider = useDataProvider();
  const verknuepft = useRef<Record<string, number>>({});
  const warteschlange = useRef<Promise<unknown>>(Promise.resolve());
  const brilleId = brille?.id;

  useEffect(() => {
    verknuepft.current = {};
  }, [brilleId]);

  const einreihen = useCallback(
    (aufgabe: () => Promise<unknown>) => {
      const lauf = warteschlange.current.catch(() => undefined).then(aufgabe);
      warteschlange.current = lauf;
      return lauf.then(() => nachher());
    },
    [nachher],
  );

  const aktuellerAuftrag = () => {
    if (!brille?.id)
      throw new EingabeFehler("Auftrag ist noch nicht gespeichert.");
    return { ...brille, ...verknuepft.current } as Datensatz;
  };

  // `daten` bestimmt bei Bedarf mehrere Felder aus der Eingabe (z. B.
  // Rabatt: Bezeichnung und Prozentsatz)
  const auftrag =
    (
      feld: string,
      daten: (neu: Wert) => Record<string, unknown> = (neu) => ({
        [feld]: neu,
      }),
    ): Speichern =>
    (neu) =>
      einreihen(() =>
        speichereAuftrag(dataProvider, aktuellerAuftrag(), daten(neu)),
      );

  const komponente =
    (
      art: Komponente,
      verweis: string,
      geladen: Datensatz | undefined,
      neu?: Record<string, unknown>,
    ) =>
    (feld: string): Speichern =>
    (wert) =>
      einreihen(async () => {
        const aktuell = aktuellerAuftrag();
        const id = aktuell[verweis] as number | null | undefined;
        const datensatz =
          id == null
            ? undefined
            : geladen?.id === id
              ? geladen
              : verknuepft.current[verweis] === id
                ? { id }
                : undefined;
        if (id != null && !datensatz)
          throw new EingabeFehler(
            "Die Angaben werden noch geladen – bitte gleich noch einmal versuchen.",
          );
        const neueId = await speichereKomponente(dataProvider, {
          brille: aktuell,
          komponente: art,
          verweis,
          datensatz,
          data: { [feld]: wert },
          neu,
        });
        if (neueId !== id) {
          verknuepft.current[verweis] = neueId;
          beiNeuerVerknuepfung?.(verweis, neueId);
        }
      });

  return { auftrag, komponente };
};
