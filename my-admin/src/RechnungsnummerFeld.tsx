import { useState } from "react";
import { Confirm, useNotify, useRefresh } from "react-admin";
import { Box, Button } from "@mui/material";
import { supabase } from "./utils";

/*
 * Rechnungsnummer in der Karteikarte: vorhanden -> anzeigen; leer -> Knopf
 * "vergeben", der nach Rückfrage die nächste fortlaufende Nummer vergibt
 * (gemeinsamer Zähler für Brillen und Kontaktlinsen). "Rechnung erstellen"
 * vergibt sie weiterhin ebenfalls automatisch.
 */
const RPC = {
  brille: { name: "assign_rechnungsnummer", parameter: "p_brille_id" },
  kontaktlinse: {
    name: "assign_rechnungsnummer_kontaktlinse",
    parameter: "p_kontaktlinse_id",
  },
} as const;

export const RechnungsnummerFeld = ({
  art,
  id,
  nummer,
}: {
  art: keyof typeof RPC;
  id: number;
  nummer: unknown;
}) => {
  const notify = useNotify();
  const refresh = useRefresh();
  const [frage, setFrage] = useState(false);
  const [laeuft, setLaeuft] = useState(false);
  const text = nummer == null ? "" : String(nummer).trim();
  if (text) return <>{text}</>;

  const vergeben = async () => {
    setFrage(false);
    setLaeuft(true);
    try {
      const { name, parameter } = RPC[art];
      const { data, error } = await supabase.rpc(name, { [parameter]: id });
      if (error) throw error;
      notify(`Rechnungsnummer ${data} vergeben.`, { type: "success" });
      refresh();
    } catch {
      notify("Rechnungsnummer konnte nicht vergeben werden.", {
        type: "error",
      });
    } finally {
      setLaeuft(false);
    }
  };

  return (
    <Box sx={{ display: "flex", justifyContent: "flex-end", width: "100%" }}>
      <Button
        size="small"
        disabled={laeuft}
        onClick={() => setFrage(true)}
        sx={{ py: 0, minHeight: 0, fontSize: "0.75rem", textTransform: "none" }}
      >
        vergeben
      </Button>
      <Confirm
        isOpen={frage}
        title="Rechnungsnummer vergeben?"
        content="Der Auftrag bekommt die nächste fortlaufende Rechnungsnummer. Eine vergebene Nummer bleibt beim Auftrag."
        confirm="Vergeben"
        cancel="Abbrechen"
        onConfirm={vergeben}
        onClose={() => setFrage(false)}
      />
    </Box>
  );
};
