// Schwebende Glas-Toolbar (Glasfläche siehe MuiAppBar in theme.ts): Seitentitel,
// globale Kundensuche (⌘K / Strg+K), "Neu"-Menü, Lade-Anzeige und
// Hell/Dunkel-Umschalter.
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  AppBar,
  LoadingIndicator,
  TitlePortal,
  ToggleThemeButton,
} from "react-admin";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  IconButton,
  InputBase,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
} from "@mui/material";
import { tokensFor } from "./designTokens";
import { CalendarIcon, PlusIcon, SearchIcon, UserPlusIcon } from "./icons";

const isMac =
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad/.test(navigator.platform);

// Übergibt den Suchbegriff per Router-State statt als URL-Parameter, damit
// Kundennamen nicht in Adresszeile, Verlauf oder Server-Logs landen.
const GlobalSearch = () => {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    if (!q) return;
    navigate("/search", { state: { q, ts: Date.now() } });
    setValue("");
    inputRef.current?.blur();
  };

  return (
    <Box
      component="form"
      role="search"
      onSubmit={submit}
      sx={(theme) => ({
        display: { xs: "none", sm: "flex" },
        alignItems: "center",
        gap: 1,
        width: { sm: 220, md: 320 },
        height: 34,
        px: 1.25,
        mr: 1,
        borderRadius: "10px",
        backgroundColor: tokensFor(theme).hover,
        border: "1px solid transparent",
        transition: "border-color .15s ease, box-shadow .15s ease",
        "&:focus-within": {
          borderColor: tokensFor(theme).primary,
          boxShadow: `0 0 0 4px ${tokensFor(theme).primarySoft}`,
          backgroundColor: tokensFor(theme).surface,
        },
      })}
    >
      <SearchIcon
        sx={{ fontSize: 17, color: (theme) => tokensFor(theme).text3 }}
      />
      <InputBase
        inputRef={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Kunde oder Kundennummer"
        inputProps={{ "aria-label": "Kunde suchen" }}
        sx={{ flex: 1, fontSize: 14 }}
      />
      <Box
        component="kbd"
        aria-hidden="true"
        sx={(theme) => ({
          fontFamily: "inherit",
          fontSize: 11,
          fontWeight: 600,
          color: tokensFor(theme).text3,
          border: `1px solid ${tokensFor(theme).lineStrong}`,
          borderRadius: "6px",
          px: 0.75,
          lineHeight: "18px",
        })}
      >
        {isMac ? "⌘K" : "Strg K"}
      </Box>
    </Box>
  );
};

const NewMenu = () => {
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const open = Boolean(anchor);
  const go = (to: string) => () => {
    setAnchor(null);
    navigate(to);
  };

  return (
    <>
      <Button
        variant="contained"
        size="small"
        startIcon={<PlusIcon />}
        onClick={(e) => setAnchor(e.currentTarget)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? "neu-menu" : undefined}
        sx={{
          minHeight: 34,
          px: 1.75,
          display: { xs: "none", sm: "inline-flex" },
        }}
      >
        Neu
      </Button>
      <IconButton
        onClick={(e) => setAnchor(e.currentTarget)}
        aria-label="Neu anlegen"
        aria-haspopup="menu"
        aria-expanded={open}
        sx={{ display: { xs: "inline-flex", sm: "none" } }}
      >
        <PlusIcon />
      </IconButton>
      <Menu
        id="neu-menu"
        anchorEl={anchor}
        open={open}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { mt: 1, minWidth: 220 } } }}
      >
        <MenuItem onClick={go("/kunde/create")}>
          <ListItemIcon>
            <UserPlusIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Kunde" />
        </MenuItem>
        <MenuItem onClick={go("/termin/create")}>
          <ListItemIcon>
            <CalendarIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Termin" />
        </MenuItem>
      </Menu>
    </>
  );
};

const AppBarActions = () => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
    <NewMenu />
    <LoadingIndicator />
    <ToggleThemeButton />
  </Box>
);

export const MyAppBar = () => (
  <AppBar color="transparent" toolbar={<AppBarActions />}>
    <TitlePortal variant="h6" sx={{ fontSize: 17 }} />
    <GlobalSearch />
  </AppBar>
);
