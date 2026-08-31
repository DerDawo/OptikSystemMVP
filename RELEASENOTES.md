# Releasenotes

> Hinweis: In diesem Repository wurden bisher keine Releasenotes geführt. Diese erste
> Ausgabe fasst daher den gesamten bisherigen Entwicklungsstand zusammen – vom
> Projektstart am 16.01.2026 bis heute (31.08.2026). Ab jetzt kann von diesem Stand
> aus fortgeschrieben werden.

## Kundenverwaltung & Suche
- Kundendatentabelle mit responsivem Layout, automatischer Seitengröße und Kundennummer-Spalte.
- Zentrale Suchseite mit Tabs für Kundensuche, Expertensuche und Suche nach Kundennummer/Geburtsdatum (inkl. Datumsauswahl).
- Direkte Filterung der Kundenliste sowie Anzeige der zuletzt angesehenen Kunden (`last_viewed_at`).
- Zusätzliche Kundenfelder: Handynummer, bevorzugter Kontaktweg, Werbeeinwilligung, Kundenquelle und Merkmale.

## Kommunikation mit Kunden
- Neuer Nachrichten-Versand direkt aus der Kundenkartei (Button in der Kundenansicht).
- Versand von Nachrichten per SMS (Twilio), E-Mail (Resend) und WhatsApp (Cloud API).
- Verwaltbare Nachrichtenvorlagen inkl. CRUD-Oberfläche im Versand-Dialog.
- Überarbeitetes, responsives Design der Nachrichtenversand-Seite.

## Brillenkartei & Aufträge
- Neue Felder in der Brillenkartei: Rechnungsnummer, Anzahlung, Krankenkassen-Anteil, Zahlungsstatus und Auftragsstatus.
- Automatische Ableitung des Auftragsstatus sowie Verlaufsansicht (Datagrid) je Kunde.
- Glasassistent: mehrstufiger Auswahldialog zur Glasauswahl direkt aus der Brillenkartei.
- Automatische Summenberechnung aus Glas, Fassung, Rabatt und Zusatzleistungen.
- Möglichkeit, eine bestehende Karteikarte zu kopieren und daraus einen neuen Auftrag anzulegen.
- Brillenart als pflegbare Werteliste statt Freitext.
- Zusatzleistungen: Mehrfachauswahl, Rabatt-Prozentfeld und Kategorisierung im Katalog.

## Kontaktlinsen
- Neue Ressource für Kontaktlinsen inklusive Anbindung an die Kundenseite.

## Terminverwaltung
- Neue Termin-Ressource (Liste, Anzeige, Bearbeiten, Anlegen).
- Terminkalender mit Tages- und Wochenansicht, verknüpft mit der Kundenseite.

## Formulare, Rechnungen & Mahnungen
- Zentraler Formulare-Dialog in der Brillenkartei als Einstieg für Rechnungs- und Mahnungserstellung.
- Dokumentvorlagen-Verwaltung mit eigener CRUD-Oberfläche und Beispielvorlagen.
- Rechnungserstellung: automatische Rechnungsnummernvergabe, Positions-Platzhalter, Übersichtsliste und Menüpunkt.
- Mahnungserstellung: Mahnstufe und Restbetrag je Auftrag, Zahlungsfrist-Platzhalter, Seed-Vorlagen, Übersichtsliste und Menüpunkt.

## Glaskatalog-Import
- Datenmodell für Glaskataloge verschiedener Hersteller (SF6).
- Import-Logik inkl. Parser für SF6-Kataloge, Admin-Ansichten und eigene Importseite.

## Dashboard
- Neue Startseite mit Übersichts-Widgets.

## Design & Layout
- Überarbeitetes, moderneres MUI-Theme als einheitliches Design-System.
- Zweispaltiges Layout mit Aktionsleisten für Kunden- und Brillenkartei inkl. Verlaufsanzeige.
- Vereinheitlichte, responsive Show-, Edit- und Create-Seiten für alle Entitäten.
- Behebung von Overflow-Problemen auf Kundenseiten, Aktionsleisten dauerhaft sichtbar.

## Sicherheit & Zugriff
- Zugriff auf die Anwendung auf authentifizierte Benutzer beschränkt.
- Row-Level-Security-Richtlinien für neue Tabellen (Nachrichten, Kontaktlinsen, Dokumentvorlagen) ergänzt bzw. bereinigt.

## Technik & Infrastruktur
- Erstes Setup von React-Admin mit Supabase-Anbindung.
- Zahlreiche Supabase-Migrationen für erweiterte Kunden- und Brillenfelder sowie neue Tabellen.
- Testdaten (Mock-Daten) für die Supabase-Entwicklungsumgebung.
- Supabase-MCP-Server für Claude Code konfiguriert.
- Allgemeine Code-Qualität: durchgängige ESLint-Bereinigung und Formatierung.
