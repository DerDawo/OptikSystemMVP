// Einheitliche Line-Icons (24er-Raster, 1,7 px Strich) für Navigation und
// Dashboard. Material Icons kennt z. B. keine Brille; ein eigenes, kleines
// Set hält den Strichstil überall gleich.
import { SvgIcon, type SvgIconProps } from "@mui/material";

const lineIcon = (d: string, displayName: string) => {
  const Icon = (props: SvgIconProps) => (
    <SvgIcon
      viewBox="0 0 24 24"
      {...props}
      sx={[
        {
          fill: "none",
          stroke: "currentColor",
          strokeWidth: 1.7,
          strokeLinecap: "round",
          strokeLinejoin: "round",
        },
        ...(Array.isArray(props.sx) ? props.sx : [props.sx]),
      ]}
    >
      <path d={d} />
    </SvgIcon>
  );
  Icon.displayName = displayName;
  return Icon;
};

export const DashboardIcon = lineIcon(
  "M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z",
  "DashboardIcon",
);
export const CalendarIcon = lineIcon(
  "M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM4 10h16M8 3v4M16 3v4",
  "CalendarIcon",
);
export const ListIcon = lineIcon(
  "M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01",
  "ListIcon",
);
export const UsersIcon = lineIcon(
  "M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M21 19v-1a4 4 0 0 0-3-3.87M15.5 3.13a3.5 3.5 0 0 1 0 6.75",
  "UsersIcon",
);
export const SearchIcon = lineIcon(
  "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4",
  "SearchIcon",
);
export const GlassesIcon = lineIcon(
  "M2 14a4 4 0 1 0 8 0 4 4 0 0 0-8 0M14 14a4 4 0 1 0 8 0 4 4 0 0 0-8 0M10 14c.6-.8 1.3-1 2-1s1.4.2 2 1M2.5 12 5 6h2M21.5 12 19 6h-2",
  "GlassesIcon",
);
export const EyeIcon = lineIcon(
  "M3 12c2.5-4 5.5-6 9-6s6.5 2 9 6c-2.5 4-5.5 6-9 6s-6.5-2-9-6zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6",
  "EyeIcon",
);
export const ReceiptIcon = lineIcon(
  "M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h4",
  "ReceiptIcon",
);
export const PrescriptionIcon = lineIcon(
  "M9 4h6v3H9zM7 5.5H6a1 1 0 0 0-1 1V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6.5a1 1 0 0 0-1-1h-1M9 14.5l2 2 4-4.5",
  "PrescriptionIcon",
);
export const AlertIcon = lineIcon(
  "M12 4 2.5 20h19zM12 10v4M12 17.5v.01",
  "AlertIcon",
);
export const LensIcon = lineIcon(
  "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
  "LensIcon",
);
export const LayersIcon = lineIcon(
  "M12 3 3 8l9 5 9-5zM3 13l9 5 9-5",
  "LayersIcon",
);
export const BookIcon = lineIcon(
  "M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h11",
  "BookIcon",
);
export const ImportIcon = lineIcon(
  "M12 3v12M7 10l5 5 5-5M4 17v3h16v-3",
  "ImportIcon",
);
export const FrameIcon = lineIcon(
  "M3 9h18M5 9v4a3 3 0 0 0 3 3h1a3 3 0 0 0 3-3 3 3 0 0 0 3 3h1a3 3 0 0 0 3-3V9",
  "FrameIcon",
);
export const TagIcon = lineIcon("M3 12V4h8l10 10-8 8zM7.5 8.5v.01", "TagIcon");
export const BuildingIcon = lineIcon(
  "M4 21V5l8-2v18M12 9h8v12M8 8v.01M8 12v.01M8 16v.01M16 13v.01M16 17v.01M2 21h20",
  "BuildingIcon",
);
export const DocumentIcon = lineIcon(
  "M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6",
  "DocumentIcon",
);
export const PlusIcon = lineIcon("M12 5v14M5 12h14", "PlusIcon");
export const ClockIcon = lineIcon(
  "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  "ClockIcon",
);
export const CheckIcon = lineIcon("M5 12.5l4.5 4.5L19 7", "CheckIcon");
export const EuroIcon = lineIcon(
  "M17 6.5A6.5 6.5 0 1 0 17 17.5M4 10.5h9M4 13.5h9",
  "EuroIcon",
);
export const UserPlusIcon = lineIcon(
  "M15 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M19 8v6M16 11h6",
  "UserPlusIcon",
);
export const ChevronDownIcon = lineIcon("M6 9l6 6 6-6", "ChevronDownIcon");
