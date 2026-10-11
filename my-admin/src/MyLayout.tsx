// in src/MyLayout.js
import { Layout, useGetOne } from "react-admin";
import { MyMenu } from "./MyMenu";
import { MyAppBar } from "./MyAppBar";
import { ReactNode, useEffect } from "react";
import { uebernehmeBetriebsdaten } from "./rechnungTemplate";
import { GlobaleTastenkuerzel } from "./tastenkuerzel";

// Lädt die Betriebsdaten (Tabelle `betrieb`, Zeile 1) für Belege, Formulare
// und SMS-Platzhalter (#132). Nach dem Speichern auf der Seite
// "Betriebsdaten" lädt react-admin die Zeile neu, der Effekt übernimmt sie.
const BetriebsdatenLaden = () => {
  const { data } = useGetOne("betrieb", { id: 1 });
  useEffect(() => {
    if (data) uebernehmeBetriebsdaten(data);
  }, [data]);
  return null;
};

export const MyLayout = ({ children }: { children: ReactNode }) => (
  <Layout menu={MyMenu} appBar={MyAppBar} appBarAlwaysOn>
    <BetriebsdatenLaden />
    <GlobaleTastenkuerzel />
    {children}
  </Layout>
);
