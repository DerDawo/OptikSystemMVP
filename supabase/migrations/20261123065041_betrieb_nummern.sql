-- Betriebs- und Steuernummern sowie Kontoinhaber auf der Seite "Betriebsdaten".
-- Nur die Spalten; die Werte werden direkt in der Datenbank gepflegt (nicht im
-- Code), damit Steuer- und Betriebsnummern nicht im Repository stehen.
alter table public.betrieb
  add column if not exists "Betriebsnummer" text,
  add column if not exists "HWKNummer" text,
  add column if not exists "BGETEMNummer" text,
  add column if not exists "Steuernummer" text,
  add column if not exists "WirtschaftsIdNr" text,
  add column if not exists "EORI" text,
  add column if not exists "Kontoinhaber" text;
