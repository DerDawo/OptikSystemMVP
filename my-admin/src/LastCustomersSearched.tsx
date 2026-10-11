import { Box } from "@mui/material";
import { Title, ListBase, Pagination } from "react-admin";
import { KundenDataTable } from "./kunden";

// Zuletzt geöffnete Kunden (Kundenansicht setzt last_viewed_at). Nie
// geöffnete Kunden werden ausgeblendet; bei absteigender Sortierung stünden
// sie in PostgreSQL sonst ganz oben.
const LastCustomersSearched = () => (
  <Box sx={{ display: "flex", flexDirection: "column", gap: "1em" }}>
    <Title title="Letzte Kunden" />
    <Box sx={{ minHeight: 300 }}>
      <ListBase
        resource="kunde"
        disableSyncWithLocation
        storeKey={false}
        filter={{ "last_viewed_at@not.is": "null" }}
        sort={{ field: "last_viewed_at", order: "DESC" }}
        perPage={25}
      >
        <KundenDataTable bulkActionButtons={false} />
        <Pagination rowsPerPageOptions={[25, 50]} />
      </ListBase>
    </Box>
  </Box>
);

export default LastCustomersSearched;
