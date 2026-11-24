-- Zusatzleistung "Erweiterte Führerschein Sehtest" (149,90 €) im Katalog
-- (in Prod bereits angelegt; idempotent).
insert into public.zusatzleistung ("Bezeichnung", "Kategorie", "Betrag", "Aktiv", "Reihenfolge")
select 'Erweiterte Führerschein Sehtest', 'Diagnostik & Vorsorge', 149.90, true, 14
where not exists (
  select 1 from public.zusatzleistung where "Bezeichnung" = 'Erweiterte Führerschein Sehtest'
);
