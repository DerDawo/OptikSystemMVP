-- Neue Zusatzleistung "Beratungsleistung / AA-Kontakt" (26,95 €) am Ende der
-- Auswahl in der Brillenkartei. Gibt es sie schon, bekommt sie Preis und
-- Sichtbarkeit; bestehende Aufträge ändern sich nicht.

update public.zusatzleistung
set "Betrag" = 26.95, "Aktiv" = true
where "Bezeichnung" = 'Beratungsleistung / AA-Kontakt';

insert into public.zusatzleistung ("Bezeichnung", "Betrag", "Kategorie", "Reihenfolge", "Aktiv")
select
  'Beratungsleistung / AA-Kontakt',
  26.95,
  'Diagnostik & Vorsorge',
  coalesce((select max("Reihenfolge") from public.zusatzleistung), 0) + 1,
  true
where not exists (
  select 1 from public.zusatzleistung
  where "Bezeichnung" = 'Beratungsleistung / AA-Kontakt'
);
