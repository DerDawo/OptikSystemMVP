-- Zusatzleistungs-Katalog des Betriebs (Auswahl in der Brillenkartei):
--   1. Glaseinschliff 28,90 €            6. Kinderoptometrie 35,60 €
--   2. Handwerksleistung 14,90 €         7. Refraktion 28,90 €
--   3. Lötung 32,90 €                    8. Fassung aufarbeiten 15,90 €
--   4. Fassung färben 59,90 €            9. Tränenfilmanalyse 59,80 €
--   5. Fundusaufnahme / Spaltlampen-    10. Kontaktlinsenanpassung 32,60 €
--      untersuchung / Dokumentation 89,90 €
-- Vorhandene Einträge mit gleicher Bezeichnung bekommen den neuen Preis,
-- fehlende werden angelegt. Die übrigen Einträge des Beispielkatalogs werden
-- nur ausgeblendet ("Aktiv" = false), nicht gelöscht - Aufträge, die sie
-- verwenden, behalten ihre Position. Zum Zeitpunkt der Migration verwendete
-- kein Auftrag einen Eintrag des Katalogs, Preisänderungen ändern also keine
-- bestehenden Summen.

alter table public.zusatzleistung
  add column if not exists "Aktiv" boolean not null default true,
  add column if not exists "Reihenfolge" smallint;

comment on column public.zusatzleistung."Aktiv" is
  'In der Auswahl (Brillenkartei, Auftrag bearbeiten) angeboten; ausgeblendete Einträge bleiben in bestehenden Aufträgen erhalten.';
comment on column public.zusatzleistung."Reihenfolge" is
  'Position in der Auswahlliste (aufsteigend, leer = am Ende).';

with katalog ("Reihenfolge", "Bezeichnung", "Betrag", "Kategorie") as (
  values
    (1, 'Glaseinschliff', 28.90, 'Reparaturen'),
    (2, 'Handwerksleistung', 14.90, 'Reparaturen'),
    (3, 'Lötung', 32.90, 'Reparaturen'),
    (4, 'Fassung färben', 59.90, 'Veredelungen & Extras'),
    (5, 'Fundusaufnahme / Spaltlampenuntersuchung / Dokumentation', 89.90, 'Diagnostik & Vorsorge'),
    (6, 'Kinderoptometrie', 35.60, 'Diagnostik & Vorsorge'),
    (7, 'Refraktion', 28.90, 'Diagnostik & Vorsorge'),
    (8, 'Fassung aufarbeiten', 15.90, 'Reparaturen'),
    (9, 'Tränenfilmanalyse', 59.80, 'Diagnostik & Vorsorge'),
    (10, 'Kontaktlinsenanpassung', 32.60, 'Kontaktlinsen')
),
geaendert as (
  update public.zusatzleistung z
  set "Betrag" = k."Betrag",
      "Reihenfolge" = k."Reihenfolge",
      "Aktiv" = true,
      "Kategorie" = coalesce(z."Kategorie", k."Kategorie")
  from katalog k
  where z."Bezeichnung" = k."Bezeichnung"
  returning z."Bezeichnung"
)
insert into public.zusatzleistung ("Bezeichnung", "Betrag", "Kategorie", "Reihenfolge", "Aktiv")
select k."Bezeichnung", k."Betrag", k."Kategorie", k."Reihenfolge", true
from katalog k
where not exists (
  select 1 from public.zusatzleistung z where z."Bezeichnung" = k."Bezeichnung"
);

update public.zusatzleistung
set "Aktiv" = false
where "Reihenfolge" is null;
