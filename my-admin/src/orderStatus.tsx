import { Chip } from "@mui/material";
import { SxProps, Theme } from "@mui/material/styles";

export type OrderStatusKey = "offen" | "bereit" | "abgeholt";

export type OrderStatusColor = "warning" | "info" | "success";

export interface OrderStatus {
  key: OrderStatusKey;
  label: string;
  color: OrderStatusColor;
}

type BrilleStatusRecord = { Abholung?: string | null } | null | undefined;

const statusBorderColor: Record<OrderStatusKey, string> = {
  offen: "warning.main",
  bereit: "info.main",
  abgeholt: "success.main",
};

/*
 * The `brille` table has no dedicated order-status field yet (see issue #59),
 * so the status shown in lists/history is derived from the pickup date
 * (`Abholung`): no date set means the order is still being processed, a future
 * date means it's ready but not yet collected, a past date means it was picked
 * up. This is a placeholder that can be swapped for a real status field later
 * without touching call sites, since everything reads it through this module.
 */
export const getBrilleOrderStatus = (
  record: BrilleStatusRecord,
): OrderStatus => {
  const abholungRaw = record?.Abholung;

  if (!abholungRaw) {
    return { key: "offen", label: "In Bearbeitung", color: "warning" };
  }

  const abholungDate = new Date(abholungRaw);

  if (Number.isNaN(abholungDate.getTime())) {
    return { key: "offen", label: "In Bearbeitung", color: "warning" };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (abholungDate.getTime() > today.getTime()) {
    return { key: "bereit", label: "Bereit zur Abholung", color: "info" };
  }

  return { key: "abgeholt", label: "Abgeholt", color: "success" };
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
