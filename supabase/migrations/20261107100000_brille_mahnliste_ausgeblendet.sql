-- Einträge aus der Mahnungen-Übersicht entfernen, ohne Auftrag oder Rechnung
-- zu löschen (Rechnungen unterliegen der Aufbewahrungspflicht). Neue Spalte
-- mit Standardwert false, keine Änderung an bestehenden Daten; die Übersicht
-- filtert auf "MahnlisteAusgeblendet" = false, ein Eintrag lässt sich über
-- die Ansicht "Entfernte anzeigen" wieder zurückholen.

alter table public.brille
  add column if not exists "MahnlisteAusgeblendet" boolean not null default false;

comment on column public.brille."MahnlisteAusgeblendet" is
  'true = Auftrag wurde manuell aus der Mahnungen-Übersicht entfernt (Auftrag und Rechnung bleiben erhalten).';
