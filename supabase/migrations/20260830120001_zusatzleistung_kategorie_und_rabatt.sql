-- Issue #22: Zusatzleistungen im Auftrag auswählbar machen (mit Leistungskatalog & Rabatt-Codes)
--
-- Erweitert den Zusatzleistungs-Katalog um eine Kategorie und ergänzt die Brille
-- um ein Rabatt-Prozentfeld, das zusammen mit dem bereits vorhandenen Feld
-- "RabattBezeichnung" den Rabatt-Mechanismus (VIP/ZNEU/zw/Sonderrabatt) auf die
-- Summe aus Glas rechts + Glas links + Fassung abbildet. Beide Felder bleiben
-- unabhängig von normalen Zusatzleistungs-Positionen, damit #52 (Summenberechnung)
-- und #56 (Rechnungen) Zusatzleistungen und Rabatt getrennt auswerten können.

-- "Bezeichnung" war bislang ein fester Enum-Typ (zusatzleistungbezeichnung).
-- Der neue, freie Leistungskatalog (siehe Seed-Migration) und das Frontend
-- (zusatzleistung.tsx: TextInput source="Bezeichnung") brauchen frei
-- befüllbaren Text statt einer festen, kleinen Werteliste.
alter table public.zusatzleistung
  alter column "Bezeichnung" type text using "Bezeichnung"::text;

drop type if exists public.zusatzleistungbezeichnung;

alter table public.zusatzleistung
  add column if not exists "Kategorie" text;

comment on column public.zusatzleistung."Kategorie" is
  'Kategorie aus dem Leistungskatalog (Issue #22): Diagnostik & Vorsorge, Kontaktlinsen, Service & Hausbesuch, Reparaturen, Veredelungen & Extras.';

alter table public.brille
  add column if not exists "RabattProzent" numeric;

comment on column public.brille."RabattBezeichnung" is
  'Rabatt-Code (z. B. VIP-Rabatt, ZNEU-Neukunden-Rabatt, zw-Zweitbrillen-Rabatt, Sonderrabatt). Wirkt zusammen mit "RabattProzent" auf die Summe aus Glas rechts + Glas links + Fassung, nicht auf Zusatzleistungen.';

comment on column public.brille."RabattProzent" is
  'Rabatt in Prozent (z. B. 15 für -15 %), zusammen mit "RabattBezeichnung" anzuwenden auf die Summe aus Glas rechts + Glas links + Fassung.';

alter table public.brille
  drop constraint if exists brille_rabattprozent_check;

alter table public.brille
  add constraint brille_rabattprozent_check
  check ("RabattProzent" is null or ("RabattProzent" >= 0 and "RabattProzent" <= 100));
