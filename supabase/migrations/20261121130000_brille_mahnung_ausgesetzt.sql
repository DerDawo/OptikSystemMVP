-- Mahnungen: Auftrag "nicht mahnen" (z. B. Kulanz, Ratenvereinbarung,
-- anderweitig geklärt). Die Forderung bleibt offen (Zahlungsstatus und
-- Restbetrag unverändert), der Auftrag erscheint aber nicht mehr in der
-- Mahnliste. Rückgängig über "Ausgesetzte anzeigen" → "Wieder mahnen".
-- Neue Spalte mit Vorgabe false, keine Änderung an bestehenden Werten.

alter table public.brille
  add column if not exists "MahnungAusgesetzt" boolean not null default false;

comment on column public.brille."MahnungAusgesetzt" is
  'true = Auftrag wird nicht gemahnt (aus der Mahnliste genommen), Forderung bleibt offen.';
