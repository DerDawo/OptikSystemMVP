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

-- Nachtclip (59,60 €), ebenfalls am Ende der Auswahl
update public.zusatzleistung
set "Betrag" = 59.60, "Aktiv" = true
where "Bezeichnung" = 'Nachtclip';

insert into public.zusatzleistung ("Bezeichnung", "Betrag", "Kategorie", "Reihenfolge", "Aktiv")
select
  'Nachtclip',
  59.60,
  'Veredelungen & Extras',
  coalesce((select max("Reihenfolge") from public.zusatzleistung), 0) + 1,
  true
where not exists (
  select 1 from public.zusatzleistung where "Bezeichnung" = 'Nachtclip'
);

-- Ersatzclip (39,90 €), ebenfalls am Ende der Auswahl
update public.zusatzleistung
set "Betrag" = 39.90, "Aktiv" = true
where "Bezeichnung" = 'Ersatzclip';

insert into public.zusatzleistung ("Bezeichnung", "Betrag", "Kategorie", "Reihenfolge", "Aktiv")
select
  'Ersatzclip',
  39.90,
  'Veredelungen & Extras',
  coalesce((select max("Reihenfolge") from public.zusatzleistung), 0) + 1,
  true
where not exists (
  select 1 from public.zusatzleistung where "Bezeichnung" = 'Ersatzclip'
);
