import { Menu } from "react-admin";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUser,
  faGlasses,
  faListCheck,
  faEye,
  faLayerGroup,
  faLinesLeaning,
  faUserPlus,
  faHandPointUp,
  faReceipt,
  faMagnifyingGlass,
  faCircleDot,
  faTags,
  faIndustry,
  faFileImport,
  faCalendarDays,
  faCalendarPlus,
  faFileLines,
  faBuilding,
  faGaugeHigh,
} from "@fortawesome/free-solid-svg-icons";
import { Divider, Typography } from "@mui/material";

export const MyMenu = () => (
  <Menu>
    <Menu.Item
      to="/"
      primaryText="Dashboard"
      leftIcon={<FontAwesomeIcon icon={faGaugeHigh} />}
    />
    <Divider />
    <Typography sx={{ padding: "0.5em 1em", color: "text.secondary" }}>
      Kunden &amp; Termine
    </Typography>
    <Menu.Item
      to="/kunde/create"
      primaryText="neuen Kunden anlegen"
      leftIcon={<FontAwesomeIcon icon={faUserPlus} />}
    />
    <Menu.Item
      to="/search"
      primaryText="Suche"
      leftIcon={<FontAwesomeIcon icon={faMagnifyingGlass} />}
    />
    <Menu.Item
      to="/kalender"
      primaryText="Terminkalender"
      leftIcon={<FontAwesomeIcon icon={faCalendarDays} />}
    />
    <Menu.Item
      to="/termin/create"
      primaryText="neuen Termin anlegen"
      leftIcon={<FontAwesomeIcon icon={faCalendarPlus} />}
    />
    <Menu.Item
      to="/termin"
      primaryText="Termine (Liste)"
      leftIcon={<FontAwesomeIcon icon={faCalendarDays} />}
    />
    <Menu.Item
      to="/kunde"
      primaryText="Kunden"
      leftIcon={<FontAwesomeIcon icon={faUser} />}
    />
    <Divider />
    <Typography sx={{ padding: "0.5em 1em", color: "text.secondary" }}>
      Aufträge &amp; Abrechnung
    </Typography>
    <Menu.Item
      to="/brille"
      primaryText="Brillen"
      leftIcon={<FontAwesomeIcon icon={faGlasses} />}
    />
    <Menu.Item
      to="/kontaktlinse"
      primaryText="Kontaktlinsen"
      leftIcon={<FontAwesomeIcon icon={faCircleDot} />}
    />
    <Menu.Item
      to="/rechnungen"
      primaryText="Rechnungen"
      leftIcon={<FontAwesomeIcon icon={faReceipt} />}
    />
    <Menu.Item
      to="/mahnungen"
      primaryText="Mahnungen"
      leftIcon={<FontAwesomeIcon icon={faHandPointUp} />}
    />
    <Divider />
    <Typography sx={{ padding: "0.5em 1em", color: "text.secondary" }}>
      Stammdaten &amp; Katalog
    </Typography>
    <Menu.Item
      to="/glass"
      primaryText="Gläser"
      leftIcon={<FontAwesomeIcon icon={faEye} />}
    />
    <Menu.Item
      to="/glastyp"
      primaryText="Glastypen"
      leftIcon={<FontAwesomeIcon icon={faLayerGroup} />}
    />
    <Menu.Item
      to="/brillenart"
      primaryText="Brillenarten"
      leftIcon={<FontAwesomeIcon icon={faTags} />}
    />
    <Menu.Item
      to="/glaskatalog"
      primaryText="Glaskatalog (Hersteller)"
      leftIcon={<FontAwesomeIcon icon={faIndustry} />}
    />
    <Menu.Item
      to="/glaskatalog-import"
      primaryText="Glaskatalog-Import (SF6)"
      leftIcon={<FontAwesomeIcon icon={faFileImport} />}
    />
    <Menu.Item
      to="/fassung"
      primaryText="Fassungen"
      leftIcon={<FontAwesomeIcon icon={faLinesLeaning} />}
    />
    <Menu.Item
      to="/zusatzleistung"
      primaryText="Zusatzleistungen"
      leftIcon={<FontAwesomeIcon icon={faListCheck} />}
    />
    <Menu.Item
      to="/betrieb/1"
      primaryText="Betriebsdaten"
      leftIcon={<FontAwesomeIcon icon={faBuilding} />}
    />
    <Divider />
    <Typography sx={{ padding: "0.5em 1em", color: "text.secondary" }}>
      Vorlagen
    </Typography>
    <Menu.Item
      to="/dokumentvorlage"
      primaryText="Dokumentvorlagen"
      leftIcon={<FontAwesomeIcon icon={faFileLines} />}
    />
  </Menu>
);
