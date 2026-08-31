// in src/App.tsx
import { Admin, CustomRoutes, Resource } from "react-admin";
import { theme } from "./theme";
import { dataProvider } from "./dataProvider";
import { MyLayout } from "./MyLayout";
import { authProvider } from "./authProvider";
import { LoginPage } from "ra-supabase";
import {
  KundenList,
  KundeShow,
  KundeEdit,
  KundeCreate,
  KundeMessage,
} from "./kunden";
import { BrilleList, BrilleShow, BrilleEdit, BrilleCreate } from "./brillen";
import {
  KontaktlinseList,
  KontaktlinseShow,
  KontaktlinseEdit,
  KontaktlinseCreate,
} from "./kontaktlinsen";
import { GlassList, GlassShow, GlassEdit, GlassCreate } from "./glass";
import {
  GlastypList,
  GlastypShow,
  GlastypEdit,
  GlastypCreate,
} from "./glasstyp";
import {
  BrillenartList,
  BrillenartShow,
  BrillenartEdit,
  BrillenartCreate,
} from "./brillenart";
import {
  FassungList,
  FassungShow,
  FassungEdit,
  FassungCreate,
} from "./fassung";
import {
  Brille_hat_zusatzleistungenList,
  Brille_hat_zusatzleistungenShow,
  Brille_hat_zusatzleistungenEdit,
  Brille_hat_zusatzleistungenCreate,
} from "./brille_hat_zusatzleistungen";
import {
  Kunde_leistet_zauzahlung_fuer_brilleList,
  Kunde_leistet_zauzahlung_fuer_brilleShow,
  Kunde_leistet_zauzahlung_fuer_brilleEdit,
  Kunde_leistet_zauzahlung_fuer_brilleCreate,
} from "./kunde_leistet_zauzahlung_fuer_brille";
import {
  ZusatzleistungList,
  ZusatzleistungShow,
  ZusatzleistungEdit,
  ZusatzleistungCreate,
} from "./zusatzleistung";
import { TerminList, TerminShow, TerminEdit, TerminCreate } from "./termin";
import { TerminKalender } from "./TerminKalender";
import {
  DokumentvorlageList,
  DokumentvorlageShow,
  DokumentvorlageEdit,
  DokumentvorlageCreate,
} from "./dokumentvorlage";
import {
  GlashersstellerList,
  GlashersstellerShow,
  GlaskatalogList,
  GlaskatalogShow,
  GlaskatalogOptionList,
  GlaskatalogOptionShow,
} from "./glaskatalog/glaskatalogResource";
import { GlaskatalogImportPage } from "./glaskatalog/GlaskatalogImportPage";
import { RechnungenList } from "./Rechnungen";

import PersonIcon from "@mui/icons-material/Person";
import PanoramaFishEyeIcon from "@mui/icons-material/PanoramaFishEye";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EventIcon from "@mui/icons-material/Event";
import { Route } from "react-router-dom";
import Search from "./Search";

export const App = () => {
  return (
    <Admin
      layout={MyLayout}
      dataProvider={dataProvider}
      authProvider={authProvider}
      loginPage={LoginPage}
      theme={theme}
      requireAuth
    >
      <Resource
        name="kunde"
        list={KundenList}
        show={KundeShow}
        edit={KundeEdit}
        create={KundeCreate}
        icon={PersonIcon}
      />
      <Resource
        name="brille"
        list={BrilleList}
        show={BrilleShow}
        edit={BrilleEdit}
        create={BrilleCreate}
      />
      <Resource
        name="kontaktlinse"
        list={KontaktlinseList}
        show={KontaktlinseShow}
        edit={KontaktlinseEdit}
        create={KontaktlinseCreate}
        icon={VisibilityIcon}
      />
      <Resource
        name="brillenart"
        list={BrillenartList}
        show={BrillenartShow}
        edit={BrillenartEdit}
        create={BrillenartCreate}
      />
      <Resource
        name="glass"
        list={GlassList}
        show={GlassShow}
        edit={GlassEdit}
        create={GlassCreate}
        icon={PanoramaFishEyeIcon}
      />
      <Resource
        name="glastyp"
        list={GlastypList}
        show={GlastypShow}
        edit={GlastypEdit}
        create={GlastypCreate}
      />
      <Resource
        name="glashersteller"
        list={GlashersstellerList}
        show={GlashersstellerShow}
      />
      <Resource
        name="glaskatalog"
        list={GlaskatalogList}
        show={GlaskatalogShow}
      />
      <Resource
        name="glaskatalog_option"
        list={GlaskatalogOptionList}
        show={GlaskatalogOptionShow}
      />
      <Resource name="glaskatalog_hat_option" />
      <Resource
        name="fassung"
        list={FassungList}
        show={FassungShow}
        edit={FassungEdit}
        create={FassungCreate}
      />
      <Resource
        name="brille_hat_zusatzleistungen"
        list={Brille_hat_zusatzleistungenList}
        show={Brille_hat_zusatzleistungenShow}
        edit={Brille_hat_zusatzleistungenEdit}
        create={Brille_hat_zusatzleistungenCreate}
      />
      <Resource
        name="kunde_leistet_zauzahlung_fuer_brille"
        list={Kunde_leistet_zauzahlung_fuer_brilleList}
        show={Kunde_leistet_zauzahlung_fuer_brilleShow}
        edit={Kunde_leistet_zauzahlung_fuer_brilleEdit}
        create={Kunde_leistet_zauzahlung_fuer_brilleCreate}
      />
      <Resource
        name="zusatzleistung"
        list={ZusatzleistungList}
        show={ZusatzleistungShow}
        edit={ZusatzleistungEdit}
        create={ZusatzleistungCreate}
      />
      <Resource
        name="termin"
        list={TerminList}
        show={TerminShow}
        edit={TerminEdit}
        create={TerminCreate}
        icon={EventIcon}
      />
      <Resource
        name="dokumentvorlage"
        list={DokumentvorlageList}
        show={DokumentvorlageShow}
        edit={DokumentvorlageEdit}
        create={DokumentvorlageCreate}
      />
      <CustomRoutes>
        <Route path="/search" element={<Search />} />
        <Route path="/rechnungen" element={<RechnungenList />} />
        <Route path="/kalender" element={<TerminKalender />} />
        <Route path="/kunde/:id/message" element={<KundeMessage />} />
        <Route path="/glaskatalog-import" element={<GlaskatalogImportPage />} />
      </CustomRoutes>
    </Admin>
  );
};
