-- Fix für Issue #81 (fehlende Migrationen): "brille_hat_zusatzleistungen" ist
-- (wie kunde, brille, glass, glastyp, fassung, zusatzleistung) eine Tabelle
-- aus der Zeit vor Einführung der Migrationsverwaltung. Anders als der Rest
-- des Schemas (z. B. kunde_leistet_zauzahlung_fuer_brille: "KundenID"/
-- "BrillenID") wurden ihre Fremdschlüssel-Spalten in snake_case angelegt
-- (brille_id/zusatzleistung_id) statt im sonst durchgängig verwendeten
-- PascalCase.
--
-- Frontend (brille_hat_zusatzleistungen.tsx, brillen.tsx) und die
-- Summenberechnungs-Trigger (20260831000000_brille_summe_berechnung.sql)
-- erwarten durchgängig "BrillenID"/"ZusatzleistungID". Diese Migration
-- benennt die Spalten entsprechend um, bevor die Trigger-Migration darauf
-- zugreift.

alter table public.brille_hat_zusatzleistungen
  rename column brille_id to "BrillenID";

alter table public.brille_hat_zusatzleistungen
  rename column zusatzleistung_id to "ZusatzleistungID";
