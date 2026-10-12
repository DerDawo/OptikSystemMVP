import polyglotI18nProvider from "ra-i18n-polyglot";
import { TranslationMessages } from "react-admin";

// Feldnamen, die in (fast) jeder Tabelle vorkommen
const commonFields = {
  id: "ID",
  created_at: "Angelegt am",
  updated_at: "Geändert am",
};

const resource = (name: string, fields: Record<string, string> = {}) => ({
  name,
  fields: { ...commonFields, ...fields },
});

// Deutsche Oberflächentexte für react-admin 5 und ra-supabase (Login,
// Passwort zurücksetzen). Die npm-Pakete ra-language-german und
// @haleos/ra-language-german sind auf react-admin 3 bzw. 4 stehen geblieben,
// deshalb liegen die Texte hier im Projekt. i18nProvider.test.ts prüft, dass
// alle Schlüssel aus ra-language-english abgedeckt sind - nach einem
// react-admin-Update zeigt der Test neue Texte an.
export const germanMessages: TranslationMessages = {
  ra: {
    action: {
      add_filter: "Filter hinzufügen",
      add: "Hinzufügen",
      back: "Zurück",
      bulk_actions:
        "1 Eintrag ausgewählt |||| %{smart_count} Einträge ausgewählt",
      cancel: "Abbrechen",
      clear_array_input: "Liste leeren",
      clear_input_value: "Eingabe löschen",
      clone: "Duplizieren",
      confirm: "Bestätigen",
      create: "Anlegen",
      create_item: "%{item} anlegen",
      delete: "Löschen",
      edit: "Bearbeiten",
      export: "Exportieren",
      list: "Liste",
      refresh: "Aktualisieren",
      remove_filter: "Diesen Filter entfernen",
      remove_all_filters: "Alle Filter entfernen",
      remove: "Entfernen",
      reset: "Zurücksetzen",
      reset_password: "Passwort zurücksetzen",
      save: "Speichern",
      search: "Suchen",
      search_columns: "Spalten durchsuchen",
      select_all: "Alle auswählen",
      select_all_button: "Alle auswählen",
      select_row: "Diese Zeile auswählen",
      show: "Anzeigen",
      sort: "Sortieren",
      undo: "Rückgängig",
      unselect: "Auswahl aufheben",
      expand: "Aufklappen",
      close: "Schließen",
      open_menu: "Menü öffnen",
      close_menu: "Menü schließen",
      update: "Aktualisieren",
      move_up: "Nach oben",
      move_down: "Nach unten",
      open: "Öffnen",
      toggle_theme: "Hell/Dunkel umschalten",
      select_columns: "Spalten",
      update_application: "Anwendung neu laden",
    },
    boolean: {
      true: "Ja",
      false: "Nein",
      null: " ",
    },
    page: {
      create: "%{name} anlegen",
      dashboard: "Dashboard",
      edit: "%{name} %{recordRepresentation}",
      error: "Etwas ist schiefgelaufen",
      list: "%{name}",
      loading: "Wird geladen",
      not_found: "Nicht gefunden",
      show: "%{name} %{recordRepresentation}",
      empty: "Noch keine %{name} vorhanden.",
      invite: "Möchten Sie einen Eintrag anlegen?",
      access_denied: "Zugriff verweigert",
      authentication_error: "Anmeldefehler",
    },
    input: {
      file: {
        upload_several:
          "Dateien zum Hochladen hierher ziehen oder klicken, um eine auszuwählen.",
        upload_single:
          "Datei zum Hochladen hierher ziehen oder klicken, um sie auszuwählen.",
      },
      image: {
        upload_several:
          "Bilder zum Hochladen hierher ziehen oder klicken, um eines auszuwählen.",
        upload_single:
          "Bild zum Hochladen hierher ziehen oder klicken, um es auszuwählen.",
      },
      references: {
        all_missing: "Die verknüpften Daten wurden nicht gefunden.",
        many_missing:
          "Mindestens eine der verknüpften Referenzen ist nicht mehr verfügbar.",
        single_missing: "Die verknüpfte Referenz ist nicht mehr verfügbar.",
      },
      password: {
        toggle_visible: "Passwort verbergen",
        toggle_hidden: "Passwort anzeigen",
      },
    },
    message: {
      about: "Über",
      access_denied:
        "Sie haben nicht die nötigen Rechte, um diese Seite aufzurufen.",
      are_you_sure: "Sind Sie sicher?",
      authentication_error:
        "Der Anmeldeserver hat einen Fehler gemeldet, Ihre Zugangsdaten konnten nicht geprüft werden.",
      auth_error: "Beim Prüfen der Anmeldung ist ein Fehler aufgetreten.",
      bulk_delete_content:
        "Möchten Sie diesen Eintrag (%{name}) wirklich löschen? |||| Möchten Sie diese %{smart_count} Einträge wirklich löschen?",
      bulk_delete_title: "%{name} löschen |||| %{smart_count} %{name} löschen",
      bulk_update_content:
        "Möchten Sie %{name} %{recordRepresentation} wirklich aktualisieren? |||| Möchten Sie diese %{smart_count} Einträge wirklich aktualisieren?",
      bulk_update_title:
        "%{name} %{recordRepresentation} aktualisieren |||| %{smart_count} %{name} aktualisieren",
      clear_array_input: "Möchten Sie die gesamte Liste wirklich leeren?",
      delete_content: "Möchten Sie diesen Eintrag (%{name}) wirklich löschen?",
      delete_title: "%{name} %{recordRepresentation} löschen",
      details: "Details",
      error:
        "Es ist ein Fehler aufgetreten, die Anfrage konnte nicht abgeschlossen werden.",
      invalid_form:
        "Das Formular ist nicht gültig. Bitte prüfen Sie Ihre Eingaben.",
      loading: "Bitte warten",
      no: "Nein",
      not_found:
        // Ohne Schlusspunkt: die NotFound-Seite von react-admin hängt selbst einen an.
        "Die Adresse ist falsch eingegeben oder der Link ist nicht mehr gültig",
      select_all_limit_reached:
        "Es gibt zu viele Einträge, um alle auszuwählen. Nur die ersten %{max} wurden ausgewählt.",
      unsaved_changes:
        "Einige Änderungen wurden nicht gespeichert. Möchten Sie sie wirklich verwerfen?",
      yes: "Ja",
      placeholder_data_warning:
        "Netzwerkproblem: Die Daten konnten nicht aktualisiert werden.",
    },
    navigation: {
      clear_filters: "Filter zurücksetzen",
      no_filtered_results: "Keine %{name} für die aktuellen Filter gefunden.",
      no_results: "Keine %{name} gefunden",
      no_more_results:
        "Seite %{page} gibt es nicht. Versuchen Sie die vorherige Seite.",
      page_out_of_boundaries: "Seite %{page} gibt es nicht",
      page_out_from_end: "Das ist bereits die letzte Seite",
      page_out_from_begin: "Das ist bereits die erste Seite",
      page_range_info: "%{offsetBegin}-%{offsetEnd} von %{total}",
      partial_page_range_info:
        "%{offsetBegin}-%{offsetEnd} von mehr als %{offsetEnd}",
      current_page: "Seite %{page}",
      page: "Zu Seite %{page}",
      first: "Zur ersten Seite",
      last: "Zur letzten Seite",
      next: "Zur nächsten Seite",
      previous: "Zur vorherigen Seite",
      page_rows_per_page: "Zeilen pro Seite:",
      skip_nav: "Zum Inhalt springen",
    },
    sort: {
      sort_by: "Sortieren nach %{field_lower_first} %{order}",
      ASC: "aufsteigend",
      DESC: "absteigend",
    },
    auth: {
      auth_check_error: "Bitte melden Sie sich an, um fortzufahren",
      user_menu: "Profil",
      username: "Benutzername",
      password: "Passwort",
      confirm_password: "Passwort bestätigen",
      email: "E-Mail",
      sign_in: "Anmelden",
      sign_in_error: "Anmeldung fehlgeschlagen, bitte erneut versuchen",
      logout: "Abmelden",
    },
    notification: {
      updated: "Eintrag gespeichert |||| %{smart_count} Einträge gespeichert",
      created: "Eintrag angelegt",
      deleted: "Eintrag gelöscht |||| %{smart_count} Einträge gelöscht",
      bad_item: "Ungültiger Eintrag",
      item_doesnt_exist: "Der Eintrag existiert nicht",
      http_error: "Fehler bei der Verbindung zum Server",
      data_provider_error:
        "Fehler beim Laden der Daten. Details stehen in der Browser-Konsole.",
      i18n_error:
        "Die Übersetzungen für diese Sprache konnten nicht geladen werden",
      canceled: "Aktion abgebrochen",
      logged_out:
        "Ihre Sitzung ist abgelaufen, bitte melden Sie sich erneut an.",
      not_authorized: "Sie haben keine Berechtigung für diesen Bereich.",
      application_update_available: "Eine neue Version ist verfügbar.",
      offline: "Keine Verbindung. Die Daten konnten nicht geladen werden.",
    },
    validation: {
      required: "Pflichtfeld",
      minLength: "Mindestens %{min} Zeichen",
      maxLength: "Höchstens %{max} Zeichen",
      minValue: "Mindestens %{min}",
      maxValue: "Höchstens %{max}",
      number: "Muss eine Zahl sein",
      email: "Muss eine gültige E-Mail-Adresse sein",
      oneOf: "Muss einer dieser Werte sein: %{options}",
      regex: "Muss einem bestimmten Format entsprechen (Regexp): %{pattern}",
      unique: "Muss eindeutig sein",
    },
    saved_queries: {
      label: "Gespeicherte Abfragen",
      query_name: "Name der Abfrage",
      new_label: "Aktuelle Abfrage speichern …",
      new_dialog_title: "Aktuelle Abfrage speichern als",
      remove_label: "Gespeicherte Abfrage entfernen",
      remove_label_with_name: 'Abfrage "%{name}" entfernen',
      remove_dialog_title: "Gespeicherte Abfrage entfernen?",
      remove_message:
        "Möchten Sie diese Abfrage wirklich aus Ihren gespeicherten Abfragen entfernen?",
      help: "Liste filtern und die Abfrage für später speichern",
    },
    configurable: {
      customize: "Anpassen",
      configureMode: "Diese Seite anpassen",
      inspector: {
        title: "Inspektor",
        content: "Mit der Maus über Elemente fahren, um sie anzupassen",
        reset: "Einstellungen zurücksetzen",
        hideAll: "Alle ausblenden",
        showAll: "Alle einblenden",
      },
      Datagrid: {
        title: "Tabelle",
        unlabeled: "Spalte ohne Titel #%{column}",
      },
      SimpleForm: {
        title: "Formular",
        unlabeled: "Eingabefeld ohne Titel #%{input}",
      },
      SimpleList: {
        title: "Liste",
        primaryText: "Haupttext",
        secondaryText: "Zweittext",
        tertiaryText: "Dritttext",
      },
    },
  },
  // Namen der Datensätze (Singular |||| Plural), wie in der Sidebar, und
  // Feldnamen für Felder ohne eigenes label. Ohne Eintrag erzeugt react-admin
  // sie aus dem Spaltennamen ("Kundes", "Created at", "Brillen i d").
  resources: {
    kunde: resource("Kunde |||| Kunden", {
      KundenNummer: "Kundennummer",
      TelefonnummerPrivat: "Telefonnummer privat",
      TelefonnummerGeschaeftlich: "Telefonnummer geschäftlich",
      KrankenkassenNummer: "Krankenkassennummer",
      VersichertenNummer: "Versichertennummer",
      KrankenversicherungsTyp: "Krankenversicherungstyp",
      Krankenkasse: "Krankenkasse",
      Versichertenstatus: "Versichertenstatus",
      VersichertenkarteGueltigBis: "Versichertenkarte gültig bis",
    }),
    brille: resource("Brille |||| Brillen", {
      BrillenArt: "Brillenart",
      RabattBezeichnung: "Rabattbezeichnung",
      RabattProzent: "Rabatt in %",
      VerordnenderArzt: "Verordnender Arzt",
      Verordnungsdatum: "Verordnungsdatum",
      Diagnose: "Diagnose (ICD-10)",
    }),
    kontaktlinse: resource("Kontaktlinse |||| Kontaktlinsen"),
    krankenkasse: resource("Krankenkasse |||| Krankenkassen", {
      Geoeffnet: "Geöffnet für",
      IK: "IK / Kassen-Nr.",
    }),
    brillenart: resource("Brillenart |||| Brillenarten"),
    glass: resource("Glas |||| Gläser", {
      PD: "PD",
      y_h: "Y/H",
      HSA: "HSA",
      iod: "IOD",
    }),
    glastyp: resource("Glastyp |||| Glastypen", {
      Verguetung: "Vergütung",
      GlasGroesse: "Glasgröße",
    }),
    glashersteller: resource("Glashersteller |||| Glashersteller"),
    glaskatalog: resource("Grundglas |||| Grundgläser"),
    glaskatalog_option: resource(
      "Glaskatalog-Option |||| Glaskatalog-Optionen",
    ),
    glaskatalog_hat_option: resource(
      "Optionszuordnung |||| Optionszuordnungen",
    ),
    fassung: resource("Fassung |||| Fassungen", { Groesse: "Größe" }),
    brille_hat_zusatzleistungen: resource(
      "Brillen-Zusatzleistung |||| Brillen-Zusatzleistungen",
      { BrillenID: "Brille", ZusatzleistungID: "Zusatzleistung" },
    ),
    kunde_leistet_zauzahlung_fuer_brille: resource("Zahlung |||| Zahlungen", {
      KundenID: "Kunde",
      BrillenID: "Brille",
    }),
    zusatzleistung: resource("Zusatzleistung |||| Zusatzleistungen"),
    termin: resource("Termin |||| Termine"),
    dokumentvorlage: resource("Dokumentvorlage |||| Dokumentvorlagen"),
    betrieb: resource("Betrieb |||| Betriebe"),
  },
  "ra-supabase": {
    auth: {
      email: "E-Mail",
      confirm_password: "Passwort bestätigen",
      sign_in_with: "Anmelden mit %{provider}",
      forgot_password: "Passwort vergessen?",
      reset_password: "Passwort zurücksetzen",
      password_reset:
        "Ihr Passwort wurde zurückgesetzt. Sie erhalten eine E-Mail mit einem Link zur Anmeldung.",
      missing_tokens: "Access- und Refresh-Token fehlen",
      back_to_login: "Zurück zur Anmeldung",
    },
    reset_password: {
      forgot_password: "Passwort vergessen?",
      forgot_password_details:
        "Geben Sie Ihre E-Mail-Adresse ein, um eine Anleitung zu erhalten.",
    },
    set_password: {
      new_password: "Neues Passwort wählen",
    },
    validation: {
      password_mismatch: "Die Passwörter stimmen nicht überein",
    },
  },
  // Supabase liefert Anmeldefehler als englischen Text, und react-admin zeigt
  // ihn über translate(message) an - der Originaltext dient hier als Schlüssel.
  "Invalid login credentials": "E-Mail oder Passwort ist falsch",
  "Email not confirmed": "Die E-Mail-Adresse ist noch nicht bestätigt",
};

// allowMissing wie beim react-admin-Standard: Ressourcen- und Feldnamen ohne
// Übersetzung fallen weiterhin auf ihren technischen Namen zurück.
export const i18nProvider = polyglotI18nProvider(
  () => germanMessages,
  "de",
  [{ locale: "de", name: "Deutsch" }],
  { allowMissing: true },
);
