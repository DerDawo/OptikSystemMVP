-- Reihenfolge der Nachrichtenvorlagen (Kundenseite "Nachricht", Vorlagen
-- zum Antippen): änderbar mit Pfeilen in der Vorlagenliste. Startwert ist
-- die bisherige Reihenfolge (nach id). Neue Spalte, Inhalt der Vorlagen
-- bleibt unverändert.

alter table public.nachrichten
  add column if not exists "Reihenfolge" integer;

update public.nachrichten n
set "Reihenfolge" = s.nr
from (select id, row_number() over (order by id) as nr from public.nachrichten) s
where n.id = s.id and n."Reihenfolge" is null;

comment on column public.nachrichten."Reihenfolge" is
  'Position der Vorlage in der Auswahl (aufsteigend, leer = am Ende).';
