// Einmalig zu pflegende Betriebsstammdaten des Leistungserbringers (#90):
// Betrieb/Stempel, IK-Nummer und Präqualifizierung nach § 126 SGB V, die für
// den Berechtigungsschein (berechtigungsscheinTemplate.ts) benötigt werden.
// Die Tabelle `betrieb` enthält immer genau eine Zeile mit id = 1 (siehe
// Migration 20260831150100_create_betrieb.sql) - kein List-/Show-/
// Create-Formular nötig, der Menüeintrag verlinkt direkt auf die
// Bearbeitungsseite dieser einen Zeile.
import { BooleanInput, Edit, SimpleForm, TextInput } from "react-admin";
import { FieldRow, FormSection } from "./EntityLayout";

export const BetriebEdit = () => (
  <Edit title="Betriebsdaten" redirect={false}>
    <SimpleForm>
      <FormSection title="Angaben zum Leistungserbringer">
        <TextInput source="Name" label="Betrieb/Stempel" fullWidth />
        <FieldRow>
          <TextInput
            source="IKNummer"
            label="IK-Nummer (Institutionskennzeichen)"
          />
          <BooleanInput
            source="Praequalifiziert"
            label="Präqualifiziert gemäß § 126 SGB V"
          />
        </FieldRow>
      </FormSection>
    </SimpleForm>
  </Edit>
);
