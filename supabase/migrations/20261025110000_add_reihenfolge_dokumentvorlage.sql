-- Eigene Reihenfolge der Formulare im Formulare-Dialog.
-- NULL = noch nicht einsortiert (erscheint alphabetisch hinter den
-- einsortierten). Idempotent, ändert keine bestehenden Daten.

alter table public.dokumentvorlage
  add column if not exists "Reihenfolge" integer;

comment on column public.dokumentvorlage."Reihenfolge" is
  'Position in der Formularliste (aufsteigend); NULL = alphabetisch am Ende';
