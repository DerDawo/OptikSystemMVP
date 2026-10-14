-- Kundennummer automatisch vergeben: bleibt das Feld bei der Neuanlage leer,
-- bekommt der Kunde die nächste freie Nummer (fortlaufend nach der höchsten
-- vorhandenen, Prisma: 10001 ...). Eine von Hand eingetragene Nummer bleibt.
-- Kunden ohne Nummer (in der App angelegt, bevor es das gab) bekommen
-- einmalig eine. Doppelte Nummern verhindert ein eindeutiger Index.

create sequence if not exists public.kunde_kundennummer_seq;

select setval(
  'public.kunde_kundennummer_seq',
  greatest(
    coalesce(
      (select max(trim("KundenNummer")::bigint)
         from public.kunde
        where trim("KundenNummer") ~ '^\d{1,15}$'),
      10000
    ),
    10000
  )
);

grant usage, select on sequence public.kunde_kundennummer_seq to authenticated;

create or replace function public.kunde_kundennummer_vergeben()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  nr text;
begin
  if coalesce(trim(new."KundenNummer"), '') = '' then
    loop
      nr := nextval('public.kunde_kundennummer_seq')::text;
      exit when not exists (
        select 1 from public.kunde where trim("KundenNummer") = nr
      );
    end loop;
    new."KundenNummer" := nr;
  else
    new."KundenNummer" := trim(new."KundenNummer");
  end if;
  return new;
end;
$$;

drop trigger if exists kunde_kundennummer_vergeben on public.kunde;
create trigger kunde_kundennummer_vergeben
  before insert on public.kunde
  for each row execute function public.kunde_kundennummer_vergeben();

-- Kunden ohne Nummer nachträglich versorgen (in Reihenfolge der Anlage)
do $$
declare
  k record;
begin
  for k in
    select id from public.kunde
     where coalesce(trim("KundenNummer"), '') = ''
     order by id
  loop
    update public.kunde
       set "KundenNummer" = nextval('public.kunde_kundennummer_seq')::text
     where id = k.id;
  end loop;
end $$;

-- Doppelte Nummern ausschließen (nur wenn der Bestand schon eindeutig ist)
do $$
begin
  if not exists (
    select 1 from public.kunde
     where coalesce(trim("KundenNummer"), '') <> ''
     group by trim("KundenNummer")
    having count(*) > 1
  ) then
    create unique index if not exists kunde_kundennummer_eindeutig
      on public.kunde (trim("KundenNummer"))
      where coalesce(trim("KundenNummer"), '') <> '';
  end if;
end $$;
