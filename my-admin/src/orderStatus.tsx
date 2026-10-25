import { Chip } from "@mui/material";
import { SxProps, Theme } from "@mui/material/styles";

export type OrderStatusKey = "offen" | "bereit" | "abgeholt";

export type OrderStatusColor = "warning" | "info" | "success";

export interface OrderStatus {
  key: OrderStatusKey;
  label: string;
  color: OrderStatusColor;
}

type BrilleStatusRecord =
  | { Abholung?: string | null; Fertig?: string | null }
  | null
  | undefined;

const statusBorderColor: Record<OrderStatusKey, string> = {
  offen: "warning.main",
  bereit: "info.main",
  abgeholt: "success.main",
};

// Kalendertag (lokal) als "YYYY-MM-DD" für Vergleiche ohne Uhrzeit
const tag = (wert: string | Date) => {
  const d = new Date(wert);
  if (Number.isNaN(d.getTime())) return null;
  const zwei = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${zwei(d.getMonth() + 1)}-${zwei(d.getDate())}`;
};

/*
 * Auftragsstatus aus den Datumsfeldern der Kartei: "Abholung" (Knopf
 * "Abgeholt", beim Prisma-Import das Abholdatum) bis heute = abgeholt;
 * "Fertig" gesetzt = bereit zur Abholung; sonst in Bearbeitung. Ein
 * Abholdatum in der Zukunft (früher als geplanter Abholtermin genutzt) gilt
 * ebenfalls als bereit. Kontaktlinsen haben kein "Fertig" und laufen nur über
 * "Abholung". Alle Listen lesen den Status über dieses Modul.
 */
export const getBrilleOrderStatus = (
  record: BrilleStatusRecord,
): OrderStatus => {
  const heute = tag(new Date());
  const abholung = record?.Abholung ? tag(record.Abholung) : null;

  if (abholung && heute && abholung <= heute) {
    return { key: "abgeholt", label: "Abgeholt", color: "success" };
  }
  if (abholung || (record?.Fertig && tag(record.Fertig))) {
    return { key: "bereit", label: "Bereit zur Abholung", color: "info" };
  }
  return { key: "offen", label: "In Bearbeitung", color: "warning" };
};

export const BrilleStatusChip = ({
  record,
}: {
  record?: BrilleStatusRecord;
}) => {
  const status = getBrilleOrderStatus(record);

  return (
    <Chip
      size="small"
      variant="outlined"
      color={status.color}
      label={status.label}
    />
  );
};

// Colors a datagrid row's left border according to its order status, for quick visual scanning.
export const brilleRowSx = (record: BrilleStatusRecord): SxProps<Theme> => ({
  borderLeft: "4px solid",
  borderLeftColor: statusBorderColor[getBrilleOrderStatus(record).key],
});
