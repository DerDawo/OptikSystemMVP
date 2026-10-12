// Seitenleiste im "Liquid Glass"-Design: Glasfläche (siehe RaMenu in
// theme.ts), Line-Icons, wenige Gruppen. Selten genutzte Stammdaten und
// Einstellungen sind einklappbar. "Neuer Kunde"/"Neuer Termin" sitzen nicht
// mehr in der Navigation, sondern im "Neu"-Menü der Toolbar (MyAppBar.tsx).
import { useEffect, useState, type ReactElement, type ReactNode } from "react";
import { Menu, useSidebarState } from "react-admin";
import { useLocation } from "react-router-dom";
import {
  Box,
  Collapse,
  Divider,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Typography,
} from "@mui/material";
import { tokensFor } from "./designTokens";
import {
  AlertIcon,
  BookIcon,
  BuildingIcon,
  CalendarIcon,
  ChevronDownIcon,
  DashboardIcon,
  DocumentIcon,
  FrameIcon,
  GlassesIcon,
  ImportIcon,
  LayersIcon,
  LensIcon,
  ListIcon,
  ReceiptIcon,
  SearchIcon,
  TagIcon,
  UsersIcon,
} from "./icons";
import unicornLogo from "./assets/unicorn-weiss.png";

const Brand = () => {
  const [open] = useSidebarState();
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.25,
        px: open ? 1 : 0.25,
        pt: 0.5,
        pb: 1.5,
      }}
    >
      <Box
        aria-hidden="true"
        sx={{
          flex: "none",
          width: 34,
          height: 34,
          borderRadius: "10px",
          bgcolor: "primary.main",
          color: "primary.contrastText",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25)",
        }}
      >
        <Box
          component="img"
          src={unicornLogo}
          alt=""
          sx={{ width: 26, height: 26, display: "block" }}
        />
      </Box>
      {open && (
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>
            UNICORN
          </Typography>
          <Typography
            sx={{ fontSize: 12, color: (theme) => tokensFor(theme).text3 }}
          >
            Optik Ulm Systems
          </Typography>
        </Box>
      )}
    </Box>
  );
};

const Section = ({ label }: { label: string }) => {
  const [open] = useSidebarState();
  if (!open) return <Divider sx={{ my: 1, mx: 1 }} />;
  return (
    <Typography
      component="div"
      sx={{
        px: 1.5,
        pt: 1.75,
        pb: 0.5,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: (theme) => tokensFor(theme).text3,
      }}
    >
      {label}
    </Typography>
  );
};

// Einklappbare Gruppe; klappt automatisch auf, wenn eine ihrer Seiten
// gerade geöffnet ist.
const SubMenu = ({
  label,
  icon,
  paths,
  children,
}: {
  label: string;
  icon: ReactElement;
  paths: string[];
  children: ReactNode;
}) => {
  const [sidebarOpen] = useSidebarState();
  const { pathname } = useLocation();
  const containsActive = paths.some((p) => pathname.startsWith(p));
  const [open, setOpen] = useState(containsActive);

  useEffect(() => {
    if (containsActive) setOpen(true);
  }, [containsActive]);

  return (
    <>
      <MenuItem
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        sx={(theme) => ({
          borderRadius: "11px",
          marginInline: 0,
          marginBlock: "1px",
          minHeight: 40,
          paddingLeft: "11px",
          color: tokensFor(theme).text2,
          "&:hover": {
            backgroundColor: tokensFor(theme).hover,
            color: tokensFor(theme).text,
          },
        })}
      >
        <ListItemIcon sx={{ minWidth: 34, color: "inherit" }}>
          {icon}
        </ListItemIcon>
        {sidebarOpen && (
          <>
            <ListItemText
              primary={label}
              slotProps={{ primary: { sx: { fontSize: 14 } } }}
            />
            <ChevronDownIcon
              sx={{
                fontSize: 16,
                transform: open ? "rotate(180deg)" : "none",
                transition: "transform .2s ease",
              }}
            />
          </>
        )}
      </MenuItem>
      <Collapse in={open} timeout="auto" unmountOnExit>
        <Box sx={{ pl: sidebarOpen ? 1.5 : 0 }}>{children}</Box>
      </Collapse>
    </>
  );
};

export const MyMenu = () => (
  <Menu>
    <Brand />
    <Menu.DashboardItem primaryText="Dashboard" leftIcon={<DashboardIcon />} />

    <Section label="Termine" />
    <Menu.Item
      to="/kalender"
      primaryText="Terminkalender"
      leftIcon={<CalendarIcon />}
    />

    <Section label="Kunden" />
    <Menu.Item to="/kunde" primaryText="Kunden" leftIcon={<UsersIcon />} />
    <Menu.Item
      to="/search"
      primaryText="Kundensuche"
      leftIcon={<SearchIcon />}
    />

    <Section label="Aufträge" />
    <Menu.Item to="/brille" primaryText="Brillen" leftIcon={<GlassesIcon />} />
    <Menu.Item
      to="/kontaktlinse"
      primaryText="Kontaktlinsen"
      leftIcon={<LensIcon />}
    />

    <Section label="Abrechnung" />
    <Menu.Item
      to="/rechnungen"
      primaryText="Rechnungen"
      leftIcon={<ReceiptIcon />}
    />
    <Menu.Item
      to="/mahnungen"
      primaryText="Mahnungen"
      leftIcon={<AlertIcon />}
    />

    <Section label="Verwaltung" />
    <SubMenu
      label="Stammdaten"
      icon={<LayersIcon />}
      paths={[
        "/glass",
        "/glastyp",
        "/brillenart",
        "/fassung",
        "/zusatzleistung",
        "/glaskatalog",
        "/glashersteller",
        "/krankenkasse",
      ]}
    >
      <Menu.Item to="/glass" primaryText="Gläser" leftIcon={<LensIcon />} />
      <Menu.Item
        to="/glastyp"
        primaryText="Glastypen"
        leftIcon={<LayersIcon />}
      />
      <Menu.Item
        to="/brillenart"
        primaryText="Brillenarten"
        leftIcon={<TagIcon />}
      />
      <Menu.Item
        to="/fassung"
        primaryText="Fassungen"
        leftIcon={<FrameIcon />}
      />
      <Menu.Item
        to="/zusatzleistung"
        primaryText="Zusatzleistungen"
        leftIcon={<ListIcon />}
      />
      <Menu.Item
        to="/glaskatalog"
        primaryText="Glaskatalog"
        leftIcon={<BookIcon />}
      />
      <Menu.Item
        to="/glaskatalog-import"
        primaryText="Katalog-Import (SF6)"
        leftIcon={<ImportIcon />}
      />
      <Menu.Item
        to="/krankenkasse"
        primaryText="Krankenkassen"
        leftIcon={<BuildingIcon />}
      />
    </SubMenu>
    <SubMenu
      label="Einstellungen"
      icon={<BuildingIcon />}
      paths={["/betrieb", "/dokumentvorlage"]}
    >
      <Menu.Item
        to="/betrieb/1"
        primaryText="Betriebsdaten"
        leftIcon={<BuildingIcon />}
      />
      <Menu.Item
        to="/dokumentvorlage"
        primaryText="Dokumentvorlagen"
        leftIcon={<DocumentIcon />}
      />
    </SubMenu>
  </Menu>
);
