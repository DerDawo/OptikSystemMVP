// Einmalig zu pflegende Betriebsstammdaten des Leistungserbringers (#90):
// Betrieb/Stempel, IK-Nummer und Präqualifizierung nach § 126 SGB V, die für
// den Berechtigungsschein (berechtigungsscheinTemplate.ts) benötigt werden.
// Die Tabelle `betrieb` enthält immer genau eine Zeile mit id = 1 (siehe
// Migration 20260831150100_create_betrieb.sql) - kein List-/Show-/
// Create-Formular nötig, der Menüeintrag verlinkt direkt auf die
// Bearbeitungsseite dieser einen Zeile.
import {
  BooleanInput,
  Edit,
  NumberInput,
  SimpleForm,
  TextInput,
} from "react-admin";
import { FieldRow, FormSection } from "./EntityLayout";
import { BetriebBilderFeld } from "./BetriebBilder";

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
      {/* Absenderdaten für Rechnung, Kostenvoranschlag, Werkstattauftrag,
          Formulare und SMS-Platzhalter (#132). Leere Felder nutzen die
          bisherigen Standardwerte. */}
      <FormSection title="Absender auf Belegen">
        <FieldRow>
          <TextInput source="Firmenname" label="Firmenname" />
          <TextInput source="Marke" label="Marke / Geschäftsname" />
          <TextInput source="Inhaber" label="Inhaber" />
        </FieldRow>
        <FieldRow>
          <TextInput source="Strasse" label="Straße und Hausnummer" />
          <TextInput source="PLZ" label="PLZ" />
          <TextInput source="Ort" label="Ort" />
        </FieldRow>
        <FieldRow>
          <TextInput source="Telefon" label="Telefon" />
          <TextInput source="Fax" label="Fax" />
          <TextInput source="Email" label="E-Mail" />
          <TextInput source="Website" label="Website" />
        </FieldRow>
      </FormSection>
      <FormSection title="Steuer und Bankverbindung">
        <FieldRow>
          <TextInput source="UStIdNr" label="USt-IdNr." />
          <NumberInput source="MwStSatz" label="MwSt-Satz (%)" />
        </FieldRow>
        <FieldRow>
          <TextInput source="Bank" label="Bank" />
          <TextInput source="IBAN" label="IBAN" />
          <TextInput source="BIC" label="BIC" />
        </FieldRow>
        <FieldRow>
          <NumberInput source="ZahlungszielTage" label="Zahlungsziel (Tage)" />
          <NumberInput
            source="KostenvoranschlagGueltigTage"
            label="Kostenvoranschlag gültig (Tage)"
          />
        </FieldRow>
      </FormSection>
      {/* Privat gespeichert (nicht im Code): Stempel und Unterschrift für
          Formulare wie die Rezeptanfrage an den Augenarzt */}
      <FormSection title="Stempel und Unterschrift (privat gespeichert)">
        <BetriebBilderFeld />
      </FormSection>
    </SimpleForm>
  </Edit>
);
