-- Zahlungsstatus eines Auftrags: zusätzlich "teilweise offen",
-- "Ratenzahlung" und "Versicherung" (Auswahl in Karteikarte und Formular,
-- my-admin/src/zahlungsstatus.ts). Bestehende Werte ("offen", "bezahlt")
-- bleiben gültig; es werden keine Daten geändert.

alter table public.brille
  drop constraint if exists brille_zahlungsstatus_check;

alter table public.brille
  add constraint brille_zahlungsstatus_check check ("Zahlungsstatus" in (
    'bezahlt',
    'teilweise offen',
    'offen',
    'Ratenzahlung',
    'Versicherung'
  ));
