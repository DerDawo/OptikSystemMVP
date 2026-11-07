-- Behandelnder Augenarzt des Kunden mit vollständiger Adresse (Praxis, Name,
-- Straße, PLZ Ort, Telefon) als mehrzeiliger Text. Neue Spalte, keine
-- Änderung an bestehenden Daten.

alter table public.kunde
  add column if not exists "Augenarzt" text;

comment on column public.kunde."Augenarzt" is
  'Behandelnder Augenarzt: Praxis, Name, Straße, PLZ Ort, Telefon (mehrzeilig).';
