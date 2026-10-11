import { Card, Tabs, Tab, Box } from "@mui/material";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

import ExpertSearch from "./ExpertSearch";
import CustomerSearch from "./CustomerSearch";
import LastCustomersSearched from "./LastCustomersSearched";
import { glassSurface, tokensFor } from "./designTokens";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    "aria-controls": `simple-tabpanel-${index}`,
  };
}

const Search = () => {
  const [value, setValue] = useState(0);
  const location = useLocation();

  // Eine globale Suche aus der Toolbar landet immer im Reiter "Kunden suchen"
  useEffect(() => {
    if ((location.state as { q?: string } | null)?.q) setValue(0);
  }, [location.state]);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <Box sx={{ p: { xs: 1, md: 2 } }}>
      <Tabs
        value={value}
        onChange={handleChange}
        variant="scrollable"
        scrollButtons={false}
        sx={(theme) => {
          const t = tokensFor(theme);
          // Segment-Steuerung auf Glas, ausgewähltes Segment als feste Fläche
          return {
            ...glassSurface(t),
            boxShadow: `inset 0 1px 0 ${t.glassHighlight}, ${t.shadow}`,
            width: "fit-content",
            maxWidth: "100%",
            minHeight: 0,
            p: 0.5,
            mb: 2,
            borderRadius: "12px",
            "& .MuiTabs-indicator": {
              height: "100%",
              borderRadius: "9px",
              backgroundColor: t.surface,
              boxShadow: "0 1px 3px rgba(16,24,40,0.12)",
            },
            "& .MuiTab-root": {
              zIndex: 1,
              minHeight: 34,
              py: 0.5,
              px: 2,
              borderRadius: "9px",
              color: t.text2,
            },
            "& .MuiTab-root.Mui-selected": { color: t.text },
          };
        }}
      >
        <Tab label="Kunden suchen" {...a11yProps(0)} />
        <Tab label="Letzte Kunden" {...a11yProps(1)} />
        <Tab label="Expertensuche" {...a11yProps(2)}></Tab>
      </Tabs>
      <Card>
        <CustomTabPanel value={value} index={0}>
          <CustomerSearch />
        </CustomTabPanel>
        <CustomTabPanel value={value} index={1}>
          <LastCustomersSearched />
        </CustomTabPanel>
        <CustomTabPanel value={value} index={2}>
          <ExpertSearch />
        </CustomTabPanel>
      </Card>
    </Box>
  );
};

export default Search;
