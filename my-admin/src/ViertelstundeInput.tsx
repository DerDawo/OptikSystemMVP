import { useEffect, useRef } from "react";
import { useInput } from "react-admin";
import { useFormContext, useWatch } from "react-hook-form";
import { Box, MenuItem, TextField } from "@mui/material";
import {
  endeNachStart,
  setzeZusammen,
  zeitOptionen,
  zerlege,
} from "./viertelstunde";

/*
 * Datum + Uhrzeit für Termine: das Datum frei wählbar, die Uhrzeit nur im
 * Viertelstundentakt (07:00, 07:15, ... 20:00).
 */
export const ViertelstundeInput = ({
  source,
  label,
}: {
  source: string;
  label: string;
}) => {
  const { field, fieldState } = useInput({ source });
  const { datum, zeit } = zerlege(field.value);
  const setze = (neuesDatum: string, neueZeit: string) =>
    field.onChange(setzeZusammen(neuesDatum, neueZeit));

  return (
    <Box sx={{ display: "flex", gap: 1, minWidth: 0, flex: "1 1 280px" }}>
      <TextField
        type="date"
        label={label}
        value={datum}
        onChange={(ev) => setze(ev.target.value, zeit)}
        onBlur={field.onBlur}
        error={Boolean(fieldState.error)}
        slotProps={{ inputLabel: { shrink: true } }}
        sx={{ flex: "1 1 160px" }}
      />
      <TextField
        select
        label="Uhrzeit"
        value={zeit}
        disabled={!datum}
        onChange={(ev) => setze(datum, ev.target.value)}
        sx={{ width: 120, flex: "none" }}
        slotProps={{
          select: {
            MenuProps: { slotProps: { paper: { sx: { maxHeight: 320 } } } },
          },
        }}
      >
        {zeitOptionen(zeit).map((z) => (
          <MenuItem key={z} value={z}>
            {z}
          </MenuItem>
        ))}
      </TextField>
    </Box>
  );
};

// Wird der Beginn geändert und liegt das Ende nicht danach (oder fehlt),
// wird das Ende auf Beginn + 30 Minuten gesetzt.
export const EndeFolgtStart = () => {
  const { setValue, getValues } = useFormContext();
  const start = useWatch({ name: "Start" });
  const erster = useRef(true);
  useEffect(() => {
    if (erster.current) {
      erster.current = false;
      if (getValues("Ende")) return;
    }
    const neu = endeNachStart(start, getValues("Ende"));
    if (neu) setValue("Ende", neu, { shouldDirty: true });
  }, [start, getValues, setValue]);
  return null;
};
